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

module.exports = { applySort };
