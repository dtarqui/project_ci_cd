const {
  buildSaleFromRequest,
  cancelSaleById,
} = require("../src/services/salesService");

const makeProduct = (overrides = {}) => ({
  id: 1,
  name: "Producto Test",
  price: 100,
  stock: 10,
  ...overrides,
});

const makeCustomer = (overrides = {}) => ({
  id: 1,
  name: "Cliente Test",
  ...overrides,
});

const makeRepos = ({
  products = [],
  customer = makeCustomer(),
  createResult,
  reserveResult = { ok: true },
  createThrows = null,
} = {}) => {
  const productRepository = {
    findById: jest.fn((id) => Promise.resolve(products.find((p) => p.id === id) || null)),
    reserveStock: jest.fn(() => Promise.resolve(reserveResult)),
    releaseStock: jest.fn(() => Promise.resolve()),
  };

  const customerRepository = {
    findById: jest.fn((id) => Promise.resolve(id === customer?.id ? customer : null)),
    updateStats: jest.fn(() => Promise.resolve()),
  };

  const saleRepository = {
    create: jest.fn((payload) =>
      createThrows
        ? Promise.reject(createThrows)
        : Promise.resolve(createResult || { id: 1, ...payload })
    ),
  };

  return { productRepository, customerRepository, saleRepository };
};

