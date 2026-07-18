/**
 * Prisma Client
 * Instancia perezosa: solo se crea (y solo entonces exige DATABASE_URL)
 * cuando algún repositorio en modo "database" la solicita. El modo
 * "memory" (default) nunca importa este módulo en tiempo de ejecución.
 */

let prismaClient = null;

const getPrismaClient = () => {
  if (!prismaClient) {
    const { PrismaClient } = require("@prisma/client");
    prismaClient = new PrismaClient();
  }

  return prismaClient;
};

module.exports = { getPrismaClient };
