/**
 * Product Validation - Validaciones para productos
 */

/**
 * Valida datos de producto para crear
 * @param {Object} body - Body del request
 * @returns {Object} { isValid: boolean, error?: string, code?: string }
 */
const validateProductCreate = (body) => {
  const { name, category, price, stock } = body;

  if (!name || !category || price === undefined || stock === undefined) {
    return {
      isValid: false,
      error: "Campos requeridos: name, category, price, stock",
      code: "INVALID_REQUEST",
    };
  }

  if (typeof price !== "number" || typeof stock !== "number") {
    return {
      isValid: false,
      error: "Price y stock deben ser números",
      code: "INVALID_TYPE",
    };
  }

  if (price < 0 || stock < 0) {
    return {
      isValid: false,
      error: "El precio y stock no pueden ser negativos",
      code: "INVALID_VALUES",
    };
  }

  return { isValid: true };
};

/**
 * Valida datos de producto para actualizar
 * @param {Object} body - Body del request
 * @returns {Object} { isValid: boolean, error?: string, code?: string }
 */
const validateProductUpdate = (body) => {
  const { price, stock } = body;

  if (price !== undefined && (typeof price !== "number" || price < 0)) {
    return {
      isValid: false,
      error: "El precio debe ser un número positivo",
      code: "INVALID_VALUES",
    };
  }

  if (stock !== undefined && (typeof stock !== "number" || stock < 0)) {
    return {
      isValid: false,
      error: "El stock debe ser un número positivo",
      code: "INVALID_VALUES",
    };
  }

  return { isValid: true };
};

/**
 * Valida credenciales de login
 * @param {Object} body - Body del request
 * @returns {Object} { isValid: boolean, error?: string, code?: string }
 */
const validateLoginCredentials = (body) => {
  const { username, password } = body;

  if (!username || !password) {
    return {
      isValid: false,
      error: "Usuario y contraseña requeridos",
      code: "MISSING_CREDENTIALS",
    };
  }

  if (typeof username !== "string" || typeof password !== "string") {
    return {
      isValid: false,
      error: "Usuario y contraseña deben ser strings",
      code: "INVALID_CREDENTIALS_TYPE",
    };
  }

  return { isValid: true };
};

/**
 * Valida datos de cliente para crear
 * @param {Object} body - Body del request
 * @returns {Object} { isValid: boolean, error?: string, code?: string }
 */
const validateCustomerCreate = (body) => {
  const { name, email, phone, address, city, postalCode } = body;

  if (!name || !email || !phone) {
    return {
      isValid: false,
      error: "Campos requeridos: name, email, phone",
      code: "MISSING_FIELDS",
    };
  }

  if (!email.includes("@")) {
    return {
      isValid: false,
      error: "El email debe ser válido",
      code: "INVALID_EMAIL",
    };
  }

  if (phone.length < 10) {
    return {
      isValid: false,
      error: "El teléfono debe tener al menos 10 caracteres",
      code: "INVALID_PHONE",
    };
  }

  return { isValid: true };
};

/**
 * Valida datos de cliente para actualizar
 * @param {Object} body - Body del request
 * @returns {Object} { isValid: boolean, error?: string, code?: string }
 */
const validateCustomerUpdate = (body) => {
  if (body.email && !body.email.includes("@")) {
    return {
      isValid: false,
      error: "El email debe ser válido",
      code: "INVALID_EMAIL",
    };
  }

  if (body.phone && body.phone.length < 10) {
    return {
      isValid: false,
      error: "El teléfono debe tener al menos 10 caracteres",
      code: "INVALID_PHONE",
    };
  }

  return { isValid: true };
};

module.exports = {
  validateProductCreate,
  validateProductUpdate,
  validateLoginCredentials,
  validateCustomerCreate,
  validateCustomerUpdate,
};
