const request = require("supertest");
const { createApp } = require("../app");
const { createAuthToken } = require("../src/utils/helpers");

describe("Endpoints CRUD de clientes", () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  const validToken = `Bearer ${createAuthToken(1, { username: "admin", role: "admin" })}`;

  describe("GET /api/customers - Listar Clientes", () => {
    it("debe obtener lista de todos los clientes", (done) => {
      request(app)
        .get("/api/customers")
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

    it("debe filtrar clientes por búsqueda de nombre", (done) => {
      request(app)
        .get("/api/customers?search=Juan")
        .set("Authorization", validToken)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.success).toBe(true);
          expect(res.body.data.length).toBeGreaterThan(0);
          expect(res.body.data[0].name).toContain("Juan");
          done();
        });
    });

    it("debe filtrar clientes por búsqueda de email", (done) => {
      request(app)
        .get("/api/customers?search=maria")
        .set("Authorization", validToken)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.success).toBe(true);
          expect(res.body.data.length).toBeGreaterThan(0);
          done();
        });
    });

    it("debe filtrar clientes por estado", (done) => {
      request(app)
        .get("/api/customers?status=Activo")
        .set("Authorization", validToken)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.success).toBe(true);
          res.body.data.forEach((c) => {
            expect(c.status).toBe("Activo");
          });
          done();
        });
    });

    it("debe ordenar clientes por nombre", (done) => {
      request(app)
        .get("/api/customers?sort=name")
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

    it("debe ordenar clientes por email", (done) => {
      request(app)
        .get("/api/customers?sort=email")
        .set("Authorization", validToken)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.success).toBe(true);
          for (let i = 1; i < res.body.data.length; i++) {
            expect(
              res.body.data[i].email.localeCompare(res.body.data[i - 1].email)
            ).toBeGreaterThanOrEqual(0);
          }
          done();
        });
    });

    it("debe ordenar clientes por gasto total (spending)", (done) => {
      request(app)
        .get("/api/customers?sort=spending")
        .set("Authorization", validToken)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.success).toBe(true);
          for (let i = 1; i < res.body.data.length; i++) {
            expect(res.body.data[i].totalSpent).toBeLessThanOrEqual(
              res.body.data[i - 1].totalSpent
            );
          }
          done();
        });
    });

    it("debe ordenar clientes por número de compras", (done) => {
      request(app)
        .get("/api/customers?sort=purchases")
        .set("Authorization", validToken)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.success).toBe(true);
          for (let i = 1; i < res.body.data.length; i++) {
            expect(res.body.data[i].purchases).toBeLessThanOrEqual(
              res.body.data[i - 1].purchases
            );
          }
          done();
        });
    });

    it("debe ordenar clientes por fecha de registro", (done) => {
      request(app)
        .get("/api/customers?sort=registered")
        .set("Authorization", validToken)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.success).toBe(true);
          for (let i = 1; i < res.body.data.length; i++) {
            const date1 = new Date(res.body.data[i].registeredDate);
            const date2 = new Date(res.body.data[i - 1].registeredDate);
            expect(date1.getTime()).toBeLessThanOrEqual(date2.getTime());
          }
          done();
        });
    });

    it("debe retornar array vacío para búsqueda sin coincidencias", (done) => {
      request(app)
        .get("/api/customers?search=XYZ123NoExiste")
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

    it("debe combinar búsqueda y filtro de estado", (done) => {
      request(app)
        .get("/api/customers?search=Juan&status=Activo")
        .set("Authorization", validToken)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.success).toBe(true);
          res.body.data.forEach((c) => {
            expect(c.status).toBe("Activo");
          });
          done();
        });
    });
  });

  describe("GET /api/customers/:id - Obtener Cliente", () => {
    it("debe obtener un cliente por ID", (done) => {
      request(app)
        .get("/api/customers/1")
        .set("Authorization", validToken)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.success).toBe(true);
          expect(res.body.data.id).toBe(1);
          expect(res.body.data.name).toBe("Juan García");
          done();
        });
    });

    it("debe validar que el cliente tenga todos los campos requeridos", (done) => {
      request(app)
        .get("/api/customers/1")
        .set("Authorization", validToken)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.data).toHaveProperty("id");
          expect(res.body.data).toHaveProperty("name");
          expect(res.body.data).toHaveProperty("email");
          expect(res.body.data).toHaveProperty("phone");
          expect(res.body.data).toHaveProperty("address");
          expect(res.body.data).toHaveProperty("city");
          expect(res.body.data).toHaveProperty("status");
          expect(res.body.data).toHaveProperty("totalSpent");
          expect(res.body.data).toHaveProperty("purchases");
          done();
        });
    });

    it("debe retornar 404 para ID inexistente", (done) => {
      request(app)
        .get("/api/customers/9999")
        .set("Authorization", validToken)
        .expect(404)
        .end(done);
    });
  });

  describe("POST /api/customers - Crear Cliente", () => {
    it("debe crear un nuevo cliente", (done) => {
      const newCustomer = {
        name: "Test Customer",
        email: "test@email.com",
        phone: "22123456",
        address: "Test Address",
        city: "La Paz",
        postalCode: "12345",
      };

      request(app)
        .post("/api/customers")
        .set("Authorization", validToken)
        .send(newCustomer)
        .expect(201)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.success).toBe(true);
          expect(res.body.data.name).toBe("Test Customer");
          expect(res.body.data.email).toBe("test@email.com");
          expect(res.body.data.status).toBe("Activo");
          expect(res.body.data.totalSpent).toBe(0);
          expect(res.body.data.purchases).toBe(0);
          done();
        });
    });

    it("debe validar que el nombre es requerido", (done) => {
      const invalidCustomer = {
        email: "test@email.com",
        phone: "22123456",
      };

      request(app)
        .post("/api/customers")
        .set("Authorization", validToken)
        .send(invalidCustomer)
        .expect(400)
        .end(done);
    });

    it("debe validar que el email es requerido", (done) => {
      const invalidCustomer = {
        name: "Test Customer",
        phone: "22123456",
      };

      request(app)
        .post("/api/customers")
        .set("Authorization", validToken)
        .send(invalidCustomer)
        .expect(400)
        .end(done);
    });

    it("debe validar que el teléfono es requerido", (done) => {
      const invalidCustomer = {
        name: "Test Customer",
        email: "test@email.com",
      };

      request(app)
        .post("/api/customers")
        .set("Authorization", validToken)
        .send(invalidCustomer)
        .expect(400)
        .end(done);
    });

    it("debe validar formato de email", (done) => {
      const invalidCustomer = {
        name: "Test Customer",
        email: "invalid-email",
        phone: "22123456",
      };

      request(app)
        .post("/api/customers")
        .set("Authorization", validToken)
        .send(invalidCustomer)
        .expect(400)
        .end(done);
    });

    it("debe rechazar un teléfono que no tenga 8 dígitos", (done) => {
      const invalidCustomer = {
        name: "Test Customer",
        email: "test@email.com",
        phone: "12345",
      };

      request(app)
        .post("/api/customers")
        .set("Authorization", validToken)
        .send(invalidCustomer)
        .expect(400)
        .end(done);
    });

    it("debe asignar ID automáticamente al crear", (done) => {
      const newCustomer = {
        name: "AutoID Customer",
        email: "autoid@email.com",
        phone: "22123456",
      };

      request(app)
        .post("/api/customers")
        .set("Authorization", validToken)
        .send(newCustomer)
        .expect(201)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.data.id).toBeDefined();
          expect(typeof res.body.data.id).toBe("number");
          done();
        });
    });

    it("debe establecer fecha de registro al crear", (done) => {
      const newCustomer = {
        name: "Date Customer",
        email: "date@email.com",
        phone: "22123456",
      };

      request(app)
        .post("/api/customers")
        .set("Authorization", validToken)
        .send(newCustomer)
        .expect(201)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.data.registeredDate).toBeDefined();
          done();
        });
    });
  });

  describe("PUT /api/customers/:id - Actualizar Cliente", () => {
    it("debe actualizar un cliente existente", (done) => {
      request(app)
        .put("/api/customers/1")
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
        .put("/api/customers/1")
        .set("Authorization", validToken)
        .send({ name: "New Customer Name" })
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.success).toBe(true);
          expect(res.body.data.name).toBe("New Customer Name");
          done();
        });
    });

    it("debe actualizar solo el email", (done) => {
      request(app)
        .put("/api/customers/1")
        .set("Authorization", validToken)
        .send({ email: "newemail@email.com" })
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.success).toBe(true);
          expect(res.body.data.email).toBe("newemail@email.com");
          done();
        });
    });

    it("debe actualizar solo el teléfono", (done) => {
      request(app)
        .put("/api/customers/1")
        .set("Authorization", validToken)
        .send({ phone: "76543210" })
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.success).toBe(true);
          expect(res.body.data.phone).toBe("76543210");
          done();
        });
    });

    it("debe actualizar solo la ciudad", (done) => {
      request(app)
        .put("/api/customers/1")
        .set("Authorization", validToken)
        .send({ city: "Cochabamba" })
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.success).toBe(true);
          expect(res.body.data.city).toBe("Cochabamba");
          done();
        });
    });

    it("debe actualizar solo el estado", (done) => {
      request(app)
        .put("/api/customers/1")
        .set("Authorization", validToken)
        .send({ status: "Inactivo" })
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.success).toBe(true);
          expect(res.body.data.status).toBe("Inactivo");
          done();
        });
    });

    it("debe actualizar múltiples campos", (done) => {
      request(app)
        .put("/api/customers/1")
        .set("Authorization", validToken)
        .send({
          name: "Multi Update Customer",
          email: "multi@email.com",
          phone: "65555555",
          city: "Tarija",
          status: "Activo",
        })
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.success).toBe(true);
          expect(res.body.data.name).toBe("Multi Update Customer");
          expect(res.body.data.email).toBe("multi@email.com");
          expect(res.body.data.phone).toBe("65555555");
          expect(res.body.data.city).toBe("Tarija");
          expect(res.body.data.status).toBe("Activo");
          done();
        });
    });

    it("debe validar email en actualización", (done) => {
      request(app)
        .put("/api/customers/1")
        .set("Authorization", validToken)
        .send({ email: "invalid-email" })
        .expect(400)
        .end(done);
    });

    it("debe validar teléfono en actualización", (done) => {
      request(app)
        .put("/api/customers/1")
        .set("Authorization", validToken)
        .send({ phone: "123" })
        .expect(400)
        .end(done);
    });

    it("debe retornar 404 para ID inexistente", (done) => {
      request(app)
        .put("/api/customers/9999")
        .set("Authorization", validToken)
        .send({ name: "Test" })
        .expect(404)
        .end(done);
    });

    it("no debe actualizar el ID del cliente", (done) => {
      request(app)
        .put("/api/customers/1")
        .set("Authorization", validToken)
        .send({ id: 9999 })
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.data.id).toBe(1);
          done();
        });
    });
  });

  describe("GET /api/customers/cities - Catalogo de ciudades", () => {
    it("debe devolver el catalogo con nombre, prefijo postal y codigo de area", (done) => {
      request(app)
        .get("/api/customers/cities")
        .set("Authorization", validToken)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.count).toBe(res.body.data.length);
          res.body.data.forEach((city) => {
            expect(typeof city.name).toBe("string");
            expect(typeof city.postalPrefix).toBe("string");
            expect(typeof city.areaCode).toBe("string");
          });
          done();
        });
    });

    it("debe incluir las ciudades que usa la semilla", (done) => {
      request(app)
        .get("/api/customers/cities")
        .set("Authorization", validToken)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          const names = res.body.data.map((city) => city.name);
          expect(names).toContain("La Paz");
          expect(names).toContain("Santa Cruz de la Sierra");
          expect(names).toContain("Cochabamba");
          done();
        });
    });

    // La ruta se declara antes de GET /:id; si se invirtiera el orden, Express
    // resolveria "cities" como un id y devolveria 404 en vez del catalogo.
    it("no debe quedar tapada por la ruta GET /:id", (done) => {
      request(app)
        .get("/api/customers/cities")
        .set("Authorization", validToken)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.error).toBeUndefined();
          done();
        });
    });

    it("debe exigir token", (done) => {
      request(app).get("/api/customers/cities").expect(401).end(done);
    });
  });

  describe("Validacion de ciudad contra el catalogo", () => {
    it("debe rechazar una ciudad que no esta en el catalogo al crear", (done) => {
      request(app)
        .post("/api/customers")
        .set("Authorization", validToken)
        .send({
          name: "Cliente Fuera de Catalogo",
          email: "fuera@email.com",
          phone: "22123456",
          city: "Madrid",
        })
        .expect(400)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.code).toBe("INVALID_CITY");
          done();
        });
    });

    it("debe rechazar una ciudad fuera del catalogo al actualizar", (done) => {
      request(app)
        .put("/api/customers/1")
        .set("Authorization", validToken)
        .send({ city: "Barcelona" })
        .expect(400)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.code).toBe("INVALID_CITY");
          done();
        });
    });

    it("debe aceptar que la ciudad venga vacia, porque es opcional", (done) => {
      request(app)
        .post("/api/customers")
        .set("Authorization", validToken)
        .send({
          name: "Cliente Sin Ciudad",
          email: "sinciudad@email.com",
          phone: "22123456",
          city: "",
        })
        .expect(201)
        .end(done);
    });
  });

  describe("Formato de telefono boliviano", () => {
    it("debe aceptar 8 digitos de linea fija", (done) => {
      request(app)
        .post("/api/customers")
        .set("Authorization", validToken)
        .send({ name: "Fija", email: "fija@email.com", phone: "44345678" })
        .expect(201)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.data.phone).toBe("44345678");
          done();
        });
    });

    it("debe guardar sin codigo de pais cuando llega con +591", (done) => {
      request(app)
        .post("/api/customers")
        .set("Authorization", validToken)
        .send({ name: "Heredado", email: "heredado@email.com", phone: "+591 76543210" })
        .expect(201)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.data.phone).toBe("76543210");
          done();
        });
    });

    it("debe rechazar un numero de 10 digitos, que la regla anterior aceptaba", (done) => {
      request(app)
        .post("/api/customers")
        .set("Authorization", validToken)
        .send({ name: "Largo", email: "largo@email.com", phone: "1234567890" })
        .expect(400)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.code).toBe("INVALID_PHONE");
          done();
        });
    });

    it("debe rechazar 8 digitos que empiecen en un digito imposible", (done) => {
      request(app)
        .post("/api/customers")
        .set("Authorization", validToken)
        .send({ name: "Raro", email: "raro@email.com", phone: "12345678" })
        .expect(400)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.code).toBe("INVALID_PHONE");
          done();
        });
    });
  });

  describe("Borrado logico", () => {
    // La baja es logica porque con borrado fisico esta peticion fallaba con 500
    // en modo base de datos (P2003, sales_customer_id_fkey) y en memoria dejaba
    // las ventas apuntando a un id inexistente. Desde el 06-10-2026, ademas, un
    // cliente con ventas no se da de baja en absoluto: se rechaza antes.
    it("rechaza borrar un cliente que tiene ventas", async () => {
      const ventas = await request(app)
        .get("/api/sales")
        .set("Authorization", validToken)
        .expect(200);

      const venta = ventas.body.data.find((s) => s.customerId);
      expect(venta).toBeDefined();

      const res = await request(app)
        .delete(`/api/customers/${venta.customerId}`)
        .set("Authorization", validToken)
        .expect(409);

      expect(res.body.code).toBe("CUSTOMER_HAS_SALES");
      expect(res.body.error).toMatch(/ya tiene ventas registradas/i);
      expect(res.body.data.sales).toBeGreaterThan(0);

      // Y sigue estando.
      await request(app)
        .get(`/api/customers/${venta.customerId}`)
        .set("Authorization", validToken)
        .expect(200);
    });

    it("no debe mostrar al cliente borrado en el listado", (done) => {
      request(app)
        .post("/api/customers")
        .set("Authorization", validToken)
        .send({ name: "Cliente A Borrar", email: "borrar@email.com", phone: "22123456" })
        .expect(201)
        .end((err, res) => {
          if (err) return done(err);
          const id = res.body.data.id;

          request(app)
            .delete(`/api/customers/${id}`)
            .set("Authorization", validToken)
            .expect(200)
            .end((delErr) => {
              if (delErr) return done(delErr);

              request(app)
                .get("/api/customers")
                .set("Authorization", validToken)
                .expect(200)
                .end((listErr, listRes) => {
                  if (listErr) return done(listErr);
                  expect(listRes.body.data.some((c) => c.id === id)).toBe(false);
                  done();
                });
            });
        });
    });

    it("debe responder 404 al consultar un cliente borrado", (done) => {
      request(app)
        .post("/api/customers")
        .set("Authorization", validToken)
        .send({ name: "Cliente Fantasma", email: "fantasma@email.com", phone: "22123456" })
        .expect(201)
        .end((err, res) => {
          if (err) return done(err);
          const id = res.body.data.id;

          request(app)
            .delete(`/api/customers/${id}`)
            .set("Authorization", validToken)
            .expect(200)
            .end((delErr) => {
              if (delErr) return done(delErr);
              request(app)
                .get(`/api/customers/${id}`)
                .set("Authorization", validToken)
                .expect(404)
                .end(done);
            });
        });
    });

    it("debe responder 404 al borrar dos veces el mismo cliente", (done) => {
      request(app)
        .post("/api/customers")
        .set("Authorization", validToken)
        .send({ name: "Cliente Doble", email: "doble@email.com", phone: "22123456" })
        .expect(201)
        .end((err, res) => {
          if (err) return done(err);
          const id = res.body.data.id;

          request(app)
            .delete(`/api/customers/${id}`)
            .set("Authorization", validToken)
            .expect(200)
            .end((delErr) => {
              if (delErr) return done(delErr);
              request(app)
                .delete(`/api/customers/${id}`)
                .set("Authorization", validToken)
                .expect(404)
                .end(done);
            });
        });
    });

    it("no debe permitir vender a un cliente borrado", (done) => {
      request(app)
        .post("/api/customers")
        .set("Authorization", validToken)
        .send({ name: "Cliente Sin Ventas", email: "sinventas@email.com", phone: "22123456" })
        .expect(201)
        .end((err, res) => {
          if (err) return done(err);
          const id = res.body.data.id;

          request(app)
            .delete(`/api/customers/${id}`)
            .set("Authorization", validToken)
            .expect(200)
            .end((delErr) => {
              if (delErr) return done(delErr);
              request(app)
                .post("/api/sales")
                .set("Authorization", validToken)
                .send({
                  customerId: id,
                  items: [{ productId: 1, quantity: 1 }],
                  paymentMethod: "Efectivo",
                })
                .expect(404)
                .end(done);
            });
        });
    });

    it("debe conservar las ventas del cliente borrado con sus datos", (done) => {
      request(app)
        .get("/api/sales")
        .set("Authorization", validToken)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          const venta = res.body.data.find((s) => s.customerId);

          request(app)
            .delete(`/api/customers/${venta.customerId}`)
            .set("Authorization", validToken)
            .end((delErr) => {
              if (delErr) return done(delErr);

              request(app)
                .get(`/api/sales/${venta.id}`)
                .set("Authorization", validToken)
                .expect(200)
                .end((saleErr, saleRes) => {
                  if (saleErr) return done(saleErr);
                  // La venta sigue existiendo y conserva a quien se le vendio.
                  expect(saleRes.body.data.customerId).toBe(venta.customerId);
                  expect(saleRes.body.data.customerName).toBe(venta.customerName);
                  done();
                });
            });
        });
    });
  });

  describe("DELETE /api/customers/:id - Eliminar Cliente", () => {
    // Los veinte clientes de la semilla tienen ventas, asi que el unico borrable
    // es uno recien creado. Es justo lo que la regla busca.
    const crearCliente = async (sufijo) => {
      const res = await request(app)
        .post("/api/customers")
        .set("Authorization", validToken)
        .send({
          name: `Cliente sin ventas ${sufijo}`,
          email: `sin.ventas.${sufijo}@email.com`,
          phone: "22123456",
        })
        .expect(201);

      return res.body.data.id;
    };

    it("debe eliminar un cliente que no tiene ventas", async () => {
      const id = await crearCliente("a");

      const res = await request(app)
        .delete(`/api/customers/${id}`)
        .set("Authorization", validToken)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it("debe retornar el cliente eliminado", async () => {
      const id = await crearCliente("b");

      const res = await request(app)
        .delete(`/api/customers/${id}`)
        .set("Authorization", validToken)
        .expect(200);

      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBe(id);
    });

    it("debe retornar 404 para ID inexistente", (done) => {
      request(app)
        .delete("/api/customers/9999")
        .set("Authorization", validToken)
        .expect(404)
        .end(done);
    });

    it("no debe permitir acceder a cliente eliminado", async () => {
      const id = await crearCliente("c");

      await request(app)
        .delete(`/api/customers/${id}`)
        .set("Authorization", validToken)
        .expect(200);

      await request(app)
        .get(`/api/customers/${id}`)
        .set("Authorization", validToken)
        .expect(404);
    });

    it("debe retornar 403 cuando el usuario no es admin", (done) => {
      const vendedorToken = `Bearer ${createAuthToken(2, { username: "demo", role: "vendedor" })}`;

      request(app)
        .delete("/api/customers/2")
        .set("Authorization", vendedorToken)
        .expect(403)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.code).toBe("FORBIDDEN_ROLE");
          done();
        });
    });
  });
});
