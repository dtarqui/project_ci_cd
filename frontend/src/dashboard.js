import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { useLocation, useNavigate } from "react-router-dom";
import { MdError, MdRefresh } from "react-icons/md";
import { dashboardService, authService } from "./services/api";
import DashboardHeader from "./components/DashboardHeader";
import DashboardSidebar from "./components/DashboardSidebar";
import SalesSummary from "./components/SalesSummary";
import DashboardOverview from "./components/DashboardOverview";
import SectionContent from "./components/SectionContent";

const sectionToSlug = {
  Dashboard: "",
  Ventas: "sales",
  Productos: "products",
  Clientes: "customers",
  Configuraciones: "settings",
};

const slugToSection = {
  "": "Dashboard",
  sales: "Ventas",
  products: "Productos",
  customers: "Clientes",
  settings: "Configuraciones",
  ventas: "Ventas",
  productos: "Productos",
  clientes: "Clientes",
  configuraciones: "Configuraciones",
};

export default function Dashboard({ user, onLogout }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("Dashboard");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    const segments = location.pathname
      .replace(/^\/+|\/+$/g, "")
      .split("/")
      .filter(Boolean);

    let slug = "";
    if (segments.length > 0) {
      slug = segments[0] === "dashboard" ? segments[1] || "" : segments[0];
    }

    const resolvedSection = slugToSection[slug] || "Dashboard";
    setActiveSection(resolvedSection);
  }, [location.pathname]);

  const loadDashboardData = async () => {
    try {
      const data = await dashboardService.getData();
      setDashboardData(data);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
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

  const handleSectionChange = (section) => {
    const slug = sectionToSlug[section];
    setActiveSection(section);
    navigate(slug ? `/${slug}` : "/dashboard");
  };

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
        <h3>
          <MdError /> Error cargando dashboard
        </h3>
        <p>No se pudieron cargar los datos del dashboard.</p>
        <button onClick={loadDashboardData} className="retry-button">
          <MdRefresh /> Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <DashboardHeader user={user} onLogout={handleLogout} />

      <div className="dashboard-content">
        <DashboardSidebar
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
        />

        <main className="dashboard-main">
          {activeSection === "Dashboard" && (
            <>
              <SalesSummary data={dashboardData} />
              <DashboardOverview data={dashboardData} />
            </>
          )}

          {activeSection !== "Dashboard" && (
            <SectionContent type={activeSection} />
          )}
        </main>
      </div>
    </div>
  );
}

Dashboard.propTypes = {
  user: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    username: PropTypes.string,
  }),
  onLogout: PropTypes.func.isRequired,
};
