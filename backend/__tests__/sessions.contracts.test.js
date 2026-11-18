/**
 * Sesiones revocables, API versionada, CORS por lista de origenes y control de
 * concurrencia optimista con ETag e If-Match (modo memoria).
 */

const request = require("supertest");
const { createApp } = require("../app");
const { createAuthToken, verifyAuthToken } = require("../src/utils/helpers");
const { resetDataStore, getMockData } = require("../src/db/dataStore");
const {
  checkSession,
  revokeToken,
  revokeAllSessions,
  clearSessionCache,
  DEFAULT_TTL_MS,
} = require("../src/services/sessionService");
const { InMemoryUserRepository } = require("../src/repositories/userRepository");
const { parseAllowedOrigins, buildCorsOptions } = require("../src/config/cors");
const {
  PreconditionFailedError,
  versionOf,
  etagOf,
  parseIfMatch,
  resolvePrecondition,
  assertVersion,
  updateIfUnchanged,
} = require("../src/utils/concurrency");

const bearer = (id, extra = {}) => `Bearer ${createAuthToken(id, { username: "usuario", ...extra })}`;
const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  resetDataStore();
  clearSessionCache();
  delete process.env.SESSION_CHECK_TTL_MS;
});

describe("Sesiones revocables", () => {
  it("cerrar sesión revoca ese token en el servidor, no los demás del usuario", async () => {
    const app = createApp();
    const token = bearer(2);

    await request(app).get("/api/v1/products").set("Authorization", token).expect(200);
    await request(app).post("/api/v1/auth/logout").set("Authorization", token).expect(200);

    const rechazada = await request(app)
      .get("/api/v1/products")
      .set("Authorization", token)
      .expect(401);
    expect(rechazada.body.code).toBe("SESSION_REVOKED");

    await request(app).get("/api/v1/products").set("Authorization", bearer(2)).expect(200);
  });

  it("cerrar todas las sesiones invalida todos los tokens del usuario", async () => {
    const app = createApp();
    const telefono = bearer(2);
    const computadora = bearer(2);

    await request(app).post("/api/v1/auth/logout-all").set("Authorization", telefono).expect(200);

    await request(app).get("/api/v1/products").set("Authorization", computadora).expect(401);
    await request(app).get("/api/v1/products").set("Authorization", bearer(1)).expect(200);
    // Un token emitido despues lleva la version nueva y si sirve.
    await request(app)
      .get("/api/v1/products")
      .set("Authorization", bearer(2, { ver: 1 }))
      .expect(200);
  });

  it("cerrar todas las sesiones exige un token vigente", async () => {
    const app = createApp();
    await request(app).post("/api/v1/auth/logout-all").expect(401);
  });

  it("GET /auth/me rechaza un token revocado", async () => {
    const app = createApp();
    const token = bearer(2);

    await request(app).post("/api/v1/auth/logout").set("Authorization", token).expect(200);
    const res = await request(app).get("/api/v1/auth/me").set("Authorization", token).expect(401);
    expect(res.body.code).toBe("SESSION_REVOKED");
  });

  it("el rol sale del repositorio, no del token", async () => {
    const app = createApp();
    // Token de un vendedor que dice ser administrador.
    const falsificado = bearer(2, { role: "admin" });

    const res = await request(app).delete("/api/v1/products/1").set("Authorization", falsificado);
    expect(res.status).toBe(403);
  });

  it("el login emite tokens con identificador y version de sesiones", () => {
    const payload = verifyAuthToken(createAuthToken(2, { ver: 0 }));
    expect(payload.jti).toEqual(expect.any(String));
    expect(createAuthToken(2)).not.toBe(createAuthToken(2));
  });

  it("guarda el resultado durante el plazo configurado", async () => {
    const espia = jest.spyOn(InMemoryUserRepository.prototype, "getSessionState");
    const payload = verifyAuthToken(createAuthToken(2));

    await checkSession(payload, { now: 1000 });
    await checkSession(payload, { now: 2000 });
    expect(espia).toHaveBeenCalledTimes(1);

    await checkSession(payload, { now: 1000 + DEFAULT_TTL_MS + 1 });
    expect(espia).toHaveBeenCalledTimes(2);
  });

  it("con SESSION_CHECK_TTL_MS=0 consulta el repositorio en cada petición", async () => {
    process.env.SESSION_CHECK_TTL_MS = "0";
    const espia = jest.spyOn(InMemoryUserRepository.prototype, "getSessionState");
    const payload = verifyAuthToken(createAuthToken(2));

    await checkSession(payload);
    await checkSession(payload);
    expect(espia).toHaveBeenCalledTimes(2);
  });

  it("la cache descarta la entrada mas antigua al llenarse", async () => {
    const espia = jest.spyOn(InMemoryUserRepository.prototype, "getSessionState");

    for (let i = 0; i <= 5000; i += 1) {
      await checkSession({ sub: 2, jti: `t${i}`, ver: 0 }, { now: 1000 });
    }
    await checkSession({ sub: 2, jti: "t0", ver: 0 }, { now: 1000 });

    expect(espia).toHaveBeenCalledTimes(5002);
  });

  it("los tokens sin identificador (anteriores al cambio) no se revocan, vencen solos", async () => {
    await expect(revokeToken({ id: 2, jti: undefined, tokenExp: 0 })).resolves.toBe(false);
  });

  it("revocar todas las sesiones de un usuario inexistente devuelve null", async () => {
    await expect(revokeAllSessions(999)).resolves.toBeNull();
  });

  it("al revocar descarta los tokens revocados que ya vencieron", async () => {
    const repo = new InMemoryUserRepository();
    await repo.revokeToken({ jti: "vencido", userId: 2, expiresAt: new Date(Date.now() - 1000) });
    await repo.revokeToken({ jti: "vigente", userId: 2, expiresAt: new Date(Date.now() + 60000) });

    expect([...getMockData().revokedTokens.keys()]).toEqual(["vigente"]);
  });

  it("no expone la version de sesiones en los datos del usuario", () => {
    const repo = new InMemoryUserRepository();
    expect(repo.sanitizeUser({ id: 1, passwordHash: "x", tokenVersion: 3 })).toEqual({ id: 1 });
  });
});

