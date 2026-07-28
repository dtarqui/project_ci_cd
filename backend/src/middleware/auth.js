/**
 * Middleware de Autenticación
 * Valida que el token Bearer sea válido antes de acceder a rutas protegidas
 */

const { extractToken, verifyAuthToken } = require("../utils/helpers");
const { sendError } = require("../utils/httpResponses");

/**
 * Middleware para validar token Bearer
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware
 */
const authenticateToken = (req, res, next) => {
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

  req.user = {
    id: Number(payload.sub),
    username: payload.username,
    name: payload.name,
    role: payload.role,
  };

  next();
};

/**
 * Middleware para restringir acceso por rol. Debe usarse después de
 * authenticateToken, ya que depende de req.user.role.
 * @param {...string} roles - Roles permitidos (ej. "admin")
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return sendError(res, 403, {
      error: "No tienes permisos para realizar esta acción",
      code: "FORBIDDEN_ROLE",
    });
  }

  next();
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
  console.error("Error interno del servidor:", err);
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
