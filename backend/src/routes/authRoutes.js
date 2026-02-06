/**
 * Auth Routes - Rutas de autenticación
 */

const express = require("express");
const router = express.Router();
const {
  login,
  logout,
  getMe,
} = require("../controllers/authController");

/**
 * POST /api/auth/login - Iniciar sesión
 */
router.post("/login", login);

/**
 * POST /api/auth/logout - Cerrar sesión
 */
router.post("/logout", logout);

/**
 * GET /api/auth/me - Obtener información del usuario autenticado
 * Nota: Sin middleware authenticateToken aquí porque getMe maneja su propia autenticación
 */
router.get("/me", getMe);

module.exports = router;
