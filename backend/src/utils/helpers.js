/**
 * Utilities - Funciones reutilizables
 */

const jwt = require("jsonwebtoken");

const DEFAULT_JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (secret && secret.trim()) {
    return secret;
  }

  // En producción se requiere secreto explícito para evitar tokens débiles.
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET no configurado en producción");
  }

  return "dev-only-jwt-secret-change-me";
};

/**
 * Calcula el estado del producto basado en el stock
 * @param {number} stock - Cantidad de stock
 * @returns {string} Estado del producto
 */
const calculateProductStatus = (stock) => {
  if (stock > 20) return "En Stock";
  if (stock > 0) return "Bajo Stock";
  return "Sin Stock";
};

/**
 * Obtiene el siguiente ID disponible para un producto
 * @param {Array} products - Array de productos
 * @returns {number} Siguiente ID disponible
 */
const getNextProductId = (products) => {
  return Math.max(...products.map((p) => p.id), 0) + 1;
};

/**
 * Extrae el token del header de autorización
 * @param {string} authHeader - Header Authorization
 * @returns {string|null} Token sin "Bearer "
 */
const extractToken = (authHeader) => {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.replace("Bearer ", "");
};

/**
 * Crea un token JWT firmado para un usuario
 * @param {number} userId - ID del usuario
 * @param {Object} extraPayload - Claims adicionales
 * @returns {string} JWT firmado
 */
const createAuthToken = (userId, extraPayload = {}) => {
  const payload = {
    sub: userId,
    ...extraPayload,
  };

  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: DEFAULT_JWT_EXPIRES_IN,
  });
};

/**
 * Verifica y decodifica un JWT
 * @param {string} token - Token a validar
 * @returns {Object|null} Payload decodificado o null
 */
const verifyAuthToken = (token) => {
  if (!token || typeof token !== "string") {
    return null;
  }

  try {
    return jwt.verify(token, getJwtSecret());
  } catch (_error) {
    return null;
  }
};

/**
 * Valida si un token JWT es válido
 * @param {string} token - Token a validar
 * @returns {boolean} True si es válido
 */
const isValidToken = (token) => {
  return Boolean(verifyAuthToken(token));
};

module.exports = {
  calculateProductStatus,
  getNextProductId,
  extractToken,
  createAuthToken,
  verifyAuthToken,
  isValidToken,
};
