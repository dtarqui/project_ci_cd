const { buildSaleFromRequest } = require("../src/services/salesService");

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

const makeRepos = ({ products = [], customer = makeCustomer(), createResult } = {}) => {
  const productRepository = {
    findById: jest.fn((id) => Promise.resolve(products.find((p) => p.id === id) || null)),
    applySaleImpact: jest.fn(() => Promise.resolve()),
  };

  const customerRepository = {
    findById: jest.fn((id) => Promise.resolve(id === customer?.id ? customer : null)),
    updateStats: jest.fn(() => Promise.resolve()),
  };

  const saleRepository = {
    create: jest.fn((payload) =>
      Promise.resolve(createResult || { id: 1, ...payload })
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

  it("calcula subtotal, impuesto (13%) y total correctamente sin descuento", async () => {
    const repos = makeRepos({ products: [makeProduct({ price: 100, stock: 10 })] });

    const result = await buildSaleFromRequest(
      { customerId: 1, items: [{ productId: 1, quantity: 2 }], paymentMethod: "Efectivo" },
      repos
    );

    expect(result.error).toBeUndefined();
    const createdPayload = repos.saleRepository.create.mock.calls[0][0];
    expect(createdPayload.subtotal).toBe(200);
    expect(createdPayload.tax).toBe(26);
    expect(createdPayload.total).toBe(226);
  });

  it("aplica el descuento antes de calcular el total final", async () => {
    const repos = makeRepos({ products: [makeProduct({ price: 100, stock: 10 })] });

    await buildSaleFromRequest(
      { customerId: 1, items: [{ productId: 1, quantity: 1 }], discount: 50, paymentMethod: "Efectivo" },
      repos
    );

    const createdPayload = repos.saleRepository.create.mock.calls[0][0];
    // subtotal 100 + tax 13 - discount 50 = 63
    expect(createdPayload.total).toBe(63);
  });

  it("clampea el total a 0 cuando el descuento supera subtotal + impuesto", async () => {
    const repos = makeRepos({ products: [makeProduct({ price: 10, stock: 10 })] });

    await buildSaleFromRequest(
      { customerId: 1, items: [{ productId: 1, quantity: 1 }], discount: 999, paymentMethod: "Efectivo" },
      repos
    );

    const createdPayload = repos.saleRepository.create.mock.calls[0][0];
    expect(createdPayload.total).toBe(0);
  });

  it("aplica impacto en inventario y estadísticas del cliente para ventas activas", async () => {
    const repos = makeRepos({ products: [makeProduct({ price: 100, stock: 10 })] });

    const result = await buildSaleFromRequest(
      { customerId: 1, items: [{ productId: 1, quantity: 1 }], paymentMethod: "Efectivo" },
      repos
    );

    expect(repos.productRepository.applySaleImpact).toHaveBeenCalledTimes(1);
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

    expect(repos.productRepository.applySaleImpact).not.toHaveBeenCalled();
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
});
