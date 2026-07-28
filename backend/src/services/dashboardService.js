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

const buildTopProducts = (sales) => {
  const topBase = buildProductSales(sales)
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

const buildBranchSales = (sales, customers) => {
  const branchMap = new Map();

  for (const sale of sales) {
    const customer = customers.find((c) => c.id === sale.customerId);
    const cityName = (customer?.city || "General").trim();
    const branchName = cityName.toLowerCase().startsWith("sucursal")
      ? cityName
      : `Sucursal ${cityName}`;

    const current = branchMap.get(branchName) || {
      name: branchName,
      revenue: 0,
      value: 0,
    };

    current.revenue = parseFloat((current.revenue + sale.total).toFixed(2));
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

const buildCategoryDistribution = (sales, products) => {
  const categoryMap = new Map();

  for (const sale of sales) {
    for (const item of sale.items) {
      const product = products.find((p) => p.id === item.productId);
      const categoryName = product?.category || "Otros";
      const current = categoryMap.get(categoryName) || {
        name: categoryName,
        items: 0,
        value: 0,
      };

      current.items += item.quantity;
      categoryMap.set(categoryName, current);
    }
  }

  const categories = [...categoryMap.values()].sort((a, b) => b.items - a.items);
  const totalItems = categories.reduce((sum, category) => sum + category.items, 0);

  return categories.map((category) => ({
    ...category,
    value: totalItems > 0 ? Math.round((category.items / totalItems) * 100) : 0,
  }));
};

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

module.exports = {
  WEEKDAY_LABELS,
  MONTH_LABELS,
  formatMoneyShort,
  toDateKey,
  buildDailyTrend,
  buildMonthlyTrend,
  buildProductSales,
  buildTopProducts,
  buildBranchSales,
  buildCategoryDistribution,
  buildCustomerSegments,
  buildDynamicDashboardData,
};
