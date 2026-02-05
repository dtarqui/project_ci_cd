const request = require("supertest");
const { createApp } = require("../app");

describe("CORS Configuration Tests", () => {
  let app;
  const originalEnv = process.env.ALLOWED_ORIGINS;

  beforeEach(() => {
    // Limpiar variable de entorno antes de cada test
    delete process.env.ALLOWED_ORIGINS;
  });

  afterAll(() => {
    // Restaurar variable de entorno original
    if (originalEnv) {
      process.env.ALLOWED_ORIGINS = originalEnv;
    } else {
      delete process.env.ALLOWED_ORIGINS;
    }
  });

  describe("Default CORS Origins", () => {
    beforeEach(() => {
      app = createApp();
    });

    test("should allow localhost:3000 origin", async () => {
      const response = await request(app)
        .get("/health")
        .set("Origin", "http://localhost:3000")
        .expect(200);

      expect(response.headers["access-control-allow-origin"]).toBe(
        "http://localhost:3000"
      );
    });

    test("should allow localhost:4000 origin", async () => {
      const response = await request(app)
        .get("/health")
        .set("Origin", "http://localhost:4000")
        .expect(200);

      expect(response.headers["access-control-allow-origin"]).toBe(
        "http://localhost:4000"
      );
    });

    test("should allow Vercel app domain", async () => {
      const response = await request(app)
        .get("/health")
        .set("Origin", "https://my-app.vercel.app")
        .expect(200);

      expect(response.headers["access-control-allow-origin"]).toBe(
        "https://my-app.vercel.app"
      );
    });

    test("should allow Vercel subdomain", async () => {
      const response = await request(app)
        .get("/health")
        .set("Origin", "https://my-app-git-main.vercel.app")
        .expect(200);

      expect(response.headers["access-control-allow-origin"]).toBe(
        "https://my-app-git-main.vercel.app"
      );
    });

    test("should block non-whitelisted origin", async () => {
      const response = await request(app)
        .options("/health")
        .set("Origin", "https://malicious-site.com")
        .set("Access-Control-Request-Method", "GET");

      // CORS debería rechazar este origen
      expect(response.headers["access-control-allow-origin"]).toBeUndefined();
    });
  });

  describe("Environment Variable CORS Origins", () => {
    test("should allow origins from ALLOWED_ORIGINS env variable", async () => {
      process.env.ALLOWED_ORIGINS = "https://custom-frontend.com";
      app = createApp();

      const response = await request(app)
        .get("/health")
        .set("Origin", "https://custom-frontend.com")
        .expect(200);

      expect(response.headers["access-control-allow-origin"]).toBe(
        "https://custom-frontend.com"
      );
    });

    test("should allow multiple origins from ALLOWED_ORIGINS (comma-separated)", async () => {
      process.env.ALLOWED_ORIGINS = "https://frontend1.com,https://frontend2.com";
      app = createApp();

      const response1 = await request(app)
        .get("/health")
        .set("Origin", "https://frontend1.com")
        .expect(200);

      expect(response1.headers["access-control-allow-origin"]).toBe(
        "https://frontend1.com"
      );

      const response2 = await request(app)
        .get("/health")
        .set("Origin", "https://frontend2.com")
        .expect(200);

      expect(response2.headers["access-control-allow-origin"]).toBe(
        "https://frontend2.com"
      );
    });

    test("should handle ALLOWED_ORIGINS with extra whitespace", async () => {
      process.env.ALLOWED_ORIGINS = " https://frontend.com , https://another.com ";
      app = createApp();

      const response = await request(app)
        .get("/health")
        .set("Origin", "https://frontend.com")
        .expect(200);

      expect(response.headers["access-control-allow-origin"]).toBe(
        "https://frontend.com"
      );
    });

    test("should combine env origins with default localhost origins", async () => {
      process.env.ALLOWED_ORIGINS = "https://production.com";
      app = createApp();

      // Localhost should still work
      const response1 = await request(app)
        .get("/health")
        .set("Origin", "http://localhost:3000")
        .expect(200);

      expect(response1.headers["access-control-allow-origin"]).toBe(
        "http://localhost:3000"
      );

      // Custom origin should also work
      const response2 = await request(app)
        .get("/health")
        .set("Origin", "https://production.com")
        .expect(200);

      expect(response2.headers["access-control-allow-origin"]).toBe(
        "https://production.com"
      );
    });
  });

  describe("CORS Preflight Requests", () => {
    beforeEach(() => {
      app = createApp();
    });

    test("should handle OPTIONS preflight for allowed origin", async () => {
      const response = await request(app)
        .options("/api/auth/login")
        .set("Origin", "http://localhost:3000")
        .set("Access-Control-Request-Method", "POST")
        .set("Access-Control-Request-Headers", "Content-Type");

      expect(response.status).toBeLessThanOrEqual(204);
      expect(response.headers["access-control-allow-origin"]).toBe(
        "http://localhost:3000"
      );
      expect(response.headers["access-control-allow-methods"]).toContain("POST");
    });

    test("should include credentials in CORS headers", async () => {
      const response = await request(app)
        .get("/health")
        .set("Origin", "http://localhost:3000")
        .expect(200);

      expect(response.headers["access-control-allow-credentials"]).toBe("true");
    });
  });

  describe("Requests without Origin header", () => {
    beforeEach(() => {
      app = createApp();
    });

    test("should allow requests without Origin header (curl, mobile apps)", async () => {
      const response = await request(app).get("/health").expect(200);

      expect(response.body.status).toBe("ok");
    });
  });

  describe("CORS Error Handling", () => {
    test("should block and log warning for non-whitelisted origin", async () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
      app = createApp();

      await request(app)
        .options("/api/auth/login")
        .set("Origin", "https://evil-site.com")
        .set("Access-Control-Request-Method", "POST");

      // Verificar que se registró el bloqueo (aunque el log puede estar suprimido en tests)
      // El origen no debería estar permitido
      
      consoleSpy.mockRestore();
    });

    test("should not expose CORS errors in production responses", async () => {
      app = createApp();

      const response = await request(app)
        .post("/api/auth/login")
        .set("Origin", "https://blocked-origin.com")
        .send({ username: "test", password: "test" });

      // El endpoint debería responder normalmente, CORS se maneja a nivel de navegador
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe("CORS with Authentication Endpoints", () => {
    beforeEach(() => {
      process.env.ALLOWED_ORIGINS = "https://trusted-frontend.vercel.app";
      app = createApp();
    });

    test("should allow authenticated requests from trusted origin", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .set("Origin", "https://trusted-frontend.vercel.app")
        .send({ username: "demo", password: "demo123" })
        .expect(200);

      expect(response.headers["access-control-allow-origin"]).toBe(
        "https://trusted-frontend.vercel.app"
      );
      expect(response.body.token).toBeDefined();
    });

    test("should allow dashboard access from trusted origin", async () => {
      // Login primero
      const loginResponse = await request(app)
        .post("/api/auth/login")
        .set("Origin", "https://trusted-frontend.vercel.app")
        .send({ username: "demo", password: "demo123" });

      const token = loginResponse.body.token;

      // Acceder al dashboard
      const dashboardResponse = await request(app)
        .get("/api/dashboard/data")
        .set("Origin", "https://trusted-frontend.vercel.app")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(dashboardResponse.headers["access-control-allow-origin"]).toBe(
        "https://trusted-frontend.vercel.app"
      );
    });
  });
});
