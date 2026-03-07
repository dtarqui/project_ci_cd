/**
 * Auth Controller - Lógica de autenticación
 */

const { createAuthToken, verifyAuthToken } = require("../utils/helpers");
const {
  validateLoginCredentials,
  validateUserRegistration,
} = require("../utils/validators");
const { extractToken } = require("../utils/helpers");
const { createUserRepository } = require("../repositories/userRepository");

const userRepository = createUserRepository();

const normalizeRegistrationPayload = (body = {}) => {
  const normalizeText = (value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  };

  const normalizedEmail = normalizeText(body.email);

  return {
    username: normalizeText(body.username),
    email: normalizedEmail ? normalizedEmail.toLowerCase() : normalizedEmail,
    password: body.password,
    name: normalizeText(body.name),
    phone: normalizeText(body.phone),
    address: normalizeText(body.address),
    city: normalizeText(body.city),
    state: normalizeText(body.state),
    country: normalizeText(body.country),
    postalCode: normalizeText(body.postalCode),
    dateOfBirth: normalizeText(body.dateOfBirth),
  };
};

/**
 * Maneja el registro de usuarios
 */
const register = async (req, res) => {
  const normalizedPayload = normalizeRegistrationPayload(req.body);
  const validation = validateUserRegistration(normalizedPayload);

  if (!validation.isValid) {
    return res.status(400).json({
      error: validation.error,
      code: validation.code,
    });
  }

  const {
    username,
    email,
    password,
    name,
    phone,
    address,
    city,
    state,
    country,
    postalCode,
    dateOfBirth,
  } = normalizedPayload;

  const existingByUsername = await userRepository.findByUsername(username);
  if (existingByUsername) {
    return res.status(409).json({
      error: "username ya registrado",
      code: "USERNAME_TAKEN",
    });
  }

  const existingByEmail = await userRepository.findByEmail(email);
  if (existingByEmail) {
    return res.status(409).json({
      error: "email ya registrado",
      code: "EMAIL_TAKEN",
    });
  }

  const createdUser = await userRepository.createUser({
    username,
    email,
    password,
    name,
    phone,
    address,
    city,
    state,
    country,
    postalCode,
    dateOfBirth,
  });

  const safeUser = userRepository.sanitizeUser(createdUser);
  const token = createAuthToken(safeUser.id, {
    username: safeUser.username,
    name: safeUser.name,
  });

  return res.status(201).json({
    success: true,
    user: safeUser,
    token,
    expiresIn: process.env.JWT_EXPIRES_IN || "1h",
  });
};

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

  const userWithoutPassword = userRepository.sanitizeUser(user);
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

  const userWithoutPassword = userRepository.sanitizeUser(user);
  res.json({
    success: true,
    user: userWithoutPassword,
  });
};

module.exports = {
  register,
  login,
  logout,
  getMe,
};
