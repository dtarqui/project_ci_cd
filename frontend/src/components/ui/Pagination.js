import React from "react";
import PropTypes from "prop-types";
import { MdChevronLeft, MdChevronRight } from "react-icons/md";
import Button from "./Button";

/**
 * Controles de paginación reusables (Products/Customers/Sales). Se oculta
 * sola si solo hay una página, para no ensuciar la UI cuando hay pocos
 * resultados filtrados.
 */
const Pagination = ({ page, totalPages, total, pageSize, onPageChange }) => {
  if (!totalPages || totalPages <= 1) {
    return null;
  }

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="ui-pagination">
      <span className="ui-pagination-summary">
        {from}-{to} de {total}
      </span>
      <div className="ui-pagination-controls">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          icon={<MdChevronLeft />}
        >
          Anterior
        </Button>
        <span className="ui-pagination-page">
          Página {page} de {totalPages}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          icon={<MdChevronRight />}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
};

Pagination.propTypes = {
  page: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  pageSize: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
};

export default Pagination;
