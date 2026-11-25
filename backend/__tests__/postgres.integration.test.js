/**
 * Pruebas de integracion contra un PostgreSQL real.
 *
 * El resto de las pruebas del backend usa el repositorio en memoria o un cliente
 * de Prisma simulado: no ejercitan el SQL, las restricciones de la base ni las
 * transacciones. Esta suite arranca un PostgreSQL 17 local (embedded-postgres),
 * aplica las migraciones del repositorio con `prisma migrate deploy` y prueba la
 * API en modo database contra el: concurrencia sobre el stock, transacciones,
 * idempotencia, concurrencia optimista y revocacion de sesiones.
 *
 * No usa la base de staging ni ninguna credencial: la base se crea y se borra
 * en cada ejecucion.
 */

const path = require("path");
const os = require("os");
const fs = require("fs");
const net = require("net");
const crypto = require("crypto");
const { spawn, execFileSync } = require("child_process");
const request = require("supertest");

const BACKEND_DIR = path.join(__dirname, "..");
const PRISMA_CLI = require.resolve("prisma/build/index.js");
const SERVER_SCRIPT = path.join(__dirname, "support", "embeddedPostgres.mjs");
// Contrasena aleatoria de los usuarios de prueba: no hay credenciales fijas.
const PASSWORD = crypto.randomBytes(12).toString("base64url");

jest.setTimeout(180000);

const freePort = () =>
  new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });

const startPostgres = (dataDir, port) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [SERVER_SCRIPT, dataDir, String(port)], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`PostgreSQL no arranco a tiempo: ${stderr}`));
    }, 150000);

    child.stdout.on("data", (chunk) => {
      if (String(chunk).includes("READY")) {
        clearTimeout(timer);
        resolve(child);
      }
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`PostgreSQL termino con codigo ${code}: ${stderr}`));
    });
  });

const stopPostgres = (child) =>
  new Promise((resolve) => {
    const timer = setTimeout(() => {
      child.kill();
      resolve();
    }, 30000);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
    child.stdin.end();
  });

const prismaCli = (args, url) =>
  execFileSync(process.execPath, [PRISMA_CLI, ...args], {
    cwd: BACKEND_DIR,
    env: { ...process.env, DATABASE_URL: url },
    stdio: "pipe",
  });

const originalEnv = { ...process.env };
let pg;
let dataDir;
let databaseUrl;
let app;
let prisma;
let runInTransaction;
let customer;
let sellerToken;
let adminToken;
let productCounter = 0;

const auth = (token) => ({ Authorization: `Bearer ${token}` });

const login = async (username) => {
  const res = await request(app)
    .post("/api/v1/auth/login")
    .send({ username, password: PASSWORD })
    .expect(200);
  return res.body.token;
};

const createProduct = (stock, name) => {
  productCounter += 1;
  return prisma.product.create({
    data: { name: name || `Producto ${productCounter}`, category: "Pruebas", price: 10, stock },
  });
};

const stockOf = async (id) => (await prisma.product.findUnique({ where: { id } })).stock;

const saleBody = (items) => ({
  customerId: customer.id,
  items,
  paymentMethod: "Efectivo",
});

beforeAll(async () => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "pg-integracion-"));
  const port = await freePort();
  pg = await startPostgres(dataDir, port);

  databaseUrl = `postgresql://postgres:postgres@127.0.0.1:${port}/ventas_test?schema=public`;
  prismaCli(["migrate", "deploy"], databaseUrl);

  process.env.DATABASE_URL = databaseUrl;
  process.env.REPOSITORY_MODE = "database";

  app = require("../app").createApp();
  prisma = require("../src/db/prismaClient").getPrismaClient();
  ({ runInTransaction } = require("../src/repositories/unitOfWork"));
  const { hashPassword } = require("../src/repositories/userRepository");

  await prisma.user.create({
    data: { username: "admin_int", passwordHash: hashPassword(PASSWORD), role: "admin", name: "Admin" },
  });
  await prisma.user.create({
    data: {
      username: "vendedor_int",
      passwordHash: hashPassword(PASSWORD),
      role: "vendedor",
      name: "Vendedor",
    },
  });
  customer = await prisma.customer.create({ data: { name: "Cliente de integracion" } });

  adminToken = await login("admin_int");
  sellerToken = await login("vendedor_int");
});

