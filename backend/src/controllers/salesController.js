/**
 * Sales Controller - Lógica de ventas
 */

const { validateSaleCreate, validateSaleUpdate } = require("../utils/validators");
const { createSaleRepository } = require("../repositories/saleRepository");
const { createProductRepository } = require("../repositories/productRepository");
const { createCustomerRepository } = require("../repositories/customerRepository");

const TAX_RATE = 0.13;
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
    const parsedCustomerId = parseInt(customerId);
    if (!Number.isNaN(parsedCustomerId)) {
      sales = sales.filter((sale) => sale.customerId === parsedCustomerId);
    }
  }

  res.json({
    success: true,
    data: sales,
    count: sales.length,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Obtiene una venta específica por ID
 */
const getSale = async (req, res) => {
  const saleId = parseInt(req.params.id);
  const sale = await saleRepository.findById(saleId);

  if (!sale) {
    return res.status(404).json({
      error: "Venta no encontrada",
      code: "SALE_NOT_FOUND",
    });
  }

  res.json({
    success: true,
    data: sale,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Crea una nueva venta
 */
const createSale = async (req, res) => {
  const validation = validateSaleCreate(req.body);

  if (!validation.isValid) {
    return res.status(400).json({
      error: validation.error,
      code: validation.code,
    });
  }

  const { customerId, items, discount = 0, paymentMethod, notes, status } =
    req.body;

  const customer = await customerRepository.findById(customerId);

  if (!customer) {
    return res.status(404).json({
      error: "Cliente no encontrado",
      code: "CUSTOMER_NOT_FOUND",
    });
  }

  let subtotal = 0;
  const saleItems = [];
  const requestedByProduct = new Map();

  for (const item of items) {
    const requestedQty = requestedByProduct.get(item.productId) || 0;
    requestedByProduct.set(item.productId, requestedQty + item.quantity);
  }

  for (const [productId, requestedQty] of requestedByProduct.entries()) {
    const product = await productRepository.findById(productId);

    if (!product) {
      return res.status(404).json({
        error: "Producto no encontrado",
        code: "PRODUCT_NOT_FOUND",
      });
    }

    if (requestedQty > product.stock) {
      return res.status(400).json({
        error: `Stock insuficiente para ${product.name}`,
        code: "INSUFFICIENT_STOCK",
        data: {
          productId: product.id,
          availableStock: product.stock,
          requestedQuantity: requestedQty,
        },
      });
    }
  }

  for (const item of items) {
    const product = await productRepository.findById(item.productId);

    if (!product) {
      return res.status(404).json({
        error: "Producto no encontrado",
        code: "PRODUCT_NOT_FOUND",
      });
    }

    const lineTotal = parseFloat((product.price * item.quantity).toFixed(2));
    subtotal += lineTotal;

    saleItems.push({
      productId: product.id,
      name: product.name,
      quantity: item.quantity,
      price: product.price,
      total: lineTotal,
    });
  }

  subtotal = parseFloat(subtotal.toFixed(2));
  const tax = parseFloat((subtotal * TAX_RATE).toFixed(2));
  const total = parseFloat((subtotal + tax - discount).toFixed(2));

  const now = new Date().toISOString();
  const saleDate = now.split("T")[0];
  const finalStatus = status || "Completada";
  const newSale = await saleRepository.create({
    customerId: customer.id,
    customerName: customer.name,
    items: saleItems,
    subtotal,
    tax,
    discount,
    total: total < 0 ? 0 : total,
    status: finalStatus,
    paymentMethod,
    notes: notes || "",
  });

  // Actualiza inventario y métricas del cliente solo para ventas activas.
  if (finalStatus.toLowerCase() !== "anulada") {
    await productRepository.applySaleImpact(saleItems, saleDate);

    await customerRepository.updateStats(customer.id, {
      totalSpentDelta: newSale.total,
      purchasesDelta: 1,
      lastPurchase: saleDate,
    });
  }

  res.status(201).json({
    success: true,
    data: newSale,
    message: "Venta registrada exitosamente",
    timestamp: now,
  });
};

/**
 * Actualiza una venta existente
 */
const updateSale = async (req, res) => {
  const saleId = parseInt(req.params.id);
  const sale = await saleRepository.findById(saleId);

  if (!sale) {
    return res.status(404).json({
      error: "Venta no encontrada",
      code: "SALE_NOT_FOUND",
    });
  }

  const validation = validateSaleUpdate(req.body);

  if (!validation.isValid) {
    return res.status(400).json({
      error: validation.error,
      code: validation.code,
    });
  }

  const updatedSale = await saleRepository.update(saleId, req.body);

  res.json({
    success: true,
    data: updatedSale,
    message: "Venta actualizada exitosamente",
    timestamp: updatedSale.updatedAt,
  });
};

/**
 * Anula una venta
 */
const cancelSale = async (req, res) => {
  const saleId = parseInt(req.params.id);
  const sale = await saleRepository.findById(saleId);

  if (!sale) {
    return res.status(404).json({
      error: "Venta no encontrada",
      code: "SALE_NOT_FOUND",
    });
  }

  const canceledSale = await saleRepository.update(saleId, { status: "Anulada" });

  res.json({
    success: true,
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
