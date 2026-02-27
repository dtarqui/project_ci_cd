const request = require("supertest");
const { createApp } = require("../app");

describe("Endpoints CRUD de ventas", () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  const validToken = "Bearer valid_token";

  describe("GET /api/sales - Listar Ventas", () => {
    it("debe obtener lista de ventas", (done) => {
      request(app)
        .get("/api/sales")
        .set("Authorization", validToken)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.count).toBeGreaterThan(0);
          done();
        });
    });

    it("debe filtrar ventas por estado", (done) => {
      request(app)
        .get("/api/sales?status=Completada")
        .set("Authorization", validToken)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.success).toBe(true);
          res.body.data.forEach((sale) => {
            expect(sale.status).toBe("Completada");
          });
          done();
        });
    });
  });

  describe("GET /api/sales/:id - Obtener Venta", () => {
    it("debe obtener una venta por ID", (done) => {
      request(app)
        .get("/api/sales/1")
        .set("Authorization", validToken)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.success).toBe(true);
          expect(res.body.data.id).toBe(1);
          done();
        });
    });

    it("debe retornar 404 para ID inexistente", (done) => {
      request(app)
        .get("/api/sales/9999")
        .set("Authorization", validToken)
        .expect(404)
        .end(done);
    });
  });

  describe("POST /api/sales - Crear Venta", () => {
    it("debe crear una venta", (done) => {
      const newSale = {
        customerId: 1,
        items: [
          { productId: 1, quantity: 1 },
          { productId: 9, quantity: 2 },
        ],
        paymentMethod: "Tarjeta",
        discount: 0,
        notes: "Entrega rápida",
      };

      request(app)
        .post("/api/sales")
        .set("Authorization", validToken)
        .send(newSale)
        .expect(201)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.success).toBe(true);
          expect(res.body.data.customerId).toBe(1);
          expect(res.body.data.items.length).toBe(2);
          expect(res.body.data.total).toBeGreaterThan(0);
          done();
        });
    });

    it("debe validar campos requeridos", (done) => {
      request(app)
        .post("/api/sales")
        .set("Authorization", validToken)
        .send({ customerId: 1 })
        .expect(400)
        .end(done);
    });
  });

  describe("PUT /api/sales/:id - Actualizar Venta", () => {
    it("debe actualizar una venta existente", (done) => {
      const updatePayload = {
        status: "Pendiente",
        paymentMethod: "Efectivo",
        notes: "Actualización de prueba",
      };

      request(app)
        .put("/api/sales/1")
        .set("Authorization", validToken)
        .send(updatePayload)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.success).toBe(true);
          expect(res.body.data.status).toBe("Pendiente");
          expect(res.body.data.paymentMethod).toBe("Efectivo");
          done();
        });
    });

    it("debe validar status inválido", (done) => {
      request(app)
        .put("/api/sales/1")
        .set("Authorization", validToken)
        .send({ status: "Invalido" })
        .expect(400)
        .end(done);
    });
  });

  describe("PUT /api/sales/:id/cancel - Anular Venta", () => {
    it("debe anular una venta", (done) => {
      request(app)
        .put("/api/sales/1/cancel")
        .set("Authorization", validToken)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.success).toBe(true);
          expect(res.body.data.status).toBe("Anulada");
          done();
        });
    });
  });
});
