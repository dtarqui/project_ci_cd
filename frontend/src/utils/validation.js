/**
 * Reglas de validacion de los formularios.
 *
 * Existe para que los tres formularios (cliente, producto, venta) apliquen el
 * mismo criterio y el mismo texto de error, en vez de repetir cada uno su propia
 * version de "el nombre es requerido".
 *
 * IMPORTANTE: estas reglas replican las de `backend/src/utils/validators.js`. No
 * se pueden importar de ahi porque backend y frontend se compilan y despliegan
 * por separado (CommonJS contra el bundle de webpack, y en Vercel son dos
 * proyectos distintos). Si se cambia una regla, hay que cambiar las dos: el
 * formulario guia al usuario, pero quien decide es la API.
 */

// Telefono boliviano: 8 digitos nacionales. El codigo de pais no se pide ni se
// guarda, porque el negocio opera solo en Bolivia y seria "+591" en todas las
// filas. El primer digito dice el tipo de linea: 2, 3 o 4 fija; 6 o 7 movil.
export const PHONE_DIGITS = 8;
export const PHONE_FIRST_DIGITS = ["2", "3", "4", "6", "7"];

export const NAME_MIN_LENGTH = 3;
export const ADDRESS_MAX_LENGTH = 180;
export const POSTAL_CODE_MAX_LENGTH = 20;

/** Deja solo los digitos del numero nacional, tolerando un +591 pegado o separadores. */
export const normalizePhone = (value) => {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().replace(/^\+?591/, "").replace(/\D/g, "");
};

/** Recorta el valor sin fallar si llega algo que no es texto. */
const clean = (value) => (typeof value === "string" ? value.trim() : "");

export const validateName = (value) => {
  const name = clean(value);
  if (!name) {
    return "El nombre es requerido";
  }
  if (name.length < NAME_MIN_LENGTH) {
    return `El nombre debe tener al menos ${NAME_MIN_LENGTH} caracteres`;
  }
  return "";
};

export const validateEmail = (value) => {
  const email = clean(value);
  if (!email) {
    return "El email es requerido";
  }
  // Suficiente para atajar el error de tecleo, sin pretender validar RFC 5322:
  // algo antes de la arroba, algo despues, y un punto con dominio.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "El email no tiene un formato válido";
  }
  return "";
};

export const validatePhone = (value) => {
  const digits = normalizePhone(value);
  if (!digits) {
    return "El teléfono es requerido";
  }
  if (digits.length !== PHONE_DIGITS) {
    return `El teléfono debe tener ${PHONE_DIGITS} dígitos`;
  }
  if (!PHONE_FIRST_DIGITS.includes(digits[0])) {
    return "El teléfono debe empezar en 2, 3 o 4 (fija) o en 6 o 7 (móvil)";
  }
  return "";
};

export const validateAddress = (value) => {
  if (clean(value).length > ADDRESS_MAX_LENGTH) {
    return `La dirección no puede pasar de ${ADDRESS_MAX_LENGTH} caracteres`;
  }
  return "";
};

/**
 * La ciudad es opcional, pero si se indica tiene que estar en el catalogo que
 * sirve el backend. Con el catalogo vacio (la peticion fallo) no se bloquea el
 * alta: el formulario cae a texto libre y la API sigue siendo el arbitro.
 */
export const validateCity = (value, cityNames = []) => {
  const city = clean(value);
  if (!city || !cityNames.length) {
    return "";
  }
  if (!cityNames.includes(city)) {
    return "Selecciona una ciudad de la lista";
  }
  return "";
};

export const validatePostalCode = (value) => {
  if (clean(value).length > POSTAL_CODE_MAX_LENGTH) {
    return `El código postal no puede pasar de ${POSTAL_CODE_MAX_LENGTH} caracteres`;
  }
  return "";
};

export const validatePrice = (value) => {
  if (value === "" || value === null || value === undefined) {
    return "El precio es requerido";
  }
  const price = Number(value);
  if (!Number.isFinite(price)) {
    return "El precio debe ser un número";
  }
  if (price < 0) {
    return "El precio no puede ser negativo";
  }
  return "";
};

/**
 * El stock son unidades: 1,5 no existe. Antes el formulario lo pasaba por
 * parseInt y guardaba 1 sin avisar de que se habia perdido el decimal.
 */
export const validateStock = (value) => {
  if (value === "" || value === null || value === undefined) {
    return "El stock es requerido";
  }
  const stock = Number(value);
  if (!Number.isFinite(stock)) {
    return "El stock debe ser un número";
  }
  if (!Number.isInteger(stock)) {
    return "El stock debe ser un número entero de unidades";
  }
  if (stock < 0) {
    return "El stock no puede ser negativo";
  }
  return "";
};

/**
 * Primer campo con error segun el orden visual del formulario, para poder
 * llevarle el foco en vez de dejar al usuario buscando que falto.
 * @param {Object<string, string>} errors - Errores por campo ("" = sin error).
 * @param {Array<string>} fieldOrder - Nombres en el orden en que se muestran.
 * @returns {string|null}
 */
export const firstInvalidField = (errors, fieldOrder) =>
  fieldOrder.find((field) => errors[field]) || null;

/** true si no hay ningun mensaje de error en el mapa. */
export const isClean = (errors) => Object.values(errors).every((message) => !message);
