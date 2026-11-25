/**
 * Middleware de Autenticación
 * Valida que el token Bearer sea válido antes de acceder a rutas protegidas
 */

const { extractToken, verifyAuthToken } = require("../utils/helpers");
const { sendError } = require("../utils/httpResponses");
const { logEvent } = require("../utils/logger");
const { checkSession } = require("../services/sessionService");
const { raiseAlert, createAccessDeniedMonitor } = require("../services/securityAlerts");
const { clientIp } = require("./security");

const accessDeniedMonitor = createAccessDeniedMonitor();

/**
 * Middleware para validar token Bearer.
 * Ademas de la firma y el vencimiento, comprueba que la sesion siga vigente
 * (que el token no se haya revocado al cerrar sesion) y toma el rol actual del
 * usuario, no el que llevaba el token (ver services/sessionService.js).
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware
 */
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return sendError(res, 401, {
      error: "Token de autorización requerido",
      code: "MISSING_AUTH_TOKEN",
    });
  }

  if (!authHeader.startsWith("Bearer ")) {
    return sendError(res, 401, {
      error: "Formato de token inválido",
      code: "INVALID_TOKEN_FORMAT",
    });
  }

  const token = extractToken(authHeader);

  const payload = verifyAuthToken(token);

  if (!payload) {
    return sendError(res, 401, {
      error: "Token inválido",
      code: "INVALID_TOKEN",
    });
  }

  let session;
  try {
    session = await checkSession(payload);
  } catch (error) {
    return next(error);
  }

  if (!session.active) {
    logEvent("warn", "auth.session_rejected", {
      userId: Number(payload.sub),
      reason: session.reason,
    });
    return sendError(res, 401, {
      error: "La sesión ya no es válida. Inicia sesión de nuevo.",
      code: "SESSION_REVOKED",
    });
  }

  req.user = {
    id: Number(payload.sub),
    username: payload.username,
    name: payload.name,
    role: session.role || payload.role,
    jti: payload.jti,
    tokenExp: payload.exp,
  };

  return next();
};

/**
 * Middleware para restringir acceso por rol. Debe usarse después de
 * authenticateToken, ya que depende de req.user.role.
 * @param {...string} roles - Roles permitidos (ej. "admin")
 */
const requireRole = (...roles) => async (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    // Varios rechazos seguidos del mismo usuario sugieren que esta probando
    // operaciones reservadas: se emite una alerta al alcanzar el umbral.
    if (req.user && accessDeniedMonitor.record(req.user.id)) {
      await raiseAlert({
        type: "access_denied_burst",
        severity: "medium",
        userId: req.user.id,
        username: req.user.username,
        ip: clientIp(req),
        details: {
          count: accessDeniedMonitor.threshold,
          windowMinutes: accessDeniedMonitor.windowMs / 60000,
          lastPath: (req.originalUrl || "").split("?")[0],
        },
      });
    }
    return sendError(res, 403, {
      error: "No tienes permisos para realizar esta acción",
      code: "FORBIDDEN_ROLE",
    });
  }

  return next();
};

/**
 * Middleware para manejar rutas no encontradas
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const notFoundHandler = (req, res) => {
  sendError(res, 404, {
    error: "Endpoint no encontrado",
    code: "NOT_FOUND",
    path: req.originalUrl,
    method: req.method,
  });
};

/**
 * Middleware para manejar errores generales
 * @param {Error} err - Error object
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} _next - Next middleware
 */
const errorHandler = (err, req, res, _next) => {
  // Se registra el código del error (P1001, P2024, etc., en los de Prisma) para
  // poder distinguir una falla de la base de datos de un error de la aplicación.
  logEvent("error", "http.unhandled_error", {
    requestId: req.requestId,
    method: req.method,
    path: (req.originalUrl || "").split("?")[0],
    errorCode: err?.code ?? null,
    errorName: err?.name ?? "Error",
    message: err?.message,
  });
  sendError(res, 500, {
    error: "Error interno del servidor",
    code: "INTERNAL_ERROR",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
};

module.exports = {
  authenticateToken,
  requireRole,
  notFoundHandler,
  errorHandler,
};
