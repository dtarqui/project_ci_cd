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
const { authenticateToken, requireRole } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");

/**
 * POST /api/products - Crear producto
 */
router.post("/", authenticateToken, asyncHandler(createProduct));

/**
 * GET /api/products - Obtener productos con filtros
 */
router.get("/", authenticateToken, asyncHandler(getProducts));

/**
 * GET /api/products/:id - Obtener producto específico
 */
router.get("/:id", authenticateToken, asyncHandler(getProduct));

/**
 * PUT /api/products/:id - Actualizar producto
 */
router.put("/:id", authenticateToken, asyncHandler(updateProduct));

/**
 * DELETE /api/products/:id - Eliminar producto (solo admin)
 */
router.delete("/:id", authenticateToken, requireRole("admin"), asyncHandler(deleteProduct));

module.exports = router;
