/**
 * Sales Controller - Lógica de ventas
 */

const { mockData } = require("../db/mockData");
const { validateSaleCreate, validateSaleUpdate } = require("../utils/validators");

const TAX_RATE = 0.13;

/**
 * Obtiene lista de ventas con filtros
 */
const getSales = (req, res) => {
  const { status = "", customerId = "" } = req.query;

  let sales = [...mockData.sales];

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
const getSale = (req, res) => {
  const saleId = parseInt(req.params.id);
  const sale = mockData.sales.find((s) => s.id === saleId);

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
const createSale = (req, res) => {
  const validation = validateSaleCreate(req.body);

  if (!validation.isValid) {
    return res.status(400).json({
      error: validation.error,
      code: validation.code,
    });
  }

  const { customerId, items, discount = 0, paymentMethod, notes, status } =
    req.body;

  const customer = mockData.customers.find((c) => c.id === customerId);

  if (!customer) {
    return res.status(404).json({
      error: "Cliente no encontrado",
      code: "CUSTOMER_NOT_FOUND",
    });
  }

  let subtotal = 0;
  const saleItems = [];

  for (const item of items) {
    const product = mockData.products.find((p) => p.id === item.productId);

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
  const newSale = {
    id: Math.max(...mockData.sales.map((s) => s.id), 0) + 1,
    customerId: customer.id,
    customerName: customer.name,
    items: saleItems,
    subtotal,
    tax,
    discount,
    total: total < 0 ? 0 : total,
    status: status || "Completada",
    paymentMethod,
    notes: notes || "",
    createdAt: now,
    updatedAt: now,
  };

  mockData.sales.push(newSale);

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
const updateSale = (req, res) => {
  const saleId = parseInt(req.params.id);
  const sale = mockData.sales.find((s) => s.id === saleId);

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

  const { status, paymentMethod, notes } = req.body;

  if (status) sale.status = status;
  if (paymentMethod) sale.paymentMethod = paymentMethod;
  if (notes !== undefined) sale.notes = notes;

  sale.updatedAt = new Date().toISOString();

  res.json({
    success: true,
    data: sale,
    message: "Venta actualizada exitosamente",
    timestamp: sale.updatedAt,
  });
};

/**
 * Anula una venta
 */
const cancelSale = (req, res) => {
  const saleId = parseInt(req.params.id);
  const sale = mockData.sales.find((s) => s.id === saleId);

  if (!sale) {
    return res.status(404).json({
      error: "Venta no encontrada",
      code: "SALE_NOT_FOUND",
    });
  }

  sale.status = "Anulada";
  sale.updatedAt = new Date().toISOString();

  res.json({
    success: true,
    data: sale,
    message: "Venta anulada exitosamente",
    timestamp: sale.updatedAt,
  });
};

module.exports = {
  getSales,
  getSale,
  createSale,
  updateSale,
  cancelSale,
};
