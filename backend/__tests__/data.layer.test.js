/**
 * Capa de datos: limite de conexiones en serverless, unidad de trabajo
 * (transacciones), paginacion en la base de datos y clave de idempotencia.
 * Prisma se simula: no hace falta una base real.
 */

const mockTx = { marker: "tx" };
const mockPrisma = {
  $transaction: jest.fn((fn) => fn(mockTx)),
  product: { count: jest.fn(), findMany: jest.fn() },
  customer: { count: jest.fn(), findMany: jest.fn() },
  sale: { count: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn() },
};

jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

const { buildDatasourceUrl, isUniqueViolationError } = require("../src/db/prismaClient");
const { pageFromDb } = require("../src/utils/queryHelpers");
const {
  productQuery,
  customerQuery,
  saleQuery,
  filterSortProducts,
  filterSortCustomers,
  filterSortSales,
} = require("../src/utils/listQueries");
const { DatabaseProductRepository } = require("../src/repositories/productRepository");
const { DatabaseCustomerRepository } = require("../src/repositories/customerRepository");
const {
  DatabaseSaleRepository,
  InMemorySaleRepository,
  mapSaleFromDb,
} = require("../src/repositories/saleRepository");
const { resetDataStore } = require("../src/db/dataStore");

beforeEach(() => {
  jest.clearAllMocks();
});

describe("buildDatasourceUrl", () => {
  const url = "postgresql://u:p@host.example:5432/postgres";

  it("no cambia nada fuera de un entorno serverless", () => {
    expect(buildDatasourceUrl(url, {})).toBe(url);
  });

  it("devuelve undefined si no hay cadena de conexion", () => {
    expect(buildDatasourceUrl(undefined, { VERCEL: "1" })).toBeUndefined();
  });

  it("en Vercel limita a una conexion por instancia", () => {
    const result = new URL(buildDatasourceUrl(url, { VERCEL: "1" }));
    expect(result.searchParams.get("connection_limit")).toBe("1");
    expect(result.host).toBe("host.example:5432");
  });

  it("respeta DB_CONNECTION_LIMIT", () => {
    const result = new URL(buildDatasourceUrl(url, { DB_CONNECTION_LIMIT: "3" }));
    expect(result.searchParams.get("connection_limit")).toBe("3");
  });

  it("no pisa un connection_limit que ya trae la cadena", () => {
    const withLimit = `${url}?connection_limit=5&pgbouncer=true`;
    const result = new URL(buildDatasourceUrl(withLimit, { VERCEL: "1" }));
    expect(result.searchParams.get("connection_limit")).toBe("5");
    expect(result.searchParams.get("pgbouncer")).toBe("true");
  });

  it("devuelve la cadena tal cual si no es una URL valida", () => {
    expect(buildDatasourceUrl("no es una url", { VERCEL: "1" })).toBe("no es una url");
  });
});

describe("getPrismaClient", () => {
  it("pasa la cadena ajustada al cliente cuando hay DATABASE_URL", () => {
    jest.isolateModules(() => {
      const previous = { url: process.env.DATABASE_URL, vercel: process.env.VERCEL };
      process.env.DATABASE_URL = "postgresql://u:p@host.example:5432/postgres";
      process.env.VERCEL = "1";
      try {
        const { PrismaClient } = require("@prisma/client");
        const { getPrismaClient } = require("../src/db/prismaClient");
        getPrismaClient();
        getPrismaClient();
        expect(PrismaClient).toHaveBeenCalledTimes(1);
        const [options] = PrismaClient.mock.calls[0];
        expect(options.datasources.db.url).toContain("connection_limit=1");
      } finally {
        if (previous.url === undefined) delete process.env.DATABASE_URL;
        else process.env.DATABASE_URL = previous.url;
        if (previous.vercel === undefined) delete process.env.VERCEL;
        else process.env.VERCEL = previous.vercel;
      }
    });
  });

  it("crea el cliente sin opciones cuando no hay DATABASE_URL", () => {
    jest.isolateModules(() => {
      const previous = process.env.DATABASE_URL;
      delete process.env.DATABASE_URL;
      try {
        const { PrismaClient } = require("@prisma/client");
        const { getPrismaClient } = require("../src/db/prismaClient");
        getPrismaClient();
        expect(PrismaClient).toHaveBeenLastCalledWith();
      } finally {
        if (previous !== undefined) process.env.DATABASE_URL = previous;
      }
    });
  });

  it("reconoce la violacion de unicidad de Prisma", () => {
    expect(isUniqueViolationError({ code: "P2002" })).toBe(true);
    expect(isUniqueViolationError({ code: "P2025" })).toBe(false);
    expect(isUniqueViolationError(null)).toBe(false);
  });
});