describe("salesService.buildSaleFromRequest", () => {
  it("retorna error CUSTOMER_NOT_FOUND cuando el cliente no existe", async () => {
    const repos = makeRepos({ customer: null });

    const result = await buildSaleFromRequest(
      { customerId: 999, items: [{ productId: 1, quantity: 1 }], paymentMethod: "Efectivo" },
      repos
    );

    expect(result).toMatchObject({ error: "Cliente no encontrado", code: "CUSTOMER_NOT_FOUND", status: 404 });
  });

  it("retorna error PRODUCT_NOT_FOUND en la pre-validación de stock cuando el producto no existe", async () => {
    const repos = makeRepos({ products: [] });

    const result = await buildSaleFromRequest(
      { customerId: 1, items: [{ productId: 999, quantity: 1 }], paymentMethod: "Efectivo" },
      repos
    );

    expect(result).toMatchObject({ error: "Producto no encontrado", code: "PRODUCT_NOT_FOUND", status: 404 });
  });

  it("retorna error INSUFFICIENT_STOCK cuando la cantidad pedida supera el stock", async () => {
    const repos = makeRepos({ products: [makeProduct({ stock: 2 })] });

    const result = await buildSaleFromRequest(
      { customerId: 1, items: [{ productId: 1, quantity: 5 }], paymentMethod: "Efectivo" },
      repos
    );

    expect(result).toMatchObject({
      error: expect.stringContaining("Stock insuficiente"),
      code: "INSUFFICIENT_STOCK",
      status: 400,
      data: { productId: 1, availableStock: 2, requestedQuantity: 5 },
    });
  });

  it("suma cantidades repetidas del mismo producto para la validación de stock", async () => {
    const repos = makeRepos({ products: [makeProduct({ stock: 3 })] });

    const result = await buildSaleFromRequest(
      {
        customerId: 1,
        items: [
          { productId: 1, quantity: 2 },
          { productId: 1, quantity: 2 },
        ],
        paymentMethod: "Efectivo",
      },
      repos
    );

    expect(result).toMatchObject({ code: "INSUFFICIENT_STOCK" });
    expect(result.data.requestedQuantity).toBe(4);
  });

  // El caso de estudio no hace facturacion: el total es subtotal menos descuento,
  // sin tributos. Ver los limites del perfil.
  it("calcula subtotal y total sin aplicar ningun impuesto", async () => {
    const repos = makeRepos({ products: [makeProduct({ price: 100, stock: 10 })] });

    const result = await buildSaleFromRequest(
      { customerId: 1, items: [{ productId: 1, quantity: 2 }], paymentMethod: "Efectivo" },
      repos
    );

    expect(result.error).toBeUndefined();
    const createdPayload = repos.saleRepository.create.mock.calls[0][0];
    expect(createdPayload.subtotal).toBe(200);
    expect(createdPayload.total).toBe(200);
    expect(createdPayload.tax).toBeUndefined();
  });

  it("aplica el descuento antes de calcular el total final", async () => {
    const repos = makeRepos({ products: [makeProduct({ price: 100, stock: 10 })] });

    await buildSaleFromRequest(
      { customerId: 1, items: [{ productId: 1, quantity: 1 }], discount: 50, paymentMethod: "Efectivo" },
      repos
    );

    const createdPayload = repos.saleRepository.create.mock.calls[0][0];
    // subtotal 100 - descuento 50 = 50
    expect(createdPayload.total).toBe(50);
  });

  // Este caso afirmaba que recortar el total a 0 estaba bien, y por eso el
  // defecto nunca salto: la venta quedaba en Bs 0 pero el stock se descontaba
  // igual. Ahora la venta se rechaza antes de llegar a registrarse.
  it("rechaza un descuento mayor que el subtotal", async () => {
    const repos = makeRepos({ products: [makeProduct({ price: 10, stock: 10 })] });

    const result = await buildSaleFromRequest(
      { customerId: 1, items: [{ productId: 1, quantity: 1 }], discount: 999, paymentMethod: "Efectivo" },
      repos
    );

    expect(result.code).toBe("INVALID_DISCOUNT");
    expect(result.status).toBe(400);
    expect(result.data.maxDiscount).toBe(10);
    // Lo importante: no se registra la venta ni se toca el inventario.
    expect(repos.saleRepository.create).not.toHaveBeenCalled();
    expect(repos.productRepository.reserveStock).not.toHaveBeenCalled();
  });

  it("acepta un descuento exactamente igual al subtotal", async () => {
    const repos = makeRepos({ products: [makeProduct({ price: 10, stock: 10 })] });

    await buildSaleFromRequest(
      { customerId: 1, items: [{ productId: 1, quantity: 1 }], discount: 10, paymentMethod: "Efectivo" },
      repos
    );

    const createdPayload = repos.saleRepository.create.mock.calls[0][0];
    expect(createdPayload.total).toBe(0);
  });

  it("reserva el inventario y actualiza las estadísticas del cliente para ventas activas", async () => {
    const repos = makeRepos({ products: [makeProduct({ price: 100, stock: 10 })] });

    const result = await buildSaleFromRequest(
      { customerId: 1, items: [{ productId: 1, quantity: 1 }], paymentMethod: "Efectivo" },
      repos
    );

    expect(repos.productRepository.reserveStock).toHaveBeenCalledTimes(1);
    expect(repos.customerRepository.updateStats).toHaveBeenCalledTimes(1);
    expect(result.sale).toBeDefined();
    expect(result.timestamp).toEqual(expect.any(String));
  });

  it("NO aplica impacto en inventario ni estadísticas cuando status es 'Anulada'", async () => {
    const repos = makeRepos({ products: [makeProduct({ price: 100, stock: 10 })] });

    await buildSaleFromRequest(
      {
        customerId: 1,
        items: [{ productId: 1, quantity: 1 }],
        paymentMethod: "Efectivo",
        status: "Anulada",
      },
      repos
    );

    expect(repos.productRepository.reserveStock).not.toHaveBeenCalled();
    expect(repos.customerRepository.updateStats).not.toHaveBeenCalled();
  });

  it("usa 'Completada' como status por defecto cuando no se especifica", async () => {
    const repos = makeRepos({ products: [makeProduct({ price: 100, stock: 10 })] });

    await buildSaleFromRequest(
      { customerId: 1, items: [{ productId: 1, quantity: 1 }], paymentMethod: "Efectivo" },
      repos
    );

    const createdPayload = repos.saleRepository.create.mock.calls[0][0];
    expect(createdPayload.status).toBe("Completada");
  });
  // La reserva es la autoridad sobre el stock, no la lectura previa: si la base
  // de datos la rechaza (otra venta se llevo la unidad entre medio), la venta no
  // se registra.
  it("rechaza la venta cuando la reserva de stock no se puede hacer", async () => {
    const repos = makeRepos({
      products: [makeProduct({ price: 100, stock: 10 })],
      reserveResult: { ok: false, productId: 1, availableStock: 0, requestedQuantity: 1 },
    });

    const result = await buildSaleFromRequest(
      { customerId: 1, items: [{ productId: 1, quantity: 1 }], paymentMethod: "Efectivo" },
      repos
    );

    expect(result).toMatchObject({ code: "INSUFFICIENT_STOCK", status: 400 });
    expect(result.data).toMatchObject({ productId: 1, availableStock: 0, requestedQuantity: 1 });
    expect(repos.saleRepository.create).not.toHaveBeenCalled();
    expect(repos.customerRepository.updateStats).not.toHaveBeenCalled();
  });

  it("devuelve el stock reservado cuando falla el registro de la venta", async () => {
    const fallo = new Error("la base de datos rechazo el insert");
    const repos = makeRepos({
      products: [makeProduct({ price: 100, stock: 10 })],
      createThrows: fallo,
    });

    await expect(
      buildSaleFromRequest(
        { customerId: 1, items: [{ productId: 1, quantity: 1 }], paymentMethod: "Efectivo" },
        repos
      )
    ).rejects.toThrow("la base de datos rechazo el insert");

    expect(repos.productRepository.releaseStock).toHaveBeenCalledTimes(1);
    expect(repos.productRepository.releaseStock).toHaveBeenCalledWith([
      expect.objectContaining({ productId: 1, quantity: 1 }),
    ]);
    expect(repos.customerRepository.updateStats).not.toHaveBeenCalled();
  });

  it("no reserva ni devuelve stock cuando la venta nace anulada", async () => {
    const repos = makeRepos({ products: [makeProduct({ price: 100, stock: 10 })] });

    await buildSaleFromRequest(
      {
        customerId: 1,
        items: [{ productId: 1, quantity: 1 }],
        paymentMethod: "Efectivo",
        status: "Anulada",
      },
      repos
    );

    expect(repos.productRepository.reserveStock).not.toHaveBeenCalled();
    expect(repos.productRepository.releaseStock).not.toHaveBeenCalled();
  });
});

