/**
 * Product Controller - Lógica de productos
 */

const {
  validateProductCreate,
  validateProductUpdate,
} = require("../utils/validators");
const { createProductRepository } = require("../repositories/productRepository");

const productRepository = createProductRepository();

/**
 * Crea un nuevo producto
 */
const createProduct = async (req, res) => {
  const validation = validateProductCreate(req.body);

  if (!validation.isValid) {
    return res.status(400).json({
      error: validation.error,
      code: validation.code,
    });
  }

  const newProduct = await productRepository.create(req.body);

  res.status(201).json({
    success: true,
    data: newProduct,
    message: "Producto creado exitosamente",
    timestamp: new Date().toISOString(),
  });
};

/**
 * Obtiene lista de productos con filtros y búsqueda
 */
const getProducts = async (req, res) => {
  const { search = "", category = "", sort = "name" } = req.query;

  let products = await productRepository.list();

  // Filtrar por búsqueda
  if (search) {
    products = products.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase())
    );
  }

  // Filtrar por categoría
  if (category) {
    products = products.filter((p) =>
      p.category.toLowerCase().includes(category.toLowerCase())
    );
  }

  // Ordenar
  switch (sort) {
    case "price":
      products.sort((a, b) => a.price - b.price);
      break;
    case "stock":
      products.sort((a, b) => b.stock - a.stock);
      break;
    case "sales":
      products.sort((a, b) => b.sales - a.sales);
      break;
    default:
      products.sort((a, b) => a.name.localeCompare(b.name));
  }

  res.json({
    success: true,
    data: products,
    count: products.length,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Obtiene un producto específico por ID
 */
const getProduct = async (req, res) => {
  const productId = parseInt(req.params.id);
  const product = await productRepository.findById(productId);

  if (!product) {
    return res.status(404).json({
      error: "Producto no encontrado",
      code: "PRODUCT_NOT_FOUND",
    });
  }

  res.json({
    success: true,
    data: product,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Actualiza un producto existente
 */
const updateProduct = async (req, res) => {
  const productId = parseInt(req.params.id);
  const product = await productRepository.findById(productId);

  if (!product) {
    return res.status(404).json({
      error: "Producto no encontrado",
      code: "PRODUCT_NOT_FOUND",
    });
  }

  const validation = validateProductUpdate(req.body);

  if (!validation.isValid) {
    return res.status(400).json({
      error: validation.error,
      code: validation.code,
    });
  }

  const updatedProduct = await productRepository.update(productId, req.body);

  res.json({
    success: true,
    data: updatedProduct,
    message: "Producto actualizado exitosamente",
    timestamp: new Date().toISOString(),
  });
};

/**
 * Elimina un producto
 */
const deleteProduct = async (req, res) => {
  const productId = parseInt(req.params.id);
  const deletedProduct = await productRepository.delete(productId);

  if (!deletedProduct) {
    return res.status(404).json({
      error: "Producto no encontrado",
      code: "PRODUCT_NOT_FOUND",
    });
  }

  res.json({
    success: true,
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
