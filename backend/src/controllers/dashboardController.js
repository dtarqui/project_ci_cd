/**
 * Dashboard Controller - Lógica del dashboard
 */

const { mockData } = require("../db/mockData");

/**
 * Obtiene datos del dashboard
 */
const getDashboardData = (req, res) => {
  res.json({
    ...mockData,
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  getDashboardData,
};
