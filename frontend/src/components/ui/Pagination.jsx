import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  limit,
  onPageChange,
  onLimitChange,
}) {
  if (totalPages <= 1 && totalItems === 0) return null;

  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages || totalPages === 0;

  return (
    <div className="lt-pagination" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderTop: "1px solid var(--lt-color-border)", gap: "16px", flexWrap: "wrap" }}>
      <div className="lt-pagination__info" style={{ fontSize: "14px", color: "var(--lt-color-text-muted)", display: "flex", alignItems: "center", gap: "12px" }}>
        <span>
          Total: <strong>{totalItems}</strong> registros
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span>Mostrar:</span>
          <select
            className="lt-select lt-select--sm"
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            aria-label="Items por página"
            style={{ width: "auto", padding: "4px 24px 4px 8px" }}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      <div className="lt-pagination__controls" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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

        <span className="lt-pagination__current" style={{ fontSize: "14px", fontWeight: "500", padding: "0 8px" }}>
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
