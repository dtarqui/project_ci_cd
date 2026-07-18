import React from "react";
import PropTypes from "prop-types";

/**
 * Bloque "shimmer" genérico. Úsalo directamente para formas simples, o las
 * variantes de abajo (SkeletonTableRows, SkeletonCard) para casos comunes.
 */
const Skeleton = ({ width, height, radius, className, style }) => (
  <span
    className={`ui-skeleton ${className}`.trim()}
    style={{ width, height, borderRadius: radius, ...style }}
  />
);

Skeleton.propTypes = {
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  radius: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  className: PropTypes.string,
  style: PropTypes.object,
};

Skeleton.defaultProps = {
  width: "100%",
  height: "1em",
  radius: "var(--radius-sm)",
  className: "",
  style: undefined,
};

/**
 * Filas de tabla "shimmer" — mismo número de columnas que la tabla real,
 * para que el layout no salte cuando llegan los datos.
 */
export const SkeletonTableRows = ({ rows, columns }) => (
  <>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <tr key={rowIndex} className="ui-skeleton-row" aria-hidden="true">
        {Array.from({ length: columns }).map((__, colIndex) => (
          <td key={colIndex}>
            <Skeleton height="14px" />
          </td>
        ))}
      </tr>
    ))}
  </>
);

SkeletonTableRows.propTypes = {
  rows: PropTypes.number,
  columns: PropTypes.number.isRequired,
};

SkeletonTableRows.defaultProps = {
  rows: 5,
};

/** Tarjeta "shimmer" para métricas/resúmenes del dashboard. */
export const SkeletonCard = ({ className }) => (
  <div className={`ui-skeleton-card ${className}`.trim()} aria-hidden="true">
    <Skeleton width="60%" height="12px" />
    <Skeleton width="40%" height="28px" style={{ marginTop: 12 }} />
  </div>
);

SkeletonCard.propTypes = {
  className: PropTypes.string,
};

SkeletonCard.defaultProps = {
  className: "",
};

export default Skeleton;
