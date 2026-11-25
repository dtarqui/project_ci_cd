/**
 * Cobertura de las implementaciones Database*Repository (modo REPOSITORY_MODE=database),
 * mockeando @prisma/client para no requerir una base de datos real.
 */

const mockPrisma = {
  customer: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
  product: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
  sale: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  $queryRaw: jest.fn(),
  $transaction: jest.fn(),
};

jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

const { DatabaseCustomerRepository } = require("../src/repositories/customerRepository");
const { DatabaseProductRepository } = require("../src/repositories/productRepository");
const { DatabaseSaleRepository } = require("../src/repositories/saleRepository");
const { DatabaseUserRepository } = require("../src/repositories/userRepository");
const { DatabaseDashboardRepository } = require("../src/repositories/dashboardRepository");

const notFoundError = () => Object.assign(new Error("Not found"), { code: "P2025" });
const otherPrismaError = () => Object.assign(new Error("Connection lost"), { code: "P1001" });

describe("DatabaseCustomerRepository", () => {
  let repo;

  beforeEach(() => {
    repo = new DatabaseCustomerRepository();
  });

  it("list() excluye los borrados y ordena por id", async () => {
    mockPrisma.customer.findMany.mockResolvedValue([{ id: 1 }]);
    const result = await repo.list();

    expect(mockPrisma.customer.findMany).toHaveBeenCalledWith({
      where: { deletedAt: null },
      orderBy: { id: "asc" },
    });
    expect(result).toEqual([{ id: 1 }]);
  });

  it("findById() no encuentra a un cliente borrado", async () => {
    mockPrisma.customer.findFirst.mockResolvedValue({ id: 5 });
    const result = await repo.findById(5);

    expect(mockPrisma.customer.findFirst).toHaveBeenCalledWith({
      where: { id: 5, deletedAt: null },
    });
    expect(result).toEqual({ id: 5 });
  });

  it("findByIdIncludingDeleted() si resuelve a un cliente borrado", async () => {
    mockPrisma.customer.findUnique.mockResolvedValue({ id: 5, deletedAt: new Date() });
    const result = await repo.findByIdIncludingDeleted(5);

    expect(mockPrisma.customer.findUnique).toHaveBeenCalledWith({ where: { id: 5 } });
    expect(result.id).toBe(5);
  });

  it("create() aplica defaults (address/city/postalCode vacíos, status Activo, totalSpent 0)", async () => {
    mockPrisma.customer.create.mockResolvedValue({ id: 1 });
    await repo.create({ name: "Ana", email: "ana@test.com", phone: "123" });

    const callArg = mockPrisma.customer.create.mock.calls[0][0];
    expect(callArg.data.address).toBe("");
    expect(callArg.data.city).toBe("");
    expect(callArg.data.postalCode).toBe("");
    expect(callArg.data.status).toBe("Activo");
    expect(callArg.data.totalSpent).toBe(0);
    expect(callArg.data.purchases).toBe(0);
  });

  it("update() solo incluye campos definidos en el payload", async () => {
    mockPrisma.customer.update.mockResolvedValue({ id: 1, name: "Nuevo" });
    await repo.update(1, { name: "Nuevo" });

    const callArg = mockPrisma.customer.update.mock.calls[0][0];
    expect(callArg.data).toEqual({ name: "Nuevo" });
  });

  it("update() retorna null cuando prisma lanza error de registro no encontrado (P2025)", async () => {
    mockPrisma.customer.update.mockRejectedValue(notFoundError());
    const result = await repo.update(999, { name: "X" });
    expect(result).toBeNull();
  });

  it("update() relanza errores que no son de registro no encontrado", async () => {
    mockPrisma.customer.update.mockRejectedValue(otherPrismaError());
    await expect(repo.update(1, { name: "X" })).rejects.toThrow("Connection lost");
  });

  it("delete() marca deletedAt en vez de destruir la fila", async () => {
    mockPrisma.customer.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.customer.findUnique.mockResolvedValue({ id: 1, deletedAt: new Date() });

    const result = await repo.delete(1);

    const callArg = mockPrisma.customer.updateMany.mock.calls[0][0];
    expect(callArg.where).toEqual({ id: 1, deletedAt: null });
    expect(callArg.data.deletedAt).toBeInstanceOf(Date);
    // La fila se conserva: es lo que permite que las ventas sigan resolviendola.
    expect(mockPrisma.customer.delete).not.toHaveBeenCalled();
    expect(result.id).toBe(1);
  });

  it("delete() retorna null cuando el cliente no existe", async () => {
    mockPrisma.customer.updateMany.mockResolvedValue({ count: 0 });
    const result = await repo.delete(999);
    expect(result).toBeNull();
    expect(mockPrisma.customer.findUnique).not.toHaveBeenCalled();
  });

  it("delete() retorna null si el cliente ya estaba borrado", async () => {
    // El filtro deletedAt: null hace que el segundo intento no afecte filas.
    mockPrisma.customer.updateMany.mockResolvedValue({ count: 0 });
    const result = await repo.delete(1);
    expect(result).toBeNull();
  });

  it("updateStats() retorna null cuando el cliente no existe", async () => {
    mockPrisma.customer.findFirst.mockResolvedValue(null);
    const result = await repo.updateStats(999, { totalSpentDelta: 10 });
    expect(result).toBeNull();
  });

  it("updateStats() acumula totalSpent y purchases sin bajar de 0", async () => {
    mockPrisma.customer.findFirst.mockResolvedValue({ id: 1, totalSpent: 100, purchases: 2 });
    mockPrisma.customer.update.mockResolvedValue({ id: 1, totalSpent: 150, purchases: 1 });

    await repo.updateStats(1, { totalSpentDelta: 50, purchasesDelta: -1, lastPurchase: "2026-01-01" });

    const callArg = mockPrisma.customer.update.mock.calls[0][0];
    expect(callArg.data.totalSpent).toBe(150);
    expect(callArg.data.purchases).toBe(1);
    expect(callArg.data.lastPurchase).toBe("2026-01-01");
  });
});

