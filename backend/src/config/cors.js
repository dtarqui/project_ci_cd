/**
 * CORS configuration
 * Politica totalmente permisiva para despliegues cross-domain.
 */

const corsOptions = {
  origin: process.env.CORS_ALLOW_ORIGIN || "*",
  methods:
    process.env.CORS_ALLOW_METHODS ||
    "GET,POST,PUT,DELETE,OPTIONS,PATCH,HEAD",
  allowedHeaders:
    process.env.CORS_ALLOW_HEADERS ||
    "Origin, X-Requested-With, Content-Type, Accept, Authorization",
  credentials: false,
  optionsSuccessStatus: 204,
};

module.exports = {
  corsOptions,
};
