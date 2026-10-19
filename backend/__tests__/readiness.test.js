/**
 * Comprobacion de disponibilidad (GET /health/ready) que consulta la etapa
 * "Post-Deploy Smoke Test" del pipeline. El modo database se prueba con un
 * doble del cliente de Prisma: no requiere una base real.
 */

const request = require("supertest");
const {
  checkReadiness,
  READINESS_MODELS,
} = require("../src/services/readinessService");

// Doble del cliente de Prisma: cada modelo responde vacio salvo el que se
// indique, que rechaza con el codigo de error dado.
const buildPrismaDouble = (failingModel, code) =>
  Object.fromEntries(
    READINESS_MODELS.map((model) => [
      model,
      {
        findFirst: jest.fn(() =>
          model === failingModel
            ? Promise.reject(Object.assign(new Error("consulta fallida"), { code }))
            : Promise.resolve(null)
        ),
      },
    ])
  );

describe("readinessService.checkReadiness", () => {
  it("en modo memoria esta listo sin consultar ninguna base", async () => {
    const getPrismaClient = jest.fn();

    const result = await checkReadiness({ repositoryMode: "memory", getPrismaClient });

    expect(result).toEqual({ ready: true, repositoryMode: "memory", checks: [] });
    expect(getPrismaClient).not.toHaveBeenCalled();
  });

  it("en modo database consulta cada modelo y queda listo si todas responden", async () => {
    const prisma = buildPrismaDouble();

    const result = await checkReadiness({
      repositoryMode: "database",
      getPrismaClient: () => prisma,
    });

    expect(result.ready).toBe(true);
    expect(result.repositoryMode).toBe("database");
    expect(result.checks).toHaveLength(READINESS_MODELS.length);
    expect(result.checks.every((check) => check.ok)).toBe(true);
    READINESS_MODELS.forEach((model) => {
      expect(prisma[model].findFirst).toHaveBeenCalledTimes(1);
    });
  });

  it("no queda listo si falta una columna en una tabla (P2022) e indica el modelo", async () => {
    const prisma = buildPrismaDouble("sale", "P2022");

    const result = await checkReadiness({
      repositoryMode: "database",
      getPrismaClient: () => prisma,
    });

    expect(result.ready).toBe(false);
    expect(result.checks.find((check) => check.model === "sale")).toEqual({
      model: "sale",
      ok: false,
      code: "P2022",
    });
    expect(
      result.checks.filter((check) => check.model !== "sale").every((check) => check.ok)
    ).toBe(true);
  });

  it("usa un codigo generico cuando el error no trae codigo propio", async () => {
    const prisma = buildPrismaDouble("product");

    const result = await checkReadiness({
      repositoryMode: "database",
      getPrismaClient: () => prisma,
    });

    expect(result.checks.find((check) => check.model === "product").code).toBe(
      "QUERY_FAILED"
    );
  });

  it("no queda listo si el cliente de Prisma no puede crearse", async () => {
    const result = await checkReadiness({
      repositoryMode: "database",
      getPrismaClient: () => {
        throw new Error("cliente no generado");
      },
    });

    expect(result).toEqual({
      ready: false,
      repositoryMode: "database",
      checks: [{ model: "prismaClient", ok: false, code: "PRISMA_CLIENT_UNAVAILABLE" }],
    });
  });

  it("conserva el codigo del error al crear el cliente", async () => {
    const result = await checkReadiness({
      repositoryMode: "database",
      getPrismaClient: () => {
        throw Object.assign(new Error("sin DATABASE_URL"), { code: "P1012" });
      },
    });

    expect(result.checks[0].code).toBe("P1012");
  });
});

describe("GET /health/ready", () => {
  const originalMode = process.env.REPOSITORY_MODE;

  afterEach(() => {
    if (originalMode === undefined) {
      delete process.env.REPOSITORY_MODE;
    } else {
      process.env.REPOSITORY_MODE = originalMode;
    }
  });

  it("responde 200 en modo memoria", async () => {
    delete process.env.REPOSITORY_MODE;
    const { createApp } = require("../app");

    const response = await request(createApp()).get("/health/ready").expect(200);

    expect(response.body).toEqual({ status: "ok", repositoryMode: "memory", checks: [] });
  });

  it("responde 503 con el detalle cuando alguna comprobacion falla", async () => {
    let app;
    jest.isolateModules(() => {
      jest.doMock("../src/services/readinessService", () => ({
        checkReadiness: async () => ({
          ready: false,
          repositoryMode: "database",
          checks: [{ model: "sale", ok: false, code: "P2022" }],
        }),
      }));
      const { createApp } = require("../app");
      app = createApp();
    });

    const response = await request(app).get("/health/ready").expect(503);

    expect(response.body).toEqual({
      status: "error",
      repositoryMode: "database",
      checks: [{ model: "sale", ok: false, code: "P2022" }],
    });
  });
});
