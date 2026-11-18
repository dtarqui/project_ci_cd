/**
 * Cola de ventas sin conexion (offline-first).
 *
 * Si al registrar una venta no hay red, la venta se guarda en este dispositivo
 * junto con su clave de idempotencia y se envia cuando vuelve la conexion. La
 * clave viaja en cada intento: si la primera peticion si llego al servidor y
 * solo se perdio la respuesta, el reenvio devuelve la venta ya registrada en vez
 * de duplicarla (cabecera Idempotency-Key del backend).
 *
 * La cola es de cada usuario: la venta se registra a nombre de quien la hizo, y
 * otra persona que inicie sesion en el mismo navegador no la envia.
 */

const STORAGE_KEY = "pendingSales";
export const PENDING_SALES_EVENT = "pending-sales-changed";

const defaultStorage = () => (typeof window !== "undefined" ? window.localStorage : null);

const readAll = (storage) => {
  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeAll = (storage, items) => {
  if (items.length === 0) {
    storage.removeItem(STORAGE_KEY);
  } else {
    storage.setItem(STORAGE_KEY, JSON.stringify(items));
  }
};

const removeByKey = (storage, idempotencyKey) => {
  writeAll(
    storage,
    readAll(storage).filter((item) => item.idempotencyKey !== idempotencyKey)
  );
};

/** Id del usuario con sesion iniciada en este navegador, o null. */
export const currentUserId = (storage = defaultStorage()) => {
  try {
    return JSON.parse(storage.getItem("user") || "null")?.id ?? null;
  } catch {
    return null;
  }
};

/**
 * True si la peticion no llego a tener respuesta: sin red, corte o tiempo
 * agotado. Un error con respuesta (400, 409, 500...) no es falta de conexion.
 */
export const isNetworkError = (error) =>
  Boolean(error) &&
  !error.response &&
  ["ERR_NETWORK", "ECONNABORTED", "ETIMEDOUT"].includes(error.code);

/** Ventas pendientes del usuario, en el orden en que se hicieron. */
export const pendingSales = (userId, storage = defaultStorage()) =>
  readAll(storage).filter((item) => item.userId === userId);

/**
 * Guarda una venta para enviarla despues. Una misma clave se guarda una sola vez.
 * @returns {number} ventas pendientes del usuario
 */
export const enqueueSale = (
  { userId, sale, idempotencyKey },
  storage = defaultStorage(),
  now = () => new Date()
) => {
  const items = readAll(storage);
  if (!items.some((item) => item.idempotencyKey === idempotencyKey)) {
    items.push({ userId, sale, idempotencyKey, queuedAt: now().toISOString() });
    writeAll(storage, items);
  }
  return pendingSales(userId, storage).length;
};

/**
 * Envia, en orden, las ventas pendientes del usuario.
 * - Respuesta 2xx: enviada, o ya registrada con la misma clave. Sale de la cola.
 * - 4xx definitivo (sin stock, cliente borrado...): rechazada. Sale de la cola y
 *   se informa al usuario.
 * - Sin red, 5xx, 401, 408 o 429: se detiene y la venta queda para despues.
 * @param {{userId: number, send: (sale: Object, key: string) => Promise}} options
 * @returns {Promise<{sent: Array, rejected: Array, remaining: number}>}
 */
export const flushPendingSales = async ({ userId, send, storage = defaultStorage() }) => {
  const result = { sent: [], rejected: [], remaining: 0 };

  for (const item of pendingSales(userId, storage)) {
    try {
      await send(item.sale, item.idempotencyKey);
      result.sent.push(item);
      removeByKey(storage, item.idempotencyKey);
    } catch (error) {
      const status = error?.response?.status;
      const definitivo =
        status >= 400 && status < 500 && ![401, 408, 429].includes(status);
      if (!definitivo) {
        break;
      }
      result.rejected.push({
        ...item,
        error: error.response?.data?.error || `Rechazada (HTTP ${status})`,
      });
      removeByKey(storage, item.idempotencyKey);
    }
  }

  result.remaining = pendingSales(userId, storage).length;
  return result;
};

let inFlight = null;

/**
 * Envia las ventas pendientes del usuario actual y avisa a la interfaz con el
 * evento PENDING_SALES_EVENT. Si ya hay un envio en curso, no inicia otro.
 */
export const syncPendingSales = ({
  send,
  storage = defaultStorage(),
  target = typeof window !== "undefined" ? window : null,
}) => {
  if (inFlight) {
    return inFlight;
  }

  const userId = currentUserId(storage);
  if (userId === null || pendingSales(userId, storage).length === 0) {
    return Promise.resolve(null);
  }

  inFlight = flushPendingSales({ userId, send, storage })
    .then((result) => {
      target?.dispatchEvent(new CustomEvent(PENDING_SALES_EVENT, { detail: result }));
      return result;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
};

/**
 * Reintenta el envio cada vez que el navegador recupera la conexion, y una vez
 * al iniciar. Devuelve la funcion que deja de escuchar.
 */
export const startOfflineSync = ({ send, target = window, storage = defaultStorage() }) => {
  const handler = () => {
    syncPendingSales({ send, storage, target }).catch(() => {});
  };
  target.addEventListener("online", handler);
  handler();
  return () => target.removeEventListener("online", handler);
};
