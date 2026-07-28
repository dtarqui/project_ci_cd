/**
 * Product Controller - Lógica de productos
 */

const {
  validateProductCreate,
  validateProductUpdate,
} = require("../utils/validators");
const { createProductRepository } = require("../repositories/productRepository");
const { filterByText } = require("../utils/helpers");
const { sendSuccess, sendError } = require("../utils/httpResponses");
const { applySort } = require("../utils/queryHelpers");

const productRepository = createProductRepository();

const PRODUCT_SORTS = {
  price: (a, b) => a.price - b.price,
  stock: (a, b) => b.stock - a.stock,
  sales: (a, b) => b.sales - a.sales,
  default: (a, b) => a.name.localeCompare(b.name),
};

/**
 * Crea un nuevo producto
 */
const createProduct = async (req, res) => {
  const validation = validateProductCreate(req.body);

  if (!validation.isValid) {
    return sendError(res, 400, {
      error: validation.error,
      code: validation.code,
    });
  }

  const newProduct = await productRepository.create(req.body);

  sendSuccess(
    res,
    {
      data: newProduct,
      message: "Producto creado exitosamente",
      timestamp: new Date().toISOString(),
    },
    201
  );
};

/**
 * Obtiene lista de productos con filtros y búsqueda
 */
const getProducts = async (req, res) => {
  const { search = "", category = "", sort = "name" } = req.query;

  let products = await productRepository.list();

  products = filterByText(products, ["name"], search);
  products = filterByText(products, ["category"], category);

  // Ordenar
  products = applySort(products, PRODUCT_SORTS, sort);

  sendSuccess(res, {
    data: products,
    count: products.length,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Obtiene un producto específico por ID
 */
const getProduct = async (req, res) => {
  const productId = parseInt(req.params.id, 10);
  const product = await productRepository.findById(productId);

  if (!product) {
    return sendError(res, 404, {
      error: "Producto no encontrado",
      code: "PRODUCT_NOT_FOUND",
    });
  }

  sendSuccess(res, { data: product, timestamp: new Date().toISOString() });
};

/**
 * Actualiza un producto existente
 */
const updateProduct = async (req, res) => {
  const productId = parseInt(req.params.id, 10);
  const product = await productRepository.findById(productId);

  if (!product) {
    return sendError(res, 404, {
      error: "Producto no encontrado",
      code: "PRODUCT_NOT_FOUND",
    });
  }

  const validation = validateProductUpdate(req.body);

  if (!validation.isValid) {
    return sendError(res, 400, {
      error: validation.error,
      code: validation.code,
    });
  }

  const updatedProduct = await productRepository.update(productId, req.body);

  sendSuccess(res, {
    data: updatedProduct,
    message: "Producto actualizado exitosamente",
    timestamp: new Date().toISOString(),
  });
};

/**
 * Elimina un producto
 */
const deleteProduct = async (req, res) => {
  const productId = parseInt(req.params.id, 10);
  const deletedProduct = await productRepository.delete(productId);

  if (!deletedProduct) {
    return sendError(res, 404, {
      error: "Producto no encontrado",
      code: "PRODUCT_NOT_FOUND",
    });
  }

  sendSuccess(res, {
    data: deletedProduct,
    message: "Producto eliminado exitosamente",
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
};
