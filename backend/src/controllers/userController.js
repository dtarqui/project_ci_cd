/**
 * User Controller - Gestión de perfil de usuario
 */

const { validateUserUpdate } = require("../utils/validators");
const { createUserRepository } = require("../repositories/userRepository");
const { sendSuccess, sendError } = require("../utils/httpResponses");

const userRepository = createUserRepository();

const getMyProfile = async (req, res) => {
  const userId = Number(req.user.id);
  const user = await userRepository.findById(userId);

  if (!user) {
    return sendError(res, 404, {
      error: "Usuario no encontrado",
      code: "USER_NOT_FOUND",
    });
  }

  return sendSuccess(res, { user: userRepository.sanitizeUser(user) });
};

const updateMyProfile = async (req, res) => {
  const validation = validateUserUpdate(req.body);

  if (!validation.isValid) {
    return sendError(res, 400, {
      error: validation.error,
      code: validation.code,
    });
  }

  const userId = Number(req.user.id);
  const currentUser = await userRepository.findById(userId);

  if (!currentUser) {
    return sendError(res, 404, {
      error: "Usuario no encontrado",
      code: "USER_NOT_FOUND",
    });
  }

  if (req.body.email && req.body.email.toLowerCase() !== (currentUser.email || "").toLowerCase()) {
    const existingByEmail = await userRepository.findByEmail(req.body.email);
    if (existingByEmail && existingByEmail.id !== userId) {
      return sendError(res, 409, {
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
      return sendError(res, 401, {
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

  return sendSuccess(res, { user: userRepository.sanitizeUser(updatedUser) });
};

const deleteMyProfile = async (req, res) => {
  const { currentPassword } = req.body || {};

  if (!currentPassword || typeof currentPassword !== "string") {
    return sendError(res, 400, {
      error: "currentPassword requerido",
      code: "MISSING_CURRENT_PASSWORD",
    });
  }

  const userId = Number(req.user.id);
  const currentUser = await userRepository.findById(userId);

  if (!currentUser) {
    return sendError(res, 404, {
      error: "Usuario no encontrado",
      code: "USER_NOT_FOUND",
    });
  }

  const isCurrentPasswordValid = userRepository.verifyPassword(
    currentPassword,
    currentUser.passwordHash
  );

  if (!isCurrentPasswordValid) {
    return sendError(res, 401, {
      error: "Contraseña actual inválida",
      code: "INVALID_CURRENT_PASSWORD",
    });
  }

  await userRepository.deleteUser(userId);

  return sendSuccess(res, { message: "Usuario eliminado correctamente" });
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  deleteMyProfile,
};
