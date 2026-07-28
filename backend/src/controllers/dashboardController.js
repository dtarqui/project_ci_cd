/**
 * Dashboard Controller - Lógica del dashboard
 */

const { createDashboardRepository } = require("../repositories/dashboardRepository");
const { buildDynamicDashboardData } = require("../services/dashboardService");

const dashboardRepository = createDashboardRepository();

/**
 * Obtiene datos del dashboard
 */
const getDashboardData = async (req, res) => {
  const sourceData = await dashboardRepository.getSourceData();
  const dynamicData = buildDynamicDashboardData(sourceData);

  res.json({
    ...sourceData.baseDashboard,
    products: sourceData.products,
    customers: sourceData.customers,
    sales: sourceData.sales,
    ...dynamicData,
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  getDashboardData,
};