describe("salesService.cancelSaleById", () => {
  const ventaRegistrada = {
    id: 7,
    customerId: 1,
    total: 113,
    status: "Completada",
    items: [{ productId: 1, quantity: 2 }],
    updatedAt: "2026-10-02T10:00:00.000Z",
  };

  const makeCancelRepos = ({ sale = ventaRegistrada, cancelResult = sale } = {}) => ({
    productRepository: { releaseStock: jest.fn(() => Promise.resolve()) },
    customerRepository: { updateStats: jest.fn(() => Promise.resolve()) },
    saleRepository: {
      findById: jest.fn(() => Promise.resolve(sale)),
      cancel: jest.fn(() => Promise.resolve(cancelResult)),
    },
  });

  it("devuelve el stock y descuenta la compra del cliente", async () => {
    const repos = makeCancelRepos();

    const result = await cancelSaleById(7, repos);

    expect(result.sale).toBe(ventaRegistrada);
    expect(repos.productRepository.releaseStock).toHaveBeenCalledWith([
      { productId: 1, quantity: 2 },
    ]);
    expect(repos.customerRepository.updateStats).toHaveBeenCalledWith(1, {
      totalSpentDelta: -113,
      purchasesDelta: -1,
    });
  });

  it("retorna SALE_NOT_FOUND cuando la venta no existe", async () => {
    const repos = makeCancelRepos({ sale: null });

    const result = await cancelSaleById(999, repos);

    expect(result).toMatchObject({ code: "SALE_NOT_FOUND", status: 404 });
    expect(repos.saleRepository.cancel).not.toHaveBeenCalled();
    expect(repos.productRepository.releaseStock).not.toHaveBeenCalled();
  });

  // Si la venta ya estaba anulada, cancel() resuelve null: devolver el stock otra
  // vez inflaria el inventario.
  it("no devuelve el stock dos veces si la venta ya estaba anulada", async () => {
    const repos = makeCancelRepos({ cancelResult: null });

    const result = await cancelSaleById(7, repos);

    expect(result).toMatchObject({ code: "SALE_ALREADY_CANCELED", status: 409 });
    expect(repos.productRepository.releaseStock).not.toHaveBeenCalled();
    expect(repos.customerRepository.updateStats).not.toHaveBeenCalled();
  });

  it("tolera una venta sin lineas registradas", async () => {
    const sinItems = { ...ventaRegistrada, items: undefined };
    const repos = makeCancelRepos({ sale: sinItems, cancelResult: sinItems });

    await cancelSaleById(7, repos);

    expect(repos.productRepository.releaseStock).toHaveBeenCalledWith([]);
  });
});
