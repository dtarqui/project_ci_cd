/**
 * Utilities - Funciones reutilizables
 */

const jwt = require("jsonwebtoken");

const DEFAULT_JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";
const DEFAULT_JWT_ALGORITHM = process.env.JWT_ALGORITHM || "HS256";
const ALLOWED_HMAC_ALGORITHMS = ["HS256", "HS384", "HS512"];

const getJwtAlgorithm = () => {
  if (ALLOWED_HMAC_ALGORITHMS.includes(DEFAULT_JWT_ALGORITHM)) {
    return DEFAULT_JWT_ALGORITHM;
  }

  return "HS256";
};

const getJwtSecret = () => {
  const secretCandidates = [
    process.env.JWT_SECRET,
    process.env.VERCEL_JWT_SECRET,
    process.env.AUTH_JWT_SECRET,
    process.env.AUTH_SECRET,
    process.env.JWT_SECRET_KEY,
  ];

  const secret = secretCandidates.find(
    (value) => typeof value === "string" && value.trim()
  );

  if (secret) {
    const normalized = secret.trim();

    // Recomendación JWT (HMAC): usar secreto de al menos 256 bits.
    if (process.env.NODE_ENV === "production" && normalized.length < 32) {
      throw new Error(
        "JWT secret inseguro: define JWT_SECRET (o VERCEL_JWT_SECRET) con al menos 32 caracteres en producción"
      );
    }

    return normalized;
  }

  // En producción se requiere secreto explícito para evitar tokens débiles.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "JWT_SECRET no configurado en producción. Configúralo en Vercel con un valor fuerte (>=32 caracteres)."
    );
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
  const signOptions = {
    expiresIn: DEFAULT_JWT_EXPIRES_IN,
    algorithm: getJwtAlgorithm(),
  };

  if (process.env.JWT_ISSUER) {
    signOptions.issuer = process.env.JWT_ISSUER;
  }

  if (process.env.JWT_AUDIENCE) {
    signOptions.audience = process.env.JWT_AUDIENCE;
  }

  const payload = {
    sub: userId,
    ...extraPayload,
  };

  return jwt.sign(payload, getJwtSecret(), signOptions);
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
    const verifyOptions = {
      algorithms: [getJwtAlgorithm()],
    };

    if (process.env.JWT_ISSUER) {
      verifyOptions.issuer = process.env.JWT_ISSUER;
    }

    if (process.env.JWT_AUDIENCE) {
      verifyOptions.audience = process.env.JWT_AUDIENCE;
    }

    return jwt.verify(token, getJwtSecret(), verifyOptions);
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
