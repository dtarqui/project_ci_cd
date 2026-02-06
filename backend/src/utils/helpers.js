/**
 * Utilities - Funciones reutilizables
 */

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
 * Crea un token mock para un usuario
 * @param {number} userId - ID del usuario
 * @returns {string} Token JWT mock
 */
const createMockToken = (userId) => {
  return `mock-jwt-token-${userId}`;
};

/**
 * Valida si un token es válido
 * @param {string} token - Token a validar
 * @returns {boolean} True si es válido
 */
const isValidToken = (token) => {
  return (
    token === "valid_token" ||
    token.includes("user_") ||
    token.startsWith("mock-jwt-token-")
  );
};

module.exports = {
  calculateProductStatus,
  getNextProductId,
  extractToken,
  createMockToken,
  isValidToken,
};
