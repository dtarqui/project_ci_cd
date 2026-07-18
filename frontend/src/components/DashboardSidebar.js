import React, { useState } from "react";
import PropTypes from "prop-types";
import {
  MdDashboard,
  MdPeople,
  MdInventory,
  MdSettings,
  MdReceiptLong,
  MdChevronLeft,
  MdChevronRight,
} from "react-icons/md";

const MENU_ITEMS = [
  { id: "Dashboard", label: "Dashboard", icon: <MdDashboard /> },
  { id: "Ventas", label: "Ventas", icon: <MdReceiptLong /> },
  { id: "Productos", label: "Productos", icon: <MdInventory /> },
  { id: "Clientes", label: "Clientes", icon: <MdPeople /> },
  { id: "Configuraciones", label: "Configuraciones", icon: <MdSettings /> },
];

const COLLAPSE_STORAGE_KEY = "sidebarCollapsed";

const DashboardSidebar = ({ activeSection, onSectionChange }) => {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(COLLAPSE_STORAGE_KEY) === "true"
  );

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_STORAGE_KEY, String(next));
      return next;
    });
  };

  return (
    <aside className={`dashboard-sidebar ${collapsed ? "collapsed" : ""}`.trim()}>
      <button
        type="button"
        className="sidebar-toggle"
        onClick={toggleCollapsed}
        aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
        title={collapsed ? "Expandir menú" : "Colapsar menú"}
      >
        {collapsed ? <MdChevronRight /> : <MdChevronLeft />}
      </button>

      <nav className="sidebar-nav">
        {MENU_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activeSection === item.id ? "active" : ""}`}
            onClick={() => onSectionChange(item.id)}
            title={collapsed ? item.label : undefined}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
};

DashboardSidebar.propTypes = {
  activeSection: PropTypes.string.isRequired,
  onSectionChange: PropTypes.func.isRequired,
};

export default DashboardSidebar;
