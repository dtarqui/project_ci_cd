import {
  PENDING_SALES_EVENT,
  currentUserId,
  enqueueSale,
  flushPendingSales,
  isNetworkError,
  pendingSales,
  startOfflineSync,
  syncPendingSales,
} from "../utils/offlineSales";

const memoryStorage = (initial = {}) => {
  const data = { ...initial };
  return {
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = String(value);
    },
    removeItem: (key) => {
      delete data[key];
    },
    data,
  };
};

const httpError = (status, error) => ({ response: { status, data: { error } } });
const networkError = () => ({ code: "ERR_NETWORK", message: "Network Error" });

describe("cola de ventas sin conexion", () => {
  it("guarda una venta por clave y por usuario", () => {
    const storage = memoryStorage();
    const now = () => new Date("2026-11-18T12:00:00Z");

    expect(enqueueSale({ userId: 1, sale: { total: 1 }, idempotencyKey: "k-1" }, storage, now)).toBe(1);
    // La misma clave no se guarda dos veces.
    expect(enqueueSale({ userId: 1, sale: { total: 1 }, idempotencyKey: "k-1" }, storage, now)).toBe(1);
    expect(enqueueSale({ userId: 2, sale: { total: 2 }, idempotencyKey: "k-2" }, storage, now)).toBe(1);

    expect(pendingSales(1, storage)).toEqual([
      { userId: 1, sale: { total: 1 }, idempotencyKey: "k-1", queuedAt: "2026-11-18T12:00:00.000Z" },
    ]);
  });

  it("tolera un almacenamiento danado", () => {
    expect(pendingSales(1, memoryStorage({ pendingSales: "{no es json" }))).toEqual([]);
    expect(pendingSales(1, memoryStorage({ pendingSales: '{"a":1}' }))).toEqual([]);
    expect(currentUserId(memoryStorage({ user: "{no es json" }))).toBeNull();
    expect(currentUserId(memoryStorage({ user: '{"id":7}' }))).toBe(7);
    expect(currentUserId(memoryStorage())).toBeNull();
  });

  it("distingue la falta de conexion de un error con respuesta", () => {
    expect(isNetworkError(networkError())).toBe(true);
    expect(isNetworkError({ code: "ECONNABORTED" })).toBe(true);
    expect(isNetworkError({ code: "ERR_NETWORK", response: { status: 500 } })).toBe(false);
    expect(isNetworkError(httpError(400, "x"))).toBe(false);
    expect(isNetworkError(new Error("otro"))).toBe(false);
    expect(isNetworkError(null)).toBe(false);
  });

  it("envia en orden, quita las enviadas y las rechazadas, y se detiene sin red", async () => {
    const storage = memoryStorage();
    ["a", "b", "c", "d"].forEach((key) =>
      enqueueSale({ userId: 1, sale: { key }, idempotencyKey: key }, storage)
    );
    enqueueSale({ userId: 2, sale: { key: "otro" }, idempotencyKey: "otro" }, storage);

    const send = jest
      .fn()
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(httpError(400, "Stock insuficiente"))
      .mockRejectedValueOnce(networkError());

    const result = await flushPendingSales({ userId: 1, send, storage });

    expect(send.mock.calls.map(([sale, key]) => [sale.key, key])).toEqual([
      ["a", "a"],
      ["b", "b"],
      ["c", "c"],
    ]);
    expect(result.sent.map((item) => item.idempotencyKey)).toEqual(["a"]);
    expect(result.rejected).toEqual([
      expect.objectContaining({ idempotencyKey: "b", error: "Stock insuficiente" }),
    ]);
    expect(result.remaining).toBe(2);
    expect(pendingSales(1, storage).map((item) => item.idempotencyKey)).toEqual(["c", "d"]);
    // La venta de otro usuario no se toca.
    expect(pendingSales(2, storage)).toHaveLength(1);
  });

  it.each([401, 408, 429, 500, 503])("conserva la venta ante un %i", async (status) => {
    const storage = memoryStorage();
    enqueueSale({ userId: 1, sale: {}, idempotencyKey: "k" }, storage);

    const result = await flushPendingSales({
      userId: 1,
      send: jest.fn().mockRejectedValue(httpError(status)),
      storage,
    });

    expect(result).toEqual({ sent: [], rejected: [], remaining: 1 });
  });

  it("un rechazo sin mensaje indica el codigo HTTP", async () => {
    const storage = memoryStorage();
    enqueueSale({ userId: 1, sale: {}, idempotencyKey: "k" }, storage);

    const result = await flushPendingSales({
      userId: 1,
      send: jest.fn().mockRejectedValue({ response: { status: 404 } }),
      storage,
    });

    expect(result.rejected[0].error).toBe("Rechazada (HTTP 404)");
    expect(storage.data.pendingSales).toBeUndefined();
  });
});

describe("sincronizacion", () => {
  it("envia las ventas del usuario actual y avisa con un evento", async () => {
    const storage = memoryStorage({ user: '{"id":1}' });
    enqueueSale({ userId: 1, sale: {}, idempotencyKey: "k" }, storage);
    const target = new EventTarget();
    const listener = jest.fn();
    target.addEventListener(PENDING_SALES_EVENT, listener);
    const send = jest.fn().mockResolvedValue({});

    // Dos llamadas seguidas comparten el mismo envio.
    const first = syncPendingSales({ send, storage, target });
    const second = syncPendingSales({ send, storage, target });
    expect(second).toBe(first);
    const result = await first;

    expect(send).toHaveBeenCalledTimes(1);
    expect(result.remaining).toBe(0);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].detail).toEqual(result);
  });

  it("no hace nada sin sesion o sin ventas pendientes", async () => {
    const send = jest.fn();
    await expect(syncPendingSales({ send, storage: memoryStorage() })).resolves.toBeNull();
    await expect(
      syncPendingSales({ send, storage: memoryStorage({ user: '{"id":1}' }) })
    ).resolves.toBeNull();
    expect(send).not.toHaveBeenCalled();
  });

  it("reintenta al iniciar y cada vez que vuelve la conexion", async () => {
    const storage = memoryStorage({ user: '{"id":1}' });
    const target = new EventTarget();
    const send = jest.fn().mockRejectedValue(networkError());
    enqueueSale({ userId: 1, sale: {}, idempotencyKey: "k" }, storage);

    const stop = startOfflineSync({ send, target, storage });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(send).toHaveBeenCalledTimes(1);

    send.mockResolvedValue({});
    target.dispatchEvent(new Event("online"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(send).toHaveBeenCalledTimes(2);
    expect(pendingSales(1, storage)).toEqual([]);

    stop();
    enqueueSale({ userId: 1, sale: {}, idempotencyKey: "k2" }, storage);
    target.dispatchEvent(new Event("online"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(send).toHaveBeenCalledTimes(2);
  });
});
