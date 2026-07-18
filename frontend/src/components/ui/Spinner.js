import React from "react";
import PropTypes from "prop-types";

const SIZE_PX = {
  sm: 16,
  md: 24,
  lg: 40,
};

const Spinner = ({ size, className }) => {
  const px = SIZE_PX[size] || SIZE_PX.md;

  return (
    <span
      className={`ui-spinner ${className}`.trim()}
      style={{ width: px, height: px }}
      role="status"
      aria-label="Cargando"
    />
  );
};

Spinner.propTypes = {
  size: PropTypes.oneOf(["sm", "md", "lg"]),
  className: PropTypes.string,
};

Spinner.defaultProps = {
  size: "md",
  className: "",
};

export default Spinner;
