/**
 * Readiness Service
 * Comprueba que la aplicacion pueda operar con el almacenamiento configurado.
 * Lo expone GET /health/ready y lo consulta la etapa "Post-Deploy Smoke Test"
 * del pipeline despues de cada despliegue.
 *
 * /health solo prueba que el proceso arranca. Con eso no basta: en las
 * ejecuciones 18 a 23 el pipeline termino en verde mientras staging estaba
 * roto, porque el codigo consultaba columnas que la migracion no habia creado
 * y /health seguia respondiendo "ok".
 */

const { resolveRepositoryMode } = require("../repositories/factory");

// Delegados del cliente de Prisma que se consultan. findFirst() sin argumentos
// selecciona todas las columnas escalares que el cliente espera, de modo que si
// falta alguna en la base Prisma responde con error (P2022) y la comprobacion
// de ese modelo falla.
const READINESS_MODELS = [
  "user",
  "customer",
  "product",
  "sale",
  "saleItem",
  "city",
  "category",
];

const defaultGetPrismaClient = () =>
  require("../db/prismaClient").getPrismaClient();

/**
 * Ejecuta las comprobaciones de disponibilidad.
 * @param {Object} [options] - Dependencias inyectables (para pruebas)
 * @param {string} [options.repositoryMode] - Modo de repositorio activo
 * @param {Function} [options.getPrismaClient] - Devuelve el cliente de Prisma
 * @param {string[]} [options.models] - Modelos a consultar
 * @returns {Promise<{ready: boolean, repositoryMode: string, checks: Object[]}>}
 */
const checkReadiness = async ({
  repositoryMode = resolveRepositoryMode(),
  getPrismaClient = defaultGetPrismaClient,
  models = READINESS_MODELS,
} = {}) => {
  // En memoria no hay dependencias externas: si el proceso responde, esta listo.
  if (repositoryMode !== "database") {
    return { ready: true, repositoryMode, checks: [] };
  }

  let prisma;
  try {
    prisma = getPrismaClient();
  } catch (error) {
    return {
      ready: false,
      repositoryMode,
      checks: [
        {
          model: "prismaClient",
          ok: false,
          code: error?.code || "PRISMA_CLIENT_UNAVAILABLE",
        },
      ],
    };
  }

  const checks = await Promise.all(
    models.map(async (model) => {
      try {
        await prisma[model].findFirst();
        return { model, ok: true };
      } catch (error) {
        return { model, ok: false, code: error?.code || "QUERY_FAILED" };
      }
    })
  );

  return {
    ready: checks.every((check) => check.ok),
    repositoryMode,
    checks,
  };
};

module.exports = { checkReadiness, READINESS_MODELS };
