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

/**
 * GET /api/sales - Listar ventas
 */
router.get("/", authenticateToken, getSales);

/**
 * GET /api/sales/:id - Obtener una venta
 */
router.get("/:id", authenticateToken, getSale);

/**
 * POST /api/sales - Crear venta
 */
router.post("/", authenticateToken, createSale);

/**
 * PUT /api/sales/:id - Actualizar venta
 */
router.put("/:id", authenticateToken, updateSale);

/**
 * PUT /api/sales/:id/cancel - Anular venta
 */
router.put("/:id/cancel", authenticateToken, cancelSale);

module.exports = router;
