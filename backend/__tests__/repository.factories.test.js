/**
 * Verifica que las factories de repositorios seleccionen la implementación
 * correcta según el switch único REPOSITORY_MODE, sin necesidad de una BD
 * real (las clases Database* no tocan Prisma hasta que se llama un método).
 */

const {
  InMemoryUserRepository,
  DatabaseUserRepository,
  createUserRepository,
} = require("../src/repositories/userRepository");
const {
  InMemoryCustomerRepository,
  DatabaseCustomerRepository,
  createCustomerRepository,
} = require("../src/repositories/customerRepository");
const {
  InMemoryProductRepository,
  DatabaseProductRepository,
  createProductRepository,
} = require("../src/repositories/productRepository");
const {
  InMemorySaleRepository,
  DatabaseSaleRepository,
  createSaleRepository,
} = require("../src/repositories/saleRepository");
const {
  InMemoryDashboardRepository,
  DatabaseDashboardRepository,
  createDashboardRepository,
} = require("../src/repositories/dashboardRepository");

describe("Factories de repositorios (REPOSITORY_MODE: memory vs database)", () => {
  const originalMode = process.env.REPOSITORY_MODE;

  afterEach(() => {
    process.env.REPOSITORY_MODE = originalMode;
  });

  describe("REPOSITORY_MODE sin definir (default memory)", () => {
    beforeEach(() => {
      delete process.env.REPOSITORY_MODE;
    });

    it("usa las implementaciones en memoria para todos los repositorios", () => {
      expect(createUserRepository()).toBeInstanceOf(InMemoryUserRepository);
      expect(createCustomerRepository()).toBeInstanceOf(InMemoryCustomerRepository);
      expect(createProductRepository()).toBeInstanceOf(InMemoryProductRepository);
      expect(createSaleRepository()).toBeInstanceOf(InMemorySaleRepository);
      expect(createDashboardRepository()).toBeInstanceOf(InMemoryDashboardRepository);
    });
  });

  describe("REPOSITORY_MODE=database", () => {
    beforeEach(() => {
      process.env.REPOSITORY_MODE = "database";
    });

    it("usa las implementaciones de Postgres/Supabase para todos los repositorios", () => {
      expect(createUserRepository()).toBeInstanceOf(DatabaseUserRepository);
      expect(createCustomerRepository()).toBeInstanceOf(DatabaseCustomerRepository);
      expect(createProductRepository()).toBeInstanceOf(DatabaseProductRepository);
      expect(createSaleRepository()).toBeInstanceOf(DatabaseSaleRepository);
      expect(createDashboardRepository()).toBeInstanceOf(DatabaseDashboardRepository);
    });
  });
});
