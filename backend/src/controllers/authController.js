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
const { UserDao } = require("../dao/userDao");
const { sendSuccess, sendError } = require("../utils/httpResponses");

const userRepository = createUserRepository();

/**
 * Maneja el registro de usuarios
 */
const register = async (req, res) => {
  const normalizedPayload = UserDao.normalizeRegistration(req.body);
  const validation = validateUserRegistration(normalizedPayload);

  if (!validation.isValid) {
    return sendError(res, 400, {
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
    return sendError(res, 409, {
      error: "username ya registrado",
      code: "USERNAME_TAKEN",
    });
  }

  const existingByEmail = await userRepository.findByEmail(email);
  if (existingByEmail) {
    return sendError(res, 409, {
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
    role: safeUser.role,
  });

  return sendSuccess(
    res,
    {
      user: safeUser,
      token,
      expiresIn: process.env.JWT_EXPIRES_IN || "1h",
    },
    201
  );
};

/**
 * Maneja el login de usuarios
 */
const login = async (req, res) => {
  const validation = validateLoginCredentials(req.body);

  if (!validation.isValid) {
    return sendError(res, 400, {
      error: validation.error,
      code: validation.code,
    });
  }

  const { username, password } = req.body;
  const user = await userRepository.findByCredentials(username, password);

  if (!user) {
    return sendError(res, 401, {
      error: "Credenciales inválidas",
      code: "INVALID_CREDENTIALS",
    });
  }

  const userWithoutPassword = userRepository.sanitizeUser(user);
  const token = createAuthToken(user.id, {
    username: user.username,
    name: user.name,
    role: user.role,
  });

  sendSuccess(res, {
    user: userWithoutPassword,
    token,
    expiresIn: process.env.JWT_EXPIRES_IN || "1h",
  });
};

/**
 * Maneja el logout de usuarios
 */
const logout = (req, res) => {
  sendSuccess(res, {
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
    return sendError(res, 401, {
      error: "Token requerido",
      code: "MISSING_TOKEN",
    });
  }

  if (!authHeader.startsWith("Bearer ")) {
    return sendError(res, 401, {
      error: "Token requerido",
      code: "MISSING_TOKEN",
    });
  }

  const token = extractToken(authHeader);

  const payload = verifyAuthToken(token);

  if (!payload) {
    return sendError(res, 401, {
      error: "Token inválido",
      code: "INVALID_TOKEN",
    });
  }

  const userId = Number(payload.sub);

  if (!Number.isFinite(userId) || userId <= 0) {
    return sendError(res, 401, {
      error: "Token inválido",
      code: "INVALID_TOKEN",
    });
  }

  const user = await userRepository.findById(userId);

  if (!user) {
    return sendError(res, 401, {
      error: "Token inválido",
      code: "INVALID_TOKEN",
    });
  }

  const userWithoutPassword = userRepository.sanitizeUser(user);
  sendSuccess(res, { user: userWithoutPassword });
};

module.exports = {
  register,
  login,
  logout,
  getMe,
};
