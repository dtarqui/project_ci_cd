/**
 * Customer Controller - Lógica de clientes
 */

const { mockData } = require("../db/mockData");
const {
  validateCustomerCreate,
  validateCustomerUpdate,
} = require("../utils/validators");

/**
 * Crea un nuevo cliente
 */
const createCustomer = (req, res) => {
  const validation = validateCustomerCreate(req.body);

  if (!validation.isValid) {
    return res.status(400).json({
      error: validation.error,
      code: validation.code,
    });
  }

  const { name, email, phone, address, city, postalCode } = req.body;

  const newCustomer = {
    id: Math.max(...mockData.customers.map((c) => c.id), 0) + 1,
    name,
    email,
    phone,
    address: address || "",
    city: city || "",
    postalCode: postalCode || "",
    status: "Activo",
    registeredDate: new Date().toISOString().split("T")[0],
    totalSpent: 0,
    purchases: 0,
    lastPurchase: null,
  };

  mockData.customers.push(newCustomer);

  res.status(201).json({
    success: true,
    data: newCustomer,
    message: "Cliente creado exitosamente",
    timestamp: new Date().toISOString(),
  });
};

/**
 * Obtiene lista de clientes con filtros y búsqueda
 */
const getCustomers = (req, res) => {
  const { search = "", status = "", sort = "name" } = req.query;

  let customers = [...mockData.customers];

  // Filtrar por búsqueda
  if (search) {
    customers = customers.filter(
      (c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search),
    );
  }

  // Filtrar por estado
  if (status) {
    customers = customers.filter(
      (c) => c.status.toLowerCase() === status.toLowerCase(),
    );
  }

  // Ordenar
  switch (sort) {
    case "email":
      customers.sort((a, b) => a.email.localeCompare(b.email));
      break;
    case "spending":
      customers.sort((a, b) => b.totalSpent - a.totalSpent);
      break;
    case "purchases":
      customers.sort((a, b) => b.purchases - a.purchases);
      break;
    case "registered":
      customers.sort((a, b) =>
        new Date(b.registeredDate) - new Date(a.registeredDate),
      );
      break;
    default:
      customers.sort((a, b) => a.name.localeCompare(b.name));
  }

  res.json({
    success: true,
    data: customers,
    count: customers.length,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Obtiene un cliente específico por ID
 */
const getCustomer = (req, res) => {
  const customerId = parseInt(req.params.id);
  const customer = mockData.customers.find((c) => c.id === customerId);

  if (!customer) {
    return res.status(404).json({
      error: "Cliente no encontrado",
      code: "CUSTOMER_NOT_FOUND",
    });
  }

  res.json({
    success: true,
    data: customer,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Actualiza un cliente existente
 */
const updateCustomer = (req, res) => {
  const customerId = parseInt(req.params.id);
  const customer = mockData.customers.find((c) => c.id === customerId);

  if (!customer) {
    return res.status(404).json({
      error: "Cliente no encontrado",
      code: "CUSTOMER_NOT_FOUND",
    });
  }

  const validation = validateCustomerUpdate(req.body);

  if (!validation.isValid) {
    return res.status(400).json({
      error: validation.error,
      code: validation.code,
    });
  }

  const { name, email, phone, address, city, postalCode, status } = req.body;

  // Actualizar campos
  if (name) customer.name = name;
  if (email) customer.email = email;
  if (phone) customer.phone = phone;
  if (address !== undefined) customer.address = address;
  if (city !== undefined) customer.city = city;
  if (postalCode !== undefined) customer.postalCode = postalCode;
  if (status) customer.status = status;

  res.json({
    success: true,
    data: customer,
    message: "Cliente actualizado exitosamente",
    timestamp: new Date().toISOString(),
  });
};

/**
 * Elimina un cliente
 */
const deleteCustomer = (req, res) => {
  const customerId = parseInt(req.params.id);
  const index = mockData.customers.findIndex((c) => c.id === customerId);

  if (index === -1) {
    return res.status(404).json({
      error: "Cliente no encontrado",
      code: "CUSTOMER_NOT_FOUND",
    });
  }

  const deletedCustomer = mockData.customers.splice(index, 1)[0];

  res.json({
    success: true,
    data: deletedCustomer,
    message: "Cliente eliminado exitosamente",
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  createCustomer,
  getCustomers,
  getCustomer,
  updateCustomer,
  deleteCustomer,
};
