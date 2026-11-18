/**
 * Prisma Client
 * Instancia perezosa: solo se crea (y solo entonces exige DATABASE_URL)
 * cuando algún repositorio en modo "database" la solicita. El modo
 * "memory" (default) nunca importa este módulo en tiempo de ejecución.
 */

let prismaClient = null;

/**
 * En Vercel cada instancia de la función crea su propio PrismaClient, y Prisma
 * abre por defecto un grupo de conexiones proporcional a los núcleos. Con
 * varias instancias simultáneas, la suma agotaba las conexiones que admite el
 * servicio de base de datos: la prueba de capacidad del 18-11-2026 (Anexo M de
 * la tesis) fallaba con tres usuarios concurrentes. Por eso, en un entorno
 * serverless cada instancia usa una sola conexión, salvo que la cadena de
 * conexión ya fije `connection_limit` o que DB_CONNECTION_LIMIT indique otro
 * valor.
 */
const SERVERLESS_CONNECTION_LIMIT = "1";

/**
 * Devuelve la cadena de conexión con el límite de conexiones que corresponde al
 * entorno, o la misma cadena si no hay que cambiar nada.
 * @param {string|undefined} rawUrl - DATABASE_URL
 * @param {Object} env - variables de entorno (process.env por defecto)
 * @returns {string|undefined}
 */
const buildDatasourceUrl = (rawUrl, env = process.env) => {
  if (!rawUrl) {
    return undefined;
  }

  const limit = env.DB_CONNECTION_LIMIT || (env.VERCEL ? SERVERLESS_CONNECTION_LIMIT : null);

  if (!limit) {
    return rawUrl;
  }

  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return rawUrl;
  }

  if (!url.searchParams.has("connection_limit")) {
    url.searchParams.set("connection_limit", limit);
  }

  return url.toString();
};

const getPrismaClient = () => {
  if (!prismaClient) {
    const { PrismaClient } = require("@prisma/client");
    const url = buildDatasourceUrl(process.env.DATABASE_URL);
    prismaClient = url ? new PrismaClient({ datasources: { db: { url } } }) : new PrismaClient();
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

/** True para una violación de unicidad de Prisma (P2002). */
const isUniqueViolationError = (error) => error?.code === "P2002";

module.exports = {
  getPrismaClient,
  buildDatasourceUrl,
  isRecordNotFoundError,
  isUniqueViolationError,
};
