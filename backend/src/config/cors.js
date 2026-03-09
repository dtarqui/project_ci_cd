/**
 * Configuration - CORS Options
 */

const commonMethods = [
  "GET",
  "POST",
  "PUT",
  "DELETE",
  "OPTIONS",
  "PATCH",
  "HEAD",
];

const commonHeaders = [
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
];

const corsOptions = {
  // Refleja el origin recibido para compatibilidad con preflight y despliegues cross-domain.
  origin: (origin, callback) => {
    callback(null, origin || "*");
  },
  methods: commonMethods,
  credentials: false,
  allowedHeaders: commonHeaders,
  exposedHeaders: ["Content-Length", "X-Request-Id"],
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

module.exports = {
  corsOptions,
};
