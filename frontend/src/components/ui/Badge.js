import React from "react";
import PropTypes from "prop-types";

/**
 * Pill de estado. Reemplaza los distintos esquemas de clases que
 * ProductsSection (status-green/orange/red/gray) y CustomersSection
 * (status-activo/inactivo/pendiente) usaban por separado para el mismo
 * patrón visual.
 */
const Badge = ({ tone, children, className }) => (
  // "status-badge" se mantiene por compatibilidad: productsSection.test.js
  // y customersSection.test.js consultan esta clase directamente.
  <span className={`ui-badge status-badge ui-badge-${tone} ${className}`.trim()}>
    {children}
  </span>
);

Badge.propTypes = {
  tone: PropTypes.oneOf(["success", "warning", "danger", "neutral"]),
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

Badge.defaultProps = {
  tone: "neutral",
  className: "",
};

export default Badge;
