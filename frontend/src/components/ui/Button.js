import React from "react";
import PropTypes from "prop-types";
import Spinner from "./Spinner";

/**
 * Botón reusable. Acepta className para que las páginas que aún consultan
 * clases legadas en sus tests (ej. ".btn-delete", ".btn-edit") sigan
 * encontrando el elemento sin cambios.
 */
const Button = ({
  variant,
  size,
  loading,
  disabled,
  icon,
  children,
  className,
  type,
  ...rest
}) => (
  <button
    type={type}
    className={`ui-btn ui-btn-${variant} ui-btn-${size} ${className}`.trim()}
    disabled={disabled || loading}
    {...rest}
  >
    {loading ? <Spinner size="sm" className="ui-btn-spinner" /> : icon}
    {children}
  </button>
);

Button.propTypes = {
  variant: PropTypes.oneOf(["primary", "secondary", "danger", "ghost"]),
  size: PropTypes.oneOf(["sm", "md"]),
  loading: PropTypes.bool,
  disabled: PropTypes.bool,
  icon: PropTypes.node,
  children: PropTypes.node,
  className: PropTypes.string,
  type: PropTypes.string,
};

Button.defaultProps = {
  variant: "primary",
  size: "md",
  loading: false,
  disabled: false,
  icon: undefined,
  children: undefined,
  className: "",
  type: "button",
};

export default Button;
