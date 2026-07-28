const { CustomerDao } = require("../src/mappers/customerDao");
const { ProductDao } = require("../src/mappers/productDao");
const { SaleDao } = require("../src/mappers/saleDao");
const { UserDao } = require("../src/mappers/userDao");

describe("mappers/customerDao", () => {
  const baseCustomer = {
    id: 1,
    name: "Juan",
    email: "juan@email.com",
    phone: "1234567890",
    address: "Calle 1",
    city: "La Paz",
    postalCode: "LP-01",
    status: "Activo",
    totalSpent: 0,
    purchases: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  it("createFromPayload asigna valores por defecto para campos opcionales ausentes", () => {
    const created = CustomerDao.createFromPayload(
      { name: "Ana", email: "ana@email.com", phone: "9999999999" },
      5
    );

    expect(created.id).toBe(5);
    expect(created.address).toBe("");
    expect(created.city).toBe("");
    expect(created.postalCode).toBe("");
    expect(created.status).toBe("Activo");
    expect(created.totalSpent).toBe(0);
    expect(created.purchases).toBe(0);
  });

  it("mergeUpdates preserva campos no incluidos en la actualización parcial", () => {
    const updated = CustomerDao.mergeUpdates(baseCustomer, { name: "Juan Actualizado" });

    expect(updated.name).toBe("Juan Actualizado");
    expect(updated.email).toBe(baseCustomer.email);
    expect(updated.phone).toBe(baseCustomer.phone);
    expect(updated.address).toBe(baseCustomer.address);
  });

  it("mergeUpdates ignora campos con string vacío para name/email/phone/status (falsy)", () => {
    const updated = CustomerDao.mergeUpdates(baseCustomer, { name: "", email: "", phone: "", status: "" });

    expect(updated.name).toBe(baseCustomer.name);
    expect(updated.email).toBe(baseCustomer.email);
    expect(updated.phone).toBe(baseCustomer.phone);
    expect(updated.status).toBe(baseCustomer.status);
  });

  it("mergeUpdates SÍ acepta string vacío para address/city/postalCode (chequeo !== undefined)", () => {
    const updated = CustomerDao.mergeUpdates(baseCustomer, { address: "", city: "", postalCode: "" });

    expect(updated.address).toBe("");
    expect(updated.city).toBe("");
    expect(updated.postalCode).toBe("");
  });

  it("mergeUpdates ignora campos undefined explícitos", () => {
    const updated = CustomerDao.mergeUpdates(baseCustomer, { address: undefined });
    expect(updated.address).toBe(baseCustomer.address);
  });

  it("mergeUpdates siempre actualiza updatedAt", () => {
    const updated = CustomerDao.mergeUpdates(baseCustomer, {});
    expect(updated.updatedAt).not.toBe(baseCustomer.updatedAt);
  });
});

describe("mappers/productDao", () => {
  const calculateProductStatus = (stock) => {
    if (stock > 20) return "En Stock";
    if (stock > 0) return "Bajo Stock";
    return "Sin Stock";
  };

  const baseProduct = {
    id: 1,
    name: "Laptop",
    category: "Electrónica",
    price: 100,
    stock: 25,
    status: "En Stock",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  it("createFromPayload calcula status a partir del stock", () => {
    const created = ProductDao.createFromPayload(
      { name: "Mouse", category: "Accesorios", price: "20.5", stock: "5" },
      2,
      calculateProductStatus
    );

    expect(created.price).toBe(20.5);
    expect(created.stock).toBe(5);
    expect(created.status).toBe("Bajo Stock");
  });

  it("mergeUpdates preserva campos no incluidos en la actualización parcial", () => {
    const updated = ProductDao.mergeUpdates(baseProduct, { price: 150 }, calculateProductStatus);

    expect(updated.price).toBe(150);
    expect(updated.name).toBe(baseProduct.name);
    expect(updated.category).toBe(baseProduct.category);
    expect(updated.stock).toBe(baseProduct.stock);
  });

  it("mergeUpdates recalcula status solo cuando se actualiza stock", () => {
    const updated = ProductDao.mergeUpdates(baseProduct, { stock: 0 }, calculateProductStatus);
    expect(updated.stock).toBe(0);
    expect(updated.status).toBe("Sin Stock");
  });

  it("mergeUpdates no recalcula status si stock no cambia", () => {
    const updated = ProductDao.mergeUpdates(baseProduct, { price: 200 }, calculateProductStatus);
    expect(updated.status).toBe(baseProduct.status);
  });

  it("mergeUpdates ignora name/category vacíos (falsy)", () => {
    const updated = ProductDao.mergeUpdates(baseProduct, { name: "", category: "" }, calculateProductStatus);
    expect(updated.name).toBe(baseProduct.name);
    expect(updated.category).toBe(baseProduct.category);
  });
});

describe("mappers/saleDao", () => {
  const baseSale = {
    id: 1,
    status: "Completada",
    paymentMethod: "Tarjeta",
    notes: "Nota original",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  it("createFromPayload usa string vacío cuando notes no viene definido", () => {
    const created = SaleDao.createFromPayload({
      id: 1,
      customerId: 1,
      customerName: "Cliente",
      items: [],
      subtotal: 0,
      tax: 0,
      discount: 0,
      total: 0,
      status: "Completada",
      paymentMethod: "Efectivo",
    });

    expect(created.notes).toBe("");
  });

  it("mergeUpdates preserva campos no incluidos en la actualización parcial", () => {
    const updated = SaleDao.mergeUpdates(baseSale, { status: "Anulada" });
    expect(updated.status).toBe("Anulada");
    expect(updated.paymentMethod).toBe(baseSale.paymentMethod);
    expect(updated.notes).toBe(baseSale.notes);
  });

  it("mergeUpdates permite vaciar notes explícitamente (chequeo !== undefined)", () => {
    const updated = SaleDao.mergeUpdates(baseSale, { notes: "" });
    expect(updated.notes).toBe("");
  });

  it("mergeUpdates ignora notes undefined explícito", () => {
    const updated = SaleDao.mergeUpdates(baseSale, { notes: undefined });
    expect(updated.notes).toBe(baseSale.notes);
  });
});

describe("mappers/userDao", () => {
  it("normalizeRegistration recorta espacios y baja el email a minúsculas", () => {
    const normalized = UserDao.normalizeRegistration({
      username: "  jdoe  ",
      email: "  JDoe@Email.com  ",
      password: "Secret123",
      name: "  John Doe  ",
    });

    expect(normalized.username).toBe("jdoe");
    expect(normalized.email).toBe("jdoe@email.com");
    expect(normalized.name).toBe("John Doe");
  });

  it("normalizeRegistration retorna undefined para strings vacíos tras el trim", () => {
    const normalized = UserDao.normalizeRegistration({ phone: "   " });
    expect(normalized.phone).toBeUndefined();
  });

  it("normalizeRegistration no altera valores no-string", () => {
    const normalized = UserDao.normalizeRegistration({ password: "Secret123" });
    expect(normalized.password).toBe("Secret123");
  });

  it("normalizeRegistration maneja payload vacío sin lanzar error", () => {
    expect(() => UserDao.normalizeRegistration()).not.toThrow();
  });
});