afterAll(async () => {
  if (prisma) await prisma.$disconnect();
  if (pg) await stopPostgres(pg);
  if (dataDir) fs.rmSync(dataDir, { recursive: true, force: true });
  process.env = originalEnv;
});

describe("Esquema", () => {
  it("las migraciones dejan la base igual al esquema que espera el codigo", () => {
    expect(() =>
      prismaCli(
        [
          "migrate",
          "diff",
          "--from-schema-datasource",
          "prisma/schema.prisma",
          "--to-schema-datamodel",
          "prisma/schema.prisma",
          "--exit-code",
        ],
        databaseUrl
      )
    ).not.toThrow();
  });

  it("/health/ready consulta cada tabla en la base", async () => {
    const res = await request(app).get("/health/ready").expect(200);
    expect(res.body.repositoryMode).toBe("database");
    expect(res.body.checks.map((check) => check.model).sort()).toEqual(
      ["category", "city", "customer", "product", "revokedToken", "sale", "saleItem", "user"]
    );
    expect(res.body.checks.every((check) => check.ok)).toBe(true);
  });
});

describe("Ventas, stock y transacciones", () => {
  it("diez ventas simultaneas por cinco unidades: se registran cinco y el stock queda en cero", async () => {
    const product = await createProduct(5);

    const responses = await Promise.all(
      Array.from({ length: 10 }, () =>
        request(app)
          .post("/api/v1/sales")
          .set(auth(sellerToken))
          .send(saleBody([{ productId: product.id, quantity: 1 }]))
      )
    );

    const statuses = responses.map((res) => res.status).sort();
    expect(statuses.filter((status) => status === 201)).toHaveLength(5);
    expect(statuses.filter((status) => status === 400)).toHaveLength(5);
    expect(
      responses.filter((res) => res.status === 400).every((res) => res.body.code === "INSUFFICIENT_STOCK")
    ).toBe(true);
    expect(await stockOf(product.id)).toBe(0);
    expect(await prisma.saleItem.count({ where: { productId: product.id } })).toBe(5);
  });

  it("una venta cuya segunda linea no tiene stock no deja reservada la primera", async () => {
    const conStock = await createProduct(5);
    const sinStock = await createProduct(0);
    const ventasAntes = await prisma.sale.count();

    const res = await request(app)
      .post("/api/v1/sales")
      .set(auth(sellerToken))
      .send(
        saleBody([
          { productId: conStock.id, quantity: 2 },
          { productId: sinStock.id, quantity: 1 },
        ])
      )
      .expect(400);

    expect(res.body.code).toBe("INSUFFICIENT_STOCK");
    expect(await stockOf(conStock.id)).toBe(5);
    expect(await prisma.sale.count()).toBe(ventasAntes);
  });

  it("si algo falla despues de reservar, PostgreSQL deshace la reserva", async () => {
    const product = await createProduct(5);

    await expect(
      runInTransaction(async ({ productRepository }) => {
        await productRepository.reserveStock([{ productId: product.id, quantity: 3 }], "2026-11-18");
        throw new Error("falla simulada despues de reservar");
      })
    ).rejects.toThrow("falla simulada despues de reservar");

    expect(await stockOf(product.id)).toBe(5);
  });

  it("dos envios simultaneos con la misma clave de idempotencia registran una sola venta", async () => {
    const product = await createProduct(5);
    const key = `int-${crypto.randomUUID()}`;

    const [a, b] = await Promise.all(
      [0, 1].map(() =>
        request(app)
          .post("/api/v1/sales")
          .set(auth(sellerToken))
          .set("Idempotency-Key", key)
          .send(saleBody([{ productId: product.id, quantity: 1 }]))
      )
    );

    expect([a.status, b.status].sort()).toEqual([200, 201]);
    expect(a.body.data.id).toBe(b.body.data.id);
    expect(await prisma.sale.count({ where: { idempotencyKey: key } })).toBe(1);
    expect(await stockOf(product.id)).toBe(4);
  });

  it("anular devuelve el stock y una segunda anulacion se rechaza", async () => {
    const product = await createProduct(5);
    const venta = await request(app)
      .post("/api/v1/sales")
      .set(auth(sellerToken))
      .send(saleBody([{ productId: product.id, quantity: 2 }]))
      .expect(201);
    expect(await stockOf(product.id)).toBe(3);

    await request(app).put(`/api/v1/sales/${venta.body.data.id}/cancel`).set(auth(sellerToken)).expect(200);
    expect(await stockOf(product.id)).toBe(5);

    const segunda = await request(app)
      .put(`/api/v1/sales/${venta.body.data.id}/cancel`)
      .set(auth(sellerToken))
      .expect(409);
    expect(segunda.body.code).toBe("SALE_ALREADY_CANCELED");
  });
});

