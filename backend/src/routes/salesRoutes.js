/**
 * Sales Routes - Rutas de ventas
 */

const express = require("express");
const router = express.Router();
const {
  getSales,
  getSale,
  createSale,
  updateSale,
  cancelSale,
} = require("../controllers/salesController");
const { authenticateToken } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");

/**
 * GET /api/sales - Listar ventas
 */
router.get("/", authenticateToken, asyncHandler(getSales));

/**
 * GET /api/sales/:id - Obtener una venta
 */
router.get("/:id", authenticateToken, asyncHandler(getSale));

/**
 * POST /api/sales - Crear venta
 */
router.post("/", authenticateToken, asyncHandler(createSale));

/**
 * PUT /api/sales/:id - Actualizar venta
 */
router.put("/:id", authenticateToken, asyncHandler(updateSale));

/**
 * PUT /api/sales/:id/cancel - Anular venta
 */
router.put("/:id/cancel", authenticateToken, asyncHandler(cancelSale));

module.exports = router;
