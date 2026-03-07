/**
 * Auth Controller - Lógica de autenticación
 */

const { createAuthToken, verifyAuthToken } = require("../utils/helpers");
const { validateLoginCredentials } = require("../utils/validators");
const { extractToken } = require("../utils/helpers");
const { createUserRepository } = require("../repositories/userRepository");

const userRepository = createUserRepository();

/**
 * Maneja el login de usuarios
 */
const login = async (req, res) => {
  const validation = validateLoginCredentials(req.body);

  if (!validation.isValid) {
    return res.status(400).json({
      error: validation.error,
      code: validation.code,
    });
  }

  const { username, password } = req.body;
  const user = await userRepository.findByCredentials(username, password);

  if (!user) {
    return res.status(401).json({
      error: "Credenciales inválidas",
      code: "INVALID_CREDENTIALS",
    });
  }

  const { password: _password, ...userWithoutPassword } = user;
  const token = createAuthToken(user.id, {
    username: user.username,
    name: user.name,
  });

  res.json({
    success: true,
    user: userWithoutPassword,
    token,
    expiresIn: process.env.JWT_EXPIRES_IN || "1h",
  });
};

/**
 * Maneja el logout de usuarios
 */
const logout = (req, res) => {
  res.json({
    success: true,
    message: "Sesión cerrada correctamente",
    timestamp: new Date().toISOString(),
  });
};

/**
 * Obtiene información del usuario autenticado
 */
const getMe = async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      error: "Token requerido",
      code: "MISSING_TOKEN",
    });
  }

  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Token requerido",
      code: "MISSING_TOKEN",
    });
  }

  const token = extractToken(authHeader);

  const payload = verifyAuthToken(token);

  if (!payload) {
    return res.status(401).json({
      error: "Token inválido",
      code: "INVALID_TOKEN",
    });
  }

  const userId = Number(payload.sub);

  if (!Number.isFinite(userId) || userId <= 0) {
    return res.status(401).json({
      error: "Token inválido",
      code: "INVALID_TOKEN",
    });
  }

  const user = await userRepository.findById(userId);

  if (!user) {
    return res.status(401).json({
      error: "Token inválido",
      code: "INVALID_TOKEN",
    });
  }

  const { password: _password, ...userWithoutPassword } = user;
  res.json({
    success: true,
    user: userWithoutPassword,
  });
};

module.exports = {
  login,
  logout,
  getMe,
};