describe("DatabaseProductRepository", () => {
  let repo;

  beforeEach(() => {
    repo = new DatabaseProductRepository();
  });

  it("list() excluye los borrados y ordena por id", async () => {
    mockPrisma.product.findMany.mockResolvedValue([{ id: 1 }]);
    const result = await repo.list();

    expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
      where: { deletedAt: null },
      orderBy: { id: "asc" },
    });
    expect(result).toEqual([{ id: 1 }]);
  });

  it("findById() no encuentra un producto borrado", async () => {
    mockPrisma.product.findFirst.mockResolvedValue({ id: 2 });
    const result = await repo.findById(2);
    expect(mockPrisma.product.findFirst).toHaveBeenCalledWith({
      where: { id: 2, deletedAt: null },
    });
    expect(result).toEqual({ id: 2 });
  });

  it("findByIdIncludingDeleted() si resuelve un producto borrado", async () => {
    mockPrisma.product.findUnique.mockResolvedValue({ id: 2, deletedAt: new Date() });
    const result = await repo.findByIdIncludingDeleted(2);
    expect(mockPrisma.product.findUnique).toHaveBeenCalledWith({ where: { id: 2 } });
    expect(result.id).toBe(2);
  });

  it("findManyByIds() excluye los borrados, para no venderlos", async () => {
    mockPrisma.product.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    await repo.findManyByIds([1, 2]);
    expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
      where: { id: { in: [1, 2] }, deletedAt: null },
    });
  });

  it("create() calcula status a partir del stock", async () => {
    mockPrisma.product.create.mockResolvedValue({ id: 1 });
    await repo.create({ name: "Mouse", category: "Accesorios", price: "20", stock: "0" });

    const callArg = mockPrisma.product.create.mock.calls[0][0];
    expect(callArg.data.stock).toBe(0);
    expect(callArg.data.status).toBe("Sin Stock");
  });

  it("update() recalcula status solo cuando cambia stock", async () => {
    mockPrisma.product.update.mockResolvedValue({ id: 1 });
    await repo.update(1, { stock: 25 });

    const callArg = mockPrisma.product.update.mock.calls[0][0];
    expect(callArg.data.stock).toBe(25);
    expect(callArg.data.status).toBe("En Stock");
  });

  it("update() retorna null en error de registro no encontrado", async () => {
    mockPrisma.product.update.mockRejectedValue(notFoundError());
    const result = await repo.update(999, { price: 10 });
    expect(result).toBeNull();
  });

  it("delete() marca deletedAt en vez de destruir la fila", async () => {
    mockPrisma.product.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.product.findUnique.mockResolvedValue({ id: 1, deletedAt: new Date() });

    const result = await repo.delete(1);

    expect(mockPrisma.product.updateMany.mock.calls[0][0].where).toEqual({
      id: 1,
      deletedAt: null,
    });
    expect(mockPrisma.product.delete).not.toHaveBeenCalled();
    expect(result.id).toBe(1);
  });

  it("delete() relanza los errores de infraestructura", async () => {
    mockPrisma.product.updateMany.mockRejectedValue(otherPrismaError());
    await expect(repo.delete(1)).rejects.toThrow("Connection lost");
  });

  it("reserveStock() descuenta con un UPDATE condicional por stock disponible", async () => {
    // Lo que hace atomica la reserva es que la condicion viaje en el propio
    // UPDATE: si se leyera el stock aparte, dos ventas simultaneas de la ultima
    // unidad pasarian las dos.
    mockPrisma.product.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.product.findUnique.mockResolvedValue({ id: 1, stock: 3, status: "Disponible" });

    const resultado = await repo.reserveStock([{ productId: 1, quantity: 2 }], "2026-01-01");

    expect(resultado).toEqual({ ok: true });
    const arg = mockPrisma.product.updateMany.mock.calls[0][0];
    expect(arg.where).toEqual({ id: 1, deletedAt: null, stock: { gte: 2 } });
    expect(arg.data.stock).toEqual({ decrement: 2 });
    expect(arg.data.sales).toEqual({ increment: 2 });
    expect(arg.data.lastSale).toBe("2026-01-01");
  });

  it("reserveStock() rechaza sin tocar nada cuando el stock no alcanza", async () => {
    // count 0 significa que ninguna fila cumplio la condicion.
    mockPrisma.product.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.product.findFirst.mockResolvedValue({ id: 1, stock: 1 });

    const resultado = await repo.reserveStock([{ productId: 1, quantity: 5 }], "2026-01-01");

    expect(resultado).toEqual({
      ok: false,
      productId: 1,
      availableStock: 1,
      requestedQuantity: 5,
    });
  });

  it("reserveStock() devuelve las lineas ya reservadas si una posterior no alcanza", async () => {
    mockPrisma.product.updateMany
      .mockResolvedValueOnce({ count: 1 }) // la primera linea se reserva
      .mockResolvedValueOnce({ count: 0 }) // la segunda no alcanza
      .mockResolvedValue({ count: 1 }); // la devolucion de la primera
    mockPrisma.product.findUnique.mockResolvedValue({ id: 1, stock: 1, status: "Stock Bajo" });
    mockPrisma.product.findFirst.mockResolvedValue({ id: 2, stock: 0 });

    const resultado = await repo.reserveStock(
      [{ productId: 1, quantity: 1 }, { productId: 2, quantity: 1 }],
      "2026-01-01"
    );

    expect(resultado.ok).toBe(false);
    expect(resultado.productId).toBe(2);
    // La devolucion de la linea 1: incrementa en lugar de decrementar.
    const devolucion = mockPrisma.product.updateMany.mock.calls.find(
      (c) => c[0].data.stock && c[0].data.stock.increment === 1
    );
    expect(devolucion).toBeDefined();
    expect(devolucion[0].where).toEqual({ id: 1 });
  });

  it("releaseStock() repone el stock incluso de productos dados de baja", async () => {
    // Sin deletedAt en el where: si el producto se borro entre la reserva y la
    // devolucion, la cifra tiene que volver a cuadrar igual.
    mockPrisma.product.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.product.findUnique.mockResolvedValue({ id: 1, stock: 4, status: "Disponible" });

    await repo.releaseStock([{ productId: 1, quantity: 3 }]);

    const arg = mockPrisma.product.updateMany.mock.calls[0][0];
    expect(arg.where).toEqual({ id: 1 });
    expect(arg.data.stock).toEqual({ increment: 3 });
    expect(arg.data.sales).toEqual({ decrement: 3 });
  });

  it("refreshStatus() solo escribe cuando el status derivado cambio", async () => {
    mockPrisma.product.findUnique.mockResolvedValue({ id: 1, stock: 0, status: "Disponible" });
    await repo.refreshStatus(1);
    expect(mockPrisma.product.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: "Sin Stock" },
    });

    mockPrisma.product.update.mockClear();
    mockPrisma.product.findUnique.mockResolvedValue({ id: 1, stock: 0, status: "Sin Stock" });
    await repo.refreshStatus(1);
    expect(mockPrisma.product.update).not.toHaveBeenCalled();
  });

  it("refreshStatus() no falla si el producto ya no existe", async () => {
    mockPrisma.product.findUnique.mockResolvedValue(null);
    await repo.refreshStatus(999);
    expect(mockPrisma.product.update).not.toHaveBeenCalled();
  });
});

