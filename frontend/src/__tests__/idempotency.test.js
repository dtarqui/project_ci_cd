import { newIdempotencyKey } from "../utils/idempotency";

describe("newIdempotencyKey", () => {
  const original = globalThis.crypto;

  afterEach(() => {
    Object.defineProperty(globalThis, "crypto", { value: original, configurable: true });
  });

  test("usa crypto.randomUUID cuando existe", () => {
    Object.defineProperty(globalThis, "crypto", {
      value: { randomUUID: () => "11111111-2222-3333-4444-555555555555" },
      configurable: true,
    });
    expect(newIdempotencyKey()).toBe("11111111-2222-3333-4444-555555555555");
  });

  test("sin randomUUID genera una clave valida para el servidor", () => {
    Object.defineProperty(globalThis, "crypto", { value: undefined, configurable: true });
    const key = newIdempotencyKey();
    expect(key).toMatch(/^[A-Za-z0-9_-]{8,100}$/);
    expect(newIdempotencyKey()).not.toBe(key);
  });
});
