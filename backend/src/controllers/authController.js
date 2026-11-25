/**
 * Auth Controller - Lógica de autenticación
 */

const {
  createAuthToken,
  createRefreshToken,
  verifyAuthToken,
  verifyRefreshToken,
  DEFAULT_JWT_EXPIRES_IN,
} = require("../utils/helpers");
const { readRefreshCookie, setRefreshCookie, clearRefreshCookie } = require("../utils/authCookies");
const { raiseAlert } = require("../services/securityAlerts");
const {
  validateLoginCredentials,
  validateUserRegistration,
} = require("../utils/validators");
const { extractToken } = require("../utils/helpers");
const { createUserRepository } = require("../repositories/userRepository");
const { UserDao } = require("../mappers/userDao");
const { sendSuccess, sendError } = require("../utils/httpResponses");
const { checkSession, revokeToken, revokeAllSessions } = require("../services/sessionService");
const { createLoginAttemptLimiter, clientIp } = require("../middleware/security");
const { logEvent } = require("../utils/logger");

const userRepository = createUserRepository();
const loginLimiter = createLoginAttemptLimiter();

// Dos pestanas pueden renovar a la vez con el mismo token: la segunda llega con un
// token que la primera acaba de rotar. Dentro de este margen no se trata como robo.
const reuseGraceMs = () => {
  const configured = Number(process.env.REFRESH_REUSE_GRACE_MS);
  return Number.isFinite(configured) && configured >= 0 ? configured : 10000;
};

/**
 * Emite el par de tokens de una sesion: el de acceso viaja en la respuesta y el
 * frontend lo guarda solo en memoria; el de renovacion, en una cookie HttpOnly.
 * @returns {string} token de acceso
 */
