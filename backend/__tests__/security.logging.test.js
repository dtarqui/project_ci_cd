/**
 * Cabeceras de seguridad, limite de intentos de inicio de sesion y registro
 * estructurado.
 */

const request = require("supertest");
const { createApp } = require("../app");
const {
  SECURITY_HEADERS,
  clientIp,
  createLoginAttemptLimiter,
} = require("../src/middleware/security");
const { logEvent, requestLogger, setLogSink } = require("../src/utils/logger");
const { errorHandler } = require("../src/middleware/auth");

const withLogLevel = async (level, fn) => {
  const previous = process.env.LOG_LEVEL;
  process.env.LOG_LEVEL = level;
  const lines = [];
  const previousSink = setLogSink((line) => lines.push(JSON.parse(line)));
  try {
    await fn(lines);
  } finally {
    setLogSink(previousSink);
    if (previous === undefined) delete process.env.LOG_LEVEL;
    else process.env.LOG_LEVEL = previous;
  }
};

describe("cabeceras de seguridad", () => {
  it("todas las respuestas llevan las cabeceras y no revelan el framework", async () => {
    const res = await request(createApp()).get("/health").expect(200);

    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      expect(res.headers[name.toLowerCase()]).toBe(value);
    }
    expect(res.headers["x-powered-by"]).toBeUndefined();
    expect(res.headers["x-request-id"]).toBeDefined();
  });

  it("reutiliza el identificador de Vercel como identificador de la peticion", async () => {
    const res = await request(createApp()).get("/health").set("x-vercel-id", "gru1::abc").expect(200);
    expect(res.headers["x-request-id"]).toBe("gru1::abc");
  });

  it("la preflight de CORS admite la cabecera Idempotency-Key", async () => {
    const res = await request(createApp())
      .options("/api/sales")
      .set("Origin", "https://frontend.example")
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "idempotency-key");
    expect(res.headers["access-control-allow-headers"]).toContain("Idempotency-Key");
  });
});

describe("createLoginAttemptLimiter", () => {
  const req = (username = "ana", ip = "1.1.1.1") => ({
    body: { username },
    ip,
    get: () => undefined,
  });

  it("bloquea al alcanzar el maximo y libera al vencer la ventana", () => {
    let now = 0;
    const limiter = createLoginAttemptLimiter({ maxAttempts: 3, windowMs: 1000, now: () => now });

    expect(limiter.check(req())).toEqual({ blocked: false });
    limiter.registerFailure(req());
    limiter.registerFailure(req());
    expect(limiter.check(req()).blocked).toBe(false);
    expect(limiter.registerFailure(req())).toBe(3);

    now = 400;
    expect(limiter.check(req())).toEqual({ blocked: true, retryAfterSeconds: 1 });
    // Otro usuario desde la misma IP no se ve afectado.
    expect(limiter.check(req("beto")).blocked).toBe(false);

    now = 1000;
    expect(limiter.check(req()).blocked).toBe(false);
    expect(limiter.registerFailure(req())).toBe(1);
  });

  it("reset borra los fallos tras un inicio de sesion correcto", () => {
    const limiter = createLoginAttemptLimiter({ maxAttempts: 1 });
    limiter.registerFailure(req());
    expect(limiter.check(req()).blocked).toBe(true);
    limiter.reset(req());
    expect(limiter.check(req()).blocked).toBe(false);
  });

  it("usa los valores por defecto", () => {
    const limiter = createLoginAttemptLimiter();
    for (let i = 0; i < 4; i += 1) limiter.registerFailure(req("x"));
    expect(limiter.check(req("x")).blocked).toBe(false);
    limiter.registerFailure(req("x"));
    expect(limiter.check(req("x")).blocked).toBe(true);
  });

  it("clientIp prefiere las cabeceras de Vercel", () => {
    const headers = { "x-vercel-forwarded-for": "9.9.9.9", "x-real-ip": "8.8.8.8" };
    expect(clientIp({ get: (h) => headers[h], ip: "1.1.1.1" })).toBe("9.9.9.9");
    expect(clientIp({ get: (h) => (h === "x-real-ip" ? "8.8.8.8" : undefined), ip: "1.1.1.1" })).toBe("8.8.8.8");
    expect(clientIp({ get: () => undefined, ip: "1.1.1.1" })).toBe("1.1.1.1");
    expect(clientIp({ get: () => undefined })).toBe("desconocida");
  });
});