describe("API versionada", () => {
  it("/api/v1 y /api responden igual; /api indica la ruta que lo sustituye", async () => {
    const app = createApp();
    const token = bearer(1);

    const v1 = await request(app).get("/api/v1/products").set("Authorization", token).expect(200);
    const legado = await request(app).get("/api/products").set("Authorization", token).expect(200);

    expect(v1.headers.deprecation).toBeUndefined();
    expect(legado.headers.deprecation).toMatch(/^@\d+$/);
    expect(legado.headers.link).toBe('</api/v1/products>; rel="successor-version"');
    expect(legado.body.data).toEqual(v1.body.data);
  });
});

describe("CORS por lista de origenes", () => {
  it("interpreta la variable CORS_ALLOW_ORIGIN", () => {
    expect(parseAllowedOrigins(undefined)).toBe("*");
    expect(parseAllowedOrigins("")).toBe("*");
    expect(parseAllowedOrigins("https://a.app, *")).toBe("*");
    expect(parseAllowedOrigins("https://a.app/, http://localhost:3000")).toEqual([
      "https://a.app",
      "http://localhost:3000",
    ]);
    expect(buildCorsOptions({}).exposedHeaders).toBe("ETag");
  });

  it("solo el origen permitido recibe Access-Control-Allow-Origin", async () => {
    let app;
    process.env.CORS_ALLOW_ORIGIN = "https://frontend.example";
    jest.isolateModules(() => {
      app = require("../app").createApp();
    });
    delete process.env.CORS_ALLOW_ORIGIN;

    const permitido = await request(app)
      .options("/api/v1/sales")
      .set("Origin", "https://frontend.example")
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "authorization,idempotency-key")
      .expect(204);
    expect(permitido.headers["access-control-allow-origin"]).toBe("https://frontend.example");
    expect(permitido.headers.vary).toMatch(/Origin/);

    const ajeno = await request(app)
      .options("/api/v1/sales")
      .set("Origin", "https://otro-sitio.example")
      .set("Access-Control-Request-Method", "POST");
    expect(ajeno.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

describe("Concurrencia optimista con ETag e If-Match", () => {
  const casos = [
    { recurso: "products", cambio: (n) => ({ price: 90 + n }) },
    { recurso: "customers", cambio: (n) => ({ name: `Cliente editado ${n}` }) },
  ];

  it.each(casos)("$recurso: guarda con la version vigente y rechaza una version vieja", async ({ recurso, cambio }) => {
    const app = createApp();
    const token = bearer(1);

    const leido = await request(app).get(`/api/v1/${recurso}/1`).set("Authorization", token).expect(200);
    const etag = leido.headers.etag;
    expect(etag).toMatch(/^"\d+"$/);

    await esperar(5);
    const guardado = await request(app)
      .put(`/api/v1/${recurso}/1`)
      .set("Authorization", token)
      .set("If-Match", etag)
      .send(cambio(1))
      .expect(200);
    expect(guardado.headers.etag).not.toBe(etag);

    // Otro usuario que leyo la version anterior ya no puede pisar el cambio.
    const viejo = await request(app)
      .put(`/api/v1/${recurso}/1`)
      .set("Authorization", token)
      .set("If-Match", etag)
      .send(cambio(2))
      .expect(412);
    expect(viejo.body.code).toBe("PRECONDITION_FAILED");
    expect(viejo.headers.etag).toBe(guardado.headers.etag);

    // Sin If-Match, o con "*", no hay precondicion (clientes anteriores).
    await esperar(5);
    await request(app).put(`/api/v1/${recurso}/1`).set("Authorization", token).send(cambio(3)).expect(200);
    await esperar(5);
    await request(app)
      .put(`/api/v1/${recurso}/1`)
      .set("Authorization", token)
      .set("If-Match", "*")
      .send(cambio(4))
      .expect(200);
  });

  it("interpreta If-Match segun RFC 9110", () => {
    expect(parseIfMatch(undefined)).toBeNull();
    expect(parseIfMatch("  ")).toBeNull();
    expect(parseIfMatch("*")).toBe("*");
    expect(parseIfMatch('W/"1", "2", "x"')).toEqual([2]);

    const registro = { updatedAt: new Date(5000).toISOString() };
    expect(etagOf(registro)).toBe('"5000"');
    expect(resolvePrecondition(registro, '"5000"')).toEqual({ ok: true, expectedVersion: 5000 });
    expect(resolvePrecondition(registro, '"4000"')).toEqual({ ok: false });
    expect(resolvePrecondition(registro, undefined)).toEqual({ ok: true });
    expect(versionOf({})).toBe(0);
    expect(versionOf({ updatedAt: "no es fecha" })).toBe(0);
  });

  it("en memoria, falla si el registro ya no tiene la version esperada", () => {
    expect(() => assertVersion({ updatedAt: new Date(1).toISOString() }, 1)).not.toThrow();
    expect(() => assertVersion({ updatedAt: new Date(2).toISOString() }, 1)).toThrow(
      PreconditionFailedError
    );
    expect(() => assertVersion({}, undefined)).not.toThrow();
  });

  it("en la base, actualiza con una sola sentencia condicionada a la version", async () => {
    const actual = { id: 7, updatedAt: new Date(10) };
    const delegate = {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUnique: jest.fn().mockResolvedValue(actual),
    };

    await expect(updateIfUnchanged(delegate, 7, { price: 1 }, 10)).resolves.toBe(actual);
    expect(delegate.updateMany).toHaveBeenCalledWith({
      where: { id: 7, updatedAt: new Date(10) },
      data: { price: 1 },
    });

    delegate.updateMany.mockResolvedValue({ count: 0 });
    await expect(updateIfUnchanged(delegate, 7, {}, 9)).rejects.toBeInstanceOf(
      PreconditionFailedError
    );

    delegate.findUnique.mockResolvedValue(null);
    await expect(updateIfUnchanged(delegate, 7, {}, 9)).resolves.toBeNull();
  });
});
