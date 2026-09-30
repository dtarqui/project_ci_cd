/**
 * Domain constants
 * Centraliza literales de negocio que antes estaban repetidos/hardcodeados
 * en controllers, services y utils.
 */

const TAX_RATE = 0.13;

// Catalogo de ciudades atendidas. Es la fuente unica: la semilla deriva de aqui
// los prefijos postales de cada cliente, el validador acepta solo estos nombres y
// GET /api/customers/cities lo expone para que el formulario ofrezca la lista en
// lugar de un campo de texto libre donde "La Paz", "la paz" y "LaPaz" eran tres
// ciudades distintas.
//   - postalPrefix: prefijo del codigo postal interno (LP-01, SC-02, ...).
//   - areaCode: codigo de area telefonico que usa la semilla al generar numeros.
const CITY_CATALOG = [
  { name: "La Paz", postalPrefix: "LP", areaCode: "22" },
  { name: "El Alto", postalPrefix: "EA", areaCode: "22" },
  { name: "Santa Cruz de la Sierra", postalPrefix: "SC", areaCode: "33" },
  { name: "Cochabamba", postalPrefix: "CB", areaCode: "44" },
  { name: "Sucre", postalPrefix: "SU", areaCode: "64" },
  { name: "Oruro", postalPrefix: "OR", areaCode: "25" },
  { name: "Potosí", postalPrefix: "PT", areaCode: "26" },
  { name: "Tarija", postalPrefix: "TJ", areaCode: "66" },
];

const CITY_NAMES = CITY_CATALOG.map((city) => city.name);

const CITY_POSTAL_PREFIX = CITY_CATALOG.reduce((acc, city) => {
  acc[city.name] = city.postalPrefix;
  return acc;
}, {});

const STOCK_THRESHOLDS = {
  LOW: 20,
  OUT: 0,
};

const CUSTOMER_SEGMENT_THRESHOLDS = {
  VIP: 3000,
  FRECUENTE: 1500,
  REGULAR: 500,
};

const MONEY_FORMAT_THRESHOLDS = {
  MILLION: 1_000_000,
  THOUSAND: 1_000,
};

const DASHBOARD_SLICE_SIZES = {
  DAILY_TREND: 7,
  MONTHLY_TREND: 6,
  PRODUCT_SALES: 8,
  TOP_PRODUCTS: 5,
};

// Heurística de normalización visual: centra el porcentaje de participación
// de ingresos (0-100) alrededor de 0, para mostrar una tendencia +/- en vez
// de un valor absoluto siempre positivo.
const TOP_PRODUCTS_TREND_FUDGE = -50;

module.exports = {
  TAX_RATE,
  CITY_CATALOG,
  CITY_NAMES,
  CITY_POSTAL_PREFIX,
  STOCK_THRESHOLDS,
  CUSTOMER_SEGMENT_THRESHOLDS,
  MONEY_FORMAT_THRESHOLDS,
  DASHBOARD_SLICE_SIZES,
  TOP_PRODUCTS_TREND_FUDGE,
};
