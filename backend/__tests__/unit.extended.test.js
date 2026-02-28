const {
  calculateProductStatus,
  getNextProductId,
  extractToken,
  isValidToken,
} = require("../src/utils/helpers");
const {
  validateProductCreate,
  validateProductUpdate,
  validateLoginCredentials,
} = require("../src/utils/validators");

describe("Pruebas unitarias - Cobertura extendida", () => {
  describe("Helpers - calcular estado de producto", () => {
    it("debe retornar 'En Stock' para cantidad > 20", () => {
      expect(calculateProductStatus(25)).toBe("En Stock");
    });

    it("debe retornar 'En Stock' para cantidad = 21", () => {
      expect(calculateProductStatus(21)).toBe("En Stock");
    });

    it("debe retornar 'Bajo Stock' para cantidad entre 1-20", () => {
      expect(calculateProductStatus(5)).toBe("Bajo Stock");
      expect(calculateProductStatus(1)).toBe("Bajo Stock");
      expect(calculateProductStatus(20)).toBe("Bajo Stock");
    });

    it("debe retornar 'Sin Stock' para cantidad = 0", () => {
      expect(calculateProductStatus(0)).toBe("Sin Stock");
    });

    it("debe retornar 'Sin Stock' para cantidad < 0", () => {
      expect(calculateProductStatus(-5)).toBe("Sin Stock");
    });
  });

  describe("Helpers - obtener siguiente ID de producto", () => {
    it("debe retornar ID siguiente", () => {
      const products = [{ id: 1 }, { id: 2 }, { id: 5 }];
      expect(getNextProductId(products)).toBe(6);
    });

    it("debe retornar 1 para array vacío", () => {
      expect(getNextProductId([])).toBe(1);
    });

    it("debe manejar IDs grandes", () => {
      const products = [{ id: 100 }, { id: 200 }];
      expect(getNextProductId(products)).toBe(201);
    });
  });

  describe("Helpers - extraer token", () => {
    it("debe extraer token válido de header Bearer", () => {
      const token = extractToken("Bearer my-secret-token");
      expect(token).toBe("my-secret-token");
    });

    it("debe retornar null para header vacío", () => {
      expect(extractToken(null)).toBeNull();
    });

    it("debe retornar null para header indefinido", () => {
      expect(extractToken(undefined)).toBeNull();
    });

    it("debe retornar null para header sin Bearer", () => {
      expect(extractToken("my-token")).toBeNull();
    });

    it("debe retornar null para header malformado", () => {
      expect(extractToken("Bearer")).toBeNull();
    });

    it("debe extraer token sin hacer trim", () => {
      const token = extractToken("Bearer   my-token-here  ");
      expect(token).toBe("  my-token-here  ");
    });
  });

  describe("Helpers - token válido", () => {
    it("debe validar token conocido 'valid_token'", () => {
      expect(isValidToken("valid_token")).toBe(true);
    });

    it("debe validar tokens mock JWT", () => {
      expect(isValidToken("mock-jwt-token-1")).toBe(true);
      expect(isValidToken("mock-jwt-token-2")).toBe(true);
    });

    it("debe validar tokens con prefijo user_", () => {
      expect(isValidToken("user_something")).toBe(true);
    });

    it("debe retornar false para token inválido", () => {
      expect(isValidToken("invalid-token")).toBe(false);
      expect(isValidToken("wrong")).toBe(false);
    });

    it("debe retornar false para token vacío", () => {
      expect(isValidToken("")).toBe(false);
    });
  });

  describe("Validadores - validar creación de producto", () => {
    it("debe validar producto válido", () => {
      const result = validateProductCreate({
        name: "Test",
        category: "Test",
        price: 99.99,
        stock: 10,
      });
      expect(result.isValid).toBe(true);
    });

    it("debe rechazar producto sin campos requeridos", () => {
      const result = validateProductCreate({
        category: "Test",
        price: 99.99,
        stock: 10,
      });
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("debe rechazar producto con price no número", () => {
      const result = validateProductCreate({
        name: "Test",
        category: "Test",
        price: "invalid",
        stock: 10,
      });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("número");
    });

    it("debe rechazar producto con stock no número", () => {
      const result = validateProductCreate({
        name: "Test",
        category: "Test",
        price: 99.99,
        stock: "invalid",
      });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("número");
    });

    it("debe rechazar precio negativo", () => {
      const result = validateProductCreate({
        name: "Test",
        category: "Test",
        price: -50,
        stock: 10,
      });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("negativos");
    });

    it("debe rechazar stock negativo", () => {
      const result = validateProductCreate({
        name: "Test",
        category: "Test",
        price: 99.99,
        stock: -5,
      });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("negativos");
    });

    it("debe aceptar precio cero", () => {
      const result = validateProductCreate({
        name: "Test",
        category: "Test",
        price: 0,
        stock: 10,
      });
      expect(result.isValid).toBe(true);
    });

    it("debe aceptar stock cero", () => {
      const result = validateProductCreate({
        name: "Test",
        category: "Test",
        price: 99.99,
        stock: 0,
      });
      expect(result.isValid).toBe(true);
    });
  });

  describe("Validadores - validar actualización de producto", () => {
    it("debe validar actualización parcial", () => {
      const result = validateProductUpdate({ name: "Updated" });
      expect(result.isValid).toBe(true);
    });

    it("debe validar actualización con precio", () => {
      const result = validateProductUpdate({ price: 150.99 });
      expect(result.isValid).toBe(true);
    });

    it("debe validar actualización con stock", () => {
      const result = validateProductUpdate({ stock: 50 });
      expect(result.isValid).toBe(true);
    });

    it("debe rechazar precio inválido en actualización", () => {
      const result = validateProductUpdate({ price: "invalid" });
      expect(result.isValid).toBe(false);
    });

    it("debe rechazar stock negativo en actualización", () => {
      const result = validateProductUpdate({ stock: -10 });
      expect(result.isValid).toBe(false);
    });

    it("debe aceptar objeto vacío (sin cambios)", () => {
      const result = validateProductUpdate({});
      expect(result.isValid).toBe(true);
    });

    it("debe validar múltiples campos en actualización", () => {
      const result = validateProductUpdate({
        name: "New Name",
        price: 99.99,
        stock: 30,
        category: "New Cat",
      });
      expect(result.isValid).toBe(true);
    });
  });

  describe("Validadores - validar credenciales de login", () => {
    it("debe validar credenciales válidas", () => {
      const result = validateLoginCredentials({
        username: "admin",
        password: "admin123",
      });
      expect(result.isValid).toBe(true);
    });

    it("debe rechazar sin username", () => {
      const result = validateLoginCredentials({
        password: "admin123",
      });
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("debe rechazar sin password", () => {
      const result = validateLoginCredentials({
        username: "admin",
      });
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("debe rechazar username vacío", () => {
      const result = validateLoginCredentials({
        username: "",
        password: "admin123",
      });
      expect(result.isValid).toBe(false);
    });

    it("debe rechazar password vacío", () => {
      const result = validateLoginCredentials({
        username: "admin",
        password: "",
      });
      expect(result.isValid).toBe(false);
    });

    it("debe rechazar si faltan ambos campos", () => {
      const result = validateLoginCredentials({});
      expect(result.isValid).toBe(false);
    });

    it("debe validar username y password con espacios", () => {
      const result = validateLoginCredentials({
        username: "  user  ",
        password: "  pass  ",
      });
      expect(result.isValid).toBe(true);
    });

    it("debe rechazar si username no es string", () => {
      const result = validateLoginCredentials({
        username: 123,
        password: "admin123",
      });
      expect(result.isValid).toBe(false);
    });

    it("debe rechazar si password no es string", () => {
      const result = validateLoginCredentials({
        username: "admin",
        password: 123,
      });
      expect(result.isValid).toBe(false);
    });
  });

  describe("Validadores - casos límite", () => {
    it("debe manejar objetos con propiedades adicionales en create", () => {
      const result = validateProductCreate({
        name: "Test",
        category: "Test",
        price: 99.99,
        stock: 10,
        extraField: "should be ignored",
      });
      expect(result.isValid).toBe(true);
    });

    it("debe manejar objetos con propiedades adicionales en update", () => {
      const result = validateProductUpdate({
        price: 100,
        randomProp: "random",
      });
      expect(result.isValid).toBe(true);
    });

    it("debe manejar valores 0 en precio", () => {
      const result = validateProductCreate({
        name: "Test",
        category: "Test",
        price: 0,
        stock: 5,
      });
      expect(result.isValid).toBe(true);
    });

    it("debe manejar valores 0 en stock", () => {
      const result = validateProductCreate({
        name: "Test",
        category: "Test",
        price: 50,
        stock: 0,
      });
      expect(result.isValid).toBe(true);
    });
  });
});
