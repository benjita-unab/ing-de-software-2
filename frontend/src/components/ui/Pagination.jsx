import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  limit,
  onPageChange,
  onLimitChange,
}) {
  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= totalPages;

  if (totalItems === 0) return null;

  return (
    <div className="lt-pagination" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '12px', background: '#fff', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px' }}>
      <div className="lt-pagination__info" style={{ fontSize: '13px', color: '#64748b' }}>
        Mostrando {(currentPage - 1) * limit + 1} - {Math.min(currentPage * limit, totalItems)} de {totalItems} resultados
      </div>

      <div className="lt-pagination__controls" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', color: '#64748b' }}>Por página:</span>
          <select
            className="lt-select"
            style={{ padding: '4px 24px 4px 8px', fontSize: '13px', minHeight: 'auto', height: '28px' }}
            value={limit}
            onChange={(e) => {
              if (onLimitChange) onLimitChange(Number(e.target.value));
            }}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            type="button"
            className="lt-btn lt-btn--ghost"
            style={{ padding: '4px', minWidth: 'auto', minHeight: 'auto' }}
            disabled={isFirstPage}
            onClick={() => onPageChange(currentPage - 1)}
            aria-label="Página anterior"
          >
            <ChevronLeft size={16} />
          </button>
          
          <span style={{ fontSize: '13px', fontWeight: 500, padding: '0 8px', color: '#334155' }}>
            Pág. {currentPage} de {Math.max(1, totalPages)}
          </span>
          
          <button
            type="button"
            className="lt-btn lt-btn--ghost"
            style={{ padding: '4px', minWidth: 'auto', minHeight: 'auto' }}
            disabled={isLastPage}
            onClick={() => onPageChange(currentPage + 1)}
            aria-label="Página siguiente"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
