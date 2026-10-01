/**
 * Dashboard Repository
 * Entrega los datos base para composición de métricas del dashboard.
 */

const { getMockData } = require("../db/dataStore");
const { getPrismaClient } = require("../db/prismaClient");
const { mapSaleFromDb } = require("./saleRepository");
const { createRepository } = require("./factory");

// Los borrados no cuentan en las metricas: un cliente dado de baja seguia
// sumando en "clientes activos" y en los segmentos, y un producto borrado seguia
// apareciendo en la distribucion por categoria. Las ventas, en cambio, se traen
// todas: el servicio ya separa las anuladas de las validas.
const activo = (registro) => !registro.deletedAt;

class InMemoryDashboardRepository {
  async getSourceData() {
    const data = getMockData();

    return {
      products: (data.products || []).filter(activo),
      customers: (data.customers || []).filter(activo),
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
      prisma.product.findMany({ where: { deletedAt: null } }),
      prisma.customer.findMany({ where: { deletedAt: null } }),
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
