/**
 * Customer Controller - Lógica de clientes
 */

const {
  validateCustomerCreate,
  validateCustomerUpdate,
} = require("../utils/validators");
const { createCustomerRepository } = require("../repositories/customerRepository");

const customerRepository = createCustomerRepository();

/**
 * Crea un nuevo cliente
 */
const createCustomer = async (req, res) => {
  const validation = validateCustomerCreate(req.body);

  if (!validation.isValid) {
    return res.status(400).json({
      error: validation.error,
      code: validation.code,
    });
  }

  const newCustomer = await customerRepository.create(req.body);

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
const getCustomers = async (req, res) => {
  const { search = "", status = "", sort = "name" } = req.query;

  let customers = await customerRepository.list();

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
const getCustomer = async (req, res) => {
  const customerId = parseInt(req.params.id);
  const customer = await customerRepository.findById(customerId);

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
const updateCustomer = async (req, res) => {
  const customerId = parseInt(req.params.id);
  const customer = await customerRepository.findById(customerId);

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

  const updatedCustomer = await customerRepository.update(customerId, req.body);

  res.json({
    success: true,
    data: updatedCustomer,
    message: "Cliente actualizado exitosamente",
    timestamp: new Date().toISOString(),
  });
};

/**
 * Elimina un cliente
 */
const deleteCustomer = async (req, res) => {
  const customerId = parseInt(req.params.id);
  const deletedCustomer = await customerRepository.delete(customerId);

  if (!deletedCustomer) {
    return res.status(404).json({
      error: "Cliente no encontrado",
      code: "CUSTOMER_NOT_FOUND",
    });
  }

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
