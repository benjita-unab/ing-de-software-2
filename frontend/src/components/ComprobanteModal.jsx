import React, { useEffect, useState } from 'react';
import { apiFetch } from '../lib/apiClient';
import Spinner from './ui/Spinner';

function formatClp(value) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

export default function ComprobanteModal({ rutaId, onClose }) {
  const [comprobantes, setComprobantes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadComprobantes() {
      try {
        const res = await apiFetch(`/api/pagos/comprobante/${rutaId}`);
        if (res.ok) {
          const data = Array.isArray(res.data) ? res.data : [res.data];
          setComprobantes(data);
        } else {
          setError(res.error || 'Error al obtener los comprobantes');
        }
      } catch (err) {
        setError(err.message || 'Error al obtener los comprobantes');
      } finally {
        setLoading(false);
      }
    }
    if (rutaId) {
      loadComprobantes();
    }
  }, [rutaId]);

  if (!rutaId) return null;

  const totalPagado = comprobantes.reduce((sum, c) => sum + Number(c.monto || 0), 0);
  const ruta = comprobantes[0]?.rutas;

  return (
    <div
      className="lt-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="comprobante-modal-title"
    >
      <div
        className="lt-modal-dialog lt-modal-dialog--sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lt-modal-header">
          <div>
            <div className="lt-modal-header__title" id="comprobante-modal-title">
              Comprobantes de pago
            </div>
            <div className="lt-modal-header__sub">
              {ruta?.nombre_ruta || 'Pedido'} · Transbank Webpay
            </div>
          </div>
          <button type="button" className="lt-modal-close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>

        <div className="lt-modal-body">
          {loading && <Spinner message="Cargando comprobantes…" />}
          {error && (
            <div className="lt-alert-banner lt-alert-banner--error" role="alert">
              {error}
            </div>
          )}
          {!loading && !error && comprobantes.length === 0 && (
            <p className="lt-empty">Sin comprobantes para este pedido.</p>
          )}
          {!loading && !error && comprobantes.length > 0 && (
            <>
              <div className="lt-modal-highlight">
                <div className="lt-modal-highlight__label">Total pagado</div>
                <div className="lt-modal-highlight__amount">{formatClp(totalPagado)}</div>
                <div className="lt-modal-highlight__sub">Pago procesado</div>
              </div>

              {ruta && (
                <div className="lt-modal-section lt-modal-section--flush">
                  <div className="lt-modal-section__title">Trayecto</div>
                  <div className="lt-modal-detail-grid">
                    <div className="lt-modal-detail-row">
                      <span className="lt-modal-detail-row__label">Origen</span>
                      <span className="lt-modal-detail-row__value">{ruta.origen || '—'}</span>
                    </div>
                    <div className="lt-modal-detail-row">
                      <span className="lt-modal-detail-row__label">Destino</span>
                      <span className="lt-modal-detail-row__value">{ruta.destino || '—'}</span>
                    </div>
                  </div>
                </div>
              )}

              {comprobantes.map((comp, index) => (
                <div key={comp.id || index} className="lt-modal-section">
                  <div className="lt-modal-section__title">
                    Pago {index + 1} · {formatClp(comp.monto)}
                  </div>
                  <div className="lt-modal-detail-grid">
                    <div className="lt-modal-detail-row">
                      <span className="lt-modal-detail-row__label">ID transacción</span>
                      <span className="lt-modal-detail-row__value">{comp.transaction_id || '—'}</span>
                    </div>
                    <div className="lt-modal-detail-row">
                      <span className="lt-modal-detail-row__label">Fecha</span>
                      <span className="lt-modal-detail-row__value">
                        {comp.fecha_pago
                          ? new Date(comp.fecha_pago).toLocaleString('es-CL', {
                              dateStyle: 'long',
                              timeStyle: 'short',
                            })
                          : '—'}
                      </span>
                    </div>
                    <div className="lt-modal-detail-row">
                      <span className="lt-modal-detail-row__label">Método</span>
                      <span className="lt-modal-detail-row__value">{comp.metodo_pago || '—'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="lt-modal-footer">
          <button type="button" className="lt-btn lt-btn--primary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
