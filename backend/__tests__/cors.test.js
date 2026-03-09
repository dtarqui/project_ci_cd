const request = require("supertest");
const { createApp } = require("../app");

describe("Pruebas de configuración CORS", () => {
  let app;

  beforeEach(() => {
    app = createApp();
  });

  describe("Cabeceras CORS globales", () => {
    test("debe permitir origen localhost:3000", async () => {
      const response = await request(app)
        .get("/health")
        .set("Origin", "http://localhost:3000")
        .expect(200);

      expect(response.headers["access-control-allow-origin"]).toBe("*");
    });

    test("debe permitir origen de Vercel", async () => {
      const response = await request(app)
        .get("/health")
        .set("Origin", "https://mi-frontend.vercel.app")
        .expect(200);

      expect(response.headers["access-control-allow-origin"]).toBe("*");
    });

    test("debe incluir métodos permitidos", async () => {
      const response = await request(app)
        .get("/health")
        .set("Origin", "https://mi-frontend.vercel.app")
        .expect(200);

      expect(response.headers["access-control-allow-methods"]).toContain("GET");
      expect(response.headers["access-control-allow-methods"]).toContain("POST");
    });

    test("debe incluir headers permitidos", async () => {
      const response = await request(app)
        .get("/health")
        .set("Origin", "https://mi-frontend.vercel.app")
        .expect(200);

      expect(response.headers["access-control-allow-headers"]).toContain("Authorization");
    });
  });

  describe("Solicitudes preflight CORS", () => {
    test("debe manejar preflight OPTIONS para origen permitido", async () => {
      const response = await request(app)
        .options("/api/auth/login")
        .set("Origin", "http://localhost:3000")
        .set("Access-Control-Request-Method", "POST")
        .set("Access-Control-Request-Headers", "Content-Type");

      expect(response.status).toBeLessThanOrEqual(204);
      expect(response.headers["access-control-allow-origin"]).toBe("*");
      expect(response.headers["access-control-allow-methods"]).toContain("POST");
    });

    test("debe responder preflight sin bloquear por origen", async () => {
      const response = await request(app)
        .options("/api/sales")
        .set("Origin", "https://any-origin.com")
        .set("Access-Control-Request-Method", "GET");

      expect(response.status).toBe(204);
      expect(response.headers["access-control-allow-origin"]).toBe("*");
    });
  });

  describe("Solicitudes sin header Origin", () => {
    test("debe permitir solicitudes sin header Origin (curl, apps móviles)", async () => {
      const response = await request(app).get("/health").expect(200);

      expect(response.body.status).toBe("ok");
    });
  });

  describe("CORS con endpoints autenticados", () => {

    test("debe permitir solicitudes autenticadas desde origen confiable", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .set("Origin", "https://trusted-frontend.vercel.app")
        .send({ username: "demo", password: "demo123" })
        .expect(200);

      expect(response.headers["access-control-allow-origin"]).toBe("*");
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

      expect(dashboardResponse.headers["access-control-allow-origin"]).toBe("*");
    });
  });
});