describe("DatabaseSaleRepository", () => {
  let repo;

  beforeEach(() => {
    repo = new DatabaseSaleRepository();
  });

  const dbSale = {
    id: 1,
    customerId: 1,
    customerName: "Cliente",
    subtotal: 100,
    tax: 13,
    discount: 0,
    total: 113,
    status: "Completada",
    paymentMethod: "Efectivo",
    notes: "",
    items: [{ id: 1, saleId: 1, productId: 1, name: "Producto", quantity: 1, price: 100, total: 100 }],
  };

  it("list() aplana los items vía mapSaleFromDb", async () => {
    mockPrisma.sale.findMany.mockResolvedValue([dbSale]);
    const [sale] = await repo.list();

    expect(mockPrisma.sale.findMany).toHaveBeenCalledWith({
      include: { items: true },
      orderBy: { id: "asc" },
    });
    expect(sale.items).toEqual([{ productId: 1, name: "Producto", quantity: 1, price: 100, total: 100 }]);
    expect(sale.id).toBe(1);
  });

  it("findById() retorna null cuando prisma retorna null", async () => {
    mockPrisma.sale.findUnique.mockResolvedValue(null);
    const result = await repo.findById(999);
    expect(result).toBeNull();
  });

  it("create() construye los items anidados para prisma", async () => {
    mockPrisma.sale.create.mockResolvedValue(dbSale);
    await repo.create({
      customerId: 1,
      customerName: "Cliente",
      subtotal: 100,
      tax: 13,
      discount: 0,
      total: 113,
      status: "Completada",
      paymentMethod: "Efectivo",
      items: [{ productId: 1, name: "Producto", quantity: 1, price: 100, total: 100 }],
    });

    const callArg = mockPrisma.sale.create.mock.calls[0][0];
    expect(callArg.data.items.create).toEqual([
      { productId: 1, name: "Producto", quantity: 1, price: 100, total: 100 },
    ]);
  });

  it("update() retorna null en error de registro no encontrado", async () => {
    mockPrisma.sale.update.mockRejectedValue(notFoundError());
    const result = await repo.update(999, { status: "Anulada" });
    expect(result).toBeNull();
  });

  it("update() relanza errores no relacionados a 'no encontrado'", async () => {
    mockPrisma.sale.update.mockRejectedValue(otherPrismaError());
    await expect(repo.update(1, { status: "Anulada" })).rejects.toThrow("Connection lost");
  });
  it("cancel() anula con un UPDATE condicionado al estado actual", async () => {
    // La condicion viaja en el UPDATE: dos anulaciones simultaneas no pueden
    // ganar las dos, y por tanto el stock no se devuelve dos veces.
    mockPrisma.sale.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.sale.findUnique.mockResolvedValue({ ...dbSale, status: "Anulada" });

    const result = await repo.cancel(1);

    expect(mockPrisma.sale.updateMany).toHaveBeenCalledWith({
      where: { id: 1, status: { not: "Anulada" } },
      data: { status: "Anulada" },
    });
    expect(result.status).toBe("Anulada");
  });

  it("cancel() retorna null si la venta no existe o ya estaba anulada", async () => {
    mockPrisma.sale.updateMany.mockResolvedValue({ count: 0 });

    const result = await repo.cancel(1);

    expect(result).toBeNull();
    expect(mockPrisma.sale.findUnique).not.toHaveBeenCalled();
  });
});

