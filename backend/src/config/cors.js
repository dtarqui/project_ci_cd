/**
 * Configuration - CORS Options
 */

const isProduction = process.env.NODE_ENV === "production";

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

const corsOptions = isProduction
  ? {
      // Modo permisivo para despliegues cross-domain.
      origin: "*",
      methods: commonMethods,
      credentials: false,
      allowedHeaders: commonHeaders,
      exposedHeaders: ["Content-Length", "X-Request-Id"],
      maxAge: 86400,
      preflightContinue: false,
      optionsSuccessStatus: 204,
    }
  : {
      origin: (origin, callback) => {
        // Permitir cualquier origen en desarrollo/tests.
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
