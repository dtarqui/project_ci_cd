/**
 * Dashboard Routes - Rutas del dashboard
 */

const express = require("express");
const router = express.Router();
const { getDashboardData } = require("../controllers/dashboardController");
const { authenticateToken } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");

/**
 * GET /api/dashboard/data - Obtener datos del dashboard
 */
router.get("/data", authenticateToken, asyncHandler(getDashboardData));

module.exports = router;
