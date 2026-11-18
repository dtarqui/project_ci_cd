/**
 * Sesiones revocables sobre JWT.
 *
 * Cada token lleva un identificador (`jti`) y la version de sesiones del usuario
 * (`ver`). Cerrar sesion revoca ese token; cerrar todas las sesiones incrementa la
 * version del usuario e invalida todos los tokens emitidos antes, por ejemplo
 * cuando se pierde o roban un dispositivo.
 *
 * Comprobarlo exige consultar la base. Para no sumar una consulta a cada peticion,
 * cada instancia guarda el resultado durante SESSION_CHECK_TTL_MS (15 s por
 * defecto). La instancia que revoca lo aplica de inmediato; las demas, como
 * maximo, en ese plazo. Es el compromiso entre revocacion inmediata y carga de la
 * base de datos.
 */

const { createUserRepository } = require("../repositories/userRepository");

const DEFAULT_TTL_MS = 15000;
const MAX_CACHE_ENTRIES = 5000;

const cache = new Map();

const ttlMs = () => {
  const configured = Number(process.env.SESSION_CHECK_TTL_MS);
  return Number.isFinite(configured) && configured >= 0 ? configured : DEFAULT_TTL_MS;
};

const cacheKey = (userId, jti, version) => `${userId}:${jti || "-"}:${version}`;

const remember = (key, value, now) => {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    // Map conserva el orden de insercion: se descarta la entrada mas antigua.
    cache.delete(cache.keys().next().value);
  }
  cache.set(key, { value, expiresAt: now + ttlMs() });
};

const forgetUser = (userId) => {
  const prefix = `${userId}:`;
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
};

/**
 * Comprueba que el token siga vigente: que el usuario exista, que el token no
 * este revocado y que su version coincida con la del usuario.
 * @param {Object} payload - Payload ya verificado del JWT
 * @returns {Promise<{active: boolean, reason?: string, role?: string}>}
 */
const checkSession = async (payload, { now = Date.now() } = {}) => {
  const userId = Number(payload.sub);
  const version = Number(payload.ver ?? 0);
  const key = cacheKey(userId, payload.jti, version);

  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const state = await createUserRepository().getSessionState(userId, payload.jti || null);

  let value;
  if (!state) {
    value = { active: false, reason: "USER_NOT_FOUND" };
  } else if (state.revoked) {
    value = { active: false, reason: "TOKEN_REVOKED" };
  } else if (state.tokenVersion !== version) {
    value = { active: false, reason: "SESSIONS_REVOKED" };
  } else {
    value = { active: true, role: state.role };
  }

  if (ttlMs() > 0) {
    remember(key, value, now);
  }

  return value;
};

/**
 * Revoca el token de la peticion hasta su vencimiento.
 * Los tokens emitidos antes de este cambio no traen `jti` y vencen solos.
 * @returns {Promise<boolean>} true si el token quedo revocado
 */
const revokeToken = async ({ id, jti, tokenExp }) => {
  if (!jti) {
    return false;
  }

  await createUserRepository().revokeToken({
    jti,
    userId: id,
    expiresAt: new Date((tokenExp ?? 0) * 1000),
  });
  forgetUser(id);
  return true;
};

/**
 * Invalida todos los tokens del usuario.
 * @returns {Promise<number|null>} nueva version, o null si el usuario no existe
 */
const revokeAllSessions = async (userId) => {
  const version = await createUserRepository().revokeAllSessions(userId);
  forgetUser(userId);
  return version;
};

const clearSessionCache = () => cache.clear();

module.exports = {
  checkSession,
  revokeToken,
  revokeAllSessions,
  clearSessionCache,
  DEFAULT_TTL_MS,
};
