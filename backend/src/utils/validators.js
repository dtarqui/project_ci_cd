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

const validatePasswordStrength = (password) => {
  if (typeof password !== "string") {
    return {
      isValid: false,
      error: "La contraseña debe ser string",
      code: "INVALID_PASSWORD_TYPE",
    };
  }

  if (password.length < 8) {
    return {
      isValid: false,
      error: "La contraseña debe tener al menos 8 caracteres",
      code: "WEAK_PASSWORD",
    };
  }

  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    return {
      isValid: false,
      error: "La contraseña debe incluir mayúsculas, minúsculas y números",
      code: "WEAK_PASSWORD",
    };
  }

  return { isValid: true };
};

const isValidDateString = (value) => {
  if (typeof value !== "string") {
    return false;
  }

  const date = new Date(value);
  return !Number.isNaN(date.getTime());
};

const validateUserMetadata = (body) => {
  const metadataRules = [
    { key: "phone", max: 25 },
    { key: "address", max: 180 },
    { key: "city", max: 80 },
    { key: "state", max: 80 },
    { key: "country", max: 80 },
    { key: "postalCode", max: 20 },
  ];

  for (const rule of metadataRules) {
    const value = body[rule.key];

    if (value === undefined) {
      continue;
    }

    if (typeof value !== "string") {
      return {
        isValid: false,
        error: `${rule.key} debe ser texto`,
        code: "INVALID_TYPE",
      };
    }

    if (value.trim().length === 0 || value.length > rule.max) {
      return {
        isValid: false,
        error: `${rule.key} inválido`,
        code: "INVALID_FIELD",
      };
    }
  }

  if (body.phone !== undefined && !/^[+]?[-\d\s()]{7,25}$/.test(body.phone)) {
    return {
      isValid: false,
      error: "phone inválido",
      code: "INVALID_PHONE",
    };
  }

  if (body.dateOfBirth !== undefined) {
    if (!isValidDateString(body.dateOfBirth)) {
      return {
        isValid: false,
        error: "dateOfBirth inválido",
        code: "INVALID_DATE",
      };
    }

    const birthDate = new Date(body.dateOfBirth);
    const now = new Date();

    if (birthDate > now) {
      return {
        isValid: false,
        error: "dateOfBirth no puede ser futura",
        code: "INVALID_DATE",
      };
    }
  }

  return { isValid: true };
};

const validateUserRegistration = (body) => {
  const { username, password, name, email } = body;

  if (!username || !password || !name || !email) {
    return {
      isValid: false,
      error: "Campos requeridos: username, password, name, email",
      code: "MISSING_FIELDS",
    };
  }

  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    typeof name !== "string" ||
    typeof email !== "string"
  ) {
    return {
      isValid: false,
      error: "Todos los campos deben ser texto",
      code: "INVALID_TYPE",
    };
  }

  if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(username)) {
    return {
      isValid: false,
      error: "username debe tener 3-30 caracteres alfanuméricos",
      code: "INVALID_USERNAME",
    };
  }

  if (!email.includes("@") || email.length > 120) {
    return {
      isValid: false,
      error: "email inválido",
      code: "INVALID_EMAIL",
    };
  }

  const passwordValidation = validatePasswordStrength(password);
  if (!passwordValidation.isValid) {
    return passwordValidation;
  }

  const metadataValidation = validateUserMetadata(body);
  if (!metadataValidation.isValid) {
    return metadataValidation;
  }

  return { isValid: true };
};

