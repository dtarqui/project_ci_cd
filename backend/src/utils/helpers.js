/**
 * Utilities - Funciones reutilizables
 */

const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { STOCK_THRESHOLDS } = require("../config/constants");

// El token de acceso es breve y vive solo en la memoria del navegador; el de
// renovacion, mas largo, viaja en una cookie HttpOnly (ver utils/authCookies.js).
const DEFAULT_JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "15m";
const DEFAULT_REFRESH_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || "7d";
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
        "JWT secret inseguro: define JWT_SECRET con al menos 32 caracteres en producción"
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
  if (stock > STOCK_THRESHOLDS.LOW) return "En Stock";
  if (stock > STOCK_THRESHOLDS.OUT) return "Bajo Stock";
  return "Sin Stock";
};

/**
 * Filtra una lista de objetos por coincidencia parcial (case-insensitive)
 * de un término en cualquiera de los campos indicados.
 * @param {Array<Object>} items - Lista a filtrar
 * @param {Array<string>} fields - Campos a comparar contra el término
 * @param {string} term - Término de búsqueda (si está vacío, no filtra)
 * @returns {Array<Object>} Lista filtrada
 */
const filterByText = (items, fields, term) => {
  if (!term) {
    return items;
  }

  const normalizedTerm = term.toLowerCase();

  return items.filter((item) =>
    fields.some((field) => (item[field] || "").toLowerCase().includes(normalizedTerm))
  );
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

const signToken = (payload, expiresIn) => {
  const signOptions = {
    expiresIn,
    algorithm: getJwtAlgorithm(),
  };

  if (process.env.JWT_ISSUER) {
    signOptions.issuer = process.env.JWT_ISSUER;
  }

  if (process.env.JWT_AUDIENCE) {
    signOptions.audience = process.env.JWT_AUDIENCE;
  }

  // Identificador unico del token: permite revocarlo al cerrar sesion.
  signOptions.jwtid = crypto.randomUUID();

  return jwt.sign(payload, getJwtSecret(), signOptions);
};

/**
 * Crea el token de acceso (JWT) de un usuario
 * @param {number} userId - ID del usuario
 * @param {Object} extraPayload - Claims adicionales
 * @returns {string} JWT firmado
 */
const createAuthToken = (userId, extraPayload = {}) =>
  signToken({ sub: userId, ...extraPayload, typ: "access" }, DEFAULT_JWT_EXPIRES_IN);

/**
 * Crea el token de renovacion de un usuario. Solo sirve en POST /auth/refresh,
 * que lo rota en cada uso; lleva la version de sesiones (ver) para que cerrar
 * todas las sesiones tambien lo invalide.
 * @returns {{token: string, expiresAt: number}} token y vencimiento (segundos epoch)
 */
const createRefreshToken = (userId, version = 0) => {
  const token = signToken({ sub: userId, ver: version, typ: "refresh" }, DEFAULT_REFRESH_EXPIRES_IN);
  return { token, expiresAt: jwt.decode(token).exp };
};

const verifyToken = (token) => {
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
 * Verifica un token de acceso. Rechaza los de renovacion: no deben servir para
 * llamar a la API aunque su firma sea valida.
 * @param {string} token - Token a validar
 * @returns {Object|null} Payload decodificado o null
 */
const verifyAuthToken = (token) => {
  const payload = verifyToken(token);
  return payload && payload.typ !== "refresh" ? payload : null;
};

/** Verifica un token de renovacion. @returns {Object|null} */
const verifyRefreshToken = (token) => {
  const payload = verifyToken(token);
  return payload && payload.typ === "refresh" ? payload : null;
};

/**
 * Deja un telefono en su forma canonica: solo los digitos del numero nacional.
 *
 * El negocio opera unicamente en Bolivia, asi que el codigo de pais no se pide
 * ni se guarda: seria "+591" en todas las filas, ocuparia espacio en la tabla y
 * el usuario tendria que teclearlo en cada alta. Se acepta al validar, junto con
 * espacios, guiones y parentesis, para no rechazar registros cargados antes de
 * esta regla; el resultado siempre son los 8 digitos nacionales.
 * @param {*} phone
 * @returns {string} Digitos del numero nacional, o "" si no hay nada usable.
 */
const normalizePhone = (phone) => {
  if (typeof phone !== "string") {
    return "";
  }
  return phone.trim().replace(/^\+?591/, "").replace(/\D/g, "");
};

module.exports = {
  calculateProductStatus,
  filterByText,
  extractToken,
  createAuthToken,
  createRefreshToken,
  verifyAuthToken,
  verifyRefreshToken,
  normalizePhone,
  DEFAULT_JWT_EXPIRES_IN,
};
