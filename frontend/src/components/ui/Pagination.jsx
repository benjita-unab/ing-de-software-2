import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  limit,
  onPageChange,
  onLimitChange,
  limitOptions = [10, 20, 50],
}) {
  if (totalItems === 0) return null;

  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= totalPages || totalPages === 0;

  return (
    <div className="lt-pagination">
      <div className="lt-pagination__info">
        <span>
          Mostrando {(currentPage - 1) * limit + 1} -{" "}
          {Math.min(currentPage * limit, totalItems)} de {totalItems} resultados
        </span>
        <div className="lt-pagination__limit">
          <span>Por página:</span>
          <select
            className="lt-select lt-select--sm"
            value={limit}
            onChange={(e) => {
              if (onLimitChange) onLimitChange(Number(e.target.value));
            }}
            aria-label="Items por página"
          >
            {limitOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="lt-pagination__controls">
        <button
          type="button"
          className="lt-btn lt-btn--ghost lt-btn--icon"
          onClick={() => onPageChange(1)}
          disabled={isFirstPage}
          aria-label="Primera página"
          title="Primera página"
        >
          <ChevronsLeft size={18} />
        </button>
        <button
          type="button"
          className="lt-btn lt-btn--ghost lt-btn--icon"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={isFirstPage}
          aria-label="Página anterior"
          title="Página anterior"
        >
          <ChevronLeft size={18} />
        </button>

        <span className="lt-pagination__current">
          Página {currentPage} de {Math.max(1, totalPages)}
        </span>

        <button
          type="button"
          className="lt-btn lt-btn--ghost lt-btn--icon"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={isLastPage}
          aria-label="Página siguiente"
          title="Página siguiente"
        >
          <ChevronRight size={18} />
        </button>
        <button
          type="button"
          className="lt-btn lt-btn--ghost lt-btn--icon"
          onClick={() => onPageChange(totalPages)}
          disabled={isLastPage}
          aria-label="Última página"
          title="Última página"
        >
          <ChevronsRight size={18} />
        </button>
      </div>
    </div>
  );
}