describe("runInTransaction", () => {
  const withMode = (mode, fn) => {
    const previous = process.env.REPOSITORY_MODE;
    process.env.REPOSITORY_MODE = mode;
    return Promise.resolve(fn()).finally(() => {
      if (previous === undefined) delete process.env.REPOSITORY_MODE;
      else process.env.REPOSITORY_MODE = previous;
    });
  };

  it("en modo database abre una transaccion y entrega repositorios ligados a ella", () =>
    withMode("database", async () => {
      mockPrisma.$transaction.mockImplementation((fn) => fn(mockTx));
      const { runInTransaction, TRANSACTION_OPTIONS } = require("../src/repositories/unitOfWork");
      const result = await runInTransaction(async (repos) => {
        expect(repos.productRepository).toBeInstanceOf(DatabaseProductRepository);
        expect(repos.customerRepository).toBeInstanceOf(DatabaseCustomerRepository);
        expect(repos.saleRepository).toBeInstanceOf(DatabaseSaleRepository);
        expect(repos.productRepository.db()).toBe(mockTx);
        expect(repos.saleRepository.db()).toBe(mockTx);
        return "hecho";
      });

      expect(result).toBe("hecho");
      expect(mockPrisma.$transaction).toHaveBeenCalledWith(expect.any(Function), TRANSACTION_OPTIONS);
    }));

  it("en modo memoria ejecuta la funcion sin transaccion", () =>
    withMode("memory", async () => {
      const { runInTransaction } = require("../src/repositories/unitOfWork");
      const result = await runInTransaction(async (repos) => {
        expect(typeof repos.productRepository.reserveStock).toBe("function");
        expect(typeof repos.saleRepository.create).toBe("function");
        return 7;
      });

      expect(result).toBe(7);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    }));

  it("un repositorio sin transaccion usa el cliente compartido", () => {
    expect(new DatabaseProductRepository().db()).toBe(mockPrisma);
  });
});

describe("pageFromDb", () => {
  it("cuenta, recorta la pagina y aplica el mapeo", async () => {
    const delegate = {
      count: jest.fn().mockResolvedValue(25),
      findMany: jest.fn().mockResolvedValue([{ id: 11 }, { id: 12 }]),
    };

    const result = await pageFromDb(
      delegate,
      { where: { a: 1 }, orderBy: [{ id: "asc" }], include: { items: true } },
      { page: 2, pageSize: 10 },
      (row) => ({ ...row, mapped: true })
    );

    expect(delegate.count).toHaveBeenCalledWith({ where: { a: 1 } });
    expect(delegate.findMany).toHaveBeenCalledWith({
      where: { a: 1 },
      orderBy: [{ id: "asc" }],
      skip: 10,
      take: 10,
      include: { items: true },
    });
    expect(result).toEqual({
      data: [{ id: 11, mapped: true }, { id: 12, mapped: true }],
      page: 2,
      pageSize: 10,
      total: 25,
      totalPages: 3,
    });
  });

  it("lleva una pagina fuera de rango a la ultima y no incluye include si no se pide", async () => {
    const delegate = { count: jest.fn().mockResolvedValue(3), findMany: jest.fn().mockResolvedValue([]) };

    const result = await pageFromDb(delegate, { where: {}, orderBy: [] }, { page: 9, pageSize: 2 });

    expect(delegate.findMany).toHaveBeenCalledWith({ where: {}, orderBy: [], skip: 2, take: 2 });
    expect(result.page).toBe(2);
    expect(result.totalPages).toBe(2);
  });

  it("con cero filas devuelve la pagina 1", async () => {
    const delegate = { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) };
    const result = await pageFromDb(delegate, { where: {}, orderBy: [] }, { page: 3, pageSize: 10 });
    expect(result).toMatchObject({ page: 1, totalPages: 1, total: 0, data: [] });
  });
});

