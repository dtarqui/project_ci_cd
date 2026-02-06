/**
 * Configuration - CORS Options
 */

const corsOptions = {
  origin: (origin, callback) => {
    // Permitir cualquier origen (necesario para Vercel cross-domain)
    callback(null, origin || "*");
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"],
  credentials: false,
  allowedHeaders: [
    "X-CSRF-Token",
    "X-Requested-With",
    "Accept",
    "Accept-Version",
    "Content-Length",
    "Content-MD5",
    "Content-Type",
    "Date",
    "X-Api-Version",
    "Origin",
    "Authorization",
  ],
  exposedHeaders: ["Content-Length", "X-Request-Id"],
  maxAge: 86400, // 24 horas de cache para preflight
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

module.exports = {
  corsOptions,
};
