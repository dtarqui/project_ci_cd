/**
 * Repository Factory
 * Elimina la duplicación del switch `REPOSITORY_MODE` (memory/database)
 * repetido en cada archivo `*Repository.js`.
 */

const resolveRepositoryMode = () => process.env.REPOSITORY_MODE || "memory";

/**
 * Instancia la implementación de repositorio correspondiente al modo activo.
 * @param {Function} InMemoryImpl - Clase de implementación en memoria
 * @param {Function} DatabaseImpl - Clase de implementación de base de datos
 * @returns {Object} Instancia de InMemoryImpl o DatabaseImpl según REPOSITORY_MODE
 */
const createRepository = (InMemoryImpl, DatabaseImpl) => {
  if (resolveRepositoryMode() === "database") {
    return new DatabaseImpl();
  }

  return new InMemoryImpl();
};

module.exports = { createRepository, resolveRepositoryMode };
