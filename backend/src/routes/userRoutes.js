/**
 * User Routes - Perfil del usuario autenticado
 */

const express = require("express");
const { authenticateToken } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");
const {
  getMyProfile,
  updateMyProfile,
  deleteMyProfile,
} = require("../controllers/userController");

const router = express.Router();

router.get("/me", authenticateToken, asyncHandler(getMyProfile));
router.put("/me", authenticateToken, asyncHandler(updateMyProfile));
router.delete("/me", authenticateToken, asyncHandler(deleteMyProfile));

module.exports = router;