describe("Consultas en la base", () => {
  it("busca sin distinguir mayusculas y pagina en la base", async () => {
    const marca = crypto.randomBytes(4).toString("hex");
    await createProduct(3, `Cuaderno ${marca} rojo`);
    await createProduct(3, `cuaderno ${marca} azul`);

    const res = await request(app)
      .get(`/api/v1/products?search=CUADERNO%20${marca.toUpperCase()}&page=1&pageSize=1`)
      .set(auth(adminToken))
      .expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.count).toBe(2);
    expect(res.body.totalPages).toBe(2);
  });

  it("el tablero y los listados de ventas y clientes funcionan con la base", async () => {
    const tablero = await request(app).get("/api/v1/dashboard/data").set(auth(adminToken)).expect(200);
    expect(tablero.body).toHaveProperty("dailySales");

    const ventas = await request(app).get("/api/v1/sales?page=1&pageSize=5").set(auth(adminToken)).expect(200);
    expect(ventas.body.data.length).toBeGreaterThan(0);
    expect(ventas.body.data[0]).not.toHaveProperty("idempotencyKey");

    await request(app).get("/api/v1/customers?page=1&search=integracion").set(auth(adminToken)).expect(200);
  });

  it("el tablero agregado en la base coincide con la agregacion en la aplicacion", async () => {
    // Casos de borde propios, ademas de las ventas de las pruebas anteriores: un
    // cliente con ciudad, otro dado de baja, un producto sin categoria y una
    // venta anulada, en fechas fijas a mediodia UTC.
    const conCiudad = await prisma.customer.create({
      data: { name: "Cliente del tablero", city: "Cochabamba", totalSpent: 1600 },
    });
    const deBaja = await prisma.customer.create({
      data: { name: "Cliente dado de baja", city: "Oruro", deletedAt: new Date() },
    });
    const cuaderno = await createProduct(0, "Cuaderno del tablero");
    const sinCategoria = await prisma.product.create({ data: { name: "Sin categoria", price: 7.5, stock: 0 } });
    const venta = (cliente, status, producto, quantity, fecha) =>
      prisma.sale.create({
        data: {
          customerId: cliente.id,
          customerName: cliente.name,
          subtotal: producto.price * quantity,
          total: producto.price * quantity,
          status,
          createdAt: new Date(fecha),
          items: {
            create: [
              {
                productId: producto.id,
                name: producto.name,
                quantity,
                price: producto.price,
                total: producto.price * quantity,
              },
            ],
          },
        },
      });
    await venta(conCiudad, "Completada", cuaderno, 3, "2026-08-14T12:00:00Z");
    await venta(deBaja, "Completada", sinCategoria, 2, "2026-09-02T12:00:00Z");
    await venta(conCiudad, "Anulada", cuaderno, 5, "2026-09-02T12:30:00Z");

    // Referencia: la agregacion en la aplicacion sobre las mismas filas, en orden de id.
    const { buildDynamicDashboardData } = require("../src/services/dashboardService");
    const { mapSaleFromDb } = require("../src/repositories/saleRepository");
    const [products, customers, sales] = await Promise.all([
      prisma.product.findMany({ where: { deletedAt: null }, orderBy: { id: "asc" } }),
      prisma.customer.findMany({ where: { deletedAt: null }, orderBy: { id: "asc" } }),
      prisma.sale.findMany({ include: { items: { orderBy: { id: "asc" } } }, orderBy: { id: "asc" } }),
    ]);
    const esperado = buildDynamicDashboardData({ products, customers, sales: sales.map(mapSaleFromDb) });

    const res = await request(app).get("/api/v1/dashboard/data").set(auth(adminToken)).expect(200);
    const { timestamp, salesTrend, monthlySales, ...resto } = res.body;
    const { salesTrend: diasEsperados, monthlySales: mesesEsperados, ...restoEsperado } = esperado;

    expect(timestamp).toEqual(expect.any(String));
    expect(resto).toEqual(restoEsperado);
    expect(resto.categoryDistribution.map((c) => c.name)).toEqual(expect.arrayContaining(["Otros"]));
    // La etiqueta del dia y del mes depende de la zona horaria del proceso; se comparan las cifras.
    const cifras = (serie) => serie.map(({ day: _dia, month: _mes, ...valores }) => valores);
    expect(cifras(salesTrend)).toEqual(cifras(diasEsperados));
    expect(cifras(monthlySales)).toEqual(cifras(mesesEsperados));
  });
});