describe("DatabaseUserRepository", () => {
  let repo;

  beforeEach(() => {
    repo = new DatabaseUserRepository();
  });

  it("findByUsername() usa comparación case-insensitive", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ id: 1, username: "admin" });
    await repo.findByUsername("Admin");

    expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
      where: { username: { equals: "Admin", mode: "insensitive" } },
    });
  });

  it("findByEmail() retorna null sin consultar prisma cuando email es falsy", async () => {
    const result = await repo.findByEmail(null);
    expect(result).toBeNull();
    expect(mockPrisma.user.findFirst).not.toHaveBeenCalled();
  });

  it("findByCredentials() retorna null si el usuario no existe", async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);
    const result = await repo.findByCredentials("ghost", "whatever");
    expect(result).toBeNull();
  });

  it("findByCredentials() retorna null si la contraseña no coincide", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ id: 1, username: "admin", passwordHash: "plainpass" });
    const result = await repo.findByCredentials("admin", "wrongpass");
    expect(result).toBeNull();
  });

  it("findByCredentials() rechaza una contraseña guardada en texto plano aunque coincida", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ id: 1, username: "admin", passwordHash: "plainpass" });
    const result = await repo.findByCredentials("admin", "plainpass");
    expect(result).toBeNull();
  });

  it("findByCredentials() retorna el usuario si la contraseña coincide con su hash scrypt", async () => {
    const { hashPassword } = require("../src/repositories/userRepository");
    const passwordHash = hashPassword("Clave-de-prueba-1");
    mockPrisma.user.findFirst.mockResolvedValue({ id: 1, username: "admin", passwordHash });
    const result = await repo.findByCredentials("admin", "Clave-de-prueba-1");
    expect(result).toEqual({ id: 1, username: "admin", passwordHash });
  });

  it("createUser() normaliza el payload y genera passwordHash", async () => {
    mockPrisma.user.create.mockResolvedValue({ id: 1 });
    await repo.createUser({
      username: "  jdoe  ",
      email: "JDoe@Email.com",
      password: "Secret123",
      name: "John Doe",
    });

    const callArg = mockPrisma.user.create.mock.calls[0][0];
    expect(callArg.data.username).toBe("jdoe");
    expect(callArg.data.email).toBe("jdoe@email.com");
    expect(callArg.data.passwordHash).toEqual(expect.any(String));
    expect(callArg.data.role).toBe("vendedor");
  });

  it("updateUser() reemplaza password por passwordHash y no filtra password en claro", async () => {
    mockPrisma.user.update.mockResolvedValue({ id: 1 });
    await repo.updateUser(1, { password: "NewSecret1" });

    const callArg = mockPrisma.user.update.mock.calls[0][0];
    expect(callArg.data.password).toBeUndefined();
    expect(callArg.data.passwordHash).toEqual(expect.any(String));
  });

  it("updateUser() retorna null en error de registro no encontrado", async () => {
    mockPrisma.user.update.mockRejectedValue(notFoundError());
    const result = await repo.updateUser(999, { name: "X" });
    expect(result).toBeNull();
  });

  it("deleteUser() retorna null en error de registro no encontrado", async () => {
    mockPrisma.user.delete.mockRejectedValue(notFoundError());
    const result = await repo.deleteUser(999);
    expect(result).toBeNull();
  });

  it("sanitizeUser() remueve password y passwordHash", () => {
    const sanitized = repo.sanitizeUser({ id: 1, username: "admin", password: "x", passwordHash: "y" });
    expect(sanitized).not.toHaveProperty("password");
    expect(sanitized).not.toHaveProperty("passwordHash");
    expect(sanitized).toHaveProperty("id");
  });
});

