/**
 * Express App Factory - Crea la aplicación Express configurada
 */

// Carga backend/.env también cuando la app se construye sin pasar por index.js
// (scripts que usan app.js). Sin esto, en modo database JWT_SECRET aparecía recién
// cuando el cliente de Prisma cargaba el .env, y los tokens firmados antes con el
// secreto de desarrollo dejaban de ser válidos. En las pruebas no se carga, para
// que Jest use el modo memoria aunque el .env local apunte a la base de datos.
if (process.env.NODE_ENV !== "test") {
  require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
}

const express = require("express");
const cors = require("cors");
const { corsOptions } = require("./config/cors");
const { notFoundHandler, errorHandler } = require("./middleware/auth");
const { securityHeaders } = require("./middleware/security");
const { requestLogger } = require("./utils/logger");
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const customerRoutes = require("./routes/customerRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const salesRoutes = require("./routes/salesRoutes");
const userRoutes = require("./routes/userRoutes");
const catalogRoutes = require("./routes/catalogRoutes");
const { asyncHandler } = require("./utils/asyncHandler");
const { checkReadiness } = require("./services/readinessService");
const { version } = require("../package.json");

const API_PREFIX = "/api/v1";
const API_LEGACY_PREFIX = "/api";
// Fecha desde la que /api sin version se considera obsoleta (RFC 9745: @segundos).
const LEGACY_API_DEPRECATION = `@${Math.floor(Date.parse("2026-11-18T00:00:00Z") / 1000)}`;

/**
 * Crea una aplicación Express configurada con todas las rutas y middleware
 * @returns {express.Application} Aplicación Express
 */
const createApp = () => {
  const app = express();

  // ==================== MIDDLEWARE ====================

  // Sin la cabecera X-Powered-By, que delataba el framework.
  app.disable("x-powered-by");

  // Registro estructurado de cada peticion y cabeceras de seguridad.
  app.use(requestLogger);
  app.use(securityHeaders);

  // CORS (origen/métodos/headers permitidos configurados en ./config/cors.js)
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
      version,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
    });
  });

  /**
   * GET /health/ready - Verifica que la app pueda operar con su almacenamiento.
   * En modo database consulta cada tabla con las columnas que espera el
   * cliente de Prisma; responde 503 si alguna comprobacion falla. Lo usa la
   * etapa "Post-Deploy Smoke Test" del pipeline (ver services/readinessService.js).
   */
  app.get(
    "/health/ready",
    asyncHandler(async (req, res) => {
      const readiness = await checkReadiness();
      res.status(readiness.ready ? 200 : 503).json({
        status: readiness.ready ? "ok" : "error",
        repositoryMode: readiness.repositoryMode,
        checks: readiness.checks,
      });
    })
  );

  // ==================== ROUTES ====================

  // La API se publica versionada en /api/v1. /api queda como alias de la misma
  // version para los clientes anteriores, con las cabeceras Deprecation y Link
  // (RFC 9745 y RFC 8288) que indican la ruta que la sustituye.
  app.use(API_LEGACY_PREFIX, (req, res, next) => {
    if (req.path !== "/v1" && !req.path.startsWith("/v1/")) {
      res.setHeader("Deprecation", LEGACY_API_DEPRECATION);
      res.setHeader("Link", `<${API_PREFIX}${req.path}>; rel="successor-version"`);
    }
    next();
  });

  for (const prefix of [API_PREFIX, API_LEGACY_PREFIX]) {
    app.use(`${prefix}/auth`, authRoutes);
    app.use(`${prefix}/products`, productRoutes);
    app.use(`${prefix}/customers`, customerRoutes);
    app.use(`${prefix}/dashboard`, dashboardRoutes);
    app.use(`${prefix}/sales`, salesRoutes);
    app.use(`${prefix}/users`, userRoutes);
    app.use(`${prefix}/catalogs`, catalogRoutes);
  }

  // ==================== ERROR HANDLING ====================

  // 404 Handler (debe ser el último)
  app.use("*", notFoundHandler);

  // Error Handler (debe ser el último)
  app.use(errorHandler);

  return app;
};

module.exports = createApp;
module.exports.API_PREFIX = API_PREFIX;
module.exports.API_LEGACY_PREFIX = API_LEGACY_PREFIX;
