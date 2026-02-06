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
const { authenticateToken } = require("../middleware/auth");

/**
 * @route POST /api/customers
 * @description Crear un nuevo cliente
 * @access Protected
 */
router.post("/", authenticateToken, createCustomer);

/**
 * @route GET /api/customers
 * @description Obtener lista de clientes con filtros
 * @access Protected
 */
router.get("/", authenticateToken, getCustomers);

/**
 * @route GET /api/customers/:id
 * @description Obtener un cliente específico
 * @access Protected
 */
router.get("/:id", authenticateToken, getCustomer);

/**
 * @route PUT /api/customers/:id
 * @description Actualizar un cliente
 * @access Protected
 */
router.put("/:id", authenticateToken, updateCustomer);

/**
 * @route DELETE /api/customers/:id
 * @description Eliminar un cliente
 * @access Protected
 */
router.delete("/:id", authenticateToken, deleteCustomer);

module.exports = router;
