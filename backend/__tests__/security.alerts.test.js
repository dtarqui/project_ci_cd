/**
 * Alertas de seguridad: cuenta bloqueada, rafaga de accesos denegados, consulta del
 * administrador y envio al webhook (modo memoria).
 */

const http = require("http");
const request = require("supertest");
const { createApp } = require("../app");
const { createAuthToken } = require("../src/utils/helpers");
const { resetDataStore, getMockData } = require("../src/db/dataStore");
const { clearSessionCache } = require("../src/services/sessionService");
const { raiseAlert, summarizeAlert, createAccessDeniedMonitor } = require("../src/services/securityAlerts");
const { InMemorySecurityAlertRepository } = require("../src/repositories/securityAlertRepository");
const { setLogSink } = require("../src/utils/logger");

// En los datos de prueba, el usuario 1 es administrador y el 2, vendedor.
const bearer = (id) => `Bearer ${createAuthToken(id, { username: `usuario${id}` })}`;
const alertas = () => getMockData().securityAlerts || [];

beforeEach(() => {
  resetDataStore();
  clearSessionCache();
  delete process.env.SECURITY_ALERT_WEBHOOK_URL;
});

describe("Reglas de alerta", () => {
  it("al bloquear una cuenta por intentos fallidos emite una alerta alta, una sola vez", async () => {
    const app = createApp();
    const intento = () =>
      request(app).post("/api/v1/auth/login").send({ username: "Intruso", password: "Incorrecta1" });

    for (let i = 0; i < 5; i += 1) {
      await intento().expect(401);
    }
    await intento().expect(429);

    expect(alertas()).toHaveLength(1);
    expect(alertas()[0]).toMatchObject({
      type: "account_locked",
      severity: "high",
      username: "intruso",
      details: { failures: 5 },
    });
  });

  it("una ráfaga de accesos denegados del mismo usuario emite una alerta media", async () => {
    const app = createApp();

    for (let i = 0; i < 5; i += 1) {
      await request(app).delete("/api/v1/products/1").set("Authorization", bearer(2)).expect(403);
    }

    expect(alertas()).toHaveLength(1);
    expect(alertas()[0]).toMatchObject({
      type: "access_denied_burst",
      severity: "medium",
      userId: 2,
      details: { count: 5, lastPath: "/api/v1/products/1" },
    });
  });

  it("el contador de accesos denegados reinicia la ventana", () => {
    let ahora = 0;
    const monitor = createAccessDeniedMonitor({ threshold: 2, windowMs: 1000, now: () => ahora });

    expect(monitor.record(7)).toBe(false);
    ahora = 2000;
    expect(monitor.record(7)).toBe(false);
    expect(monitor.record(7)).toBe(true);
  });
});

describe("Consulta de alertas", () => {
  it("el administrador lista las alertas de la más reciente a la más antigua; un vendedor no", async () => {
    const app = createApp();
    await raiseAlert({ type: "account_locked", severity: "high", username: "a" });
    await raiseAlert({ type: "refresh_token_reuse", severity: "critical", userId: 2 });

    const res = await request(app)
      .get("/api/v1/security/alerts?limit=1")
      .set("Authorization", bearer(1))
      .expect(200);
    expect(res.body.count).toBe(1);
    expect(res.body.data[0].type).toBe("refresh_token_reuse");

    await request(app).get("/api/v1/security/alerts").set("Authorization", bearer(2)).expect(403);
  });
});

describe("Envío de alertas", () => {
  it("envía la alerta al webhook configurado", async () => {
    const recibidas = [];
    const servidor = http.createServer((req, res) => {
      let cuerpo = "";
      req.on("data", (parte) => {
        cuerpo += parte;
      });
      req.on("end", () => {
        recibidas.push(JSON.parse(cuerpo));
        res.end("ok");
      });
    });
    await new Promise((resolve) => servidor.listen(0, "127.0.0.1", resolve));
    process.env.SECURITY_ALERT_WEBHOOK_URL = `http://127.0.0.1:${servidor.address().port}/alertas`;

    try {
      const resultado = await raiseAlert({ type: "account_locked", severity: "high", username: "ana", ip: "1.2.3.4" });
      expect(resultado).toMatchObject({ stored: true, notified: true });
      expect(recibidas[0].text).toBe("[ALTA] account_locked: ana desde 1.2.3.4");
      expect(recibidas[0].alert.username).toBe("ana");
    } finally {
      await new Promise((resolve) => servidor.close(resolve));
    }
  });

  it("si el webhook responde con error o no responde, la petición sigue y la alerta queda guardada", async () => {
    const servidor = http.createServer((req, res) => {
      res.statusCode = 500;
      res.end();
    });
    await new Promise((resolve) => servidor.listen(0, "127.0.0.1", resolve));
    process.env.SECURITY_ALERT_WEBHOOK_URL = `http://127.0.0.1:${servidor.address().port}/`;
    try {
      const conError = await raiseAlert({ type: "access_denied_burst", severity: "medium", userId: 2 });
      expect(conError).toMatchObject({ stored: true, notified: false });
    } finally {
      await new Promise((resolve) => servidor.close(resolve));
    }

    process.env.SECURITY_ALERT_WEBHOOK_URL = "http://127.0.0.1:1/";
    const sinRespuesta = await raiseAlert({ type: "access_denied_burst", severity: "medium", userId: 2 });
    expect(sinRespuesta).toMatchObject({ stored: true, notified: false });
  });

  it("si la base falla, la alerta queda en el registro estructurado", async () => {
    const lineas = [];
    const anterior = setLogSink((linea) => lineas.push(JSON.parse(linea)));
    const nivel = process.env.LOG_LEVEL;
    process.env.LOG_LEVEL = "warn";
    const espia = jest
      .spyOn(InMemorySecurityAlertRepository.prototype, "create")
      .mockRejectedValue(Object.assign(new Error("sin base"), { code: "P1001" }));

    try {
      const resultado = await raiseAlert({ type: "refresh_token_reuse", severity: "critical", userId: 3 });
      expect(resultado).toEqual({ logged: true, stored: false, notified: false });
      expect(lineas.map((l) => l.event)).toEqual(["security.alert", "security.alert_store_failed"]);
    } finally {
      espia.mockRestore();
      setLogSink(anterior);
      if (nivel === undefined) delete process.env.LOG_LEVEL;
      else process.env.LOG_LEVEL = nivel;
    }
  });

  it("resume la alerta en una línea legible", () => {
    expect(summarizeAlert({ type: "refresh_token_reuse", severity: "critical", userId: 4 })).toBe(
      "[CRÍTICA] refresh_token_reuse: usuario 4"
    );
    expect(summarizeAlert({ type: "x", severity: "otra" })).toBe("[otra] x: usuario desconocido");
  });
});
