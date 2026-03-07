/**
 * User Controller - Gestión de perfil de usuario
 */

const { validateUserUpdate } = require("../utils/validators");
const { createUserRepository } = require("../repositories/userRepository");

const userRepository = createUserRepository();

const getMyProfile = async (req, res) => {
  const userId = Number(req.user.id);
  const user = await userRepository.findById(userId);

  if (!user) {
    return res.status(404).json({
      error: "Usuario no encontrado",
      code: "USER_NOT_FOUND",
    });
  }

  return res.json({
    success: true,
    user: userRepository.sanitizeUser(user),
  });
};

const updateMyProfile = async (req, res) => {
  const validation = validateUserUpdate(req.body);

  if (!validation.isValid) {
    return res.status(400).json({
      error: validation.error,
      code: validation.code,
    });
  }

  const userId = Number(req.user.id);
  const currentUser = await userRepository.findById(userId);

  if (!currentUser) {
    return res.status(404).json({
      error: "Usuario no encontrado",
      code: "USER_NOT_FOUND",
    });
  }

  if (req.body.email && req.body.email.toLowerCase() !== (currentUser.email || "").toLowerCase()) {
    const existingByEmail = await userRepository.findByEmail(req.body.email);
    if (existingByEmail && existingByEmail.id !== userId) {
      return res.status(409).json({
        error: "email ya registrado",
        code: "EMAIL_TAKEN",
      });
    }
  }

  if (req.body.password) {
    const isCurrentPasswordValid = userRepository.verifyPassword(
      req.body.currentPassword,
      currentUser.passwordHash
    );

    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        error: "Contraseña actual inválida",
        code: "INVALID_CURRENT_PASSWORD",
      });
    }
  }

  const updates = {
    ...(req.body.name !== undefined ? { name: req.body.name } : {}),
    ...(req.body.email !== undefined ? { email: req.body.email } : {}),
    ...(req.body.password !== undefined ? { password: req.body.password } : {}),
    ...(req.body.phone !== undefined ? { phone: req.body.phone } : {}),
    ...(req.body.address !== undefined ? { address: req.body.address } : {}),
    ...(req.body.city !== undefined ? { city: req.body.city } : {}),
    ...(req.body.state !== undefined ? { state: req.body.state } : {}),
    ...(req.body.country !== undefined ? { country: req.body.country } : {}),
    ...(req.body.postalCode !== undefined ? { postalCode: req.body.postalCode } : {}),
    ...(req.body.dateOfBirth !== undefined ? { dateOfBirth: req.body.dateOfBirth } : {}),
  };

  const updatedUser = await userRepository.updateUser(userId, updates);

  return res.json({
    success: true,
    user: userRepository.sanitizeUser(updatedUser),
  });
};

const deleteMyProfile = async (req, res) => {
  const { currentPassword } = req.body || {};

  if (!currentPassword || typeof currentPassword !== "string") {
    return res.status(400).json({
      error: "currentPassword requerido",
      code: "MISSING_CURRENT_PASSWORD",
    });
  }

  const userId = Number(req.user.id);
  const currentUser = await userRepository.findById(userId);

  if (!currentUser) {
    return res.status(404).json({
      error: "Usuario no encontrado",
      code: "USER_NOT_FOUND",
    });
  }

  const isCurrentPasswordValid = userRepository.verifyPassword(
    currentPassword,
    currentUser.passwordHash
  );

  if (!isCurrentPasswordValid) {
    return res.status(401).json({
      error: "Contraseña actual inválida",
      code: "INVALID_CURRENT_PASSWORD",
    });
  }

  await userRepository.deleteUser(userId);

  return res.json({
    success: true,
    message: "Usuario eliminado correctamente",
  });
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  deleteMyProfile,
};
