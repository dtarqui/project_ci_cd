/**
 * Auth Routes - Rutas de autenticación
 */

const express = require("express");
const router = express.Router();
const {
  register,
  login,
  logout,
  logoutAll,
  getMe,
} = require("../controllers/authController");
const { authenticateToken } = require("../middleware/auth");
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
 * POST /api/auth/logout - Cerrar sesión: revoca el token de la petición, si trae
 * uno vigente. Responde 200 también sin token, para que el cliente limpie su sesión.
 */
router.post("/logout", asyncHandler(logout));

/**
 * POST /api/auth/logout-all - Cerrar todas las sesiones del usuario
 */
router.post("/logout-all", authenticateToken, asyncHandler(logoutAll));

/**
 * GET /api/auth/me - Obtener información del usuario autenticado
 * Nota: Sin middleware authenticateToken aquí porque getMe maneja su propia autenticación
 */
router.get("/me", asyncHandler(getMe));

module.exports = router;
