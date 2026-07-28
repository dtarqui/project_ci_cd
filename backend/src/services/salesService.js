/**
 * Sales Service
 * Lógica de negocio para construir una venta: valida stock, calcula
 * subtotal/impuesto/total y aplica el impacto en inventario y estadísticas
 * del cliente. No conoce `req`/`res`: en caso de fallo retorna un objeto
 * `{ error, code, status }` para que el controller lo traduzca con sendError.
 */

const { TAX_RATE } = require("../config/constants");

const buildSaleFromRequest = async (
  { customerId, items, discount = 0, paymentMethod, notes, status },
  { productRepository, customerRepository, saleRepository }
) => {
  const customer = await customerRepository.findById(customerId);

  if (!customer) {
    return {
      error: "Cliente no encontrado",
      code: "CUSTOMER_NOT_FOUND",
      status: 404,
    };
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
      return {
        error: "Producto no encontrado",
        code: "PRODUCT_NOT_FOUND",
        status: 404,
      };
    }

    if (requestedQty > product.stock) {
      return {
        error: `Stock insuficiente para ${product.name}`,
        code: "INSUFFICIENT_STOCK",
        status: 400,
        data: {
          productId: product.id,
          availableStock: product.stock,
          requestedQuantity: requestedQty,
        },
      };
    }
  }

  for (const item of items) {
    const product = await productRepository.findById(item.productId);

    if (!product) {
      return {
        error: "Producto no encontrado",
        code: "PRODUCT_NOT_FOUND",
        status: 404,
      };
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

  return { sale: newSale, timestamp: now };
};

module.exports = { buildSaleFromRequest };
