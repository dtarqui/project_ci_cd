const {
  calculateProductStatus,
  extractToken,
  createAuthToken,
  verifyAuthToken,
  normalizePhone,
} = require("../src/utils/helpers");
const {
  validateProductCreate,
  validateProductUpdate,
  validateLoginCredentials,
  validateBolivianPhone,
  validateCityAgainstCatalog,
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
    it("debe decodificar payload válido de JWT", () => {
      const token = createAuthToken(2, { username: "demo" });
      const payload = verifyAuthToken(token);
      expect(payload).toMatchObject({ sub: 2, username: "demo" });
    });

    it("debe retornar null para token inválido", () => {
      expect(verifyAuthToken("invalid-token")).toBeNull();
      expect(verifyAuthToken("wrong")).toBeNull();
    });

    it("debe retornar null para token vacío", () => {
      expect(verifyAuthToken("")).toBeNull();
    });
  });

  describe("Helpers - normalizar telefono", () => {
    it("debe dejar intactos los 8 digitos nacionales", () => {
      expect(normalizePhone("22123456")).toBe("22123456");
    });

    it("debe quitar el codigo de pais heredado, con y sin +", () => {
      expect(normalizePhone("+591 22123456")).toBe("22123456");
      expect(normalizePhone("591 76543210")).toBe("76543210");
    });

    it("debe quitar separadores y parentesis", () => {
      expect(normalizePhone("(2) 2123456")).toBe("22123456");
      expect(normalizePhone("7-654-3210")).toBe("76543210");
    });

    it("debe devolver cadena vacia cuando no hay nada usable", () => {
      expect(normalizePhone("")).toBe("");
      expect(normalizePhone("abc")).toBe("");
      expect(normalizePhone(null)).toBe("");
      expect(normalizePhone(undefined)).toBe("");
      expect(normalizePhone(42)).toBe("");
    });
  });

  describe("Validadores - telefono boliviano", () => {
    it("debe aceptar lineas fijas y moviles", () => {
      ["22123456", "33234567", "44345678", "65555555", "76543210"].forEach((phone) => {
        expect(validateBolivianPhone(phone).isValid).toBe(true);
      });
    });

    it("debe rechazar cualquier cantidad de digitos distinta de 8", () => {
      ["1234567", "123456789", "1234567890", ""].forEach((phone) => {
        const result = validateBolivianPhone(phone);
        expect(result.isValid).toBe(false);
        expect(result.code).toBe("INVALID_PHONE");
      });
    });

    it("debe rechazar primeros digitos que no existen en Bolivia", () => {
      ["12345678", "52345678", "82345678", "92345678", "02345678"].forEach((phone) => {
        const result = validateBolivianPhone(phone);
        expect(result.isValid).toBe(false);
        expect(result.code).toBe("INVALID_PHONE");
      });
    });

    it("debe rechazar valores que no son texto", () => {
      expect(validateBolivianPhone(22123456).isValid).toBe(false);
      expect(validateBolivianPhone(null).isValid).toBe(false);
    });
  });

  describe("Validadores - ciudad contra el catalogo", () => {
    it("debe aceptar una ciudad del catalogo", () => {
      expect(validateCityAgainstCatalog("La Paz").isValid).toBe(true);
      expect(validateCityAgainstCatalog("Santa Cruz de la Sierra").isValid).toBe(true);
    });

    it("debe aceptar los espacios sobrantes alrededor del nombre", () => {
      expect(validateCityAgainstCatalog("  Cochabamba  ").isValid).toBe(true);
    });

    it("debe tratar la ciudad como opcional", () => {
      expect(validateCityAgainstCatalog(undefined).isValid).toBe(true);
      expect(validateCityAgainstCatalog(null).isValid).toBe(true);
      expect(validateCityAgainstCatalog("").isValid).toBe(true);
      expect(validateCityAgainstCatalog("   ").isValid).toBe(true);
    });

    it("debe rechazar una ciudad que no se atiende", () => {
      const result = validateCityAgainstCatalog("Madrid");
      expect(result.isValid).toBe(false);
      expect(result.code).toBe("INVALID_CITY");
      expect(result.error).toContain("La Paz");
    });

    it("debe distinguir mayusculas, para que no entren variantes del mismo nombre", () => {
      expect(validateCityAgainstCatalog("la paz").isValid).toBe(false);
    });

    it("debe rechazar valores que no son texto", () => {
      const result = validateCityAgainstCatalog(42);
      expect(result.isValid).toBe(false);
      expect(result.code).toBe("INVALID_CITY");
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
