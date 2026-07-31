/**
 * Query Helpers
 * `applySort` reemplaza el patrón `switch (sort) { ... }.sort()` repetido en
 * customerController y productController: cada caller pasa su propio mapa de
 * comparadores por clave de orden, y este helper aplica el que corresponda
 * (o `sortMap.default` si la clave no existe).
 */

const applySort = (items, sortMap, sortKey) => {
  const comparator = sortMap[sortKey] || sortMap.default;
  return items.sort(comparator);
};

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

/**
 * Paginación opt-in: si el caller no manda `page` en la query, devuelve
 * `null` y el controller sigue respondiendo la lista completa como siempre
 * (mantiene compatibilidad con clientes/tests existentes que no paginan).
 * @param {Object} query - req.query
 * @returns {{page: number, pageSize: number}|null}
 */
const parsePagination = (query) => {
  if (query.page === undefined) {
    return null;
  }

  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const pageSize = Math.min(
    Math.max(parseInt(query.pageSize, 10) || DEFAULT_PAGE_SIZE, 1),
    MAX_PAGE_SIZE
  );

  return { page, pageSize };
};

/**
 * Recorta `items` (ya filtrados/ordenados) a la página pedida.
 * @param {Array} items
 * @param {{page: number, pageSize: number}} pagination
 * @returns {{data: Array, page: number, pageSize: number, total: number, totalPages: number}}
 */
const paginate = (items, { page, pageSize }) => {
  const total = items.length;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    data: items.slice(start, start + pageSize),
    page: safePage,
    pageSize,
    total,
    totalPages,
  };
};

module.exports = { applySort, parsePagination, paginate };
