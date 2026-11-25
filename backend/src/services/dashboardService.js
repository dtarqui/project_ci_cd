/**
 * Dashboard Service
 * Lógica pura de agregación/composición de métricas del dashboard,
 * separada del adaptador HTTP (dashboardController.js).
 */

const {
  CUSTOMER_SEGMENT_THRESHOLDS,
  MONEY_FORMAT_THRESHOLDS,
  DASHBOARD_SLICE_SIZES,
  TOP_PRODUCTS_TREND_FUDGE,
} = require("../config/constants");

const WEEKDAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const formatMoneyShort = (value) => {
  const abs = Math.abs(value);

  if (abs >= MONEY_FORMAT_THRESHOLDS.MILLION) {
    return `${(value / MONEY_FORMAT_THRESHOLDS.MILLION).toFixed(1)}M Bs.`;
  }

  if (abs >= MONEY_FORMAT_THRESHOLDS.THOUSAND) {
    return `${(value / MONEY_FORMAT_THRESHOLDS.THOUSAND).toFixed(1)}K Bs.`;
  }

  return `${value.toFixed(2)} Bs.`;
};

const toDateKey = (date) => new Date(date).toISOString().split("T")[0];

const buildDailyTrend = (sales) => {
  const dayMap = new Map();

  for (const sale of sales) {
    const date = new Date(sale.createdAt);
    const key = toDateKey(date);
    const current = dayMap.get(key) || {
      day: WEEKDAY_LABELS[date.getDay()],
      sales: 0,
      revenue: 0,
      orders: 0,
      _date: key,
    };

    current.sales += sale.items.reduce((sum, item) => sum + item.quantity, 0);
    current.revenue = parseFloat((current.revenue + sale.total).toFixed(2));
    current.orders += 1;
    dayMap.set(key, current);
  }

  return [...dayMap.values()]
    .sort((a, b) => new Date(a._date) - new Date(b._date))
    .slice(-DASHBOARD_SLICE_SIZES.DAILY_TREND)
    .map(({ _date, ...safeDay }) => safeDay);
};

const buildMonthlyTrend = (sales) => {
  const monthMap = new Map();

  for (const sale of sales) {
    const date = new Date(sale.createdAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const current = monthMap.get(key) || {
      month: MONTH_LABELS[date.getMonth()],
      sales: 0,
      revenue: 0,
      _date: `${key}-01`,
    };

    current.sales += sale.items.reduce((sum, item) => sum + item.quantity, 0);
    current.revenue = parseFloat((current.revenue + sale.total).toFixed(2));
    monthMap.set(key, current);
  }

  return [...monthMap.values()]
    .sort((a, b) => new Date(a._date) - new Date(b._date))
    .slice(-DASHBOARD_SLICE_SIZES.MONTHLY_TREND)
    .map(({ _date, ...safeMonth }) => safeMonth);
};

const buildProductSales = (sales) => {
  const productMap = new Map();

  for (const sale of sales) {
    for (const item of sale.items) {
      const key = item.productId;
      const current = productMap.get(key) || {
        product: item.name,
        quantity: 0,
        revenue: 0,
      };

      current.quantity += item.quantity;
      current.revenue = parseFloat((current.revenue + item.total).toFixed(2));
      productMap.set(key, current);
    }
  }

  return [...productMap.values()]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, DASHBOARD_SLICE_SIZES.PRODUCT_SALES);
};

/**
 * Los productos mas vendidos por ingreso, a partir de la lista de productSales
 * (los mas vendidos por cantidad). La usan el modo en memoria y la base.
 */
const topProductsFrom = (productSales) => {
  const topBase = [...productSales]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, DASHBOARD_SLICE_SIZES.TOP_PRODUCTS);

  if (topBase.length === 0) {
    return [];
  }

  const bestRevenue = topBase[0].revenue || 1;

  return topBase.map((item) => {
    const deltaPercent =
      Math.round((item.revenue / bestRevenue) * 100) + TOP_PRODUCTS_TREND_FUDGE;
    const trendPrefix = deltaPercent >= 0 ? "+" : "";

    return {
      name: item.product,
      sales: item.quantity,
      revenue: item.revenue,
      trend: `${trendPrefix}${deltaPercent}%`,
    };
  });
};

const buildTopProducts = (sales) => topProductsFrom(buildProductSales(sales));

const branchNameOf = (city) => {
  const cityName = (city || "General").trim();
  return cityName.toLowerCase().startsWith("sucursal") ? cityName : `Sucursal ${cityName}`;
};

/**
 * Ventas por sucursal a partir de filas { city, revenue }, en el orden en que
 * aparecio cada ciudad. Dos ciudades con el mismo nombre de sucursal se suman.
 */
