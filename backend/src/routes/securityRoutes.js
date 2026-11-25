/**
 * Security Routes - Alertas de seguridad (solo administrador)
 */

const express = require("express");
const router = express.Router();
const { authenticateToken, requireRole } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");
const { listAlerts } = require("../services/securityAlerts");
const { sendSuccess } = require("../utils/httpResponses");

/**
 * GET /api/v1/security/alerts?limit=50 - Ultimas alertas, de la mas reciente a la
 * mas antigua (maximo 100).
 */
router.get(
  "/alerts",
  authenticateToken,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const requested = parseInt(req.query.limit, 10);
    const limit = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), 100) : 50;
    const alerts = await listAlerts(limit);
    sendSuccess(res, { data: alerts, count: alerts.length });
  })
);

module.exports = router;
