/**
 * CORS configuration
 *
 * CORS_ALLOW_ORIGIN admite uno o varios origenes separados por coma. Con "*"
 * (valor por defecto, para desarrollo y pruebas) se permite cualquiera. En
 * staging el pipeline fija el dominio publico del frontend: otro sitio no puede
 * llamar a la API desde el navegador de un usuario.
 */

const parseAllowedOrigins = (value) => {
  const origins = String(value || "*")
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);

  if (origins.length === 0 || origins.includes("*")) {
    return "*";
  }

  // Con una lista, el paquete cors devuelve el origen solo si coincide y agrega
  // "Vary: Origin" para que ninguna cache mezcle respuestas de origenes distintos.
  return origins;
};

const buildCorsOptions = (env = process.env) => ({
  origin: parseAllowedOrigins(env.CORS_ALLOW_ORIGIN),
  methods: env.CORS_ALLOW_METHODS || "GET,POST,PUT,DELETE,OPTIONS,PATCH,HEAD",
  allowedHeaders:
    env.CORS_ALLOW_HEADERS ||
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, Idempotency-Key, If-Match",
  // El frontend necesita leer la version del recurso para editarlo (If-Match).
  exposedHeaders: "ETag",
  credentials: false,
  optionsSuccessStatus: 204,
});

const corsOptions = buildCorsOptions();

module.exports = {
  corsOptions,
  buildCorsOptions,
  parseAllowedOrigins,
};
