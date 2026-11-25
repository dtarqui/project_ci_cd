/**
 * User Repository
 * Abstrae el origen de datos de usuarios para facilitar migración a BD.
 */

const crypto = require("crypto");
const { UserDao } = require("../mappers/userDao");
const { getUsers, getMockData, resetDataStore } = require("../db/dataStore");
const { getPrismaClient, isRecordNotFoundError } = require("../db/prismaClient");
const { resolveRepositoryMode } = require("./factory");

const DEFAULT_ROLE = "vendedor";

const HASH_PREFIX = "scrypt";
const SCRYPT_KEYLEN = 64;

const normalizeSeedUser = (user) => {
  if (user.passwordHash) {
    return { ...user };
  }

  return {
    ...user,
    passwordHash: user.password ? hashPassword(user.password) : "",
    role: user.role || DEFAULT_ROLE,
    phone: user.phone || null,
    address: user.address || null,
    city: user.city || null,
    state: user.state || null,
    postalCode: user.postalCode || null,
    dateOfBirth: user.dateOfBirth || null,
    createdAt: user.createdAt || new Date().toISOString(),
    updatedAt: user.updatedAt || new Date().toISOString(),
  };
};

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const digest = crypto
    .scryptSync(password, salt, SCRYPT_KEYLEN)
    .toString("hex");
  return `${HASH_PREFIX}$${salt}$${digest}`;
};

const verifyPassword = (password, storedHash) => {
  if (!storedHash || typeof storedHash !== "string") {
    return false;
  }

  // Solo se aceptan contrasenas derivadas con scrypt. La compatibilidad con
  // contrasenas guardadas en texto plano se retiro: la semilla de la base y el
  // registro siempre las derivaron, y el modo en memoria deriva las suyas al
  // cargarlas (normalizeSeedUser).
  if (!storedHash.startsWith(`${HASH_PREFIX}$`)) {
    return false;
  }

  const parts = storedHash.split("$");

  if (parts.length !== 3) {
    return false;
  }

  const [, salt, hashHex] = parts;
  const derived = crypto
    .scryptSync(password, salt, SCRYPT_KEYLEN)
    .toString("hex");

  return crypto.timingSafeEqual(Buffer.from(hashHex, "hex"), Buffer.from(derived, "hex"));
};

const sanitizeUser = (user) => {
  const {
    passwordHash: _passwordHash,
    password: _legacyPassword,
    tokenVersion: _tokenVersion,
    ...safeUser
  } = user;
  return safeUser;
};

/** Tokens revocados en modo memoria: jti -> { userId, expiresAt (ms) }. */
const revokedTokens = () => {
  const data = getMockData();
  if (!data.revokedTokens) {
    data.revokedTokens = new Map();
  }
  return data.revokedTokens;
};

const ensureUsersNormalized = () => {
  const users = getUsers();

  for (let index = 0; index < users.length; index += 1) {
    users[index] = normalizeSeedUser(users[index]);
  }
};

class InMemoryUserRepository {
  async findByCredentials(username, password) {
    return (
      getUsers().find(
        (user) =>
          user.username.toLowerCase() === String(username).toLowerCase() &&
          verifyPassword(password, user.passwordHash)
      ) || null
    );
  }

  async findById(id) {
    return getUsers().find((user) => user.id === id) || null;
  }

  async findByUsername(username) {
    return (
      getUsers().find(
        (user) => user.username.toLowerCase() === String(username).toLowerCase()
      ) || null
    );
  }

  async findByEmail(email) {
    return (
      getUsers().find(
        (user) =>
          user.email && user.email.toLowerCase() === String(email).toLowerCase()
      ) || null
    );
  }

  async createUser(userData) {
    const users = getUsers();
    const nextId =
      users.length > 0
        ? Math.max(...users.map((user) => user.id)) + 1
        : 1;

    const now = new Date().toISOString();
    const user = {
      id: nextId,
      ...UserDao.normalizeRegistration(userData),
      passwordHash: hashPassword(userData.password),
      role: userData.role || DEFAULT_ROLE,
      createdAt: now,
      updatedAt: now,
    };

    users.push(user);

    return user;
  }

  async updateUser(id, updates) {
    const users = getUsers();
    const userIndex = users.findIndex((user) => user.id === id);

    if (userIndex === -1) {
      return null;
    }

    const currentUser = users[userIndex];
    const nextUser = {
      ...currentUser,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if (updates.password) {
      nextUser.passwordHash = hashPassword(updates.password);
    }

    delete nextUser.password;

    users[userIndex] = nextUser;
    return nextUser;
  }

  async deleteUser(id) {
    const users = getUsers();
    const userIndex = users.findIndex((user) => user.id === id);

    if (userIndex === -1) {
      return null;
    }

    const [deletedUser] = users.splice(userIndex, 1);
    return deletedUser;
  }

  /**
   * Estado de la sesion de un token: version de sesiones y rol actuales del
   * usuario, y si el token fue revocado. null si el usuario ya no existe.
   */
  async getSessionState(userId, jti) {
    const user = getUsers().find((item) => item.id === userId);

    if (!user) {
      return null;
    }

    return {
      tokenVersion: user.tokenVersion ?? 0,
      role: user.role,
      revoked: Boolean(jti) && revokedTokens().has(jti),
    };
  }

  /** Revoca un token hasta su vencimiento y descarta los ya vencidos. */
  async revokeToken({ jti, userId, expiresAt }) {
    const tokens = revokedTokens();
    const now = Date.now();

    for (const [key, entry] of tokens) {
      if (entry.expiresAt <= now) {
        tokens.delete(key);
      }
    }

    tokens.set(jti, { userId, expiresAt: new Date(expiresAt).getTime(), revokedAt: now });
  }

  /** Momento en que se revoco un token (ms epoch), o null si no esta revocado. */
  async getRevokedAt(jti) {
    const entry = jti ? revokedTokens().get(jti) : null;
    return entry ? entry.revokedAt ?? 0 : null;
  }

  /** Invalida todos los tokens del usuario. Devuelve la nueva version, o null. */
  async revokeAllSessions(userId) {
    const user = getUsers().find((item) => item.id === userId);

    if (!user) {
      return null;
    }

    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    return user.tokenVersion;
  }

  sanitizeUser(user) {
    return sanitizeUser(user);
  }

  verifyPassword(password, storedHash) {
    return verifyPassword(password, storedHash);
  }
}

class DatabaseUserRepository {
  async findByCredentials(username, password) {
    const user = await this.findByUsername(username);

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return null;
    }