const issueSession = (res, user) => {
  const version = user.tokenVersion ?? 0;
  const token = createAuthToken(user.id, {
    username: user.username,
    name: user.name,
    role: user.role,
    ver: version,
  });
  const refreshToken = createRefreshToken(user.id, version);
  setRefreshCookie(res, refreshToken.token, refreshToken.expiresAt);
  return token;
};

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
    postalCode,
    dateOfBirth,
  });

  const safeUser = userRepository.sanitizeUser(createdUser);
  const token = issueSession(res, createdUser);

  return sendSuccess(
    res,
    {
      user: safeUser,
      token,
      expiresIn: DEFAULT_JWT_EXPIRES_IN,
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

  const limit = loginLimiter.check(req);
  if (limit.blocked) {
    logEvent("warn", "auth.login_blocked", { username, ip: clientIp(req) });
    res.setHeader("Retry-After", String(limit.retryAfterSeconds));
    return sendError(res, 429, {
      error: "Demasiados intentos fallidos. Intenta de nuevo más tarde.",
      code: "TOO_MANY_LOGIN_ATTEMPTS",
      retryAfterSeconds: limit.retryAfterSeconds,
    });
  }

  const user = await userRepository.findByCredentials(username, password);

  if (!user) {
    const failures = loginLimiter.registerFailure(req);
    logEvent("warn", "auth.login_failed", { username, ip: clientIp(req), failures });
    if (failures === loginLimiter.maxAttempts) {
      await raiseAlert({
        type: "account_locked",
        severity: "high",
        username: String(username).trim().toLowerCase(),
        ip: clientIp(req),
        details: { failures, windowMinutes: loginLimiter.windowMs / 60000 },
      });
    }
    return sendError(res, 401, {
      error: "Credenciales inválidas",
      code: "INVALID_CREDENTIALS",
    });
  }

  loginLimiter.reset(req);
  logEvent("info", "auth.login_succeeded", { userId: user.id, ip: clientIp(req) });

  const userWithoutPassword = userRepository.sanitizeUser(user);
  const token = issueSession(res, user);

  sendSuccess(res, {
    user: userWithoutPassword,
    token,
    expiresIn: DEFAULT_JWT_EXPIRES_IN,
  });
};

/**
 * Renueva la sesion con el token de la cookie y lo rota: el token usado queda
 * revocado y se emite uno nuevo. Si llega un token ya rotado fuera del margen de
 * las pestanas simultaneas, alguien lo copio: se cierran todas las sesiones del
 * usuario y se emite una alerta critica.
 */
const refresh = async (req, res) => {
  const payload = verifyRefreshToken(readRefreshCookie(req));

  if (!payload) {
    clearRefreshCookie(res);
    return sendError(res, 401, {
      error: "La sesión expiró. Inicia sesión de nuevo.",
      code: "INVALID_REFRESH_TOKEN",
    });
  }

  const userId = Number(payload.sub);
  const revokedAt = await userRepository.getRevokedAt(payload.jti);

  if (revokedAt !== null) {
    clearRefreshCookie(res);

    if (Date.now() - revokedAt < reuseGraceMs()) {
      return sendError(res, 401, {
        error: "El token de renovación ya se usó.",
        code: "REFRESH_TOKEN_ROTATED",
      });
    }

    const owner = await userRepository.findById(userId);
    await revokeAllSessions(userId);
    await raiseAlert({
      type: "refresh_token_reuse",
      severity: "critical",
      userId,
      username: owner?.username ?? null,
      ip: clientIp(req),
      details: { rotatedSecondsAgo: Math.round((Date.now() - revokedAt) / 1000) },
    });
    return sendError(res, 401, {
      error: "Por seguridad se cerraron todas las sesiones. Inicia sesión de nuevo.",
      code: "REFRESH_TOKEN_REUSED",
    });
  }

  const user = await userRepository.findById(userId);

  if (!user || (user.tokenVersion ?? 0) !== Number(payload.ver ?? 0)) {
    clearRefreshCookie(res);
    return sendError(res, 401, {
      error: "La sesión ya no es válida. Inicia sesión de nuevo.",
      code: "SESSION_REVOKED",
    });
  }

  await revokeToken({ id: userId, jti: payload.jti, tokenExp: payload.exp });
  const token = issueSession(res, user);
  logEvent("info", "auth.token_refreshed", { userId });

  return sendSuccess(res, {
    user: userRepository.sanitizeUser(user),
    token,
    expiresIn: DEFAULT_JWT_EXPIRES_IN,
  });
};

/**
 * Maneja el logout de usuarios
 */
const logout = async (req, res) => {
  // Con un token vigente, este deja de servir en el servidor y no solo en el
  // navegador. Sin token, o con uno ya invalido, no hay nada que revocar: la
  // respuesta es la misma, para que el cliente siempre pueda limpiar su sesion.
  const authHeader = req.headers.authorization || "";
  const payload = authHeader.startsWith("Bearer ")
    ? verifyAuthToken(extractToken(authHeader))
    : null;

  if (payload) {
    const session = await checkSession(payload);
    if (session.active) {
      const userId = Number(payload.sub);
      await revokeToken({ id: userId, jti: payload.jti, tokenExp: payload.exp });
      logEvent("info", "auth.logout", { userId });
    }
  }

  // El token de renovacion de la cookie tambien deja de servir.
  const refreshPayload = verifyRefreshToken(readRefreshCookie(req));
  if (refreshPayload) {
    await revokeToken({
      id: Number(refreshPayload.sub),
      jti: refreshPayload.jti,
      tokenExp: refreshPayload.exp,
    });
  }
  clearRefreshCookie(res);

  sendSuccess(res, {
    message: "Sesión cerrada correctamente",
    timestamp: new Date().toISOString(),
  });
};

/**
 * Cierra todas las sesiones del usuario (por ejemplo, si pierde un dispositivo):
 * invalida todos los tokens emitidos hasta ahora, incluido el de la peticion.
 */
const logoutAll = async (req, res) => {
  const version = await revokeAllSessions(req.user.id);

  if (version === null) {
    return sendError(res, 404, {
      error: "Usuario no encontrado",
      code: "USER_NOT_FOUND",
    });
  }

  logEvent("info", "auth.sessions_revoked", { userId: req.user.id });
  clearRefreshCookie(res);

  return sendSuccess(res, {
    message: "Se cerraron todas las sesiones",
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

  const session = await checkSession(payload);

  if (!session.active) {
    return sendError(res, 401, session.reason === "USER_NOT_FOUND"
      ? { error: "Token inválido", code: "INVALID_TOKEN" }
      : { error: "La sesión ya no es válida. Inicia sesión de nuevo.", code: "SESSION_REVOKED" });
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
  refresh,
  logout,
  logoutAll,
  getMe,
};
