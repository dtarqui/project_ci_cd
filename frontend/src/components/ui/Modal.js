import React from "react";
import PropTypes from "prop-types";

/**
 * Overlay + panel con animación/radio consistentes. Pensado para diálogos
 * simples (confirmaciones, formularios cortos); no reemplaza formularios
 * ya extraídos con su propio encabezado (ej. ProductForm).
 */
const Modal = ({ isOpen, onClose, children, className, maxWidth }) => {
  if (!isOpen) return null;

  return (
    <div className="ui-modal-overlay" onClick={onClose}>
      <div
        className={`ui-modal ${className}`.trim()}
        style={{ maxWidth }}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

Modal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  maxWidth: PropTypes.string,
};

Modal.defaultProps = {
  className: "",
  maxWidth: "420px",
};

export default Modal;
