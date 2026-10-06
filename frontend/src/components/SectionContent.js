import React from "react";
import PropTypes from "prop-types";
import Settings from "./Settings";
import ProductsSection from "./ProductsSection";
import CustomersSection from "./CustomersSection";
import SalesSection from "./SalesSection";
import CatalogsSection from "./CatalogsSection";

const SectionContent = ({ type }) => {
  // Si es Productos, mostrar el componente ProductsSection
  if (type === "Productos") {
    return <ProductsSection />;
  }

  // Si es Clientes, mostrar el componente CustomersSection
  if (type === "Clientes") {
    return <CustomersSection />;
  }

  // Si es Ventas, mostrar el componente SalesSection
  if (type === "Ventas") {
    return <SalesSection />;
  }

  // Catalogos administrables. El propio componente oculta el contenido a quien
  // no sea admin, y el backend rechaza la escritura con 403.
  if (type === "Catálogos") {
    return <CatalogsSection />;
  }

  // Si es Configuraciones, mostrar el componente Settings
  if (type === "Configuraciones") {
    return <Settings />;
  }

  return null;
};

SectionContent.propTypes = {
  type: PropTypes.string.isRequired,
};

export default SectionContent;
