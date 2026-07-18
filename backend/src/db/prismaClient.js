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

/**
 * True solo para el error de Prisma "registro no encontrado" (P2025), que
 * los repositorios traducen a `null` (404 de negocio). Cualquier otro error
 * (conexión caída, constraint violado, etc.) debe relanzarse para no
 * disfrazar fallas reales de infraestructura como "no encontrado".
 */
const isRecordNotFoundError = (error) => error?.code === "P2025";

module.exports = { getPrismaClient, isRecordNotFoundError };
