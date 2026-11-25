/**
 * Token de renovacion en cookie HttpOnly, con rotacion y deteccion de reutilizacion
 * (modo memoria).
 */

const request = require("supertest");
const { createApp } = require("../app");
const { resetDataStore, getMockData } = require("../src/db/dataStore");
const { clearSessionCache } = require("../src/services/sessionService");
const { readCookie } = require("../src/utils/authCookies");

const PASSWORD = "Clave-Segura1";
let contador = 0;

const cookieDe = (res) => (res.headers["set-cookie"] || []).find((c) => c.startsWith("rt="));
const parDe = (cookie) => cookie.split(";")[0];

const registrar = async (app) => {
  contador += 1;
  const username = `renovacion${contador}`;
  const res = await request(app)
    .post("/api/v1/auth/register")
    .send({ username, email: `${username}@example.com`, password: PASSWORD, name: "Usuario de prueba" })
    .expect(201);
  return { username, token: res.body.token, cookie: parDe(cookieDe(res)), user: res.body.user };
};

const renovar = (app, cookie) => request(app).post("/api/v1/auth/refresh").set("Cookie", cookie);
const alertas = () => getMockData().securityAlerts || [];

beforeEach(() => {
  resetDataStore();
  clearSessionCache();
  process.env.REFRESH_REUSE_GRACE_MS = "0";
});

afterAll(() => {
  delete process.env.REFRESH_REUSE_GRACE_MS;
});

describe("Token de renovación en cookie HttpOnly", () => {
  it("el registro y el inicio de sesión fijan la cookie con sus atributos de seguridad", async () => {
    const app = createApp();
    const { username } = await registrar(app);

    const res = await request(app).post("/api/v1/auth/login").send({ username, password: PASSWORD }).expect(200);
    const cookie = cookieDe(res);

    expect(cookie).toMatch(/^rt=[^;]+;/);
    for (const atributo of ["HttpOnly", "Secure", "SameSite=Strict", "Path=/api/v1/auth"]) {
      expect(cookie).toContain(atributo);
    }
    expect(Number(cookie.match(/Max-Age=(\d+)/)[1])).toBeGreaterThan(24 * 3600);
    expect(res.body.expiresIn).toBe("15m");
  });

  it("renovar devuelve un token de acceso nuevo y rota la cookie", async () => {
    const app = createApp();
    const sesion = await registrar(app);

    const res = await renovar(app, sesion.cookie).expect(200);
    const nueva = parDe(cookieDe(res));

    expect(res.body.user.username).toBe(sesion.username);
    expect(res.body.token).toEqual(expect.any(String));
    expect(nueva).not.toBe(sesion.cookie);
    await request(app).get("/api/v1/products").set("Authorization", `Bearer ${res.body.token}`).expect(200);
    await renovar(app, nueva).expect(200);
  });

  it("sin cookie o con un token inválido responde 401 y borra la cookie", async () => {
    const app = createApp();

    const sinCookie = await request(app).post("/api/v1/auth/refresh").expect(401);
    expect(sinCookie.body.code).toBe("INVALID_REFRESH_TOKEN");
    expect(cookieDe(sinCookie)).toContain("Max-Age=0");

    const invalida = await renovar(app, "rt=no-es-un-jwt").expect(401);
    expect(invalida.body.code).toBe("INVALID_REFRESH_TOKEN");
  });

  it("el token de renovación no sirve como token de acceso", async () => {
    const app = createApp();
    const { cookie } = await registrar(app);
    const token = cookie.slice("rt=".length);

    const res = await request(app).get("/api/v1/products").set("Authorization", `Bearer ${token}`).expect(401);
    expect(res.body.code).toBe("INVALID_TOKEN");
  });

  it("reutilizar un token ya rotado cierra todas las sesiones y emite una alerta crítica", async () => {
    const app = createApp();
    const sesion = await registrar(app);

    const primera = await renovar(app, sesion.cookie).expect(200);
    const robada = await renovar(app, sesion.cookie).expect(401);
    expect(robada.body.code).toBe("REFRESH_TOKEN_REUSED");

    // La sesion legitima tambien cae: ninguno de los dos tokens sirve ya.
    const legitima = await renovar(app, parDe(cookieDe(primera))).expect(401);
    expect(legitima.body.code).toBe("SESSION_REVOKED");
    await request(app).get("/api/v1/products").set("Authorization", `Bearer ${primera.body.token}`).expect(401);

    const [alerta] = alertas();
    expect(alerta).toMatchObject({ type: "refresh_token_reuse", severity: "critical", userId: sesion.user.id });
  });

  it("dentro del margen de pestañas simultáneas no se trata como robo", async () => {
    process.env.REFRESH_REUSE_GRACE_MS = "60000";
    const app = createApp();
    const sesion = await registrar(app);

    const primera = await renovar(app, sesion.cookie).expect(200);
    const segunda = await renovar(app, sesion.cookie).expect(401);

    expect(segunda.body.code).toBe("REFRESH_TOKEN_ROTATED");
    await renovar(app, parDe(cookieDe(primera))).expect(200);
    expect(alertas()).toHaveLength(0);
  });

  it("cerrar sesión revoca el token de renovación y borra la cookie", async () => {
    const app = createApp();
    const sesion = await registrar(app);

    const res = await request(app)
      .post("/api/v1/auth/logout")
      .set("Authorization", `Bearer ${sesion.token}`)
      .set("Cookie", sesion.cookie)
      .expect(200);

    expect(cookieDe(res)).toContain("Max-Age=0");
    await renovar(app, sesion.cookie).expect(401);
  });

  it("cerrar todas las sesiones también invalida los tokens de renovación", async () => {
    const app = createApp();
    const sesion = await registrar(app);

    await request(app)
      .post("/api/v1/auth/logout-all")
      .set("Authorization", `Bearer ${sesion.token}`)
      .expect(200);

    const res = await renovar(app, sesion.cookie).expect(401);
    expect(res.body.code).toBe("SESSION_REVOKED");
  });
});

describe("Lectura de cookies", () => {
  it("encuentra la cookie entre otras y tolera valores mal codificados", () => {
    expect(readCookie({ headers: { cookie: "a=1; rt=abc%20def; b=2" } }, "rt")).toBe("abc def");
    expect(readCookie({ headers: { cookie: "rt=%E0%A4%A" } }, "rt")).toBeNull();
    expect(readCookie({ headers: { cookie: "otra=1" } }, "rt")).toBeNull();
    expect(readCookie({ headers: {} }, "rt")).toBeNull();
  });
});
