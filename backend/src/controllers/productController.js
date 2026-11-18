/**
 * Product Controller - Lógica de productos
 */

const {
  validateProductCreate,
  validateProductUpdate,
} = require("../utils/validators");
const { createProductRepository } = require("../repositories/productRepository");
const { createSaleRepository } = require("../repositories/saleRepository");
const { sendSuccess, sendError } = require("../utils/httpResponses");
const {
  PreconditionFailedError,
  etagOf,
  resolvePrecondition,
} = require("../utils/concurrency");
const { parsePagination } = require("../utils/queryHelpers");
const { filterSortProducts } = require("../utils/listQueries");

const productRepository = createProductRepository();
const saleRepository = createSaleRepository();

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
  const query = { search, category, sort };

  // Con `page`, se pagina en el repositorio (en la base de datos, sin leer la
  // tabla completa); sin el, se devuelve la lista completa filtrada, que el
  // frontend usa en los selectores.
  const pagination = parsePagination(req.query);
  let result;
  if (pagination) {
    result = await productRepository.listPage(query, pagination);
  } else {
    const products = filterSortProducts(await productRepository.list(), query);
    result = { data: products, total: products.length };
  }

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

  res.setHeader("ETag", etagOf(product));
  sendSuccess(res, { data: product, timestamp: new Date().toISOString() });
};


/** 412: el registro cambio desde que el cliente lo leyo. */
const sendPreconditionFailed = (res, current) => {
  res.setHeader("ETag", etagOf(current));
  return sendError(res, 412, {
    error: "El producto cambió desde que lo abriste. Recarga los datos y vuelve a intentarlo.",
    code: "PRECONDITION_FAILED",
  });
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

  // Concurrencia optimista: con If-Match, solo se guarda si nadie modifico el
  // registro desde que el cliente lo leyo (412 si no).
  const precondition = resolvePrecondition(product, req.get("If-Match"));
  if (!precondition.ok) {
    return sendPreconditionFailed(res, product);
  }

  const validation = validateProductUpdate(req.body);

  if (!validation.isValid) {
    return sendError(res, 400, {
      error: validation.error,
      code: validation.code,
    });
  }

  let updatedProduct;
  try {
    updatedProduct = await productRepository.update(productId, req.body, {
      expectedVersion: precondition.expectedVersion,
    });
  } catch (error) {
    if (error instanceof PreconditionFailedError) {
      return sendPreconditionFailed(res, error.current);
    }
    throw error;
  }

  res.setHeader("ETag", etagOf(updatedProduct));
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

  // Integridad referencial: un producto que ya figura en una venta no se da de
  // baja. Si se permitiera, el historial quedaria nombrando algo que el catalogo
  // ya no ofrece, y el informe de ventas tendria que explicar un producto que
  // para la aplicacion no existe. El borrado logico conserva la fila, pero el
  // producto desaparece de los listados y del formulario de ventas igual.
  const lineasDeVenta = await saleRepository.countItemsByProduct(productId);

  if (lineasDeVenta > 0) {
    return sendError(res, 409, {
      error:
        "No se puede eliminar un producto que ya figura en una venta. " +
        "Para retirarlo del catálogo, deja su stock en cero.",
      code: "PRODUCT_HAS_SALES",
      data: { productId, saleItems: lineasDeVenta },
    });
  }

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
