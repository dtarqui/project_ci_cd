import axios from "axios";

// Configurar base URL del backend
// En PRODUCCIÓN: SIEMPRE usar rewrites relativos (/) para evitar CORS
// En DESARROLLO: usar localhost directamente
const API_BASE_URL = process.env.NODE_ENV === "production" 
  ? "/" // Usar rewrites de Vercel - sin CORS
  : (process.env.API_BASE_URL || "http://localhost:4000");

// Configuración de axios - Compatible con rewrites de Vercel
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  // Solo enviar credenciales si es mismo dominio, en cross-origin no es necesario
  withCredentials: false,
});

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
  login: async (credentials) => {
    const response = await api.post("/api/auth/login", credentials);
    return response.data;
  },

  logout: async () => {
    const response = await api.post("/api/auth/logout");
    return response.data;
  },
};

// Servicios del dashboard
export const dashboardService = {
  getData: async () => {
    const response = await api.get("/api/dashboard/data");
    return response.data;
  },

  getProducts: async (params = "") => {
    const response = await api.get(`/api/products${params ? "?" + params : ""}`);
    // El backend retorna { success, data: [], count, timestamp }
    // Retornamos la respuesta completa para que el componente pueda acceder a .data
    return response.data;
  },

  getProduct: async (id) => {
    const response = await api.get(`/api/products/${id}`);
    return response.data;
  },

  createProduct: async (productData) => {
    const response = await api.post("/api/products", productData);
    return response.data;
  },

  updateProduct: async (id, productData) => {
    const response = await api.put(`/api/products/${id}`, productData);
    return response.data;
  },

  deleteProduct: async (id) => {
    const response = await api.delete(`/api/products/${id}`);
    return response.data;
  },
};

// Función de utilidad para manejar errores de API
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
