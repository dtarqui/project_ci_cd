import { formatCurrency, formatDate } from "../utils/format";

describe("formatCurrency", () => {
  it("debe formatear un número positivo como Bolivianos", () => {
    expect(formatCurrency(999.99)).toMatch(/Bs/);
    expect(formatCurrency(999.99)).toMatch(/999[,.]99/);
  });

  it("debe formatear cero", () => {
    expect(formatCurrency(0)).toMatch(/Bs/);
  });

  it("debe usar 0 cuando el valor es undefined", () => {
    expect(formatCurrency(undefined)).toBe(formatCurrency(0));
  });

  it("debe usar 0 cuando el valor es null", () => {
    expect(formatCurrency(null)).toBe(formatCurrency(0));
  });

  it("debe formatear números negativos", () => {
    expect(formatCurrency(-50)).toMatch(/50/);
  });
});

describe("formatDate", () => {
  it("debe formatear una fecha válida", () => {
    const result = formatDate("2026-02-04");
    expect(result).not.toBe("-");
    expect(typeof result).toBe("string");
  });

  it("debe retornar '-' cuando la fecha es inválida", () => {
    expect(formatDate("no-es-una-fecha")).toBe("-");
  });

  it("debe retornar '-' cuando la fecha es undefined", () => {
    expect(formatDate(undefined)).toBe("-");
  });

  it("debe tratar null como la época Unix (comportamiento nativo de Date)", () => {
    expect(formatDate(null)).not.toBe("-");
    expect(typeof formatDate(null)).toBe("string");
  });
});
