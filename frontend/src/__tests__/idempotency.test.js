import { newIdempotencyKey } from "../utils/idempotency";

describe("newIdempotencyKey", () => {
  test("usa crypto.randomUUID cuando existe", () => {
    const cryptoImpl = { randomUUID: () => "11111111-2222-3333-4444-555555555555" };
    expect(newIdempotencyKey(cryptoImpl)).toBe("11111111-2222-3333-4444-555555555555");
  });

  test("sin randomUUID genera una clave valida para el servidor", () => {
    const key = newIdempotencyKey({});
    expect(key).toMatch(/^[A-Za-z0-9_-]{8,100}$/);
    expect(newIdempotencyKey(undefined)).toMatch(/^[A-Za-z0-9_-]{8,100}$/);
  });

  test("sin argumentos usa el crypto del entorno o la alternativa", () => {
    expect(newIdempotencyKey()).toMatch(/^[A-Za-z0-9_-]{8,100}$/);
  });
});
