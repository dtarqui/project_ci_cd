/**
 * Dashboard Components Structure
 * 
 * Este archivo documenta la arquitectura de componentes del dashboard
 * para facilitar el mantenimiento y escalabilidad del código.
 * 
 * COMPONENTES PRINCIPALES:
 * 
 * 1. DashboardHeader
 *    - Encabezado superior con logo y menú de usuario
 *    - Gestiona el logout del usuario
 *    - Ubicación: src/components/DashboardHeader.js
 * 
 * 2. DashboardSidebar
 *    - Barra lateral con navegación entre secciones
 *    - Items: Dashboard, Productos, Clientes, Configuraciones
 *    - Ubicación: src/components/DashboardSidebar.js
 * 
 * 3. SalesSummary
 *    - Tarjetas KPI mostrando métricas principales
 *    - Datos: Ventas diarias, Órdenes, Clientes, Ticket promedio
 *    - Ubicación: src/components/SalesSummary.js
 * 
 * 4. DashboardOverview
 *    - Contenedor principal de gráficas
 *    - Renderiza todos los charts en grid responsivo
 *    - Ubicación: src/components/DashboardOverview.js
 * 
 * 5. Charts.js (Múltiples componentes)
 *    - ProductSalesChart: Gráfica de productos vendidos (LineChart)
 *    - DailySalesChart: Ventas por día (BarChart)
 *    - BranchSalesChart: Ventas por sucursal (PieChart)
 *    - CategoryChart: Distribución por categoría (PieChart)
 *    - MonthlyTrendChart: Tendencia mensual dual-axis (LineChart)
 *    - TopProductsChart: Top 5 productos (Lista estilizada)
 *    - Ubicación: src/components/Charts.js
 * 
 * 6. SectionContent
 *    - Contenido de secciones no-Dashboard (Productos, Clientes, etc)
 *    - Renderiza placeholders mientras se desarrollan
 *    - Ubicación: src/components/SectionContent.js
 * 
 * FLUJO DE DATOS:
 * 
 * Dashboard (principal)
 *  ├── DashboardHeader (user, onLogout)
 *  ├── DashboardSidebar (activeSection, onSectionChange)
 *  └── Main Content
 *       ├── Dashboard View:
 *       │    ├── SalesSummary (data)
 *       │    └── DashboardOverview (data)
 *       │         └── Charts (data)
 *       └── Other Sections:
 *            └── SectionContent (type)
 * 
 * BENEFICIOS DE ESTA ESTRUCTURA:
 * - Componentes pequeños y reutilizables
 * - Separación de responsabilidades
 * - Fácil de testear
 * - Mejor mantenibilidad
 * - Reduce duplicación de código
 * - Facilita adiciones futuras
 */

export const DASHBOARD_STRUCTURE = {
  Header: "DashboardHeader",
  Sidebar: "DashboardSidebar",
  Summary: "SalesSummary",
  Overview: "DashboardOverview",
  Charts: "Charts",
  SectionContent: "SectionContent",
};
