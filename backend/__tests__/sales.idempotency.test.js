/**
 * Registro de ventas con clave de idempotencia y listados paginados por el
 * repositorio (modo memoria).
 */

const request = require("supertest");
const { createApp } = require("../app");
const { createAuthToken } = require("../src/utils/helpers");
const { resetDataStore, getMockData } = require("../src/db/dataStore");

const tokenFor = (id, username) => `Bearer ${createAuthToken(id, { username, role: "vendedor" })}`;
const admin = tokenFor(1, "admin");

const nuevaVenta = () => {
  const product = getMockData().products.find((p) => !p.deletedAt && p.stock > 5);
  const customer = getMockData().customers.find((c) => !c.deletedAt);
  return {
    product,
    body: {
      customerId: customer.id,
      items: [{ productId: product.id, quantity: 1 }],
      paymentMethod: "Efectivo",
    },
  };
};

describe("POST /api/sales con Idempotency-Key", () => {
  let app;

  beforeEach(() => {
    resetDataStore();
    app = createApp();
  });

  it("un reintento con la misma clave devuelve la misma venta sin descontar dos veces", async () => {
    const { product, body } = nuevaVenta();
    const stockInicial = product.stock;

    const first = await request(app)
      .post("/api/sales")
      .set("Authorization", admin)
      .set("Idempotency-Key", "clave-reintento-01")
      .send(body)
      .expect(201);

    const retry = await request(app)
      .post("/api/sales")
      .set("Authorization", admin)
      .set("Idempotency-Key", "clave-reintento-01")
      .send(body)
      .expect(200);

    expect(retry.body.idempotentReplay).toBe(true);
    expect(retry.body.data.id).toBe(first.body.data.id);
    expect(retry.body.data).not.toHaveProperty("idempotencyKey");
    expect(getMockData().products.find((p) => p.id === product.id).stock).toBe(stockInicial - 1);
  });

  it("dos peticiones simultaneas con la misma clave registran una sola venta", async () => {
    const { body } = nuevaVenta();
    const ventasAntes = getMockData().sales.length;

    const send = () =>
      request(app)
        .post("/api/sales")
        .set("Authorization", admin)
        .set("Idempotency-Key", "clave-simultanea-01")
        .send(body);

    const [a, b] = await Promise.all([send(), send()]);

    expect([a.status, b.status].sort()).toEqual([200, 201]);
    expect(a.body.data.id).toBe(b.body.data.id);
    expect(getMockData().sales.length).toBe(ventasAntes + 1);
  });

  it("rechaza una clave con formato invalido", async () => {
    const { body } = nuevaVenta();
    const res = await request(app)
      .post("/api/sales")
      .set("Authorization", admin)
      .set("Idempotency-Key", "corta")
      .send(body)
      .expect(400);
    expect(res.body.code).toBe("INVALID_IDEMPOTENCY_KEY");
  });

  it("no revela la venta de otro usuario que uso la misma clave", async () => {
    const { body } = nuevaVenta();
    await request(app)
      .post("/api/sales")
      .set("Authorization", admin)
      .set("Idempotency-Key", "clave-compartida-01")
      .send(body)
      .expect(201);

    const res = await request(app)
      .post("/api/sales")
      .set("Authorization", tokenFor(2, "demo"))
      .set("Idempotency-Key", "clave-compartida-01")
      .send(body)
      .expect(409);
    expect(res.body.code).toBe("IDEMPOTENCY_KEY_CONFLICT");
  });

  it("sin clave, cada peticion registra una venta distinta", async () => {
    const { body } = nuevaVenta();
    const a = await request(app).post("/api/sales").set("Authorization", admin).send(body).expect(201);
    const b = await request(app).post("/api/sales").set("Authorization", admin).send(body).expect(201);
    expect(a.body.data.id).not.toBe(b.body.data.id);
  });

  it("propaga un error que no es de unicidad", async () => {
    const { InMemorySaleRepository } = require("../src/repositories/saleRepository");
    const spy = jest
      .spyOn(InMemorySaleRepository.prototype, "create")
      .mockRejectedValueOnce(new Error("falla"));
    const { body } = nuevaVenta();

    try {
      await request(app)
        .post("/api/sales")
        .set("Authorization", admin)
        .set("Idempotency-Key", "clave-con-falla-01")
        .send(body)
        .expect(500);
    } finally {
      spy.mockRestore();
    }
  });
});

describe("listados paginados", () => {
  let app;

  beforeAll(() => {
    resetDataStore();
    app = createApp();
  });

  it.each([
    ["/api/products?page=1&pageSize=2&sort=price"],
    ["/api/customers?page=1&pageSize=2&sort=spending"],
    ["/api/sales?page=1&pageSize=2"],
  ])("%s devuelve la pagina y el total", async (url) => {
    const res = await request(app).get(url).set("Authorization", admin).expect(200);
    expect(res.body.data.length).toBeLessThanOrEqual(2);
    expect(res.body.page).toBe(1);
    expect(res.body.pageSize).toBe(2);
    expect(res.body.totalPages).toBeGreaterThanOrEqual(1);
    expect(res.body.count).toBeGreaterThanOrEqual(res.body.data.length);
  });

  it("la pagina coincide con el listado completo filtrado", async () => {
    const full = await request(app).get("/api/products?sort=price").set("Authorization", admin).expect(200);
    const page2 = await request(app)
      .get("/api/products?sort=price&page=2&pageSize=3")
      .set("Authorization", admin)
      .expect(200);

    expect(page2.body.data.map((p) => p.id)).toEqual(full.body.data.slice(3, 6).map((p) => p.id));
    expect(page2.body.count).toBe(full.body.count);
  });
});
