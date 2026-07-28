/**
 * Product DAO
 * Centraliza el mapeo de payloads a entidades de producto.
 */

const ProductDao = {
  createFromPayload(payload, nextId, calculateProductStatus) {
    const now = new Date().toISOString();

    return {
      id: nextId,
      name: payload.name,
      category: payload.category,
      price: parseFloat(payload.price),
      stock: parseInt(payload.stock, 10),
      status: calculateProductStatus(parseInt(payload.stock, 10)),
      lastSale: now.split("T")[0],
      sales: 0,
      createdAt: now,
      updatedAt: now,
    };
  },

  mergeUpdates(currentProduct, updates, calculateProductStatus) {
    const next = { ...currentProduct };

    if (updates.name) next.name = updates.name;
    if (updates.category) next.category = updates.category;
    if (updates.price !== undefined) next.price = parseFloat(updates.price);

    if (updates.stock !== undefined) {
      next.stock = parseInt(updates.stock, 10);
      next.status = calculateProductStatus(next.stock);
    }

    next.updatedAt = new Date().toISOString();

    return next;
  },
};

module.exports = { ProductDao };