describe("consultas de listados para Prisma", () => {
  it("productos: busqueda, categoria y orden con desempate por id", () => {
    expect(productQuery({ search: "lap", category: "Elec", sort: "price" })).toEqual({
      where: {
        deletedAt: null,
        name: { contains: "lap", mode: "insensitive" },
        category: { contains: "Elec", mode: "insensitive" },
      },
      orderBy: [{ price: "asc" }, { id: "asc" }],
    });
    expect(productQuery({ sort: "stock" }).orderBy[0]).toEqual({ stock: "desc" });
    expect(productQuery({ sort: "sales" }).orderBy[0]).toEqual({ sales: "desc" });
    expect(productQuery({ sort: "otro" }).orderBy[0]).toEqual({ name: "asc" });
    expect(productQuery().where).toEqual({ deletedAt: null });
  });

  it("clientes: busqueda en nombre, email y telefono, y estado exacto", () => {
    const query = customerQuery({ search: "ana", status: "activo", sort: "spending" });
    expect(query.where.OR).toHaveLength(3);
    expect(query.where.status).toEqual({ equals: "activo", mode: "insensitive" });
    expect(query.orderBy[0]).toEqual({ totalSpent: "desc" });
    expect(customerQuery({ sort: "email" }).orderBy[0]).toEqual({ email: "asc" });
    expect(customerQuery({ sort: "purchases" }).orderBy[0]).toEqual({ purchases: "desc" });
    expect(customerQuery({ sort: "registered" }).orderBy[0]).toEqual({ registeredDate: "desc" });
    expect(customerQuery().where).toEqual({ deletedAt: null });
  });

  it("ventas: estado, cliente y busqueda por nombre o numero exacto", () => {
    const query = saleQuery({ status: "Completada", customerId: "4", search: "12" });
    expect(query.where.status).toEqual({ equals: "Completada", mode: "insensitive" });
    expect(query.where.customerId).toBe(4);
    expect(query.where.OR).toEqual([
      { customerName: { contains: "12", mode: "insensitive" } },
      { id: 12 },
    ]);
    expect(query.orderBy).toEqual([{ createdAt: "desc" }, { id: "desc" }]);

    expect(saleQuery({ search: "ana" }).where.OR).toHaveLength(1);
    expect(saleQuery({ customerId: "abc" }).where.customerId).toBeUndefined();
    expect(saleQuery().where).toEqual({});
  });
});

describe("filtros en memoria", () => {
  const products = [
    { name: "Silla", category: "Muebles", price: 50, stock: 2, sales: 9 },
    { name: "Laptop", category: "Electronica", price: 900, stock: 8, sales: 1 },
  ];

  it("productos", () => {
    expect(filterSortProducts([...products]).map((p) => p.name)).toEqual(["Laptop", "Silla"]);
    expect(filterSortProducts([...products], { category: "mueb" })).toHaveLength(1);
    expect(filterSortProducts([...products], { sort: "price" })[0].name).toBe("Silla");
  });

  it("clientes", () => {
    const customers = [
      { name: "Beto", email: "b@x.com", phone: "1", status: "Activo" },
      { name: "Ana", email: "a@x.com", phone: "2", status: "Inactivo" },
    ];
    expect(filterSortCustomers([...customers]).map((c) => c.name)).toEqual(["Ana", "Beto"]);
    expect(filterSortCustomers([...customers], { status: "ACTIVO" })).toHaveLength(1);
  });

  it("ventas", () => {
    const sales = [
      { id: 1, customerId: 1, customerName: "Ana", status: "Completada", createdAt: "2026-01-01" },
      { id: 2, customerId: 2, customerName: "Beto", status: "Anulada", createdAt: "2026-02-01" },
    ];
    expect(filterSortSales(sales).map((s) => s.id)).toEqual([2, 1]);
    expect(filterSortSales(sales, { status: "anulada" })).toHaveLength(1);
    expect(filterSortSales(sales, { customerId: "1" })).toHaveLength(1);
    expect(filterSortSales(sales, { customerId: "x" })).toHaveLength(2);
    expect(filterSortSales(sales, { search: "bet" })).toHaveLength(1);
  });
});

