/**
 * Customer Controller - Lógica de clientes
 */

const {
  validateCustomerCreate,
  validateCustomerUpdate,
} = require("../utils/validators");
const { createCustomerRepository } = require("../repositories/customerRepository");
const { filterByText } = require("../utils/helpers");
const { sendSuccess, sendError } = require("../utils/httpResponses");
const { applySort } = require("../utils/queryHelpers");

const customerRepository = createCustomerRepository();

const CUSTOMER_SORTS = {
  email: (a, b) => a.email.localeCompare(b.email),
  spending: (a, b) => b.totalSpent - a.totalSpent,
  purchases: (a, b) => b.purchases - a.purchases,
  registered: (a, b) => new Date(b.registeredDate) - new Date(a.registeredDate),
  default: (a, b) => a.name.localeCompare(b.name),
};

/**
 * Crea un nuevo cliente
 */
const createCustomer = async (req, res) => {
  const validation = validateCustomerCreate(req.body);

  if (!validation.isValid) {
    return sendError(res, 400, {
      error: validation.error,
      code: validation.code,
    });
  }

  const newCustomer = await customerRepository.create(req.body);

  sendSuccess(
    res,
    {
      data: newCustomer,
      message: "Cliente creado exitosamente",
      timestamp: new Date().toISOString(),
    },
    201
  );
};

/**
 * Obtiene lista de clientes con filtros y búsqueda
 */
const getCustomers = async (req, res) => {
  const { search = "", status = "", sort = "name" } = req.query;

  let customers = await customerRepository.list();

  customers = filterByText(customers, ["name", "email", "phone"], search);

  // Filtrar por estado (coincidencia exacta, no parcial)
  if (status) {
    customers = customers.filter(
      (c) => c.status.toLowerCase() === status.toLowerCase(),
    );
  }

  // Ordenar
  customers = applySort(customers, CUSTOMER_SORTS, sort);

  sendSuccess(res, {
    data: customers,
    count: customers.length,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Obtiene un cliente específico por ID
 */
const getCustomer = async (req, res) => {
  const customerId = parseInt(req.params.id, 10);
  const customer = await customerRepository.findById(customerId);

  if (!customer) {
    return sendError(res, 404, {
      error: "Cliente no encontrado",
      code: "CUSTOMER_NOT_FOUND",
    });
  }

  sendSuccess(res, { data: customer, timestamp: new Date().toISOString() });
};

/**
 * Actualiza un cliente existente
 */
const updateCustomer = async (req, res) => {
  const customerId = parseInt(req.params.id, 10);
  const customer = await customerRepository.findById(customerId);

  if (!customer) {
    return sendError(res, 404, {
      error: "Cliente no encontrado",
      code: "CUSTOMER_NOT_FOUND",
    });
  }

  const validation = validateCustomerUpdate(req.body);

  if (!validation.isValid) {
    return sendError(res, 400, {
      error: validation.error,
      code: validation.code,
    });
  }

  const updatedCustomer = await customerRepository.update(customerId, req.body);

  sendSuccess(res, {
    data: updatedCustomer,
    message: "Cliente actualizado exitosamente",
    timestamp: new Date().toISOString(),
  });
};

/**
 * Elimina un cliente
 */
const deleteCustomer = async (req, res) => {
  const customerId = parseInt(req.params.id, 10);
  const deletedCustomer = await customerRepository.delete(customerId);

  if (!deletedCustomer) {
    return sendError(res, 404, {
      error: "Cliente no encontrado",
      code: "CUSTOMER_NOT_FOUND",
    });
  }

  sendSuccess(res, {
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
