import React from "react";
import PropTypes from "prop-types";
import {
  MdDashboard,
  MdPeople,
  MdInventory,
  MdSettings,
  MdReceiptLong,
} from "react-icons/md";

const MENU_ITEMS = [
  { id: "Dashboard", label: "Dashboard", icon: <MdDashboard /> },
  { id: "Ventas", label: "Ventas", icon: <MdReceiptLong /> },
  { id: "Productos", label: "Productos", icon: <MdInventory /> },
  { id: "Clientes", label: "Clientes", icon: <MdPeople /> },
  { id: "Configuraciones", label: "Configuraciones", icon: <MdSettings /> },
];

const DashboardSidebar = ({ activeSection, onSectionChange }) => (
  <aside className="dashboard-sidebar">
    <nav className="sidebar-nav">
      {MENU_ITEMS.map((item) => (
        <button
          key={item.id}
          className={`nav-item ${activeSection === item.id ? "active" : ""}`}
          onClick={() => onSectionChange(item.id)}
        >
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  </aside>
);

DashboardSidebar.propTypes = {
  activeSection: PropTypes.string.isRequired,
  onSectionChange: PropTypes.func.isRequired,
};

export default DashboardSidebar;
