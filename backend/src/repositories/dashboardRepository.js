/**
 * Dashboard Repository
 * Entrega los datos base para composición de métricas del dashboard.
 */

const { getMockData } = require("../db/dataStore");
const { getPrismaClient } = require("../db/prismaClient");
const { mapSaleFromDb } = require("./saleRepository");
const { createRepository } = require("./factory");

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
    const prisma = getPrismaClient();
    const [products, customers, sales] = await Promise.all([
      prisma.product.findMany(),
      prisma.customer.findMany(),
      prisma.sale.findMany({ include: { items: true } }),
    ]);

    return {
      products,
      customers,
      sales: sales.map(mapSaleFromDb),
      // dashboardController recalcula todas estas métricas a partir de
      // products/customers/sales (buildDynamicDashboardData), así que no
      // hace falta duplicar agregados estáticos aquí.
      baseDashboard: {},
    };
  }
}

const createDashboardRepository = () =>
  createRepository(InMemoryDashboardRepository, DatabaseDashboardRepository);

module.exports = {
  InMemoryDashboardRepository,
  DatabaseDashboardRepository,
  createDashboardRepository,
};
