/**
 * Dashboard Repository
 * Entrega los datos base para composición de métricas del dashboard.
 */

const { getMockData } = require("../db/dataStore");

class InMemoryDashboardRepository {
  async getSourceData() {
    const data = getMockData();

    return {
      products: [...(data.products || [])],
      customers: [...(data.customers || [])],
      sales: [...(data.sales || [])],
      baseDashboard: {
        dailySales: data.dailySales,
        totalOrders: data.totalOrders,
        activeCustomers: data.activeCustomers,
        averageTicket: data.averageTicket,
        branchSales: data.branchSales,
        salesTrend: data.salesTrend,
        productSales: data.productSales,
        monthlySales: data.monthlySales,
        categoryDistribution: data.categoryDistribution,
        customerSegments: data.customerSegments,
        topProducts: data.topProducts,
      },
    };
  }
}

class DatabaseDashboardRepository {
  async getSourceData() {
    throw new Error("DatabaseDashboardRepository not implemented yet");
  }
}

const createDashboardRepository = () => {
  const provider = process.env.DATA_REPOSITORY || "memory";

  if (provider === "database") {
    return new DatabaseDashboardRepository();
  }

  return new InMemoryDashboardRepository();
};

module.exports = {
  InMemoryDashboardRepository,
  DatabaseDashboardRepository,
  createDashboardRepository,
};