const validateUserUpdate = (body) => {
  const allowedFields = [
    "name",
    "email",
    "password",
    "currentPassword",
    "phone",
    "address",
    "city",
    "state",
    "country",
    "postalCode",
    "dateOfBirth",
  ];
  const updateFields = Object.keys(body || {});

  if (updateFields.length === 0) {
    return {
      isValid: false,
      error: "No hay campos para actualizar",
      code: "NO_UPDATE_FIELDS",
    };
  }

  const invalidField = updateFields.find((field) => !allowedFields.includes(field));
  if (invalidField) {
    return {
      isValid: false,
      error: `Campo no permitido: ${invalidField}`,
      code: "INVALID_FIELD",
    };
  }

  if (body.email !== undefined) {
    if (typeof body.email !== "string" || !body.email.includes("@")) {
      return {
        isValid: false,
        error: "email inválido",
        code: "INVALID_EMAIL",
      };
    }
  }

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || body.name.trim().length < 2) {
      return {
        isValid: false,
        error: "name inválido",
        code: "INVALID_NAME",
      };
    }
  }

  if (body.password !== undefined) {
    if (!body.currentPassword) {
      return {
        isValid: false,
        error: "currentPassword es requerido para cambiar contraseña",
        code: "MISSING_CURRENT_PASSWORD",
      };
    }

    const passwordValidation = validatePasswordStrength(body.password);
    if (!passwordValidation.isValid) {
      return passwordValidation;
    }
  }

  const metadataValidation = validateUserMetadata(body);
  if (!metadataValidation.isValid) {
    return metadataValidation;
  }

  return { isValid: true };
};

/**
 * Valida datos de cliente para crear
 * @param {Object} body - Body del request
 * @returns {Object} { isValid: boolean, error?: string, code?: string }
 */
const validateCustomerCreate = (body) => {
  const { name, email, phone, _address, _city, _postalCode } = body;

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

/**
 * Valida datos de venta para crear
 * @param {Object} body - Body del request
 * @returns {Object} { isValid: boolean, error?: string, code?: string }
 */
const validateSaleCreate = (body) => {
  const { customerId, items, discount, paymentMethod } = body;

  if (customerId === undefined || !items || !paymentMethod) {
    return {
      isValid: false,
      error: "Campos requeridos: customerId, items, paymentMethod",
      code: "MISSING_FIELDS",
    };
  }

  if (typeof customerId !== "number") {
    return {
      isValid: false,
      error: "customerId debe ser número",
      code: "INVALID_TYPE",
    };
  }

  if (!Array.isArray(items) || items.length === 0) {
    return {
      isValid: false,
      error: "items debe ser un array con al menos un producto",
      code: "INVALID_ITEMS",
    };
  }

  const invalidItem = items.find(
    (item) =>
      typeof item.productId !== "number" ||
      typeof item.quantity !== "number" ||
      item.quantity <= 0
  );

  if (invalidItem) {
    return {
      isValid: false,
      error: "Cada item debe tener productId y quantity válidos",
      code: "INVALID_ITEMS",
    };
  }

  if (typeof paymentMethod !== "string") {
    return {
      isValid: false,
      error: "paymentMethod debe ser string",
      code: "INVALID_PAYMENT_METHOD",
    };
  }

  if (discount !== undefined && (typeof discount !== "number" || discount < 0)) {
    return {
      isValid: false,
      error: "discount debe ser un número positivo",
      code: "INVALID_DISCOUNT",
    };
  }

  return { isValid: true };
};

/**
 * Valida datos de venta para actualizar
 * @param {Object} body - Body del request
 * @returns {Object} { isValid: boolean, error?: string, code?: string }
 */
const validateSaleUpdate = (body) => {
  const { status, paymentMethod, notes } = body;
  const validStatuses = ["Completada", "Pendiente", "Anulada"];

  if (status && !validStatuses.includes(status)) {
    return {
      isValid: false,
      error: "status inválido",
      code: "INVALID_STATUS",
    };
  }

  if (paymentMethod !== undefined && typeof paymentMethod !== "string") {
    return {
      isValid: false,
      error: "paymentMethod debe ser string",
      code: "INVALID_PAYMENT_METHOD",
    };
  }

  if (notes !== undefined && typeof notes !== "string") {
    return {
      isValid: false,
      error: "notes debe ser string",
      code: "INVALID_NOTES",
    };
  }

  return { isValid: true };
};

module.exports = {
  validateProductCreate,
  validateProductUpdate,
  validateLoginCredentials,
  validatePasswordStrength,
  validateUserRegistration,
  validateUserUpdate,
  validateCustomerCreate,
  validateCustomerUpdate,
  validateSaleCreate,
  validateSaleUpdate,
};
