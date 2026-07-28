/**
 * Sale DAO
 * Construye y actualiza entidades de venta de forma consistente.
 */

const SaleDao = {
  createFromPayload(payload) {
    const now = new Date().toISOString();

    return {
      id: payload.id,
      customerId: payload.customerId,
      customerName: payload.customerName,
      items: payload.items,
      subtotal: payload.subtotal,
      tax: payload.tax,
      discount: payload.discount,
      total: payload.total,
      status: payload.status,
      paymentMethod: payload.paymentMethod,
      notes: payload.notes || "",
      createdAt: now,
      updatedAt: now,
    };
  },

  mergeUpdates(currentSale, updates) {
    const next = { ...currentSale };

    if (updates.status) next.status = updates.status;
    if (updates.paymentMethod) next.paymentMethod = updates.paymentMethod;
    if (updates.notes !== undefined) next.notes = updates.notes;

    next.updatedAt = new Date().toISOString();

    return next;
  },
};

module.exports = { SaleDao };
