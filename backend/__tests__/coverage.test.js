const request = require("supertest");
const { createApp } = require("../app");

describe("Pruebas adicionales de cobertura de API", () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  describe("Casos límite de autenticación", () => {
    test("debe fallar con formato válido pero token de usuario inexistente", async () => {
      const response = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer mock-jwt-token-999")
        .expect(401);

      expect(response.body).toEqual(
        expect.objectContaining({
          error: "Token inválido",
          code: "INVALID_TOKEN",
        })
      );
    });

    test("debe fallar con token de usuario ID cero", async () => {
      const response = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer mock-jwt-token-0")
        .expect(401);

      expect(response.body).toEqual(
        expect.objectContaining({
          error: "Token inválido",
          code: "INVALID_TOKEN",
        })
      );
    });

    test("debe manejar token con ID de usuario negativo", async () => {
      const response = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer mock-jwt-token--1")
        .expect(401);

      expect(response.body).toEqual(
        expect.objectContaining({
          error: "Token inválido", 
          code: "INVALID_TOKEN",
        })
      );
    });
  });

  describe("Casos límite de login", () => {
    test("debe manejar usernames muy largos", async () => {
      const longUsername = "a".repeat(1000);
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          username: longUsername,
          password: "demo123",
        })
        .expect(401);

      expect(response.body.code).toBe("INVALID_CREDENTIALS");
    });

    test("debe manejar caracteres especiales en credenciales", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          username: "admin<script>alert('xss')</script>",
          password: "admin123",
        })
        .expect(401);

      expect(response.body.code).toBe("INVALID_CREDENTIALS");
    });

    test("debe manejar username nulo", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          username: null,
          password: "demo123",
        })
        .expect(400);

      expect(response.body.code).toBe("MISSING_CREDENTIALS");
    });

    test("debe manejar password nulo", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          username: "demo",
          password: null,
        })
        .expect(400);

      expect(response.body.code).toBe("MISSING_CREDENTIALS");
    });

    test("debe manejar número como username", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          username: 12345,
          password: "demo123",
        })
        .expect(400);

      expect(response.body.code).toBe("INVALID_CREDENTIALS_TYPE");
    });

    test("debe manejar número como password", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          username: "demo",
          password: 12345,
        })
        .expect(400);

      expect(response.body.code).toBe("INVALID_CREDENTIALS_TYPE");
    });

    test("debe manejar booleano como username", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          username: true,
          password: "demo123",
        })
        .expect(400);

      expect(response.body.code).toBe("INVALID_CREDENTIALS_TYPE");
    });

    test("debe manejar booleano como password", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          username: "demo",
          password: false,
        })
        .expect(400);

      expect(response.body.code).toBe("MISSING_CREDENTIALS");
    });

    test("debe manejar objeto como username", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          username: { name: "demo" },
          password: "demo123",
        })
        .expect(400);

      expect(response.body.code).toBe("INVALID_CREDENTIALS_TYPE");
    });

    test("debe manejar objeto como password", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          username: "demo",
          password: { pass: "demo123" },
        })
        .expect(400);

      expect(response.body.code).toBe("INVALID_CREDENTIALS_TYPE");
    });

    test("debe manejar arreglo como username", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          username: ["demo"],
          password: "demo123",
        })
        .expect(400);

      expect(response.body.code).toBe("INVALID_CREDENTIALS_TYPE");
    });

    test("debe manejar arreglo como password", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          username: "demo",
          password: ["demo123"],
        })
        .expect(400);

      expect(response.body.code).toBe("INVALID_CREDENTIALS_TYPE");
    });
  });

  describe("Casos límite de datos de dashboard", () => {
    test("debe manejar token Bearer malformado en dashboard", async () => {
      const response = await request(app)
        .get("/api/dashboard/data")
        .set("Authorization", "Bearer invalid-format-token")
        .expect(401);

      expect(response.body.code).toBe("INVALID_TOKEN");
    });

    test("debe manejar usuario inexistente en token de dashboard", async () => {
      const response = await request(app)
        .get("/api/dashboard/data")
        .set("Authorization", "Bearer mock-jwt-token-9999")
        .expect(200);

      expect(response.body).toHaveProperty("dailySales");
    });

    test("debe manejar ID de usuario cero en token de dashboard", async () => {
      const response = await request(app)
        .get("/api/dashboard/data")
        .set("Authorization", "Bearer mock-jwt-token-0")
        .expect(200);

      expect(response.body).toHaveProperty("dailySales");
    });
  });

  describe("Pruebas adicionales de seguridad", () => {
    test("debe manejar credenciales en cadena vacía", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          username: "",
          password: "",
        })
        .expect(400);

      expect(response.body.code).toBe("MISSING_CREDENTIALS");
    });

    test("debe manejar credenciales con solo espacios en blanco", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          username: "   ",
          password: "   ",
        })
        .expect(401);

      expect(response.body.code).toBe("INVALID_CREDENTIALS");
    });

    test("debe manejar credenciales con espacios mixtos", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          username: " demo ",
          password: " demo123 ",
        })
        .expect(401);

      expect(response.body.code).toBe("INVALID_CREDENTIALS");
    });
  });

  describe("Pruebas de estrés y rendimiento", () => {
    test("debe manejar intentos rápidos y sucesivos de login", async () => {
      const credentials = { username: "demo", password: "demo123" };
      
      const requests = Array(5).fill().map(() => 
        request(app).post("/api/auth/login").send(credentials)
      );
      
      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    test("debe manejar solicitudes rápidas de dashboard con distintos tokens", async () => {
      const tokens = ["mock-jwt-token-1", "mock-jwt-token-2", "mock-jwt-token-3"];
      
      const requests = tokens.map(token => 
        request(app)
          .get("/api/dashboard/data")
          .set("Authorization", `Bearer ${token}`)
      );
      
      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("dailySales");
      });
    });
  });

  describe("Pruebas de validación de datos", () => {
    test("debe retornar estructura consistente de datos de dashboard", async () => {
      const response = await request(app)
        .get("/api/dashboard/data")
        .set("Authorization", "Bearer mock-jwt-token-1")
        .expect(200);

      expect(response.body).toMatchObject({
        dailySales: expect.any(String),
        branchSales: expect.any(Array),
        salesTrend: expect.any(Array),
        productSales: expect.any(Array),
        timestamp: expect.any(String),
      });
    });

    test("debe retornar timestamp válido en datos de dashboard", async () => {
      const response = await request(app)
        .get("/api/dashboard/data")
        .set("Authorization", "Bearer mock-jwt-token-1")
        .expect(200);

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).not.toBeNaN();
    });

    test("debe retornar estructura consistente de usuario en auth/me", async () => {
      const response = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer mock-jwt-token-1")
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        user: expect.objectContaining({
          id: expect.any(Number),
          username: expect.any(String),
          name: expect.any(String),
        }),
      });

      // Should not include password
      expect(response.body.user.password).toBeUndefined();
    });
  });
});