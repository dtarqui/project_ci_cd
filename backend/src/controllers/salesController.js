/**
 * Sales Controller - Lógica de ventas
 */

const { validateSaleCreate, validateSaleUpdate } = require("../utils/validators");
const { createSaleRepository } = require("../repositories/saleRepository");
const { createProductRepository } = require("../repositories/productRepository");
const { createCustomerRepository } = require("../repositories/customerRepository");
const { sendSuccess, sendError } = require("../utils/httpResponses");
const { buildSaleFromRequest } = require("../services/salesService");

const saleRepository = createSaleRepository();
const productRepository = createProductRepository();
const customerRepository = createCustomerRepository();

/**
 * Obtiene lista de ventas con filtros
 */
const getSales = async (req, res) => {
  const { status = "", customerId = "" } = req.query;

  let sales = await saleRepository.list();

  if (status) {
    sales = sales.filter(
      (sale) => sale.status.toLowerCase() === status.toLowerCase()
    );
  }

  if (customerId) {
    const parsedCustomerId = parseInt(customerId, 10);
    if (!Number.isNaN(parsedCustomerId)) {
      sales = sales.filter((sale) => sale.customerId === parsedCustomerId);
    }
  }

  sendSuccess(res, {
    data: sales,
    count: sales.length,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Obtiene una venta específica por ID
 */
const getSale = async (req, res) => {
  const saleId = parseInt(req.params.id, 10);
  const sale = await saleRepository.findById(saleId);

  if (!sale) {
    return sendError(res, 404, {
      error: "Venta no encontrada",
      code: "SALE_NOT_FOUND",
    });
  }

  sendSuccess(res, { data: sale, timestamp: new Date().toISOString() });
};

/**
 * Crea una nueva venta
 */
const createSale = async (req, res) => {
  const validation = validateSaleCreate(req.body);

  if (!validation.isValid) {
    return sendError(res, 400, {
      error: validation.error,
      code: validation.code,
    });
  }

  const result = await buildSaleFromRequest(req.body, {
    productRepository,
    customerRepository,
    saleRepository,
  });

  if (result.error) {
    return sendError(res, result.status, {
      error: result.error,
      code: result.code,
      ...(result.data ? { data: result.data } : {}),
    });
  }

  sendSuccess(
    res,
    {
      data: result.sale,
      message: "Venta registrada exitosamente",
      timestamp: result.timestamp,
    },
    201
  );
};

/**
 * Actualiza una venta existente
 */
const updateSale = async (req, res) => {
  const saleId = parseInt(req.params.id, 10);
  const sale = await saleRepository.findById(saleId);

  if (!sale) {
    return sendError(res, 404, {
      error: "Venta no encontrada",
      code: "SALE_NOT_FOUND",
    });
  }

  const validation = validateSaleUpdate(req.body);

  if (!validation.isValid) {
    return sendError(res, 400, {
      error: validation.error,
      code: validation.code,
    });
  }

  const updatedSale = await saleRepository.update(saleId, req.body);

  sendSuccess(res, {
    data: updatedSale,
    message: "Venta actualizada exitosamente",
    timestamp: updatedSale.updatedAt,
  });
};

/**
 * Anula una venta
 */
const cancelSale = async (req, res) => {
  const saleId = parseInt(req.params.id, 10);
  const sale = await saleRepository.findById(saleId);

  if (!sale) {
    return sendError(res, 404, {
      error: "Venta no encontrada",
      code: "SALE_NOT_FOUND",
    });
  }

  const canceledSale = await saleRepository.update(saleId, { status: "Anulada" });

  sendSuccess(res, {
    data: canceledSale,
    message: "Venta anulada exitosamente",
    timestamp: canceledSale.updatedAt,
  });
};

module.exports = {
  getSales,
  getSale,
  createSale,
  updateSale,
  cancelSale,
};
