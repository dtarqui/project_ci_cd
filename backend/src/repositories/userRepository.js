/**
 * User Repository
 * Abstrae el origen de datos de usuarios para facilitar migración a BD.
 */

const { users: seedUsers } = require("../db/mockData");

class InMemoryUserRepository {
  constructor(initialUsers = []) {
    this.users = initialUsers.map((user) => ({ ...user }));
  }

  async findByCredentials(username, password) {
    return (
      this.users.find(
        (user) => user.username === username && user.password === password
      ) || null
    );
  }

  async findById(id) {
    return this.users.find((user) => user.id === id) || null;
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

  return new InMemoryUserRepository(seedUsers);
};

module.exports = {
  InMemoryUserRepository,
  DatabaseUserRepository,
  createUserRepository,
};
