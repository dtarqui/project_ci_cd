/**
 * Customer DAO
 * Normaliza datos de cliente para evitar lógica de persistencia en controladores.
 */

const CustomerDao = {
  createFromPayload(payload, nextId) {
    const now = new Date().toISOString();
    const registeredDate = now.split("T")[0];

    return {
      id: nextId,
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      address: payload.address || "",
      city: payload.city || "",
      postalCode: payload.postalCode || "",
      status: "Activo",
      registeredDate,
      totalSpent: 0,
      purchases: 0,
      lastPurchase: null,
      createdAt: now,
      updatedAt: now,
    };
  },

  mergeUpdates(currentCustomer, updates) {
    const next = { ...currentCustomer };

    if (updates.name) next.name = updates.name;
    if (updates.email) next.email = updates.email;
    if (updates.phone) next.phone = updates.phone;
    if (updates.address !== undefined) next.address = updates.address;
    if (updates.city !== undefined) next.city = updates.city;
    if (updates.postalCode !== undefined) next.postalCode = updates.postalCode;
    if (updates.status) next.status = updates.status;

    next.updatedAt = new Date().toISOString();

    return next;
  },
};

module.exports = { CustomerDao };
