import axios from "axios";

const API_BASE_URL = "http://localhost:4000";

// Configuración de axios
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para agregar token de autorización
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    console.log("🔑 Token found in localStorage:", token ? "Yes" : "No");
    if (token) {
      console.log("📤 Adding Authorization header:", `Bearer ${token}`);
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log("📋 Final request config:", {
      method: config.method?.toUpperCase(),
      url: config.url,
      headers: config.headers,
    });
    return config;
  },
  (error) => {
    console.error("❌ Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas de error
api.interceptors.response.use(
  (response) => {
    console.log("✅ API Response successful:", {
      status: response.status,
      url: response.config?.url,
      data: response.data,
    });
    return response;
  },
  (error) => {
    console.error("❌ API Response error:", {
      status: error.response?.status,
      url: error.config?.url,
      message: error.message,
      data: error.response?.data,
    });
    
    if (error.response?.status === 401) {
      console.log("🚨 401 Unauthorized - clearing session");
      // Token expirado o inválido
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.reload();
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
