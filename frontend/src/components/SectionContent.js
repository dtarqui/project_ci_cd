import React from "react";
import PropTypes from "prop-types";
import Settings from "./Settings";
import ProductsSection from "./ProductsSection";
import CustomersSection from "./CustomersSection";
import SalesSection from "./SalesSection";

const SectionContent = ({ type, user }) => {
  // Si es Productos, mostrar el componente ProductsSection
  if (type === "Productos") {
    return <ProductsSection user={user} />;
  }

  // Si es Clientes, mostrar el componente CustomersSection
  if (type === "Clientes") {
    return <CustomersSection user={user} />;
  }

  // Si es Ventas, mostrar el componente SalesSection
  if (type === "Ventas") {
    return <SalesSection />;
  }

  // Si es Configuraciones, mostrar el componente Settings
  if (type === "Configuraciones") {
    return <Settings />;
  }

  return null;
};

SectionContent.propTypes = {
  type: PropTypes.string.isRequired,
  user: PropTypes.shape({
    role: PropTypes.string,
  }),
};

export default SectionContent;
