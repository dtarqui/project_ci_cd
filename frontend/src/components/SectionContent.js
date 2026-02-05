import React from "react";
import PropTypes from "prop-types";
import { MdInventory, MdPeople, MdSettings } from "react-icons/md";

const SectionContent = ({ type }) => {
  const sections = {
    Productos: {
      title: "Gestión de Productos",
      description: "Aquí puedes administrar tu inventario de productos.",
      icon: <MdInventory />,
    },
    Clientes: {
      title: "Gestión de Clientes",
      description: "Administra tu base de datos de clientes.",
      icon: <MdPeople />,
    },
    Configuraciones: {
      title: "Configuraciones del Sistema",
      description: "Ajusta las preferencias de tu tienda.",
      icon: <MdSettings />,
    },
  };

  const content = sections[type];

  if (!content) return null;

  return (
    <div className="section-content">
      <h2>{content.title}</h2>
      <p>{content.description}</p>
      <div className="feature-placeholder">
        <div className="placeholder-icon">{content.icon}</div>
        <p>Esta sección está en desarrollo</p>
      </div>
    </div>
  );
};

SectionContent.propTypes = {
  type: PropTypes.string.isRequired,
};

export default SectionContent;
