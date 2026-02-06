/**
 * Express App Factory - Crea la aplicación Express configurada
 */

const express = require("express");
const cors = require("cors");
const { corsOptions } = require("./config/cors");
const { notFoundHandler, errorHandler } = require("./middleware/auth");
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const customerRoutes = require("./routes/customerRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

/**
 * Crea una aplicación Express configurada con todas las rutas y middleware
 * @returns {express.Application} Aplicación Express
 */
const createApp = () => {
  const app = express();

  // ==================== MIDDLEWARE ====================

  // CORS
  app.use(cors(corsOptions));

  // Body parser
  app.use(express.json());

  // ==================== HEALTH CHECK ====================

  /**
   * GET /health - Verifica el estado del servidor
   */
  app.get("/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
    });
  });

  // ==================== ROUTES ====================

  // Rutas de autenticación
  app.use("/api/auth", authRoutes);

  // Rutas de productos
  app.use("/api/products", productRoutes);

  // Rutas de clientes
  app.use("/api/customers", customerRoutes);

  // Rutas del dashboard
  app.use("/api/dashboard", dashboardRoutes);

  // ==================== ERROR HANDLING ====================

  // 404 Handler (debe ser el último)
  app.use("*", notFoundHandler);

  // Error Handler (debe ser el último)
  app.use(errorHandler);

  return app;
};

module.exports = createApp;
