/**
 * User Repository
 * Abstrae el origen de datos de usuarios para facilitar migración a BD.
 */

const crypto = require("crypto");
const { UserDao } = require("../dao/userDao");
const { getUsers, resetDataStore } = require("../db/dataStore");
const { getPrismaClient, isRecordNotFoundError } = require("../db/prismaClient");

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
    country: user.country || null,
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

  // Compatibilidad con seeds legacy en texto plano.
  if (!storedHash.startsWith(`${HASH_PREFIX}$`)) {
    return password === storedHash;
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
  const { passwordHash: _passwordHash, password: _legacyPassword, ...safeUser } = user;
  return safeUser;
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
        country: normalized.country,
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

  sanitizeUser(user) {
    return sanitizeUser(user);
  }

  verifyPassword(password, storedHash) {
    return verifyPassword(password, storedHash);
  }
}

const createUserRepository = () => {
  const provider = process.env.REPOSITORY_MODE || "memory";

  if (provider === "database") {
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
