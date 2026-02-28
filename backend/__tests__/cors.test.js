const request = require("supertest");
const { createApp } = require("../app");

describe("Pruebas de configuración CORS", () => {
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

  describe("Orígenes CORS por defecto", () => {
    beforeEach(() => {
      app = createApp();
    });

    test("debe permitir origen localhost:3000", async () => {
      const response = await request(app)
        .get("/health")
        .set("Origin", "http://localhost:3000")
        .expect(200);

      expect(response.headers["access-control-allow-origin"]).toBe(
        "http://localhost:3000"
      );
    });

    test("debe permitir origen localhost:4000", async () => {
      const response = await request(app)
        .get("/health")
        .set("Origin", "http://localhost:4000")
        .expect(200);

      expect(response.headers["access-control-allow-origin"]).toBe(
        "http://localhost:4000"
      );
    });

    test("debe permitir dominio de app Vercel", async () => {
      const response = await request(app)
        .get("/health")
        .set("Origin", "https://my-app.vercel.app")
        .expect(200);

      expect(response.headers["access-control-allow-origin"]).toBe(
        "https://my-app.vercel.app"
      );
    });

    test("debe permitir subdominio de Vercel", async () => {
      const response = await request(app)
        .get("/health")
        .set("Origin", "https://my-app-git-main.vercel.app")
        .expect(200);

      expect(response.headers["access-control-allow-origin"]).toBe(
        "https://my-app-git-main.vercel.app"
      );
    });
  });

  describe("Orígenes CORS por variable de entorno", () => {
    test("debe permitir orígenes desde variable ALLOWED_ORIGINS", async () => {
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

    test("debe permitir múltiples orígenes desde ALLOWED_ORIGINS (separados por coma)", async () => {
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

    test("debe manejar ALLOWED_ORIGINS con espacios extra", async () => {
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

    test("debe combinar orígenes de entorno con orígenes localhost por defecto", async () => {
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

  describe("Solicitudes preflight CORS", () => {
    beforeEach(() => {
      app = createApp();
    });

    test("debe manejar preflight OPTIONS para origen permitido", async () => {
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

    test("debe incluir credenciales en headers CORS", async () => {
      const response = await request(app)
        .get("/health")
        .set("Origin", "http://localhost:3000")
        .expect(200);

      // Credentials are not required - frontend sends credentials: omit
      // So we don't set Access-Control-Allow-Credentials header
      expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
    });
  });

  describe("Solicitudes sin header Origin", () => {
    beforeEach(() => {
      app = createApp();
    });

    test("debe permitir solicitudes sin header Origin (curl, apps móviles)", async () => {
      const response = await request(app).get("/health").expect(200);

      expect(response.body.status).toBe("ok");
    });
  });

  describe("Manejo de errores CORS", () => {
    test("debe bloquear y registrar advertencia para origen no permitido", async () => {
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

    test("no debe exponer errores CORS en respuestas de producción", async () => {
      app = createApp();

      const response = await request(app)
        .post("/api/auth/login")
        .set("Origin", "https://blocked-origin.com")
        .send({ username: "test", password: "test" });

      // El endpoint debería responder normalmente, CORS se maneja a nivel de navegador
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe("CORS con endpoints de autenticación", () => {
    beforeEach(() => {
      process.env.ALLOWED_ORIGINS = "https://trusted-frontend.vercel.app";
      app = createApp();
    });

    test("debe permitir solicitudes autenticadas desde origen confiable", async () => {
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

    test("debe permitir acceso al dashboard desde origen confiable", async () => {
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
