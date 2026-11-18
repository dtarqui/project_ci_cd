/**
 * Sales Controller - Lógica de ventas
 */

const { validateSaleCreate, validateSaleUpdate } = require("../utils/validators");
const { createSaleRepository } = require("../repositories/saleRepository");
const { sendSuccess, sendError } = require("../utils/httpResponses");
const { buildSaleFromRequest, cancelSaleById } = require("../services/salesService");
const { runInTransaction } = require("../repositories/unitOfWork");
const { isUniqueViolationError } = require("../db/prismaClient");
const { logEvent } = require("../utils/logger");
const { parsePagination } = require("../utils/queryHelpers");
const { filterSortSales } = require("../utils/listQueries");

const saleRepository = createSaleRepository();

/**
 * Obtiene lista de ventas con filtros
 */
const getSales = async (req, res) => {
  const { status = "", customerId = "", search = "" } = req.query;
  const query = { status, customerId, search };

  // Con `page`, se pagina en el repositorio; sin el, lista completa filtrada
  // (la usan los indicadores de la seccion de ventas).
  const pagination = parsePagination(req.query);
  let result;
  if (pagination) {
    result = await saleRepository.listPage(query, pagination);
  } else {
    const sales = filterSortSales(await saleRepository.list(), query);
    result = { data: sales, total: sales.length };
  }

  sendSuccess(res, {
    data: result.data,
    count: result.total,
    ...(pagination
      ? { page: result.page, pageSize: result.pageSize, totalPages: result.totalPages }
      : {}),
    timestamp: new Date().toISOString(),
  });
};

/**
 * Obtiene una venta específica por ID
 */
const getSale = async (req, res) => {
  const saleId = parseInt(req.params.id, 10);
  const sale = await saleRepository.findById(saleId);

  if (!sale) {
    return sendError(res, 404, {
      error: "Venta no encontrada",
      code: "SALE_NOT_FOUND",
    });
  }

  sendSuccess(res, { data: sale, timestamp: new Date().toISOString() });
};

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{8,100}$/;

/**
 * Responde con la venta ya registrada bajo la clave, si existe. Una clave usada
 * por otro usuario se rechaza, para no revelar sus ventas.
 * @returns la respuesta enviada, o null si la clave no se habia usado.
 */
const replayIdempotentSale = async (req, res, idempotencyKey) => {
  const previous = await saleRepository.findByIdempotencyKey(idempotencyKey);

  if (!previous) {
    return null;
  }

  if (previous.userId != null && req.user?.id != null && previous.userId !== req.user.id) {
    return sendError(res, 409, {
      error: "La clave de idempotencia ya se uso en otra venta",
      code: "IDEMPOTENCY_KEY_CONFLICT",
    });
  }

  logEvent("info", "sale.idempotent_replay", { saleId: previous.id, userId: req.user?.id });

  return sendSuccess(res, {
    data: previous,
    message: "Venta ya registrada",
    idempotentReplay: true,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Crea una nueva venta
 */
const createSale = async (req, res) => {
  const validation = validateSaleCreate(req.body);

  if (!validation.isValid) {
    return sendError(res, 400, {
      error: validation.error,
      code: validation.code,
    });
  }

  const idempotencyKey = req.get("Idempotency-Key");

  if (idempotencyKey !== undefined && !IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
    return sendError(res, 400, {
      error: "Idempotency-Key debe tener entre 8 y 100 caracteres alfanumericos, guiones o guiones bajos",
      code: "INVALID_IDEMPOTENCY_KEY",
    });
  }

  // Un reintento con la misma clave (por ejemplo, tras perder la respuesta por
  // un corte de red) devuelve la venta ya registrada en lugar de duplicarla.
  if (idempotencyKey) {
    const replay = await replayIdempotentSale(req, res, idempotencyKey);
    if (replay) return replay;
  }

  let result;
  try {
    // Reserva de stock, venta y estadisticas del cliente en una sola transaccion.
    result = await runInTransaction((repos) =>
      buildSaleFromRequest(req.body, {
        ...repos,
        user: req.user,
        idempotencyKey: idempotencyKey || null,
      })
    );
  } catch (error) {
    // Dos peticiones simultaneas con la misma clave: la restriccion UNIQUE deja
    // pasar solo una; la otra responde con la venta que gano.
    if (idempotencyKey && isUniqueViolationError(error)) {
      const replay = await replayIdempotentSale(req, res, idempotencyKey);
      if (replay) return replay;
    }
    throw error;
  }

  if (result.error) {
    return sendError(res, result.status, {
      error: result.error,
      code: result.code,
      ...(result.data ? { data: result.data } : {}),
    });
  }

  sendSuccess(
    res,
    {
      data: result.sale,
      message: "Venta registrada exitosamente",
      timestamp: result.timestamp,
    },
    201
  );
};

/**
 * Actualiza una venta existente
 */
const updateSale = async (req, res) => {
  const saleId = parseInt(req.params.id, 10);
  const sale = await saleRepository.findById(saleId);

  if (!sale) {
    return sendError(res, 404, {
      error: "Venta no encontrada",
      code: "SALE_NOT_FOUND",
    });
  }

  const validation = validateSaleUpdate(req.body);

  if (!validation.isValid) {
    return sendError(res, 400, {
      error: validation.error,
      code: validation.code,
    });
  }

  // Anular por PUT es la misma operacion que el DELETE y tiene que devolver el
  // stock igual; de lo contrario quedaba una segunda puerta que solo cambiaba el
  // estado y dejaba el inventario descuadrado.
  if (req.body.status && req.body.status.toLowerCase() === "anulada") {
    const result = await runInTransaction((repos) => cancelSaleById(saleId, repos));

    if (result.error) {
      return sendError(res, result.status, {
        error: result.error,
        code: result.code,
      });
    }

    return sendSuccess(res, {
      data: result.sale,
      message: "Venta anulada exitosamente",
      timestamp: result.sale.updatedAt,
    });
  }

  const updatedSale = await saleRepository.update(saleId, req.body);

  sendSuccess(res, {
    data: updatedSale,
    message: "Venta actualizada exitosamente",
    timestamp: updatedSale.updatedAt,
  });
};

/**
 * Anula una venta
 */
const cancelSale = async (req, res) => {
  const saleId = parseInt(req.params.id, 10);

  const result = await runInTransaction((repos) => cancelSaleById(saleId, repos));

  if (result.error) {
    return sendError(res, result.status, {
      error: result.error,
      code: result.code,
    });
  }

  sendSuccess(res, {
    data: result.sale,
    message: "Venta anulada exitosamente",
    timestamp: result.sale.updatedAt,
  });
};

module.exports = {
  getSales,
  getSale,
  createSale,
  updateSale,
  cancelSale,
};
