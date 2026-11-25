/**
 * Dashboard Repository
 * Entrega los datos del tablero. En memoria agrega en la aplicacion; con
 * PostgreSQL, la base calcula los agregados y solo viajan unas decenas de filas.
 */

const { getMockData } = require("../db/dataStore");
const { getPrismaClient } = require("../db/prismaClient");
const { createRepository } = require("./factory");
const {
  toDateKey,
  buildDynamicDashboardData,
  buildDashboardFromAggregates,
} = require("../services/dashboardService");
const { CUSTOMER_SEGMENT_THRESHOLDS } = require("../config/constants");

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
    };
  }

  async getDashboardData() {
    return buildDynamicDashboardData(await this.getSourceData());
  }
}

/**
 * Antes, el tablero leia las tablas completas de productos, clientes y ventas
 * con sus lineas y las agregaba en la funcion: el tiempo y la memoria crecian
 * con el volumen de datos, y la respuesta devolvia ademas las tres tablas.
 * Ahora la base agrega en tres consultas, cada una con un solo recorrido:
 *
 *   ventas   ventas validas por dia y por ciudad del cliente (GROUPING SETS);
 *   lineas   unidades e ingresos por producto (validas y completadas) y por dia;
 *   clientes clientes activos y segmentos.
 *
 * Las tres van en una transaccion de lectura repetible, en una sola conexion,
 * para que las cifras salgan de la misma instantanea. Las reglas son las de
 * buildDynamicDashboardData: una venta es valida si no esta anulada, los
 * productos mas vendidos salen de las completadas, los borrados no cuentan y
 * los empates se resuelven por orden de aparicion (el id mas bajo).
 */
class DatabaseDashboardRepository {
  async getAggregates(today = new Date()) {
    const prisma = getPrismaClient();
    const { VIP, FRECUENTE, REGULAR } = CUSTOMER_SEGMENT_THRESHOLDS;

    const [ventas, lineas, customerRows] = await prisma.$transaction(
      [
        prisma.$queryRaw`
          SELECT to_char(dia, 'YYYY-MM-DD') AS dia, city,
                 count(*)::int AS orders, sum(total)::float8 AS revenue, min(id)::int AS primera,
                 GROUPING(dia)::int AS "porCiudad"
          FROM (
            SELECT s.id, s.total, s.created_at::date AS dia,
                   CASE WHEN c.id IS NULL OR c.city IS NULL OR c.city = '' THEN 'General' ELSE c.city END AS city
            FROM sales s
            LEFT JOIN customers c ON c.id = s.customer_id AND c.deleted_at IS NULL
            WHERE lower(s.status) <> 'anulada'
          ) v
          GROUP BY GROUPING SETS ((dia), (city))`,
        prisma.$queryRaw`
          WITH g AS (
            SELECT product_id, dia,
                   sum(quantity) FILTER (WHERE valida)::int AS quantity,
                   sum(total) FILTER (WHERE valida)::float8 AS revenue,
                   min(id) FILTER (WHERE valida)::int AS primera,
                   sum(quantity) FILTER (WHERE completada)::int AS "quantityCompletada",
                   sum(total) FILTER (WHERE completada)::float8 AS "revenueCompletada",
                   min(id) FILTER (WHERE completada)::int AS "primeraCompletada",
                   GROUPING(dia)::int AS "porProducto"
            FROM (
              SELECT si.id, si.product_id, si.quantity, si.total, s.created_at::date AS dia,
                     lower(s.status) <> 'anulada' AS valida, lower(s.status) = 'completada' AS completada
              FROM sale_items si
              JOIN sales s ON s.id = si.sale_id
            ) v
            GROUP BY GROUPING SETS ((product_id), (dia))
          )
          SELECT g.product_id AS "productId", to_char(g.dia, 'YYYY-MM-DD') AS dia,
                 g.quantity, g.revenue, g.primera,
                 g."quantityCompletada", g."revenueCompletada", g."primeraCompletada", g."porProducto",
                 CASE WHEN g."porProducto" = 1 THEN (SELECT name FROM sale_items WHERE id = g.primera) END AS name,
                 CASE WHEN g."porProducto" = 1
                      THEN (SELECT name FROM sale_items WHERE id = g."primeraCompletada") END AS "nameCompletada",
                 CASE WHEN g."porProducto" = 1
                      THEN (SELECT NULLIF(p.category, '') FROM products p
                            WHERE p.id = g.product_id AND p.deleted_at IS NULL) END AS category
          FROM g`,
        prisma.$queryRaw`
          SELECT count(*) FILTER (WHERE lower(status) = 'activo')::int AS "activeCustomers",
                 count(*) FILTER (WHERE total_spent >= ${VIP}::float8)::int AS "vipCount",
                 COALESCE(sum(total_spent) FILTER (WHERE total_spent >= ${VIP}::float8), 0)::float8 AS "vipRevenue",
                 count(*) FILTER (WHERE total_spent >= ${FRECUENTE}::float8
                                    AND total_spent < ${VIP}::float8)::int AS "frecuenteCount",
                 COALESCE(sum(total_spent) FILTER (WHERE total_spent >= ${FRECUENTE}::float8
                                                     AND total_spent < ${VIP}::float8), 0)::float8 AS "frecuenteRevenue",
                 count(*) FILTER (WHERE total_spent >= ${REGULAR}::float8
                                    AND total_spent < ${FRECUENTE}::float8)::int AS "regularCount",
                 COALESCE(sum(total_spent) FILTER (WHERE total_spent >= ${REGULAR}::float8
                                                     AND total_spent < ${FRECUENTE}::float8), 0)::float8 AS "regularRevenue",
                 count(*) FILTER (WHERE total_spent < ${REGULAR}::float8)::int AS "nuevoCount",
                 COALESCE(sum(total_spent) FILTER (WHERE total_spent < ${REGULAR}::float8), 0)::float8 AS "nuevoRevenue"
          FROM customers
          WHERE deleted_at IS NULL`,
      ],
      { isolationLevel: "RepeatableRead" }
    );

    const c = customerRows[0];
    const porDia = (filas) => filas.filter((fila) => fila.dia !== null);

    return {
      todayKey: toDateKey(today),
      salesByDay: porDia(ventas),
      salesByCity: ventas.filter((fila) => fila.porCiudad === 1),
      itemsByDay: porDia(lineas),
      itemsByProduct: lineas.filter((fila) => fila.porProducto === 1),
      customers: {
        activeCustomers: c.activeCustomers,
        segments: [
          { segment: "VIP", count: c.vipCount, revenue: c.vipRevenue },
          { segment: "Frecuente", count: c.frecuenteCount, revenue: c.frecuenteRevenue },
          { segment: "Regular", count: c.regularCount, revenue: c.regularRevenue },
          { segment: "Nuevo", count: c.nuevoCount, revenue: c.nuevoRevenue },
        ],
      },
    };
  }

  async getDashboardData() {
    return buildDashboardFromAggregates(await this.getAggregates());
  }
}

const createDashboardRepository = () =>
  createRepository(InMemoryDashboardRepository, DatabaseDashboardRepository);

module.exports = {
  InMemoryDashboardRepository,
  DatabaseDashboardRepository,
  createDashboardRepository,
};
