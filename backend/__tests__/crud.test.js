const request = require("supertest");
const { createApp } = require("../app");

describe("Products CRUD Endpoints", () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  const validToken = "Bearer valid_token";

  describe("GET /api/products - Listar Productos", () => {
    it("debe obtener lista de todos los productos", (done) => {
      request(app)
        .get("/api/products")
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

    it("debe filtrar productos por búsqueda", (done) => {
      request(app)
        .get("/api/products?search=Monitor")
        .set("Authorization", validToken)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.success).toBe(true);
          expect(res.body.data.length).toBeGreaterThan(0);
          expect(res.body.data[0].name).toContain("Monitor");
          done();
        });
    });

    it("debe filtrar productos por categoría", (done) => {
      request(app)
        .get("/api/products?category=Electrónica")
        .set("Authorization", validToken)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.success).toBe(true);
          res.body.data.forEach((p) => {
            expect(p.category.toLowerCase()).toContain(
              "Electrónica".toLowerCase()
            );
          });
          done();
        });
    });

    it("debe ordenar productos por precio", (done) => {
      request(app)
        .get("/api/products?sort=price")
        .set("Authorization", validToken)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.success).toBe(true);
          for (let i = 1; i < res.body.data.length; i++) {
            expect(res.body.data[i].price).toBeGreaterThanOrEqual(
              res.body.data[i - 1].price
            );
          }
          done();
        });
    });

    it("debe ordenar productos por stock", (done) => {
      request(app)
        .get("/api/products?sort=stock")
        .set("Authorization", validToken)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.success).toBe(true);
          for (let i = 1; i < res.body.data.length; i++) {
            expect(res.body.data[i].stock).toBeLessThanOrEqual(
              res.body.data[i - 1].stock
            );
          }
          done();
        });
    });

    it("debe ordenar productos por ventas", (done) => {
      request(app)
        .get("/api/products?sort=sales")
        .set("Authorization", validToken)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.success).toBe(true);
          for (let i = 1; i < res.body.data.length; i++) {
            expect(res.body.data[i].sales).toBeLessThanOrEqual(
              res.body.data[i - 1].sales
            );
          }
          done();
        });
    });

    it("debe ordenar productos por nombre (default)", (done) => {
      request(app)
        .get("/api/products?sort=name")
        .set("Authorization", validToken)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.success).toBe(true);
          for (let i = 1; i < res.body.data.length; i++) {
            expect(
              res.body.data[i].name.localeCompare(res.body.data[i - 1].name)
            ).toBeGreaterThanOrEqual(0);
          }
          done();
        });
    });

    it("debe retornar array vacío para búsqueda sin coincidencias", (done) => {
      request(app)
        .get("/api/products?search=XYZ123NoExiste")
        .set("Authorization", validToken)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.success).toBe(true);
          expect(res.body.data.length).toBe(0);
          expect(res.body.count).toBe(0);
          done();
        });
    });
  });

  describe("GET /api/products/:id - Obtener Producto", () => {
    it("debe obtener un producto por ID", (done) => {
      request(app)
        .get("/api/products/1")
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
        .get("/api/products/9999")
        .set("Authorization", validToken)
        .expect(404)
        .end(done);
    });
  });

  describe("POST /api/products - Crear Producto", () => {
    it("debe crear un nuevo producto", (done) => {
      const newProduct = {
        name: "Test Product",
        category: "Test",
        price: 99.99,
        stock: 10,
      };

      request(app)
        .post("/api/products")
        .set("Authorization", validToken)
        .send(newProduct)
        .expect(201)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.success).toBe(true);
          expect(res.body.data.name).toBe("Test Product");
          done();
        });
    });

    it("debe validar campos requeridos", (done) => {
      request(app)
        .post("/api/products")
        .set("Authorization", validToken)
        .send({ price: 99.99 })
        .expect(400)
        .end(done);
    });
  });

  describe("PUT /api/products/:id - Actualizar Producto", () => {
    it("debe actualizar un producto existente", (done) => {
      request(app)
        .put("/api/products/1")
        .set("Authorization", validToken)
        .send({ name: "Updated Name" })
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.success).toBe(true);
          done();
        });
    });

    it("debe actualizar solo el nombre", (done) => {
      request(app)
        .put("/api/products/1")
        .set("Authorization", validToken)
        .send({ name: "New Product Name" })
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.success).toBe(true);
          expect(res.body.data.name).toBe("New Product Name");
          done();
        });
    });

    it("debe actualizar solo el precio", (done) => {
      request(app)
        .put("/api/products/1")
        .set("Authorization", validToken)
        .send({ price: 150.99 })
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.success).toBe(true);
          expect(res.body.data.price).toBe(150.99);
          done();
        });
    });

    it("debe actualizar solo el stock", (done) => {
      request(app)
        .put("/api/products/1")
        .set("Authorization", validToken)
        .send({ stock: 50 })
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.success).toBe(true);
          expect(res.body.data.stock).toBe(50);
          done();
        });
    });

    it("debe actualizar solo la categoría", (done) => {
      request(app)
        .put("/api/products/1")
        .set("Authorization", validToken)
        .send({ category: "Nueva Categoría" })
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.success).toBe(true);
          expect(res.body.data.category).toBe("Nueva Categoría");
          done();
        });
    });

    it("debe actualizar múltiples campos", (done) => {
      request(app)
        .put("/api/products/1")
        .set("Authorization", validToken)
        .send({
          name: "Test Multi Update",
          category: "Test",
          price: 199.99,
          stock: 75,
        })
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.success).toBe(true);
          expect(res.body.data.name).toBe("Test Multi Update");
          expect(res.body.data.price).toBe(199.99);
          expect(res.body.data.stock).toBe(75);
          done();
        });
    });

    it("debe validar en actualización", (done) => {
      request(app)
        .put("/api/products/1")
        .set("Authorization", validToken)
        .send({ price: "invalid" })
        .expect(400)
        .end(done);
    });

    it("debe retornar 404 para ID inexistente", (done) => {
      request(app)
        .put("/api/products/9999")
        .set("Authorization", validToken)
        .send({ name: "Test" })
        .expect(404)
        .end(done);
    });
  });

  describe("DELETE /api/products/:id - Eliminar Producto", () => {
    it("debe eliminar un producto", (done) => {
      request(app)
        .delete("/api/products/2")
        .set("Authorization", validToken)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.success).toBe(true);
          done();
        });
    });

    it("debe retornar 404 para ID inexistente", (done) => {
      request(app)
        .delete("/api/products/9999")
        .set("Authorization", validToken)
        .expect(404)
        .end(done);
    });
  });
});
