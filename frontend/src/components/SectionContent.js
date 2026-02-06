import React from "react";
import PropTypes from "prop-types";
import { MdPeople, MdSettings } from "react-icons/md";
import ProductsSection from "./ProductsSection";

const SectionContent = ({ type }) => {
  // Si es Productos, mostrar el componente ProductsSection
  if (type === "Productos") {
    return <ProductsSection />;
  }

  const sections = {
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
