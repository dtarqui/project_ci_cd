/**
 * Middleware de Autenticación
 * Valida que el token Bearer sea válido antes de acceder a rutas protegidas
 */

const { extractToken, isValidToken } = require("../utils/helpers");

/**
 * Middleware para validar token Bearer
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      error: "Token de autorización requerido",
      code: "MISSING_AUTH_TOKEN",
    });
  }

  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Formato de token inválido",
      code: "INVALID_TOKEN_FORMAT",
    });
  }

  const token = extractToken(authHeader);

  if (!isValidToken(token)) {
    return res.status(401).json({
      error: "Token inválido",
      code: "INVALID_TOKEN",
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
  res.status(404).json({
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
  res.status(500).json({
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
  notFoundHandler,
  errorHandler,
};
