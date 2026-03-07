/**
 * User Repository
 * Abstrae el origen de datos de usuarios para facilitar migración a BD.
 */

const crypto = require("crypto");
const { users: seedUsers } = require("../db/mockData");

const HASH_PREFIX = "scrypt";
const SCRYPT_KEYLEN = 64;

const normalizeSeedUser = (user) => {
  if (user.passwordHash) {
    return { ...user };
  }

  return {
    ...user,
    passwordHash: user.password ? hashPassword(user.password) : "",
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

const createInitialUsers = () => seedUsers.map((user) => normalizeSeedUser(user));

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

const userStore = {
  users: createInitialUsers(),
};

class InMemoryUserRepository {
  constructor(store) {
    this.store = store;
  }

  async findByCredentials(username, password) {
    return (
      this.store.users.find(
        (user) =>
          user.username.toLowerCase() === String(username).toLowerCase() &&
          verifyPassword(password, user.passwordHash)
      ) || null
    );
  }

  async findById(id) {
    return this.store.users.find((user) => user.id === id) || null;
  }

  async findByUsername(username) {
    return (
      this.store.users.find(
        (user) => user.username.toLowerCase() === String(username).toLowerCase()
      ) || null
    );
  }

  async findByEmail(email) {
    return (
      this.store.users.find(
        (user) =>
          user.email && user.email.toLowerCase() === String(email).toLowerCase()
      ) || null
    );
  }

  async createUser(userData) {
    const nextId =
      this.store.users.length > 0
        ? Math.max(...this.store.users.map((user) => user.id)) + 1
        : 1;

    const now = new Date().toISOString();
    const user = {
      id: nextId,
      username: userData.username,
      name: userData.name,
      email: userData.email,
      phone: userData.phone || null,
      address: userData.address || null,
      city: userData.city || null,
      state: userData.state || null,
      country: userData.country || null,
      postalCode: userData.postalCode || null,
      dateOfBirth: userData.dateOfBirth || null,
      passwordHash: hashPassword(userData.password),
      createdAt: now,
      updatedAt: now,
    };

    this.store.users.push(user);

    return user;
  }

  async updateUser(id, updates) {
    const userIndex = this.store.users.findIndex((user) => user.id === id);

    if (userIndex === -1) {
      return null;
    }

    const currentUser = this.store.users[userIndex];
    const nextUser = {
      ...currentUser,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if (updates.password) {
      nextUser.passwordHash = hashPassword(updates.password);
    }

    delete nextUser.password;

    this.store.users[userIndex] = nextUser;
    return nextUser;
  }

  async deleteUser(id) {
    const userIndex = this.store.users.findIndex((user) => user.id === id);

    if (userIndex === -1) {
      return null;
    }

    const [deletedUser] = this.store.users.splice(userIndex, 1);
    return deletedUser;
  }

  sanitizeUser(user) {
    return sanitizeUser(user);
  }

  verifyPassword(password, storedHash) {
    return verifyPassword(password, storedHash);
  }
}

// Placeholder para migración futura a base de datos.
// Implementar mismos métodos: findByCredentials y findById.
class DatabaseUserRepository {
  async findByCredentials(_username, _password) {
    throw new Error("DatabaseUserRepository not implemented yet");
  }

  async findById(_id) {
    throw new Error("DatabaseUserRepository not implemented yet");
  }
}

const createUserRepository = () => {
  const provider = process.env.USER_REPOSITORY || "memory";

  if (provider === "database") {
    return new DatabaseUserRepository();
  }

  return new InMemoryUserRepository(userStore);
};

const resetInMemoryUserRepository = () => {
  userStore.users = createInitialUsers();
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
