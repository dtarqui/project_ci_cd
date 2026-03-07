/**
 * User Routes - Perfil del usuario autenticado
 */

const express = require("express");
const { authenticateToken } = require("../middleware/auth");
const {
  getMyProfile,
  updateMyProfile,
  deleteMyProfile,
} = require("../controllers/userController");

const router = express.Router();

router.get("/me", authenticateToken, getMyProfile);
router.put("/me", authenticateToken, updateMyProfile);
router.delete("/me", authenticateToken, deleteMyProfile);

module.exports = router;
