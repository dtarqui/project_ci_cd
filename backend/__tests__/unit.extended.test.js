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
    it("deve retornar 'En Stock' para cantidad > 20", () => {
      expect(calculateProductStatus(25)).toBe("En Stock");
    });

    it("deve retornar 'En Stock' para cantidad = 21", () => {
      expect(calculateProductStatus(21)).toBe("En Stock");
    });

    it("deve retornar 'Bajo Stock' para quantidade entre 1-20", () => {
      expect(calculateProductStatus(5)).toBe("Bajo Stock");
      expect(calculateProductStatus(1)).toBe("Bajo Stock");
      expect(calculateProductStatus(20)).toBe("Bajo Stock");
    });

    it("deve retornar 'Sin Stock' para quantidade = 0", () => {
      expect(calculateProductStatus(0)).toBe("Sin Stock");
    });

    it("deve retornar 'Sin Stock' para quantidade < 0", () => {
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
    it("deve extraer token valido de header Bearer", () => {
      const token = extractToken("Bearer my-secret-token");
      expect(token).toBe("my-secret-token");
    });

    it("deve retornar null para header vacio", () => {
      expect(extractToken(null)).toBeNull();
    });

    it("deve retornar null para header indefinido", () => {
      expect(extractToken(undefined)).toBeNull();
    });

    it("deve retornar null para header sin Bearer", () => {
      expect(extractToken("my-token")).toBeNull();
    });

    it("deve retornar null para header malformado", () => {
      expect(extractToken("Bearer")).toBeNull();
    });

    it("deve extraer token sin hacer trim", () => {
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

    it("deve retornar false para token invalido", () => {
      expect(isValidToken("invalid-token")).toBe(false);
      expect(isValidToken("wrong")).toBe(false);
    });

    it("deve retornar false para token vacio", () => {
      expect(isValidToken("")).toBe(false);
    });
  });

  describe("Validadores - validar creación de producto", () => {
    it("deve validar producto valido", () => {
      const result = validateProductCreate({
        name: "Test",
        category: "Test",
        price: 99.99,
        stock: 10,
      });
      expect(result.isValid).toBe(true);
    });

    it("deve rejeitar producto sin campos requeridos", () => {
      const result = validateProductCreate({
        category: "Test",
        price: 99.99,
        stock: 10,
      });
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("deve rejeitar producto con price no número", () => {
      const result = validateProductCreate({
        name: "Test",
        category: "Test",
        price: "invalid",
        stock: 10,
      });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("número");
    });

    it("deve rejeitar producto con stock no número", () => {
      const result = validateProductCreate({
        name: "Test",
        category: "Test",
        price: 99.99,
        stock: "invalid",
      });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("número");
    });

    it("deve rejeitar precio negativo", () => {
      const result = validateProductCreate({
        name: "Test",
        category: "Test",
        price: -50,
        stock: 10,
      });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("negativos");
    });

    it("deve rejeitar stock negativo", () => {
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
    it("deve validar actualización parcial", () => {
      const result = validateProductUpdate({ name: "Updated" });
      expect(result.isValid).toBe(true);
    });

    it("deve validar actualización con precio", () => {
      const result = validateProductUpdate({ price: 150.99 });
      expect(result.isValid).toBe(true);
    });

    it("deve validar actualización con stock", () => {
      const result = validateProductUpdate({ stock: 50 });
      expect(result.isValid).toBe(true);
    });

    it("deve rejeitar precio invalido en actualización", () => {
      const result = validateProductUpdate({ price: "invalid" });
      expect(result.isValid).toBe(false);
    });

    it("deve rejeitar stock negativo en actualización", () => {
      const result = validateProductUpdate({ stock: -10 });
      expect(result.isValid).toBe(false);
    });

    it("deve aceptar objeto vacío (sin cambios)", () => {
      const result = validateProductUpdate({});
      expect(result.isValid).toBe(true);
    });

    it("deve validar múltiples campos en actualización", () => {
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

    it("debe rejeitar sin username", () => {
      const result = validateLoginCredentials({
        password: "admin123",
      });
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("debe rejeitar sin password", () => {
      const result = validateLoginCredentials({
        username: "admin",
      });
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("debe rejeitar username vacio", () => {
      const result = validateLoginCredentials({
        username: "",
        password: "admin123",
      });
      expect(result.isValid).toBe(false);
    });

    it("debe rejeitar password vacio", () => {
      const result = validateLoginCredentials({
        username: "admin",
        password: "",
      });
      expect(result.isValid).toBe(false);
    });

    it("debe rejeitar si faltan ambos campos", () => {
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

    it("debe rejeitar si username no es string", () => {
      const result = validateLoginCredentials({
        username: 123,
        password: "admin123",
      });
      expect(result.isValid).toBe(false);
    });

    it("debe rejeitar si password no es string", () => {
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
