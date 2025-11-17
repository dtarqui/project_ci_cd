import React, { useState, useEffect } from "react";
import { MdDashboard, MdError, MdRefresh, MdExitToApp, MdPeople, MdInventory, MdSettings, MdDescription, MdAccountCircle } from "react-icons/md";
import { dashboardService, authService } from "./services/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export default function Dashboard({ user, onLogout }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("Dashboard");
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const data = await dashboardService.getData();
      setDashboardData(data);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      // Si es un error 401, el interceptor se encargará de limpiar la sesión
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error("Error logging out:", error);
    } finally {
      onLogout();
    }
  };

  const menuItems = [
    { id: "Dashboard", label: "Dashboard", icon: <MdDashboard /> },
    { id: "Productos", label: "Productos", icon: <MdInventory /> },
    { id: "Clientes", label: "Clientes", icon: <MdPeople /> },
    { id: "Configuraciones", label: "Configuraciones", icon: <MdSettings /> },
  ];

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" data-testid="loading-spinner"></div>
        <p>Cargando dashboard...</p>
        <small>Verificando autenticación y cargando datos...</small>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="loading-container">
        <h3><MdError /> Error cargando dashboard</h3>
        <p>No se pudieron cargar los datos del dashboard.</p>
        <button onClick={loadDashboardData} className="retry-button">
          <MdRefresh /> Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <h1>Mi Tienda</h1>
        </div>
        <div className="header-right">
          <div className="user-menu">
            <button
              className="user-button"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <MdAccountCircle />
            </button>
            {showUserMenu && (
              <div className="user-dropdown">
                <div className="user-info">
                  <span>Cuenta</span>
                </div>
                <button onClick={handleLogout} className="logout-button">
                  Salir
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="dashboard-content">
        {/* Sidebar */}
        <aside className="dashboard-sidebar">
          <nav className="sidebar-nav">
            {menuItems.map((item) => (
              <button
                key={item.id}
                className={`nav-item ${
                  activeSection === item.id ? "active" : ""
                }`}
                onClick={() => setActiveSection(item.id)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="dashboard-main">
          {activeSection === "Dashboard" && dashboardData && (
            <div className="dashboard-overview">
              {/* Sales Summary */}
              <div className="sales-summary">
                <div className="summary-card main-metric">
                  <h3>{dashboardData.dailySales}</h3>
                  <p>Ventas diarias</p>
                </div>
              </div>

              {/* Charts Grid */}
              <div className="charts-grid">
                {/* Daily Sales Trend */}
                <div className="chart-card">
                  <h4>Productos vendidos</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={dashboardData.productSales}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="product"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis
                        label={{
                          value: "Productos vendidos",
                          angle: -90,
                          position: "insideLeft",
                        }}
                      />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="quantity"
                        stroke="#8884d8"
                        strokeWidth={2}
                        dot={{ fill: "#8884d8", strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Daily Trend */}
                <div className="chart-card">
                  <h4>Ventas en día</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={dashboardData.salesTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis
                        label={{
                          value: "Y Axis Label",
                          angle: -90,
                          position: "insideLeft",
                        }}
                      />
                      <Tooltip />
                      <Bar dataKey="sales" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Branch Sales */}
                <div className="chart-card">
                  <h4>Ventas por sucursal</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={dashboardData.branchSales}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {(dashboardData.branchSales || []).map(
                          (entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          )
                        )}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Product Performance */}
                <div className="chart-card">
                  <h4>Y Axis Label</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={dashboardData.branchSales}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {(dashboardData.branchSales || []).map(
                          (entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          )
                        )}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="help-icon">
                    <span>❓</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === "Productos" && (
            <div className="section-content">
              <h2>Gestión de Productos</h2>
              <p>Aquí puedes administrar tu inventario de productos.</p>
              <div className="feature-placeholder">
                <div className="placeholder-icon"><MdInventory /></div>
                <p>Esta sección está en desarrollo</p>
              </div>
            </div>
          )}

          {activeSection === "Clientes" && (
            <div className="section-content">
              <h2>Gestión de Clientes</h2>
              <p>Administra tu base de datos de clientes.</p>
              <div className="feature-placeholder">
                <div className="placeholder-icon"><MdPeople /></div>
                <p>Esta sección está en desarrollo</p>
              </div>
            </div>
          )}

          {activeSection === "Configuraciones" && (
            <div className="section-content">
              <h2>Configuraciones del Sistema</h2>
              <p>Ajusta las preferencias de tu tienda.</p>
              <div className="feature-placeholder">
                <div className="placeholder-icon"><MdSettings /></div>
                <p>Esta sección está en desarrollo</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
