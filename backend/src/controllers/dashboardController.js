/**
 * Dashboard Controller - Lógica del dashboard
 */

const { createDashboardRepository } = require("../repositories/dashboardRepository");

const dashboardRepository = createDashboardRepository();

/**
 * Obtiene los indicadores y las series agregadas del tablero. La respuesta ya
 * no incluye las tablas completas de productos, clientes y ventas, que el
 * frontend no usaba y que crecian con el volumen de datos.
 */
const getDashboardData = async (req, res) => {
  const data = await dashboardRepository.getDashboardData();

  res.json({
    ...data,
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  getDashboardData,
};
