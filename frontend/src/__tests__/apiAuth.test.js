// setupTests.js sustituye axios por un doble vacío; aquí se prueba el cliente real
// con un adaptador que responde sin red.
jest.unmock("axios");

import api, { authService, getAccessToken, refreshSession, setAccessToken } from "../services/api";

// Adaptador de axios que simula la API sin red.
const responder = (config, status, data = {}) => {
  if (status >= 400) {
    const error = new Error(`HTTP ${status}`);
    error.config = config;
    error.response = { status, data, config, headers: {} };
    return Promise.reject(error);
  }
  return Promise.resolve({ data, status, statusText: "OK", headers: {}, config });
};

describe("token de acceso en memoria y renovación con la cookie", () => {
  let adaptadorOriginal;

  beforeEach(() => {
    adaptadorOriginal = api.defaults.adapter;
    setAccessToken(null);
    jest.clearAllMocks();
  });

  afterEach(() => {
    api.defaults.adapter = adaptadorOriginal;
    setAccessToken(null);
  });

  it("llama a la API por el mismo origen y con credenciales, para que viaje la cookie", () => {
    expect(api.defaults.baseURL).toBe("/");
    expect(api.defaults.withCredentials).toBe(true);
  });

  it("añade el token en memoria a cada petición", async () => {
    setAccessToken("acceso-1");
    const cabeceras = [];
    api.defaults.adapter = (config) => {
      cabeceras.push(config.headers.Authorization);
      return responder(config, 200);
    };

    await api.get("/api/v1/products");

    expect(cabeceras).toEqual(["Bearer acceso-1"]);
  });

  it("ante un 401 renueva una vez y repite la petición con el token nuevo", async () => {
    setAccessToken("acceso-1");
    let renovaciones = 0;
    api.defaults.adapter = (config) => {
      if (config.url === "/api/v1/auth/refresh") {
        renovaciones += 1;
        return responder(config, 200, { token: "acceso-2", user: { id: 1 } });
      }
      return config.headers.Authorization === "Bearer acceso-2"
        ? responder(config, 200, { ok: true })
        : responder(config, 401, { code: "INVALID_TOKEN" });
    };

    const res = await api.get("/api/v1/products");

    expect(res.data).toEqual({ ok: true });
    expect(renovaciones).toBe(1);
    expect(getAccessToken()).toBe("acceso-2");
  });

  it("varias peticiones rechazadas a la vez comparten una sola renovación", async () => {
    setAccessToken("acceso-1");
    let renovaciones = 0;
    api.defaults.adapter = (config) => {
      if (config.url === "/api/v1/auth/refresh") {
        renovaciones += 1;
        return new Promise((resolve) =>
          setTimeout(() => resolve(responder(config, 200, { token: "acceso-2" })), 10)
        );
      }
      return config.headers.Authorization === "Bearer acceso-2"
        ? responder(config, 200)
        : responder(config, 401);
    };

    await Promise.all([api.get("/api/v1/products"), api.get("/api/v1/customers")]);

    expect(renovaciones).toBe(1);
  });

  it("si otra pestaña acaba de rotar el token, reintenta la renovación una vez", async () => {
    let intentos = 0;
    api.defaults.adapter = (config) => {
      intentos += 1;
      return intentos === 1
        ? responder(config, 401, { code: "REFRESH_TOKEN_ROTATED" })
        : responder(config, 200, { token: "acceso-3" });
    };

    await refreshSession();

    expect(intentos).toBe(2);
    expect(getAccessToken()).toBe("acceso-3");
  });

  it("si la renovación falla, olvida el token y avisa que la sesión terminó", async () => {
    setAccessToken("acceso-1");
    const aviso = jest.fn();
    window.addEventListener("unauthorized", aviso);
    api.defaults.adapter = (config) => responder(config, 401, { code: "SESSION_REVOKED" });

    try {
      await expect(api.get("/api/v1/products")).rejects.toThrow("HTTP 401");
      expect(aviso).toHaveBeenCalledTimes(1);
      expect(getAccessToken()).toBeNull();
      expect(localStorage.removeItem).toHaveBeenCalledWith("user");
    } finally {
      window.removeEventListener("unauthorized", aviso);
    }
  });

  it("un 401 del inicio de sesión no intenta renovar ni cierra la sesión", async () => {
    const aviso = jest.fn();
    window.addEventListener("unauthorized", aviso);
    const urls = [];
    api.defaults.adapter = (config) => {
      urls.push(config.url);
      return responder(config, 401, { code: "INVALID_CREDENTIALS" });
    };

    try {
      await expect(authService.login({ username: "a", password: "b" })).rejects.toThrow("HTTP 401");
      expect(urls).toEqual(["/api/v1/auth/login"]);
      expect(aviso).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener("unauthorized", aviso);
    }
  });

  it("cerrar sesión olvida el token aunque la petición falle", async () => {
    setAccessToken("acceso-1");
    api.defaults.adapter = (config) => responder(config, 500);

    await expect(authService.logout()).rejects.toThrow("HTTP 500");
    expect(getAccessToken()).toBeNull();
  });
});