describe("Concurrencia optimista", () => {
  it("dos ediciones simultaneas con la misma version: una se guarda y la otra recibe 412", async () => {
    const product = await createProduct(5);
    const leido = await request(app).get(`/api/v1/products/${product.id}`).set(auth(adminToken)).expect(200);
    const etag = leido.headers.etag;

    const [a, b] = await Promise.all(
      [11, 22].map((price) =>
        request(app)
          .put(`/api/v1/products/${product.id}`)
          .set(auth(adminToken))
          .set("If-Match", etag)
          .send({ price })
      )
    );

    expect([a.status, b.status].sort()).toEqual([200, 412]);
    const ganador = a.status === 200 ? a : b;
    const guardado = await prisma.product.findUnique({ where: { id: product.id } });
    expect(guardado.price).toBe(ganador.body.data.price);
    expect(ganador.headers.etag).toBe(`"${guardado.updatedAt.getTime()}"`);
  });
});

describe("Sesiones", () => {
  it("cerrar sesion revoca el token; cerrar todas las sesiones invalida los demas", async () => {
    const telefono = await login("vendedor_int");
    const computadora = await login("vendedor_int");

    await request(app).post("/api/v1/auth/logout").set(auth(telefono)).expect(200);
    await request(app).get("/api/v1/products").set(auth(telefono)).expect(401);
    await request(app).get("/api/v1/products").set(auth(computadora)).expect(200);

    await request(app).post("/api/v1/auth/logout-all").set(auth(computadora)).expect(200);
    await request(app).get("/api/v1/products").set(auth(computadora)).expect(401);
    await request(app).get("/api/v1/products").set(auth(sellerToken)).expect(401);

    const usuario = await prisma.user.findUnique({ where: { username: "vendedor_int" } });
    expect(usuario.tokenVersion).toBe(1);
    expect(await prisma.revokedToken.count({ where: { userId: usuario.id } })).toBe(1);

    // Un login nuevo emite un token con la version vigente.
    sellerToken = await login("vendedor_int");
    await request(app).get("/api/v1/products").set(auth(sellerToken)).expect(200);
  });
});
