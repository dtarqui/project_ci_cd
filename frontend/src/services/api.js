import axios from "axios";

const rawApiBaseUrl = process.env.API_BASE_URL;

const API_BASE_URL = rawApiBaseUrl
  ? rawApiBaseUrl.replace(/\/+$/, "")
  : process.env.NODE_ENV === "production"
    ? "/"
    : "http://localhost:4000";

// Configuración de axios - Compatible con rewrites de Vercel
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  // Solo enviar credenciales si es mismo dominio, en cross-origin no es necesario
  withCredentials: false,
});

/**
 * Cabecera If-Match con la version del registro que el usuario abrio para editar
 * (su fecha de ultima modificacion). Si otro usuario lo guardo antes, la API
 * responde 412 en lugar de pisar sus cambios.
 */
export const ifMatchFor = (updatedAt) => {
  const version = updatedAt ? Date.parse(updatedAt) : NaN;
  return Number.isFinite(version) ? { headers: { "If-Match": `"${version}"` } } : undefined;
};

// Interceptor para agregar token de autorización
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas de error
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado o inválido
      // Solo limpiar localStorage, dejar que el componente maneje el error
      localStorage.removeItem("token");
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

  logout: async () => {
    const response = await api.post("/api/v1/auth/logout");
    return response.data;
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
