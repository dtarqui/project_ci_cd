/**
 * Customer Controller - Lógica de clientes
 */

const {
  validateCustomerCreate,
  validateCustomerUpdate,
  validateCityAgainstCatalog,
} = require("../utils/validators");
const { createCustomerRepository } = require("../repositories/customerRepository");
const { filterByText } = require("../utils/helpers");
const { sendSuccess, sendError } = require("../utils/httpResponses");
const { applySort, parsePagination, paginate } = require("../utils/queryHelpers");
const { createCatalogRepository } = require("../repositories/catalogRepository");
const { createSaleRepository } = require("../repositories/saleRepository");

const customerRepository = createCustomerRepository();
const cityRepository = createCatalogRepository("cities");
const saleRepository = createSaleRepository();

/**
 * Comprueba la ciudad contra el catalogo vigente.
 *
 * No lo hace el validador sincrono porque la lista ya no es una constante: vive
 * en la tabla `cities` y el admin la edita desde la pantalla de configuracion.
 * @returns {null|{error: string, code: string}} null si es valida
 */
const revisarCiudad = async (city) => {
  if (city === undefined || city === null || city === "") {
    return null;
  }

  const ciudades = await cityRepository.list();
  const check = validateCityAgainstCatalog(city, ciudades.map((c) => c.name));

  return check.isValid ? null : { error: check.error, code: check.code };
};

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

  const ciudadInvalida = await revisarCiudad(req.body.city);
  if (ciudadInvalida) {
    return sendError(res, 400, ciudadInvalida);
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

  const pagination = parsePagination(req.query);
  const result = pagination
    ? paginate(customers, pagination)
    : { data: customers, total: customers.length };

  sendSuccess(res, {
    data: result.data,
    count: result.total,
    ...(pagination
      ? { page: result.page, pageSize: result.pageSize, totalPages: result.totalPages }
      : {}),
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

  const ciudadInvalida = await revisarCiudad(req.body.city);
  if (ciudadInvalida) {
    return sendError(res, 400, ciudadInvalida);
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

  // Integridad referencial, igual que en productos: un cliente con ventas a su
  // nombre no se da de baja. La venta guarda `customerName` como copia, asi que
  // el historial seguiria legible, pero el vinculo quedaria apuntando a alguien
  // que la aplicacion ya no reconoce.
  const ventas = await saleRepository.countByCustomer(customerId);

  if (ventas > 0) {
    return sendError(res, 409, {
      error:
        "No se puede eliminar un cliente que ya tiene ventas registradas. " +
        "Para retirarlo de la operación, cámbialo a Inactivo.",
      code: "CUSTOMER_HAS_SALES",
      data: { customerId, sales: ventas },
    });
  }

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

/**
 * Devuelve el catalogo de ciudades atendidas. El formulario de clientes lo usa
 * para ofrecer una lista en vez de un campo de texto libre, y `postalPrefix`
 * para proponer el codigo postal una vez elegida la ciudad. Es el mismo
 * catalogo contra el que valida el POST/PUT, de modo que la lista que ve el
 * usuario y lo que acepta la API no pueden separarse.
 */
const getCities = async (req, res) => {
  // Sale de la tabla, no de la constante: lo que el admin agregue o retire en la
  // pantalla de configuracion tiene que verse aqui.
  const ciudades = await cityRepository.list();

  sendSuccess(res, {
    data: ciudades,
    count: ciudades.length,
  });
};

module.exports = {
  getCities,
  createCustomer,
  getCustomers,
  getCustomer,
  updateCustomer,
  deleteCustomer,
};
