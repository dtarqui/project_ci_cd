/**
 * List Queries
 *
 * Filtros y órdenes de los listados de productos, clientes y ventas, en sus dos
 * formas:
 * - `filterSort*`: sobre una lista en memoria (modo memoria y respuestas sin
 *   paginar, que el frontend usa para los selectores y los indicadores);
 * - `*Query`: el `where` y el `orderBy` equivalentes para Prisma, que permiten
 *   paginar en la base de datos en lugar de leer la tabla completa.
 *
 * Ambas formas viven juntas para que no se separen.
 */

const { filterByText } = require("./helpers");
const { applySort } = require("./queryHelpers");

const insensitiveContains = (value) => ({ contains: value, mode: "insensitive" });

// ---------------------------------------------------------------- Productos

const PRODUCT_SORTS = {
  price: (a, b) => a.price - b.price,
  stock: (a, b) => b.stock - a.stock,
  sales: (a, b) => b.sales - a.sales,
  default: (a, b) => a.name.localeCompare(b.name),
};

const PRODUCT_ORDER_BY = {
  price: { price: "asc" },
  stock: { stock: "desc" },
  sales: { sales: "desc" },
  default: { name: "asc" },
};

const filterSortProducts = (items, { search = "", category = "", sort = "name" } = {}) => {
  let products = filterByText(items, ["name"], search);
  products = filterByText(products, ["category"], category);
  return applySort(products, PRODUCT_SORTS, sort);
};

const productQuery = ({ search = "", category = "", sort = "name" } = {}) => ({
  where: {
    deletedAt: null,
    ...(search ? { name: insensitiveContains(search) } : {}),
    ...(category ? { category: insensitiveContains(category) } : {}),
  },
  orderBy: [PRODUCT_ORDER_BY[sort] || PRODUCT_ORDER_BY.default, { id: "asc" }],
});

// ----------------------------------------------------------------- Clientes

const CUSTOMER_SORTS = {
  email: (a, b) => a.email.localeCompare(b.email),
  spending: (a, b) => b.totalSpent - a.totalSpent,
  purchases: (a, b) => b.purchases - a.purchases,
  registered: (a, b) => new Date(b.registeredDate) - new Date(a.registeredDate),
  default: (a, b) => a.name.localeCompare(b.name),
};

const CUSTOMER_ORDER_BY = {
  email: { email: "asc" },
  spending: { totalSpent: "desc" },
  purchases: { purchases: "desc" },
  // registeredDate es texto AAAA-MM-DD: el orden alfabético coincide con el de fechas.
  registered: { registeredDate: "desc" },
  default: { name: "asc" },
};

const filterSortCustomers = (items, { search = "", status = "", sort = "name" } = {}) => {
  let customers = filterByText(items, ["name", "email", "phone"], search);

  // Estado: coincidencia exacta, no parcial.
  if (status) {
    customers = customers.filter((c) => c.status.toLowerCase() === status.toLowerCase());
  }

  return applySort(customers, CUSTOMER_SORTS, sort);
};

const customerQuery = ({ search = "", status = "", sort = "name" } = {}) => ({
  where: {
    deletedAt: null,
    ...(search
      ? {
          OR: [
            { name: insensitiveContains(search) },
            { email: insensitiveContains(search) },
            { phone: insensitiveContains(search) },
          ],
        }
      : {}),
    ...(status ? { status: { equals: status, mode: "insensitive" } } : {}),
  },
  orderBy: [CUSTOMER_ORDER_BY[sort] || CUSTOMER_ORDER_BY.default, { id: "asc" }],
});

// ------------------------------------------------------------------- Ventas

const parseCustomerId = (customerId) => {
  const parsed = parseInt(customerId, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const filterSortSales = (items, { status = "", customerId = "", search = "" } = {}) => {
  let sales = items;

  if (status) {
    sales = sales.filter((sale) => sale.status.toLowerCase() === status.toLowerCase());
  }

  if (search) {
    const term = search.toLowerCase();
    sales = sales.filter(
      (sale) => sale.customerName.toLowerCase().includes(term) || String(sale.id).includes(term)
    );
  }

  const parsedCustomerId = customerId ? parseCustomerId(customerId) : null;
  if (parsedCustomerId !== null) {
    sales = sales.filter((sale) => sale.customerId === parsedCustomerId);
  }

  // Ordenes recientes primero (no hay parametro `sort` para ventas).
  return [...sales].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

/**
 * En la base de datos, la búsqueda por número de venta es exacta: un término
 * numérico encuentra la venta con ese id (en memoria basta con que el id lo
 * contenga). La búsqueda por nombre del cliente es igual en ambos modos.
 */
const saleQuery = ({ status = "", customerId = "", search = "" } = {}) => {
  const parsedCustomerId = customerId ? parseCustomerId(customerId) : null;
  const numericSearch = /^\d+$/.test(search) ? parseInt(search, 10) : null;

  return {
    where: {
      ...(status ? { status: { equals: status, mode: "insensitive" } } : {}),
      ...(parsedCustomerId !== null ? { customerId: parsedCustomerId } : {}),
      ...(search
        ? {
            OR: [
              { customerName: insensitiveContains(search) },
              ...(numericSearch !== null ? [{ id: numericSearch }] : []),
            ],
          }
        : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  };
};

module.exports = {
  PRODUCT_SORTS,
  CUSTOMER_SORTS,
  filterSortProducts,
  filterSortCustomers,
  filterSortSales,
  productQuery,
  customerQuery,
  saleQuery,
};
