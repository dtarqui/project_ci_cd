/**
 * Product Controller - Lógica de productos
 */

const { mockData } = require("../db/mockData");
const {
  calculateProductStatus,
  getNextProductId,
} = require("../utils/helpers");
const {
  validateProductCreate,
  validateProductUpdate,
} = require("../utils/validators");

/**
 * Crea un nuevo producto
 */
const createProduct = (req, res) => {
  const validation = validateProductCreate(req.body);

  if (!validation.isValid) {
    return res.status(400).json({
      error: validation.error,
      code: validation.code,
    });
  }

  const { name, category, price, stock } = req.body;

  const newProduct = {
    id: getNextProductId(mockData.products),
    name,
    category,
    price: parseFloat(price),
    stock: parseInt(stock),
    status: calculateProductStatus(parseInt(stock)),
    lastSale: new Date().toISOString().split("T")[0],
    sales: 0,
  };

  mockData.products.push(newProduct);

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
const getProducts = (req, res) => {
  const { search = "", category = "", sort = "name" } = req.query;

  let products = [...mockData.products];

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
const getProduct = (req, res) => {
  const productId = parseInt(req.params.id);
  const product = mockData.products.find((p) => p.id === productId);

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
const updateProduct = (req, res) => {
  const productId = parseInt(req.params.id);
  const product = mockData.products.find((p) => p.id === productId);

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

  const { name, category, price, stock } = req.body;

  // Actualizar campos
  if (name) product.name = name;
  if (category) product.category = category;
  if (price !== undefined) product.price = parseFloat(price);
  if (stock !== undefined) {
    product.stock = parseInt(stock);
    product.status = calculateProductStatus(parseInt(stock));
  }

  res.json({
    success: true,
    data: product,
    message: "Producto actualizado exitosamente",
    timestamp: new Date().toISOString(),
  });
};

/**
 * Elimina un producto
 */
const deleteProduct = (req, res) => {
  const productId = parseInt(req.params.id);
  const productIndex = mockData.products.findIndex((p) => p.id === productId);

  if (productIndex === -1) {
    return res.status(404).json({
      error: "Producto no encontrado",
      code: "PRODUCT_NOT_FOUND",
    });
  }

  const deletedProduct = mockData.products.splice(productIndex, 1)[0];

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