describe("DatabaseDashboardRepository", () => {
  // Respuestas de las tres consultas de agregacion, en el orden de getAggregates.
  const filas = () => [
    [
      { dia: "2026-11-16", city: null, orders: 2, revenue: 400, primera: 1, porCiudad: 0 },
      { dia: "2026-11-17", city: null, orders: 2, revenue: 600, primera: 3, porCiudad: 0 },
      { dia: null, city: "La Paz", orders: 2, revenue: 750, primera: 1, porCiudad: 1 },
      { dia: null, city: "General", orders: 1, revenue: 200, primera: 4, porCiudad: 1 },
      { dia: null, city: "Sucursal La Paz", orders: 1, revenue: 50, primera: 2, porCiudad: 1 },
    ],
    [
      { dia: "2026-11-16", quantity: 6, porProducto: 0 },
      { dia: "2026-11-17", quantity: 3, porProducto: 0 },
      {
        productId: 1, dia: null, quantity: 6, revenue: 300, primera: 1, name: "Cuaderno", category: "Papeleria",
        quantityCompletada: 6, revenueCompletada: 300, primeraCompletada: 1, nameCompletada: "Cuaderno", porProducto: 1,
      },
      {
        productId: 2, dia: null, quantity: 3, revenue: 700, primera: 2, name: "Lapiz", category: null,
        quantityCompletada: 3, revenueCompletada: 700, primeraCompletada: 2, nameCompletada: "Lapiz", porProducto: 1,
      },
      {
        productId: 3, dia: null, quantity: null, revenue: null, primera: null, name: null, category: "Hogar",
        quantityCompletada: null, revenueCompletada: null, primeraCompletada: null, nameCompletada: null, porProducto: 1,
      },
    ],
    [
      {
        activeCustomers: 3,
        vipCount: 1,
        vipRevenue: 3200,
        frecuenteCount: 0,
        frecuenteRevenue: 0,
        regularCount: 1,
        regularRevenue: 600.556,
        nuevoCount: 2,
        nuevoRevenue: 40,
      },
    ],
  ];

  const prepararMocks = () => {
    filas().forEach((resultado) => mockPrisma.$queryRaw.mockReturnValueOnce(resultado));
    mockPrisma.$transaction.mockImplementation(async (consultas) => consultas);
  };

  it("getAggregates() lanza tres consultas en una transaccion de lectura repetible", async () => {
    prepararMocks();

    const result = await new DatabaseDashboardRepository().getAggregates(new Date("2026-11-17T12:00:00Z"));

    expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(3);
    expect(mockPrisma.$transaction).toHaveBeenCalledWith(expect.any(Array), { isolationLevel: "RepeatableRead" });
    expect(result.todayKey).toBe("2026-11-17");
    expect(result.salesByDay.map((d) => d.dia)).toEqual(["2026-11-16", "2026-11-17"]);
    expect(result.salesByCity.map((c) => c.city)).toEqual(["La Paz", "General", "Sucursal La Paz"]);
    expect(result.itemsByProduct).toHaveLength(3);
    expect(result.customers.segments.map((s) => s.segment)).toEqual(["VIP", "Frecuente", "Regular", "Nuevo"]);
  });

  it("getDashboardData() compone el tablero a partir de los agregados", async () => {
    prepararMocks();
    jest.useFakeTimers().setSystemTime(new Date("2026-11-17T12:00:00Z"));

    let data;
    try {
      data = await new DatabaseDashboardRepository().getDashboardData();
    } finally {
      jest.useRealTimers();
    }

    expect(data.totalOrders).toBe(4);
    expect(data.averageTicket).toBe("250.00");
    expect(data.dailySales).toBe("600.00 Bs.");
    expect(data.salesTrend).toEqual([
      { day: "Lun", sales: 6, revenue: 400, orders: 2 },
      { day: "Mar", sales: 3, revenue: 600, orders: 2 },
    ]);
    expect(data.monthlySales).toEqual([{ month: "Nov", sales: 9, revenue: 1000 }]);
    // "La Paz" y "Sucursal La Paz" son la misma sucursal; el orden de aparicion decide los empates.
    expect(data.branchSales).toEqual([
      { name: "Sucursal La Paz", revenue: 800, value: 80 },
      { name: "Sucursal General", revenue: 200, value: 20 },
    ]);
    expect(data.productSales).toEqual([
      { product: "Cuaderno", quantity: 6, revenue: 300 },
      { product: "Lapiz", quantity: 3, revenue: 700 },
    ]);
    expect(data.categoryDistribution).toEqual([
      { name: "Papeleria", items: 6, value: 67 },
      { name: "Otros", items: 3, value: 33 },
    ]);
    expect(data.customerSegments[2]).toEqual({ segment: "Regular", count: 1, revenue: 600.56 });
    expect(data.topProducts.map((p) => p.name)).toEqual(["Lapiz", "Cuaderno"]);
    expect(data).not.toHaveProperty("sales");
  });

  it("getDashboardData() sin ventas devuelve ceros y series vacias", async () => {
    mockPrisma.$queryRaw
      .mockReturnValueOnce([])
      .mockReturnValueOnce([])
      .mockReturnValueOnce([
        {
          activeCustomers: 0, vipCount: 0, vipRevenue: 0, frecuenteCount: 0, frecuenteRevenue: 0,
          regularCount: 0, regularRevenue: 0, nuevoCount: 0, nuevoRevenue: 0,
        },
      ]);
    mockPrisma.$transaction.mockImplementation(async (consultas) => consultas);

    const data = await new DatabaseDashboardRepository().getDashboardData();

    expect(data.totalOrders).toBe(0);
    expect(data.averageTicket).toBe("0.00");
    expect(data.dailySales).toBe("0.00 Bs.");
    expect(data.salesTrend).toEqual([]);
    expect(data.topProducts).toEqual([]);
  });
});
