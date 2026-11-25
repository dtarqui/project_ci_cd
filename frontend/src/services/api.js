import axios from "axios";

// La API se llama siempre por el mismo origen del frontend: en Vercel, la regla
// "/api/:path*" de vercel.json la reenvia al backend, y en desarrollo lo hace el
// proxy del servidor de webpack. Asi la cookie HttpOnly con el token de
// renovacion es del mismo sitio y ningun navegador la descarta como de terceros.
const api = axios.create({
  baseURL: "/",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

/**
 * Token de acceso de la sesion. Vive solo en memoria: no se guarda en
 * localStorage, donde un script inyectado (XSS) podria leerlo. Al recargar la
 * pagina se recupera con POST /auth/refresh, que usa la cookie HttpOnly.
 */
let accessToken = null;

export const setAccessToken = (token) => {
  accessToken = token || null;
};

export const getAccessToken = () => accessToken;

/**
 * Cabecera If-Match con la version del registro que el usuario abrio para editar
 * (su fecha de ultima modificacion). Si otro usuario lo guardo antes, la API
 * responde 412 en lugar de pisar sus cambios.
 */
export const ifMatchFor = (updatedAt) => {
  const version = updatedAt ? Date.parse(updatedAt) : NaN;
  return Number.isFinite(version) ? { headers: { "If-Match": `"${version}"` } } : undefined;
};

const AUTH_PATHS = ["/api/v1/auth/login", "/api/v1/auth/register", "/api/v1/auth/refresh", "/api/v1/auth/logout"];
const isAuthRequest = (config) => AUTH_PATHS.some((path) => (config?.url || "").startsWith(path));

let refreshing = null;

/**
 * Pide un token de acceso nuevo con la cookie de renovacion. Las llamadas
 * simultaneas comparten la misma peticion, porque cada renovacion rota el token
 * de la cookie. Si otra pestana lo acaba de rotar (REFRESH_TOKEN_ROTATED), la
 * cookie ya trae el nuevo y basta reintentar una vez.
 * @returns {Promise<{user: Object, token: string}>}
 */
export const refreshSession = () => {
  if (!refreshing) {
    const attempt = () => api.post("/api/v1/auth/refresh").then((response) => response.data);
    refreshing = attempt()
      .catch((error) => {
        if (error?.response?.data?.code === "REFRESH_TOKEN_ROTATED") {
          return attempt();
        }
        throw error;
      })
      .then((data) => {
        setAccessToken(data.token);
        return data;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
};

// Interceptor para agregar el token de acceso
api.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Ante un 401, renueva el token una vez y repite la peticion; si la renovacion
// tambien falla, la sesion termino y se avisa a la aplicacion.
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const config = error.config;
    if (error.response?.status === 401 && config && !config._retried && !isAuthRequest(config)) {
      config._retried = true;
      try {
        await refreshSession();
        config.headers = { ...(config.headers || {}), Authorization: `Bearer ${accessToken}` };
        return api.request(config);
      } catch {
        // la sesion ya no se puede renovar: se trata como 401
      }
    }
    if (error.response?.status === 401 && !isAuthRequest(config)) {
      setAccessToken(null);
      localStorage.removeItem("user");
      // Crear evento personalizado para que App.js se entere
      window.dispatchEvent(new Event("unauthorized"));
    }
    return Promise.reject(error);
  }
);

// Servicios de autenticación
export const authService = {
  // payload: username, password, name, email
  register: async (payload) => {
    const response = await api.post("/api/v1/auth/register", payload);
    return response.data;
  },

  login: async (credentials) => {
    const response = await api.post("/api/v1/auth/login", credentials);
    return response.data;
  },

  refresh: () => refreshSession(),

  logout: async () => {
    try {
      const response = await api.post("/api/v1/auth/logout");
      return response.data;
    } finally {
      setAccessToken(null);
    }
  },

  getMe: async () => {
    const response = await api.get("/api/v1/auth/me");
    return response.data;
  },
};

export const userService = {
  getMyProfile: async () => {
    const response = await api.get("/api/v1/users/me");
    return response.data;
  },

  updateMyProfile: async (payload) => {
    const response = await api.put("/api/v1/users/me", payload);
    return response.data;
  },
};

// Datos agregados del dashboard (métricas, gráficos)
export const dashboardService = {
  getData: async () => {
    const response = await api.get("/api/v1/dashboard/data");
    return response.data;
  },
};

// CRUD de productos
export const productService = {
  getProducts: async (params = "") => {
    const response = await api.get(`/api/v1/products${params ? "?" + params : ""}`);
    // El backend retorna { success, data: [], count, timestamp }
    // Retornamos la respuesta completa para que el componente pueda acceder a .data
    return response.data;
  },

  getProduct: async (id) => {
    const response = await api.get(`/api/v1/products/${id}`);
    return response.data;
  },

  createProduct: async (productData) => {
    const response = await api.post("/api/v1/products", productData);
    return response.data;
  },

  /** @param {string} [updatedAt] - version leida del producto (concurrencia optimista) */
  updateProduct: async (id, productData, updatedAt) => {
    const response = await api.put(`/api/v1/products/${id}`, productData, ifMatchFor(updatedAt));
    return response.data;
  },

  deleteProduct: async (id) => {
    const response = await api.delete(`/api/v1/products/${id}`);
    return response.data;
  },
};

// CRUD de clientes
export const customerService = {
  getCustomers: async (params = "") => {
    const response = await api.get(`/api/v1/customers${params ? "?" + params : ""}`);
    return response.data;
  },

  // Catalogo de ciudades atendidas. Lo sirve el backend para que la lista del
  // formulario y lo que acepta la API sean lo mismo.
  getCities: async () => {
    const response = await api.get("/api/v1/customers/cities");
    return response.data;
  },

  getCustomer: async (id) => {
    const response = await api.get(`/api/v1/customers/${id}`);
    return response.data;
  },

  createCustomer: async (customerData) => {
    const response = await api.post("/api/v1/customers", customerData);
    return response.data;
  },

  /** @param {string} [updatedAt] - version leida del cliente (concurrencia optimista) */
  updateCustomer: async (id, customerData, updatedAt) => {
    const response = await api.put(`/api/v1/customers/${id}`, customerData, ifMatchFor(updatedAt));
    return response.data;
  },

  deleteCustomer: async (id) => {
    const response = await api.delete(`/api/v1/customers/${id}`);
    return response.data;
  },
};

// CRUD de ventas
export const saleService = {
  getSales: async (params = "") => {
    const response = await api.get(`/api/v1/sales${params ? "?" + params : ""}`);
    return response.data;
  },

  getSale: async (id) => {
    const response = await api.get(`/api/v1/sales/${id}`);
    return response.data;
  },

  /**
   * @param {Object} saleData
   * @param {string} [idempotencyKey] - la misma clave en cada reintento de una
   *   venta evita registrarla dos veces (cabecera Idempotency-Key).
   */
  createSale: async (saleData, idempotencyKey) => {
    const response = await api.post(
      "/api/v1/sales",
      saleData,
      idempotencyKey ? { headers: { "Idempotency-Key": idempotencyKey } } : undefined
    );
    return response.data;
  },

  updateSale: async (id, saleData) => {
    const response = await api.put(`/api/v1/sales/${id}`, saleData);
    return response.data;
  },

  cancelSale: async (id) => {
    const response = await api.put(`/api/v1/sales/${id}/cancel`);
    return response.data;
  },
};

// Función de utilidad para manejar errores de API
// Catalogos administrables (ciudades y categorias). La lectura la necesitan los
// formularios de cliente y de producto; la escritura solo la acepta el backend
// para el rol admin.
export const catalogService = {
  list: async (recurso) => {
    const response = await api.get(`/api/v1/catalogs/${recurso}`);
    return response.data;
  },

  create: async (recurso, datos) => {
    const response = await api.post(`/api/v1/catalogs/${recurso}`, datos);
    return response.data;
  },

  update: async (recurso, id, datos) => {
    const response = await api.put(`/api/v1/catalogs/${recurso}/${id}`, datos);
    return response.data;
  },

  remove: async (recurso, id) => {
    const response = await api.delete(`/api/v1/catalogs/${recurso}/${id}`);
    return response.data;
  },
};

export const handleApiError = (error) => {
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return "Error inesperado. Por favor intenta nuevamente.";
};

export default api;