const branchSalesFromRows = (rows) => {
  const branchMap = new Map();

  for (const row of rows) {
    const branchName = branchNameOf(row.city);
    const current = branchMap.get(branchName) || {
      name: branchName,
      revenue: 0,
      value: 0,
    };

    current.revenue = parseFloat((current.revenue + row.revenue).toFixed(2));
    branchMap.set(branchName, current);
  }

  const branches = [...branchMap.values()].sort((a, b) => b.revenue - a.revenue);
  const totalRevenue = branches.reduce((sum, branch) => sum + branch.revenue, 0);

  return branches.map((branch) => ({
    ...branch,
    value:
      totalRevenue > 0
        ? Math.round((branch.revenue / totalRevenue) * 100)
        : 0,
  }));
};

const buildBranchSales = (sales, customers) =>
  branchSalesFromRows(
    sales.map((sale) => ({
      city: customers.find((c) => c.id === sale.customerId)?.city,
      revenue: sale.total,
    }))
  );

/** Distribucion por categoria a partir de filas { name, items }. */
const categoryDistributionFromRows = (rows) => {
  const categoryMap = new Map();

  for (const row of rows) {
    const categoryName = row.name || "Otros";
    const current = categoryMap.get(categoryName) || {
      name: categoryName,
      items: 0,
      value: 0,
    };

    current.items += row.items;
    categoryMap.set(categoryName, current);
  }

  const categories = [...categoryMap.values()].sort((a, b) => b.items - a.items);
  const totalItems = categories.reduce((sum, category) => sum + category.items, 0);

  return categories.map((category) => ({
    ...category,
    value: totalItems > 0 ? Math.round((category.items / totalItems) * 100) : 0,
  }));
};

const buildCategoryDistribution = (sales, products) =>
  categoryDistributionFromRows(
    sales.flatMap((sale) =>
      sale.items.map((item) => ({
        name: products.find((p) => p.id === item.productId)?.category,
        items: item.quantity,
      }))
    )
  );

const buildCustomerSegments = (customers) => {
  const segments = [
    { segment: "VIP", predicate: (c) => c.totalSpent >= CUSTOMER_SEGMENT_THRESHOLDS.VIP },
    {
      segment: "Frecuente",
      predicate: (c) =>
        c.totalSpent >= CUSTOMER_SEGMENT_THRESHOLDS.FRECUENTE &&
        c.totalSpent < CUSTOMER_SEGMENT_THRESHOLDS.VIP,
    },
    {
      segment: "Regular",
      predicate: (c) =>
        c.totalSpent >= CUSTOMER_SEGMENT_THRESHOLDS.REGULAR &&
        c.totalSpent < CUSTOMER_SEGMENT_THRESHOLDS.FRECUENTE,
    },
    { segment: "Nuevo", predicate: (c) => c.totalSpent < CUSTOMER_SEGMENT_THRESHOLDS.REGULAR },
  ];

  return segments.map(({ segment, predicate }) => {
    const group = customers.filter(predicate);
    const revenue = group.reduce((sum, customer) => sum + (customer.totalSpent || 0), 0);

    return {
      segment,
      count: group.length,
      revenue: parseFloat(revenue.toFixed(2)),
    };
  });
};

const buildDynamicDashboardData = ({ products, customers, sales }) => {
  const validSales = sales.filter((sale) => sale.status?.toLowerCase() !== "anulada");
  const completedSales = sales.filter((sale) => sale.status?.toLowerCase() === "completada");

  const todayKey = toDateKey(new Date());
  const todaySalesTotal = validSales
    .filter((sale) => toDateKey(sale.createdAt) === todayKey)
    .reduce((sum, sale) => sum + sale.total, 0);

  const totalOrders = validSales.length;
  const activeCustomers = customers.filter(
    (customer) => (customer.status || "").toLowerCase() === "activo"
  ).length;
  const averageTicket = totalOrders > 0
    ? (validSales.reduce((sum, sale) => sum + sale.total, 0) / totalOrders).toFixed(2)
    : "0.00";

  return {
    dailySales: formatMoneyShort(todaySalesTotal),
    totalOrders,
    activeCustomers,
    averageTicket,
    branchSales: buildBranchSales(validSales, customers),
    salesTrend: buildDailyTrend(validSales),
    productSales: buildProductSales(validSales),
    monthlySales: buildMonthlyTrend(validSales),
    categoryDistribution: buildCategoryDistribution(validSales, products),
    customerSegments: buildCustomerSegments(customers),
    topProducts: buildTopProducts(completedSales),
  };
};

