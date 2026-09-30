import {
  normalizePhone,
  validateName,
  validateEmail,
  validatePhone,
  validateAddress,
  validateCity,
  validatePostalCode,
  validatePrice,
  validateStock,
  firstInvalidField,
  isClean,
  PHONE_DIGITS,
} from "../utils/validation";

describe("Reglas de validacion de formularios", () => {
  describe("normalizePhone", () => {
    it("debe dejar intactos los 8 digitos nacionales", () => {
      expect(normalizePhone("22123456")).toBe("22123456");
    });

    it("debe quitar el codigo de pais, con y sin signo", () => {
      expect(normalizePhone("+591 22123456")).toBe("22123456");
      expect(normalizePhone("591 76543210")).toBe("76543210");
    });

    it("debe quitar espacios, guiones y parentesis", () => {
      expect(normalizePhone(" (2) 212-3456 ")).toBe("22123456");
    });

    it("debe devolver vacio cuando no hay digitos usables", () => {
      expect(normalizePhone("")).toBe("");
      expect(normalizePhone("sin numero")).toBe("");
      expect(normalizePhone(null)).toBe("");
      expect(normalizePhone(undefined)).toBe("");
      expect(normalizePhone(22123456)).toBe("");
    });
  });

  describe("validateName", () => {
    it("debe aceptar un nombre normal", () => {
      expect(validateName("Juan García")).toBe("");
    });

    it("debe exigir el campo", () => {
      expect(validateName("")).toMatch(/requerido/i);
      expect(validateName("   ")).toMatch(/requerido/i);
      expect(validateName(undefined)).toMatch(/requerido/i);
    });

    it("debe exigir un largo minimo", () => {
      expect(validateName("Jo")).toMatch(/al menos 3/i);
    });
  });

  describe("validateEmail", () => {
    it("debe aceptar direcciones bien formadas", () => {
      expect(validateEmail("juan@example.com")).toBe("");
      expect(validateEmail("  juan.perez@sub.example.bo  ")).toBe("");
    });

    it("debe exigir el campo", () => {
      expect(validateEmail("")).toMatch(/requerido/i);
    });

    it("debe rechazar lo que la regla anterior del backend dejaba pasar", () => {
      // El backend solo comprueba que haya una arroba: "a@b" le sirve.
      expect(validateEmail("a@b")).toMatch(/formato/i);
      expect(validateEmail("sin-arroba.com")).toMatch(/formato/i);
      expect(validateEmail("dos@@arrobas.com")).toMatch(/formato/i);
      expect(validateEmail("con espacio@example.com")).toMatch(/formato/i);
    });
  });

  describe("validatePhone", () => {
    it("debe aceptar fijas y moviles bolivianas", () => {
      ["22123456", "33234567", "44345678", "65555555", "76543210"].forEach((phone) => {
        expect(validatePhone(phone)).toBe("");
      });
    });

    it("debe aceptar un numero pegado con codigo de pais", () => {
      expect(validatePhone("+591 76543210")).toBe("");
    });

    it("debe exigir el campo", () => {
      expect(validatePhone("")).toMatch(/requerido/i);
    });

    it("debe exigir exactamente 8 digitos", () => {
      expect(validatePhone("2212345")).toMatch(new RegExp(`${PHONE_DIGITS} digitos`));
      expect(validatePhone("1234567890")).toMatch(new RegExp(`${PHONE_DIGITS} digitos`));
    });

    it("debe rechazar primeros digitos que no existen en Bolivia", () => {
      expect(validatePhone("12345678")).toMatch(/empezar/i);
      expect(validatePhone("52345678")).toMatch(/empezar/i);
      expect(validatePhone("92345678")).toMatch(/empezar/i);
    });
  });

  describe("validateAddress y validatePostalCode", () => {
    it("debe aceptar valores vacios, porque son opcionales", () => {
      expect(validateAddress("")).toBe("");
      expect(validatePostalCode("")).toBe("");
    });

    it("debe rechazar una direccion mas larga que el limite del backend", () => {
      expect(validateAddress("x".repeat(181))).toMatch(/180/);
      expect(validateAddress("x".repeat(180))).toBe("");
    });

    it("debe rechazar un codigo postal mas largo que el limite del backend", () => {
      expect(validatePostalCode("x".repeat(21))).toMatch(/20/);
      expect(validatePostalCode("x".repeat(20))).toBe("");
    });
  });

  describe("validateCity", () => {
    const cities = ["La Paz", "Cochabamba"];

    it("debe aceptar una ciudad del catalogo", () => {
      expect(validateCity("La Paz", cities)).toBe("");
      expect(validateCity("  Cochabamba  ", cities)).toBe("");
    });

    it("debe tratar la ciudad como opcional", () => {
      expect(validateCity("", cities)).toBe("");
      expect(validateCity(undefined, cities)).toBe("");
    });

    it("debe rechazar una ciudad fuera del catalogo", () => {
      expect(validateCity("Madrid", cities)).toMatch(/de la lista/i);
    });

    it("no debe bloquear el alta cuando el catalogo no se pudo cargar", () => {
      expect(validateCity("Cualquier Ciudad", [])).toBe("");
      expect(validateCity("Cualquier Ciudad")).toBe("");
    });
  });

  describe("validatePrice", () => {
    it("debe aceptar precios validos, incluido cero", () => {
      expect(validatePrice("1200.50")).toBe("");
      expect(validatePrice(0)).toBe("");
    });

    it("debe exigir el campo", () => {
      expect(validatePrice("")).toMatch(/requerido/i);
      expect(validatePrice(null)).toMatch(/requerido/i);
      expect(validatePrice(undefined)).toMatch(/requerido/i);
    });

    it("debe rechazar texto y negativos", () => {
      expect(validatePrice("abc")).toMatch(/numero/i);
      expect(validatePrice("-1")).toMatch(/negativo/i);
    });
  });

  describe("validateStock", () => {
    it("debe aceptar enteros no negativos", () => {
      expect(validateStock("0")).toBe("");
      expect(validateStock("15")).toBe("");
    });

    it("debe exigir el campo", () => {
      expect(validateStock("")).toMatch(/requerido/i);
    });

    it("debe rechazar decimales en vez de truncarlos en silencio", () => {
      expect(validateStock("1.5")).toMatch(/entero/i);
    });

    it("debe rechazar texto y negativos", () => {
      expect(validateStock("abc")).toMatch(/numero/i);
      expect(validateStock("-3")).toMatch(/negativo/i);
    });
  });

  describe("firstInvalidField e isClean", () => {
    const order = ["name", "email", "phone"];

    it("debe devolver el primer campo con error segun el orden visual", () => {
      expect(firstInvalidField({ name: "", email: "falla", phone: "falla" }, order)).toBe("email");
    });

    it("debe devolver null cuando no hay errores", () => {
      expect(firstInvalidField({ name: "", email: "", phone: "" }, order)).toBeNull();
    });

    it("debe ignorar errores de campos que no estan en el orden", () => {
      expect(firstInvalidField({ otro: "falla" }, order)).toBeNull();
    });

    it("isClean debe reflejar si queda algun mensaje", () => {
      expect(isClean({ name: "", email: "" })).toBe(true);
      expect(isClean({ name: "", email: "falla" })).toBe(false);
      expect(isClean({})).toBe(true);
    });
  });
});