describe("limite de intentos en /api/auth/login", () => {
  it("responde 429 con Retry-After tras cinco fallos y registra los eventos", async () => {
    const app = createApp();

    await withLogLevel("info", async (lines) => {
      for (let i = 0; i < 5; i += 1) {
        await request(app)
          .post("/api/auth/login")
          .set("x-real-ip", "10.0.0.1")
          .send({ username: "victima", password: "Incorrecta1" })
          .expect(401);
      }

      const blocked = await request(app)
        .post("/api/auth/login")
        .set("x-real-ip", "10.0.0.1")
        .send({ username: "victima", password: "Incorrecta1" })
        .expect(429);

      expect(blocked.body.code).toBe("TOO_MANY_LOGIN_ATTEMPTS");
      expect(Number(blocked.headers["retry-after"])).toBeGreaterThan(0);

      const events = lines.map((line) => line.event);
      expect(events.filter((e) => e === "auth.login_failed")).toHaveLength(5);
      expect(events).toContain("auth.login_blocked");
      expect(lines.find((line) => line.event === "auth.login_failed")).not.toHaveProperty("password");
    });
  });

  it("un inicio de sesion correcto reinicia el contador", async () => {
    const app = createApp();
    const login = (password) =>
      request(app).post("/api/auth/login").set("x-real-ip", "10.0.0.2").send({ username: "demo", password });

    for (let i = 0; i < 4; i += 1) await login("Incorrecta1").expect(401);
    await login("demo123").expect(200);
    for (let i = 0; i < 4; i += 1) await login("Incorrecta1").expect(401);
    await login("demo123").expect(200);
  });
});

describe("registro estructurado", () => {
  it("filtra por nivel y escribe JSON", async () => {
    await withLogLevel("warn", async (lines) => {
      expect(logEvent("info", "ignorado")).toBe(false);
      expect(logEvent("error", "visible", { a: 1 })).toBe(true);
      expect(logEvent("otro", "nivel desconocido")).toBe(false);
      expect(lines).toHaveLength(1);
      expect(lines[0]).toMatchObject({ level: "error", event: "visible", a: 1 });
      expect(typeof lines[0].time).toBe("string");
    });
  });

  it("en pruebas no escribe nada por defecto", () => {
    const previous = process.env.LOG_LEVEL;
    delete process.env.LOG_LEVEL;
    try {
      expect(logEvent("error", "silencio")).toBe(false);
    } finally {
      if (previous !== undefined) process.env.LOG_LEVEL = previous;
    }
  });

  it("un nivel configurado desconocido equivale a info", async () => {
    await withLogLevel("raro", async (lines) => {
      expect(logEvent("debug", "no")).toBe(false);
      expect(logEvent("info", "si")).toBe(true);
      expect(lines).toHaveLength(1);
    });
  });

  it("registra cada peticion con su estado y duracion", async () => {
    await withLogLevel("info", async (lines) => {
      await request(createApp()).get("/health?x=1").expect(200);
      await request(createApp()).get("/no-existe").expect(404);

      const requests = lines.filter((line) => line.event === "http.request");
      expect(requests[0]).toMatchObject({ method: "GET", path: "/health", status: 200, level: "info" });
      expect(typeof requests[0].durationMs).toBe("number");
      expect(requests[1]).toMatchObject({ path: "/no-existe", status: 404 });
    });
  });

  it("registra con nivel error las respuestas 5xx", async () => {
    await withLogLevel("info", async (lines) => {
      const handlers = {};
      const req = { get: () => undefined, method: "GET", originalUrl: "/x" };
      const res = {
        statusCode: 503,
        setHeader: jest.fn(),
        on: (event, fn) => {
          handlers[event] = fn;
        },
      };
      requestLogger(req, res, jest.fn());
      handlers.finish();
      expect(lines[0]).toMatchObject({ level: "error", status: 503, userId: null });
    });
  });

  it("el manejador de errores registra el codigo del error", async () => {
    await withLogLevel("error", async (lines) => {
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      errorHandler(Object.assign(new Error("caida"), { code: "P1001" }), { requestId: "r1", method: "GET", originalUrl: "/api/x?y=1" }, res, jest.fn());
      errorHandler(null, {}, res, jest.fn());

      expect(lines[0]).toMatchObject({
        event: "http.unhandled_error",
        requestId: "r1",
        path: "/api/x",
        errorCode: "P1001",
        message: "caida",
      });
      expect(lines[1]).toMatchObject({ errorCode: null, errorName: "Error" });
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
