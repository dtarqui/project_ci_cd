/**
 * Product Routes - Rutas de productos (CRUD)
 */

const express = require("express");
const router = express.Router();
const {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");
const { authenticateToken } = require("../middleware/auth");

/**
 * POST /api/products - Crear producto
 */
router.post("/", authenticateToken, createProduct);

/**
 * GET /api/products - Obtener productos con filtros
 */
router.get("/", authenticateToken, getProducts);

/**
 * GET /api/products/:id - Obtener producto específico
 */
router.get("/:id", authenticateToken, getProduct);

/**
 * PUT /api/products/:id - Actualizar producto
 */
router.put("/:id", authenticateToken, updateProduct);

/**
 * DELETE /api/products/:id - Eliminar producto
 */
router.delete("/:id", authenticateToken, deleteProduct);

module.exports = router;
