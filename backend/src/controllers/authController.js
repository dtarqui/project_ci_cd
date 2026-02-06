/**
 * Auth Controller - Lógica de autenticación
 */

const { users } = require("../db/mockData");
const { createMockToken } = require("../utils/helpers");
const { validateLoginCredentials } = require("../utils/validators");
const { extractToken } = require("../utils/helpers");

/**
 * Maneja el login de usuarios
 */
const login = (req, res) => {
  const validation = validateLoginCredentials(req.body);

  if (!validation.isValid) {
    return res.status(400).json({
      error: validation.error,
      code: validation.code,
    });
  }

  const { username, password } = req.body;
  const user = users.find(
    (u) => u.username === username && u.password === password
  );

  if (!user) {
    return res.status(401).json({
      error: "Credenciales inválidas",
      code: "INVALID_CREDENTIALS",
    });
  }

  const { password: _password, ...userWithoutPassword } = user;
  const token = createMockToken(user.id);

  res.json({
    success: true,
    user: userWithoutPassword,
    token,
    expiresIn: 3600, // 1 hour
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
const getMe = (req, res) => {
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

  if (!token || !token.startsWith("mock-jwt-token-")) {
    return res.status(401).json({
      error: "Token inválido",
      code: "INVALID_TOKEN",
    });
  }

  const userId = parseInt(token.replace("mock-jwt-token-", ""));
  const user = users.find((u) => u.id === userId);

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
