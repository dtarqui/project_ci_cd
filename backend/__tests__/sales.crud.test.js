const request = require("supertest");
const { createApp } = require("../app");
const { createAuthToken } = require("../src/utils/helpers");

describe("Endpoints CRUD de ventas", () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  const validToken = `Bearer ${createAuthToken(1, { username: "admin" })}`;

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

    it("debe filtrar ventas por customerId válido", (done) => {
      request(app)
        .get("/api/sales?customerId=1")
        .set("Authorization", validToken)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.success).toBe(true);
          res.body.data.forEach((sale) => {
            expect(sale.customerId).toBe(1);
          });
          done();
        });
    });

    it("debe ignorar customerId no numérico sin fallar", (done) => {
      request(app)
        .get("/api/sales?customerId=abc")
        .set("Authorization", validToken)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
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
          { productId: 4, quantity: 2 },
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

    it("debe registrar el vendedor autenticado que crea la venta", (done) => {
      const sellerToken = `Bearer ${createAuthToken(2, {
        username: "demo",
        name: "Usuario Demo",
        role: "vendedor",
      })}`;

      request(app)
        .post("/api/sales")
        .set("Authorization", sellerToken)
        .send({
          customerId: 1,
          items: [{ productId: 1, quantity: 1 }],
          paymentMethod: "Efectivo",
        })
        .expect(201)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.data.userId).toBe(2);
          expect(res.body.data.userName).toBe("Usuario Demo");
          done();
        });
    });

    it("no debe permitir que el cliente atribuya la venta a otro usuario", (done) => {
      request(app)
        .post("/api/sales")
        .set("Authorization", validToken)
        .send({
          customerId: 1,
          items: [{ productId: 1, quantity: 1 }],
          paymentMethod: "Efectivo",
          userId: 999,
          userName: "Vendedor falso",
        })
        .expect(201)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.data.userId).toBe(1);
          expect(res.body.data.userName).not.toBe("Vendedor falso");
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

    it("debe retornar 404 cuando el cliente no existe", (done) => {
      request(app)
        .post("/api/sales")
        .set("Authorization", validToken)
        .send({
          customerId: 9999,
          items: [{ productId: 1, quantity: 1 }],
          paymentMethod: "Tarjeta",
        })
        .expect(404)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.code).toBe("CUSTOMER_NOT_FOUND");
          done();
        });
    });

    it("debe retornar 404 cuando un producto no existe", (done) => {
      request(app)
        .post("/api/sales")
        .set("Authorization", validToken)
        .send({
          customerId: 1,
          items: [{ productId: 9999, quantity: 1 }],
          paymentMethod: "Tarjeta",
        })
        .expect(404)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.code).toBe("PRODUCT_NOT_FOUND");
          done();
        });
    });

    it("debe retornar 400 cuando no hay stock suficiente", (done) => {
      request(app)
        .post("/api/sales")
        .set("Authorization", validToken)
        .send({
          customerId: 1,
          items: [{ productId: 1, quantity: 9999 }],
          paymentMethod: "Tarjeta",
        })
        .expect(400)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.code).toBe("INSUFFICIENT_STOCK");
          done();
        });
    });

    it("debe crear venta anulada sin aplicar impacto a inventario", (done) => {
      const payload = {
        customerId: 1,
        items: [{ productId: 2, quantity: 1 }],
        paymentMethod: "Tarjeta",
        status: "Anulada",
      };

      request(app)
        .post("/api/sales")
        .set("Authorization", validToken)
        .send(payload)
        .expect(201)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.success).toBe(true);
          expect(res.body.data.status).toBe("Anulada");
          done();
        });
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

    it("debe retornar 404 al actualizar venta inexistente", (done) => {
      request(app)
        .put("/api/sales/9999")
        .set("Authorization", validToken)
        .send({ status: "Pendiente" })
        .expect(404)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.code).toBe("SALE_NOT_FOUND");
          done();
        });
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

    it("debe retornar 404 al anular venta inexistente", (done) => {
      request(app)
        .put("/api/sales/9999/cancel")
        .set("Authorization", validToken)
        .expect(404)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.code).toBe("SALE_NOT_FOUND");
          done();
        });
    });
  });
  describe("Tope del descuento", () => {
    // Antes esto devolvia 201 con total 0: la venta quedaba en Bs 0 pero el
    // stock se descontaba igual, o sea regalando la mercaderia sin aviso.
    it("debe rechazar un descuento mayor que el total", (done) => {
      request(app)
        .post("/api/sales")
        .set("Authorization", validToken)
        .send({
          customerId: 2,
          items: [{ productId: 1, quantity: 1 }],
          paymentMethod: "Efectivo",
          discount: 999999,
        })
        .expect(400)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.code).toBe("INVALID_DISCOUNT");
          expect(res.body.data.maxDiscount).toBeGreaterThan(0);
          done();
        });
    });

    it("debe aceptar un descuento igual al total", (done) => {
      request(app)
        .post("/api/sales")
        .set("Authorization", validToken)
        .send({
          customerId: 2,
          items: [{ productId: 1, quantity: 1 }],
          paymentMethod: "Efectivo",
        })
        .expect(201)
        .end((err, res) => {
          if (err) return done(err);
          const exacto = Number((res.body.data.subtotal + res.body.data.tax).toFixed(2));

          request(app)
            .post("/api/sales")
            .set("Authorization", validToken)
            .send({
              customerId: 2,
              items: [{ productId: 1, quantity: 1 }],
              paymentMethod: "Efectivo",
              discount: exacto,
            })
            .expect(201)
            .end((err2, res2) => {
              if (err2) return done(err2);
              expect(res2.body.data.total).toBe(0);
              done();
            });
        });
    });
  });

  describe("Estado de la venta al crear", () => {
    // La lista blanca solo la exigia PUT, asi que por POST entraba cualquier
    // cadena y esa venta no aparecia en ningun filtro de la interfaz.
    it("debe rechazar un estado que no existe", (done) => {
      request(app)
        .post("/api/sales")
        .set("Authorization", validToken)
        .send({
          customerId: 2,
          items: [{ productId: 1, quantity: 1 }],
          paymentMethod: "Efectivo",
          status: "Cualquier Cosa",
        })
        .expect(400)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.code).toBe("INVALID_STATUS");
          done();
        });
    });

    it("debe aceptar los estados validos", (done) => {
      request(app)
        .post("/api/sales")
        .set("Authorization", validToken)
        .send({
          customerId: 2,
          items: [{ productId: 1, quantity: 1 }],
          paymentMethod: "Efectivo",
          status: "Pendiente",
        })
        .expect(201)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.data.status).toBe("Pendiente");
          done();
        });
    });

    it("debe aplicar Completada cuando no se indica estado", (done) => {
      request(app)
        .post("/api/sales")
        .set("Authorization", validToken)
        .send({
          customerId: 2,
          items: [{ productId: 1, quantity: 1 }],
          paymentMethod: "Efectivo",
        })
        .expect(201)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.data.status).toBe("Completada");
          done();
        });
    });
  });

  // Anular tenia que dejar el inventario como estaba antes de la venta. Hasta
  // ahora solo cambiaba el estado: el stock descontado no volvia nunca.
  describe("PUT /api/sales/:id/cancel - reversion del inventario", () => {
    const leerProducto = (id) =>
      request(app).get(`/api/products/${id}`).set("Authorization", validToken);

    it("devuelve el stock y descuenta la compra del cliente al anular", async () => {
      const antesProducto = await leerProducto(3);
      const antesCliente = await request(app)
        .get("/api/customers/1")
        .set("Authorization", validToken);

      const stockInicial = antesProducto.body.data.stock;
      const comprasIniciales = antesCliente.body.data.purchases;

      const venta = await request(app)
        .post("/api/sales")
        .set("Authorization", validToken)
        .send({
          customerId: 1,
          items: [{ productId: 3, quantity: 2 }],
          paymentMethod: "Efectivo",
        })
        .expect(201);

      const trasVenta = await leerProducto(3);
      expect(trasVenta.body.data.stock).toBe(stockInicial - 2);

      await request(app)
        .put(`/api/sales/${venta.body.data.id}/cancel`)
        .set("Authorization", validToken)
        .expect(200);

      const trasAnular = await leerProducto(3);
      expect(trasAnular.body.data.stock).toBe(stockInicial);

      const clienteFinal = await request(app)
        .get("/api/customers/1")
        .set("Authorization", validToken);
      expect(clienteFinal.body.data.purchases).toBe(comprasIniciales);
    });

    it("rechaza anular dos veces la misma venta", async () => {
      const venta = await request(app)
        .post("/api/sales")
        .set("Authorization", validToken)
        .send({
          customerId: 1,
          items: [{ productId: 3, quantity: 1 }],
          paymentMethod: "Efectivo",
        })
        .expect(201);

      await request(app)
        .put(`/api/sales/${venta.body.data.id}/cancel`)
        .set("Authorization", validToken)
        .expect(200);

      // El segundo intento no debe devolver el stock otra vez.
      const segundo = await request(app)
        .put(`/api/sales/${venta.body.data.id}/cancel`)
        .set("Authorization", validToken)
        .expect(409);

      expect(segundo.body.code).toBe("SALE_ALREADY_CANCELED");
    });

    it("anular por PUT revierte el inventario igual que el endpoint de anulacion", async () => {
      const antes = await leerProducto(3);
      const stockInicial = antes.body.data.stock;

      const venta = await request(app)
        .post("/api/sales")
        .set("Authorization", validToken)
        .send({
          customerId: 1,
          items: [{ productId: 3, quantity: 1 }],
          paymentMethod: "Efectivo",
        })
        .expect(201);

      await request(app)
        .put(`/api/sales/${venta.body.data.id}`)
        .set("Authorization", validToken)
        .send({ status: "Anulada" })
        .expect(200);

      const despues = await leerProducto(3);
      expect(despues.body.data.stock).toBe(stockInicial);
    });
  });

});
