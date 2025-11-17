const express = require("express");
const cors = require("cors");

// Mock data para el dashboard
const mockData = {
  dailySales: "64M",
  branchSales: [
    { name: "Sucursal Norte", value: 30 },
    { name: "Sucursal Sur", value: 25 },
    { name: "Sucursal Este", value: 20 },
    { name: "Sucursal Oeste", value: 25 },
  ],
  salesTrend: [
    { day: "Lun", sales: 12 },
    { day: "Mar", sales: 19 },
    { day: "Mié", sales: 15 },
    { day: "Jue", sales: 25 },
    { day: "Vie", sales: 22 },
    { day: "Sáb", sales: 30 },
    { day: "Dom", sales: 28 },
  ],
  productSales: [
    { product: "Producto A", quantity: 45 },
    { product: "Producto B", quantity: 30 },
    { product: "Producto C", quantity: 35 },
    { product: "Producto D", quantity: 20 },
  ],
};

// Usuarios mock para autenticación
const users = [
  { id: 1, username: "admin", password: "admin123", name: "Administrador" },
  { id: 2, username: "demo", password: "demo123", name: "Usuario Demo" },
  { id: 3, username: "test", password: "test123", name: "Usuario Test" },
];

// Función para crear la aplicación Express
const createApp = () => {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(cors());

  // Health check endpoint
  app.get("/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
    });
  });

  // Endpoint de autenticación
  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    console.log("🔐 Login attempt for user:", username);

    // Validación de campos requeridos
    if (!username || !password) {
      console.log("❌ Missing credentials");
      return res.status(400).json({
        error: "Usuario y contraseña requeridos",
        code: "MISSING_CREDENTIALS",
      });
    }

    // Validación de tipos
    if (typeof username !== "string" || typeof password !== "string") {
      console.log("❌ Invalid credential types");
      return res.status(400).json({
        error: "Usuario y contraseña deben ser strings",
        code: "INVALID_CREDENTIALS_TYPE",
      });
    }

    // Buscar usuario
    const user = users.find(
      (u) => u.username === username && u.password === password
    );

    if (user) {
      const { password: userPassword, ...userWithoutPassword } = user;
      const token = `mock-jwt-token-${user.id}`;
      console.log("✅ Login successful - Generated token:", token);
      
      res.json({
        success: true,
        user: userWithoutPassword,
        token: token,
        expiresIn: 3600, // 1 hour
      });
    } else {
      console.log("❌ Invalid credentials for user:", username);
      res.status(401).json({
        error: "Credenciales inválidas",
        code: "INVALID_CREDENTIALS",
      });
    }
  });

  // Endpoint para datos del dashboard
  app.get("/api/dashboard/data", (req, res) => {
    // Simular autenticación simple
    const authHeader = req.headers.authorization;
    console.log("🔐 Dashboard request - Auth header:", authHeader);

    if (!authHeader) {
      console.log("❌ No auth header provided");
      return res.status(401).json({
        error: "Token de autorización requerido",
        code: "MISSING_AUTH_TOKEN",
      });
    }

    // Validar formato del token (debe empezar con "Bearer ")
    if (!authHeader.startsWith("Bearer ")) {
      console.log("❌ Invalid auth header format:", authHeader);
      return res.status(401).json({
        error: "Formato de token inválido - debe usar 'Bearer '",
        code: "INVALID_TOKEN_FORMAT",
      });
    }

    // Extraer el token sin "Bearer "
    const token = authHeader.replace("Bearer ", "");
    console.log("🔑 Extracted token:", token);
    
    // Validar que el token tenga el formato esperado
    if (!token.startsWith("mock-jwt-token-")) {
      console.log("❌ Invalid token format:", token);
      return res.status(401).json({
        error: "Token inválido",
        code: "INVALID_TOKEN",
      });
    }

    console.log("✅ Token valid, returning dashboard data");
    res.json({
      ...mockData,
      timestamp: new Date().toISOString(),
    });
  });

  // Endpoint para cerrar sesión
  app.post("/api/auth/logout", (req, res) => {
    // En un app real, aquí invalidarías el token
    res.json({
      success: true,
      message: "Sesión cerrada correctamente",
      timestamp: new Date().toISOString(),
    });
  });

  // Endpoint para obtener información del usuario
  app.get("/api/auth/me", (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: "Token requerido",
        code: "MISSING_TOKEN",
      });
    }

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Token requerido",
        code: "MISSING_TOKEN",
      });
    }

    const token = authHeader.replace("Bearer ", "");

    if (!token.startsWith("mock-jwt-token-")) {
      return res.status(401).json({
        error: "Token inválido",
        code: "INVALID_TOKEN",
      });
    }

    const userId = parseInt(token.replace("mock-jwt-token-", ""));
    const user = users.find((u) => u.id === userId);

    if (!user) {
      return res.status(401).json({
        error: "Token inválido",
        code: "INVALID_TOKEN",
      });
    }

    const { password, ...userWithoutPassword } = user;
    res.json({
      success: true,
      user: userWithoutPassword,
    });
  });

  // Middleware para manejar rutas no encontradas
  app.use("*", (req, res) => {
    res.status(404).json({
      error: "Endpoint no encontrado",
      code: "NOT_FOUND",
      path: req.originalUrl,
      method: req.method,
    });
  });

  // Middleware para manejar errores
  app.use((err, req, res, next) => {
    console.error("Error interno del servidor:", err);
    res.status(500).json({
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
      message:
        process.env.NODE_ENV === "development"
          ? err.message
          : "Something went wrong",
    });
  });

  return app;
};

// Exportar la función de creación y los datos para testing
module.exports = {
  createApp,
  mockData,
  users,
};
