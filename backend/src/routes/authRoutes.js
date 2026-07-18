/**
 * Auth Routes - Rutas de autenticación
 */

const express = require("express");
const router = express.Router();
const {
  register,
  login,
  logout,
  getMe,
} = require("../controllers/authController");
const { asyncHandler } = require("../utils/asyncHandler");

/**
 * POST /api/auth/register - Registrar usuario
 */
router.post("/register", asyncHandler(register));

/**
 * POST /api/auth/login - Iniciar sesión
 */
router.post("/login", asyncHandler(login));

/**
 * POST /api/auth/logout - Cerrar sesión
 */
router.post("/logout", logout);

/**
 * GET /api/auth/me - Obtener información del usuario autenticado
 * Nota: Sin middleware authenticateToken aquí porque getMe maneja su propia autenticación
 */
router.get("/me", asyncHandler(getMe));

module.exports = router;
