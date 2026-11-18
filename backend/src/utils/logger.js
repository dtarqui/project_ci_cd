/**
 * Registro estructurado
 *
 * Escribe una línea JSON por evento en la salida estándar. En Vercel esas líneas
 * quedan en los registros de la función y pueden filtrarse por campo (evento,
 * estado, duración, identificador de la petición). Sustituye al único
 * console.error que tenía el backend, que no permitía distinguir un error de base
 * de datos de uno de la aplicación.
 *
 * Nivel con LOG_LEVEL (debug, info, warn, error, silent); en las pruebas el valor
 * por defecto es silent, para no ensuciar la salida de Jest.
 */

const { randomUUID } = require("crypto");

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };

const currentLevel = () => {
  const fallback = process.env.NODE_ENV === "test" ? "silent" : "info";
  const configured = (process.env.LOG_LEVEL || fallback).toLowerCase();
  return LEVELS[configured] ?? LEVELS.info;
};

let sink = (line) => console.log(line);

/** Permite capturar las líneas en las pruebas. Devuelve el destino anterior. */
const setLogSink = (fn) => {
  const previous = sink;
  sink = fn;
  return previous;
};

/**
 * Registra un evento.
 * @param {string} level - debug | info | warn | error
 * @param {string} event - nombre del evento, por ejemplo "auth.login_failed"
 * @param {Object} fields - datos del evento; no incluir contraseñas ni tokens
 * @returns {boolean} true si el evento se escribió
 */
const logEvent = (level, event, fields = {}) => {
  if ((LEVELS[level] ?? LEVELS.info) < currentLevel()) {
    return false;
  }

  sink(JSON.stringify({ time: new Date().toISOString(), level, event, ...fields }));
  return true;
};

/**
 * Middleware: asigna un identificador a cada petición (el de Vercel si existe),
 * lo devuelve en la cabecera X-Request-Id y, al terminar, registra el método, la
 * ruta, el estado y la duración.
 */
const requestLogger = (req, res, next) => {
  const start = process.hrtime.bigint();
  const requestId = req.get("x-vercel-id") || randomUUID();

  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    logEvent(res.statusCode >= 500 ? "error" : "info", "http.request", {
      requestId,
      method: req.method,
      path: req.originalUrl.split("?")[0],
      status: res.statusCode,
      durationMs: Math.round(durationMs * 10) / 10,
      userId: req.user?.id ?? null,
    });
  });

  next();
};

module.exports = { logEvent, requestLogger, setLogSink, LEVELS };