describe("repositorios de base de datos: paginacion e idempotencia", () => {
  it("productos y clientes paginan con count y findMany", async () => {
    mockPrisma.product.count.mockResolvedValue(1);
    mockPrisma.product.findMany.mockResolvedValue([{ id: 1 }]);
    const products = await new DatabaseProductRepository().listPage(
      { search: "a" },
      { page: 1, pageSize: 10 }
    );
    expect(products.data).toEqual([{ id: 1 }]);
    expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 10 })
    );

    mockPrisma.customer.count.mockResolvedValue(0);
    mockPrisma.customer.findMany.mockResolvedValue([]);
    const customers = await new DatabaseCustomerRepository().listPage({}, { page: 1, pageSize: 5 });
    expect(customers.total).toBe(0);
  });

  it("ventas paginan con sus lineas y sin exponer la clave", async () => {
    mockPrisma.sale.count.mockResolvedValue(1);
    mockPrisma.sale.findMany.mockResolvedValue([
      { id: 3, idempotencyKey: "secreta", items: [{ productId: 1, name: "X", quantity: 1, price: 2, total: 2, saleId: 3 }] },
    ]);

    const result = await new DatabaseSaleRepository().listPage({}, { page: 1, pageSize: 10 });

    expect(mockPrisma.sale.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ include: { items: true } })
    );
    expect(result.data[0].idempotencyKey).toBeUndefined();
    expect(result.data[0].items[0]).toEqual({ productId: 1, name: "X", quantity: 1, price: 2, total: 2 });
  });

  it("busca una venta por su clave de idempotencia", async () => {
    mockPrisma.sale.findUnique.mockResolvedValue({ id: 8, idempotencyKey: "k", items: [] });
    const sale = await new DatabaseSaleRepository().findByIdempotencyKey("k");
    expect(mockPrisma.sale.findUnique).toHaveBeenCalledWith({
      where: { idempotencyKey: "k" },
      include: { items: true },
    });
    expect(sale).toEqual({ id: 8, items: [] });
  });

  it("guarda la clave al crear la venta solo si se envia", async () => {
    mockPrisma.sale.create.mockResolvedValue({ id: 1, items: [] });
    const repo = new DatabaseSaleRepository();
    const base = { customerId: 1, customerName: "A", items: [], subtotal: 1, discount: 0, total: 1, status: "Completada" };

    await repo.create({ ...base, idempotencyKey: "clave-123" });
    expect(mockPrisma.sale.create.mock.calls[0][0].data.idempotencyKey).toBe("clave-123");

    await repo.create(base);
    expect(mockPrisma.sale.create.mock.calls[1][0].data).not.toHaveProperty("idempotencyKey");
  });

  it("mapSaleFromDb devuelve null sin venta", () => {
    expect(mapSaleFromDb(null)).toBeNull();
  });
});

describe("repositorio de ventas en memoria: idempotencia", () => {
  beforeEach(() => resetDataStore());

  it("registra la clave y rechaza un segundo uso como la restriccion UNIQUE", async () => {
    const repo = new InMemorySaleRepository();
    const payload = { customerId: 1, customerName: "A", items: [], subtotal: 1, discount: 0, total: 1, status: "Completada" };

    const sale = await repo.create({ ...payload, idempotencyKey: "clave-memoria" });
    expect(await repo.findByIdempotencyKey("clave-memoria")).toEqual(sale);
    expect(await repo.findByIdempotencyKey("otra-clave")).toBeNull();

    await expect(repo.create({ ...payload, idempotencyKey: "clave-memoria" })).rejects.toMatchObject({
      code: "P2002",
    });
  });
});