/**
 * Compone el tablero a partir de los agregados que calcula la base de datos
 * (DatabaseDashboardRepository.getAggregates). Devuelve la misma forma que
 * buildDynamicDashboardData, que el modo en memoria sigue usando.
 */
const round2 = (value) => parseFloat((value || 0).toFixed(2));

/** Los mas vendidos de las filas por producto: mayor cantidad y, a igualdad, el que aparecio antes. */
const topByQuantity = (rows, quantityKey, firstKey, nameKey, revenueKey) =>
  rows
    .filter((row) => row[quantityKey] > 0)
    .sort((a, b) => b[quantityKey] - a[quantityKey] || a[firstKey] - b[firstKey])
    .slice(0, DASHBOARD_SLICE_SIZES.PRODUCT_SALES)
    .map((row) => ({ product: row[nameKey], quantity: row[quantityKey], revenue: round2(row[revenueKey]) }));

/**
 * Compone el tablero a partir de los agregados que calcula la base de datos
 * (DatabaseDashboardRepository.getAggregates): ventas validas por dia
 * ({ dia, orders, revenue }) y por ciudad ({ city, revenue, primera }), lineas
 * por dia ({ dia, quantity }) y por producto, y los totales de clientes.
 * Devuelve la misma forma que buildDynamicDashboardData, que el modo en memoria
 * sigue usando. Los dias son fechas UTC con formato AAAA-MM-DD.
 */
const buildDashboardFromAggregates = ({
  todayKey,
  salesByDay,
  salesByCity,
  itemsByDay,
  itemsByProduct,
  customers,
}) => {
  const unitsByDay = new Map(itemsByDay.map((row) => [row.dia, row.quantity || 0]));
  const days = [...salesByDay].sort((a, b) => a.dia.localeCompare(b.dia));
  const totalOrders = days.reduce((sum, day) => sum + day.orders, 0);
  const validRevenue = days.reduce((sum, day) => sum + day.revenue, 0);
  const todayTotal = days.find((day) => day.dia === todayKey)?.revenue || 0;

  const months = new Map();
  for (const day of days) {
    const key = day.dia.slice(0, 7);
    const month = months.get(key) || { key, sales: 0, revenue: 0 };
    month.sales += unitsByDay.get(day.dia) || 0;
    month.revenue += day.revenue;
    months.set(key, month);
  }

  const products = [...itemsByProduct].sort((a, b) => (a.primera ?? Infinity) - (b.primera ?? Infinity));

  return {
    dailySales: formatMoneyShort(todayTotal),
    totalOrders,
    activeCustomers: customers.activeCustomers,
    averageTicket: totalOrders > 0 ? (validRevenue / totalOrders).toFixed(2) : "0.00",
    branchSales: branchSalesFromRows(
      [...salesByCity]
        .sort((a, b) => a.primera - b.primera)
        .map(({ city, revenue }) => ({ city, revenue: round2(revenue) }))
    ),
    salesTrend: days.slice(-DASHBOARD_SLICE_SIZES.DAILY_TREND).map((day) => ({
      day: WEEKDAY_LABELS[new Date(`${day.dia}T00:00:00Z`).getUTCDay()],
      sales: unitsByDay.get(day.dia) || 0,
      revenue: round2(day.revenue),
      orders: day.orders,
    })),
    productSales: topByQuantity(itemsByProduct, "quantity", "primera", "name", "revenue"),
    monthlySales: [...months.values()].slice(-DASHBOARD_SLICE_SIZES.MONTHLY_TREND).map((month) => ({
      month: MONTH_LABELS[Number(month.key.slice(5, 7)) - 1],
      sales: month.sales,
      revenue: round2(month.revenue),
    })),
    categoryDistribution: categoryDistributionFromRows(
      products.filter((row) => row.quantity > 0).map((row) => ({ name: row.category, items: row.quantity }))
    ),
    customerSegments: customers.segments.map(({ segment, count, revenue }) => ({
      segment,
      count,
      revenue: round2(revenue),
    })),
    topProducts: topProductsFrom(
      topByQuantity(itemsByProduct, "quantityCompletada", "primeraCompletada", "nameCompletada", "revenueCompletada")
    ),
  };
};

module.exports = {
  WEEKDAY_LABELS,
  MONTH_LABELS,
  formatMoneyShort,
  toDateKey,
  buildDailyTrend,
  buildMonthlyTrend,
  buildProductSales,
  buildTopProducts,
  topProductsFrom,
  buildBranchSales,
  branchSalesFromRows,
  buildCategoryDistribution,
  categoryDistributionFromRows,
  buildCustomerSegments,
  buildDynamicDashboardData,
  buildDashboardFromAggregates,
};
