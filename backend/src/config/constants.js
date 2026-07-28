/**
 * Domain constants
 * Centraliza literales de negocio que antes estaban repetidos/hardcodeados
 * en controllers, services y utils.
 */

const TAX_RATE = 0.13;

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
  STOCK_THRESHOLDS,
  CUSTOMER_SEGMENT_THRESHOLDS,
  MONEY_FORMAT_THRESHOLDS,
  DASHBOARD_SLICE_SIZES,
  TOP_PRODUCTS_TREND_FUDGE,
};
