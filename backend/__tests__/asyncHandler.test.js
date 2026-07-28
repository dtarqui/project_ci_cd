const { asyncHandler } = require("../src/utils/asyncHandler");

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe("asyncHandler", () => {
  it("reenvía a next() el error de una promesa rechazada", async () => {
    const error = new Error("boom");
    const handler = asyncHandler(async () => {
      throw error;
    });

    const next = jest.fn();
    handler({}, {}, next);
    await flushPromises();

    expect(next).toHaveBeenCalledWith(error);
  });

  it("no llama a next() cuando el handler async resuelve exitosamente", async () => {
    const handler = asyncHandler(async (req, res) => {
      res.json({ ok: true });
    });

    const res = { json: jest.fn() };
    const next = jest.fn();

    handler({}, res, next);
    await flushPromises();

    expect(res.json).toHaveBeenCalledWith({ ok: true });
    expect(next).not.toHaveBeenCalled();
  });

  it("un throw síncrono en un handler no-async se propaga de inmediato (no pasa por next)", () => {
    // asyncHandler solo intercepta rechazos de promesa (fn async o que retorna
    // una promesa); un throw síncrono ocurre antes de que exista promesa que
    // envolver, así que se propaga tal cual al llamador.
    const error = new Error("sync throw");
    const handler = asyncHandler(() => {
      throw error;
    });

    expect(() => handler({}, {}, jest.fn())).toThrow(error);
  });
});
