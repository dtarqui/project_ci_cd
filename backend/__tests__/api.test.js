const request = require("supertest");
const { createApp, mockData } = require("../app");

describe("Pruebas de API Backend", () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  afterAll(() => {
    // Limpiar cualquier recurso si es necesario
  });

  describe("Endpoint de Health Check", () => {
    test("GET /health - debe retornar estado ok", async () => {
      const response = await request(app).get("/health").expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          status: "ok",
          timestamp: expect.any(String),
          uptime: expect.any(Number),
          environment: expect.any(String),
        })
      );
    });

    test("GET /health - debe retornar timestamp válido", async () => {
      const response = await request(app).get("/health").expect(200);

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).not.toBeNaN();
    });
  });

  describe("Endpoints de autenticación", () => {
    describe("POST /api/auth/login", () => {
      test("debe iniciar sesión correctamente con credenciales válidas", async () => {
        const credentials = {
          username: "demo",
          password: "demo123",
        };

        const response = await request(app)
          .post("/api/auth/login")
          .send(credentials)
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          user: {
            id: 2,
            username: "demo",
            name: "Usuario Demo",
          },
          token: "mock-jwt-token-2",
          expiresIn: 3600,
        });
      });

      test("debe iniciar sesión del usuario admin correctamente", async () => {
        const credentials = {
          username: "admin",
          password: "admin123",
        };

        const response = await request(app)
          .post("/api/auth/login")
          .send(credentials)
          .expect(200);

        expect(response.body.user.name).toBe("Administrador");
        expect(response.body.token).toBe("mock-jwt-token-1");
      });

      test("debe fallar con credenciales inválidas", async () => {
        const credentials = {
          username: "wronguser",
          password: "wrongpass",
        };

        const response = await request(app)
          .post("/api/auth/login")
          .send(credentials)
          .expect(401);

        expect(response.body).toEqual({
          error: "Credenciales inválidas",
          code: "INVALID_CREDENTIALS",
        });
      });

      test("debe fallar cuando falta username", async () => {
        const credentials = {
          password: "demo123",
        };

        const response = await request(app)
          .post("/api/auth/login")
          .send(credentials)
          .expect(400);

        expect(response.body).toEqual({
          error: "Usuario y contraseña requeridos",
          code: "MISSING_CREDENTIALS",
        });
      });

      test("debe fallar cuando falta password", async () => {
        const credentials = {
          username: "demo",
        };

        const response = await request(app)
          .post("/api/auth/login")
          .send(credentials)
          .expect(400);

        expect(response.body.code).toBe("MISSING_CREDENTIALS");
      });

      test("debe fallar con credenciales vacías", async () => {
        const credentials = {
          username: "",
          password: "",
        };

        const response = await request(app)
          .post("/api/auth/login")
          .send(credentials)
          .expect(400);

        expect(response.body.code).toBe("MISSING_CREDENTIALS");
      });

      test("debe fallar con tipos de credenciales inválidos", async () => {
        const credentials = {
          username: 123,
          password: true,
        };

        const response = await request(app)
          .post("/api/auth/login")
          .send(credentials)
          .expect(400);

        expect(response.body).toEqual({
          error: "Usuario y contraseña deben ser strings",
          code: "INVALID_CREDENTIALS_TYPE",
        });
      });

      test("no debe retornar password en la respuesta", async () => {
        const credentials = {
          username: "test",
          password: "test123",
        };

        const response = await request(app)
          .post("/api/auth/login")
          .send(credentials)
          .expect(200);

        expect(response.body.user.password).toBeUndefined();
        expect(response.body.user).not.toHaveProperty("password");
      });
    });

    describe("POST /api/auth/logout", () => {
      test("debe cerrar sesión correctamente", async () => {
        const response = await request(app)
          .post("/api/auth/logout")
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          message: "Sesión cerrada correctamente",
          timestamp: expect.any(String),
        });
      });

      test("debe cerrar sesión sin autenticación", async () => {
        // El logout debería funcionar sin token (para limpiar sesión client-side)
        const response = await request(app)
          .post("/api/auth/logout")
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe("GET /api/auth/me", () => {
      test("debe retornar información de usuario con token válido", async () => {
        const response = await request(app)
          .get("/api/auth/me")
          .set("Authorization", "Bearer mock-jwt-token-1")
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          user: {
            id: 1,
            username: "admin",
            name: "Administrador",
          },
        });
      });

      test("debe fallar sin token", async () => {
        const response = await request(app).get("/api/auth/me").expect(401);

        expect(response.body.code).toBe("MISSING_TOKEN");
      });

      test("debe fallar con token inválido", async () => {
        const response = await request(app)
          .get("/api/auth/me")
          .set("Authorization", "Bearer invalid-token")
          .expect(401);

        expect(response.body.code).toBe("INVALID_TOKEN");
      });

      test("debe fallar con token malformado", async () => {
        const response = await request(app)
          .get("/api/auth/me")
          .set("Authorization", "InvalidFormat token")
          .expect(401);

        expect(response.body.code).toBe("MISSING_TOKEN");
      });
    });
  });

  describe("Endpoint de datos de dashboard", () => {
    test("debe retornar datos de dashboard con token válido", async () => {
      const response = await request(app)
        .get("/api/dashboard/data")
        .set("Authorization", "Bearer mock-jwt-token-1")
        .expect(200);

      expect(response.body).toEqual({
        ...mockData,
        timestamp: expect.any(String),
      });
    });

    test("debe fallar sin header de autorización", async () => {
      const response = await request(app)
        .get("/api/dashboard/data")
        .expect(401);

      expect(response.body).toEqual({
        error: "Token de autorización requerido",
        code: "MISSING_AUTH_TOKEN",
      });
    });

    test("debe fallar con formato de token inválido", async () => {
      const response = await request(app)
        .get("/api/dashboard/data")
        .set("Authorization", "InvalidFormat token")
        .expect(401);

      expect(response.body.code).toBe("INVALID_TOKEN_FORMAT");
    });

    test("debe fallar con token inválido", async () => {
      const response = await request(app)
        .get("/api/dashboard/data")
        .set("Authorization", "Bearer invalid-token")
        .expect(401);

      expect(response.body.code).toBe("INVALID_TOKEN");
    });

    test("debe retornar estructura de datos correcta", async () => {
      const response = await request(app)
        .get("/api/dashboard/data")
        .set("Authorization", "Bearer mock-jwt-token-2")
        .expect(200);

      expect(response.body).toHaveProperty("dailySales");
      expect(response.body).toHaveProperty("branchSales");
      expect(response.body).toHaveProperty("salesTrend");
      expect(response.body).toHaveProperty("productSales");
      expect(response.body).toHaveProperty("timestamp");

      // Verificar estructura de arrays
      expect(Array.isArray(response.body.branchSales)).toBe(true);
      expect(Array.isArray(response.body.salesTrend)).toBe(true);
      expect(Array.isArray(response.body.productSales)).toBe(true);

      // Verificar estructura de objetos en arrays
      if (response.body.branchSales.length > 0) {
        expect(response.body.branchSales[0]).toHaveProperty("name");
        expect(response.body.branchSales[0]).toHaveProperty("value");
      }
    });

    test("debe funcionar con diferentes tokens válidos", async () => {
      const tokens = [
        "mock-jwt-token-1",
        "mock-jwt-token-2",
        "mock-jwt-token-3",
      ];

      for (const token of tokens) {
        const response = await request(app)
          .get("/api/dashboard/data")
          .set("Authorization", `Bearer ${token}`)
          .expect(200);

        expect(response.body.dailySales).toBe(mockData.dailySales);
      }
    });
  });

  describe("Manejo de errores", () => {
    test("debe retornar 404 para rutas inexistentes", async () => {
      const response = await request(app)
        .get("/api/non-existent-route")
        .expect(404);

      expect(response.body).toEqual({
        error: "Endpoint no encontrado",
        code: "NOT_FOUND",
        path: "/api/non-existent-route",
        method: "GET",
      });
    });

    test("debe manejar POST a rutas inexistentes", async () => {
      const response = await request(app)
        .post("/api/fake-endpoint")
        .send({ data: "test" })
        .expect(404);

      expect(response.body.method).toBe("POST");
    });

    test("debe manejar JSON malformado", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send('{"invalid": json}')
        .set("Content-Type", "application/json")
        .expect(500);

      // Express maneja JSON malformado como error interno
      expect(response.body.code).toBe("INTERNAL_ERROR");
    });
  });

  describe("Pruebas de integración", () => {
    test("flujo completo de autenticación", async () => {
      // 1. Login
      const loginResponse = await request(app)
        .post("/api/auth/login")
        .send({ username: "demo", password: "demo123" })
        .expect(200);

      const { token } = loginResponse.body;

      // 2. Get user info
      await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      // 3. Get dashboard data
      await request(app)
        .get("/api/dashboard/data")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      // 4. Logout
      await request(app).post("/api/auth/logout").expect(200);
    });

    test("debe manejar solicitudes concurrentes", async () => {
      const requests = [];

      // Crear múltiples requests simultáneas
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app)
            .post("/api/auth/login")
            .send({ username: "demo", password: "demo123" })
        );
      }

      const responses = await Promise.all(requests);

      // Todos deberían ser exitosos
      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe("Pruebas de rendimiento", () => {
    test("health check debe responder rápido", async () => {
      const start = Date.now();

      await request(app).get("/health").expect(200);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100); // Debería responder en menos de 100ms
    });

    test("login debe responder en un tiempo razonable", async () => {
      const start = Date.now();

      await request(app)
        .post("/api/auth/login")
        .send({ username: "demo", password: "demo123" })
        .expect(200);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(500); // Debería responder en menos de 500ms
    });
  });

  describe("Pruebas de seguridad", () => {
    test("no debe exponer información sensible en mensajes de error", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({ username: "admin", password: "wrongpassword" })
        .expect(401);

      // No debería revelar si el usuario existe o no
      expect(response.body.error).not.toContain("admin");
      expect(response.body.error).not.toContain("user not found");
    });

    test("debe manejar intentos de SQL injection de forma segura", async () => {
      const sqlInjection = "'; DROP TABLE users; --";

      const response = await request(app)
        .post("/api/auth/login")
        .send({ username: sqlInjection, password: "password" })
        .expect(401);

      expect(response.body.code).toBe("INVALID_CREDENTIALS");
    });

    test("debe manejar intentos de XSS de forma segura", async () => {
      const xssPayload = '<script>alert("xss")</script>';

      const response = await request(app)
        .post("/api/auth/login")
        .send({ username: xssPayload, password: "password" })
        .expect(401);

      expect(response.body.error).not.toContain("<script>");
    });
  });
});
