/**
 * Controles de seguridad de la API
 *
 * - Cabeceras de seguridad en todas las respuestas (OWASP A02:2025). La API solo
 *   devuelve JSON, de modo que la política de contenido puede prohibirlo todo.
 * - Límite de intentos fallidos de inicio de sesión (OWASP A07:2025).
 */

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
  "Strict-Transport-Security": "max-age=15552000; includeSubDomains",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  // Las respuestas de la API son datos autenticados: ningun navegador ni
  // intermediario debe guardarlas (aviso 10049 del escaneo OWASP ZAP).
  "Cache-Control": "no-store",
};

const securityHeaders = (req, res, next) => {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    res.setHeader(name, value);
  }
  next();
};

/**
 * IP del cliente. En Vercel la entrega la plataforma en x-real-ip o
 * x-vercel-forwarded-for; fuera de ella se usa la del socket.
 */
const clientIp = (req) =>
  req.get("x-vercel-forwarded-for") || req.get("x-real-ip") || req.ip || "desconocida";

/**
 * Cuenta los inicios de sesión fallidos por par IP + usuario en una ventana fija.
 * Al alcanzar el máximo, rechaza nuevos intentos hasta que la ventana vence.
 *
 * Limitación conocida: en Vercel el contador vive en la memoria de cada instancia
 * de la función. Frena los intentos repetidos de un cliente, pero no es un límite
 * global; para eso haría falta un almacén compartido, como Redis.
 */
const createLoginAttemptLimiter = ({
  maxAttempts = parseInt(process.env.LOGIN_MAX_ATTEMPTS, 10) || 5,
  windowMs = (parseInt(process.env.LOGIN_WINDOW_MINUTES, 10) || 15) * 60 * 1000,
  now = () => Date.now(),
} = {}) => {
  const attempts = new Map();

  const keyFor = (req) =>
    `${clientIp(req)}|${String(req.body?.username ?? "").trim().toLowerCase()}`;

  const entryFor = (req) => {
    const key = keyFor(req);
    const entry = attempts.get(key);

    if (entry && now() - entry.firstAttempt >= windowMs) {
      attempts.delete(key);
      return { key, entry: null };
    }

    return { key, entry };
  };

  return {
    /** @returns {{blocked: boolean, retryAfterSeconds?: number}} */
    check(req) {
      const { entry } = entryFor(req);

      if (!entry || entry.count < maxAttempts) {
        return { blocked: false };
      }

      return {
        blocked: true,
        retryAfterSeconds: Math.max(Math.ceil((entry.firstAttempt + windowMs - now()) / 1000), 1),
      };
    },

    registerFailure(req) {
      const { key, entry } = entryFor(req);
      const next = entry
        ? { ...entry, count: entry.count + 1 }
        : { count: 1, firstAttempt: now() };
      attempts.set(key, next);
      return next.count;
    },

    reset(req) {
      attempts.delete(keyFor(req));
    },
  };
};

module.exports = {
  SECURITY_HEADERS,
  securityHeaders,
  clientIp,
  createLoginAttemptLimiter,
};
