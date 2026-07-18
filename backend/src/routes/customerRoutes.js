/**
 * Customer Routes - Rutas para gestión de clientes
 */

const express = require("express");
const router = express.Router();
const {
  createCustomer,
  getCustomers,
  getCustomer,
  updateCustomer,
  deleteCustomer,
} = require("../controllers/customerController");
const { authenticateToken, requireRole } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");

/**
 * @route POST /api/customers
 * @description Crear un nuevo cliente
 * @access Protected
 */
router.post("/", authenticateToken, asyncHandler(createCustomer));

/**
 * @route GET /api/customers
 * @description Obtener lista de clientes con filtros
 * @access Protected
 */
router.get("/", authenticateToken, asyncHandler(getCustomers));

/**
 * @route GET /api/customers/:id
 * @description Obtener un cliente específico
 * @access Protected
 */
router.get("/:id", authenticateToken, asyncHandler(getCustomer));

/**
 * @route PUT /api/customers/:id
 * @description Actualizar un cliente
 * @access Protected
 */
router.put("/:id", authenticateToken, asyncHandler(updateCustomer));

/**
 * @route DELETE /api/customers/:id
 * @description Eliminar un cliente
 * @access Protected (solo admin)
 */
router.delete("/:id", authenticateToken, requireRole("admin"), asyncHandler(deleteCustomer));

module.exports = router;
