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

  it("reenvía a next() un throw síncrono dentro del handler", async () => {
    const error = new Error("sync throw");
    const handler = asyncHandler(() => {
      throw error;
    });

    const next = jest.fn();
    handler({}, {}, next);
    await flushPromises();

    expect(next).toHaveBeenCalledWith(error);
  });
});