    return user;
  }

  async findById(id) {
    return getPrismaClient().user.findUnique({ where: { id } });
  }

  async findByUsername(username) {
    return getPrismaClient().user.findFirst({
      where: { username: { equals: username, mode: "insensitive" } },
    });
  }

  async findByEmail(email) {
    if (!email) {
      return null;
    }

    return getPrismaClient().user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });
  }

  async createUser(userData) {
    const normalized = UserDao.normalizeRegistration(userData);

    return getPrismaClient().user.create({
      data: {
        username: normalized.username,
        email: normalized.email,
        passwordHash: hashPassword(userData.password),
        role: userData.role || DEFAULT_ROLE,
        name: normalized.name,
        phone: normalized.phone,
        address: normalized.address,
        city: normalized.city,
        state: normalized.state,
        postalCode: normalized.postalCode,
        dateOfBirth: normalized.dateOfBirth,
      },
    });
  }

  async updateUser(id, updates) {
    const data = { ...updates };

    if (updates.password) {
      data.passwordHash = hashPassword(updates.password);
    }
    delete data.password;

    try {
      return await getPrismaClient().user.update({ where: { id }, data });
    } catch (error) {
      if (isRecordNotFoundError(error)) return null;
      throw error;
    }
  }

  async deleteUser(id) {
    try {
      return await getPrismaClient().user.delete({ where: { id } });
    } catch (error) {
      if (isRecordNotFoundError(error)) return null;
      throw error;
    }
  }

  /**
   * Una sola consulta: version de sesiones y rol del usuario, y si el token
   * esta revocado. null si el usuario ya no existe.
   */
  async getSessionState(userId, jti) {
    const rows = await getPrismaClient().$queryRaw`
      SELECT u.token_version AS "tokenVersion",
             u.role AS "role",
             EXISTS (SELECT 1 FROM revoked_tokens r WHERE r.jti = ${jti || ""}) AS "revoked"
      FROM users u
      WHERE u.id = ${userId}`;

    if (rows.length === 0) {
      return null;
    }

    const [row] = rows;
    return {
      tokenVersion: Number(row.tokenVersion),
      role: row.role,
      revoked: Boolean(row.revoked),
    };
  }

  /** Revoca un token hasta su vencimiento y descarta los ya vencidos. */
  async revokeToken({ jti, userId, expiresAt }) {
    const prisma = getPrismaClient();

    // La fecha de revocacion la fija la aplicacion con su propio reloj, el mismo con el que
    // la renovacion mide el margen de reutilizacion: el de Prisma o el de la base pueden ir
    // unos milisegundos adelantados y hacer que un token recien rotado parezca del futuro.
    await prisma.revokedToken.createMany({
      data: [{ jti, userId, expiresAt: new Date(expiresAt), createdAt: new Date() }],
      skipDuplicates: true,
    });
    await prisma.revokedToken.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  }

  /** Momento en que se revoco un token (ms epoch), o null si no esta revocado. */
  async getRevokedAt(jti) {
    if (!jti) {
      return null;
    }
    const row = await getPrismaClient().revokedToken.findUnique({
      where: { jti },
      select: { createdAt: true },
    });
    return row ? row.createdAt.getTime() : null;
  }

  /** Invalida todos los tokens del usuario. Devuelve la nueva version, o null. */
  async revokeAllSessions(userId) {
    try {
      const user = await getPrismaClient().user.update({
        where: { id: userId },
        data: { tokenVersion: { increment: 1 } },
        select: { tokenVersion: true },
      });
      return user.tokenVersion;
    } catch (error) {
      if (isRecordNotFoundError(error)) return null;
      throw error;
    }
  }

  sanitizeUser(user) {
    return sanitizeUser(user);
  }

  verifyPassword(password, storedHash) {
    return verifyPassword(password, storedHash);
  }
}

const createUserRepository = () => {
  if (resolveRepositoryMode() === "database") {
    return new DatabaseUserRepository();
  }

  ensureUsersNormalized();
  return new InMemoryUserRepository();
};

const resetInMemoryUserRepository = () => {
  resetDataStore();
};

module.exports = {
  InMemoryUserRepository,
  DatabaseUserRepository,
  createUserRepository,
  resetInMemoryUserRepository,
  hashPassword,
  verifyPassword,
  sanitizeUser,
};
