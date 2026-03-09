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
const salesRoutes = require("./routes/salesRoutes");
const userRoutes = require("./routes/userRoutes");

/**
 * Crea una aplicación Express configurada con todas las rutas y middleware
 * @returns {express.Application} Aplicación Express
 */
const createApp = () => {
  const app = express();

  // ==================== MIDDLEWARE ====================

  // Garantiza headers CORS incluso cuando el preflight no alcanza las rutas.
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", process.env.CORS_ALLOW_ORIGIN || "*");
    res.header(
      "Access-Control-Allow-Methods",
      process.env.CORS_ALLOW_METHODS || "GET,POST,PUT,DELETE,OPTIONS,PATCH,HEAD"
    );
    res.header(
      "Access-Control-Allow-Headers",
      process.env.CORS_ALLOW_HEADERS ||
        "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    );

    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }

    return next();
  });

  // CORS abierto para todos los orígenes
  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions));

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

  // Rutas de ventas
  app.use("/api/sales", salesRoutes);

  // Rutas de usuarios autenticados
  app.use("/api/users", userRoutes);

  // ==================== ERROR HANDLING ====================

  // 404 Handler (debe ser el último)
  app.use("*", notFoundHandler);

  // Error Handler (debe ser el último)
  app.use(errorHandler);

  return app;
};

module.exports = createApp;
