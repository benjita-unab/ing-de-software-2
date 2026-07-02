import React, { useEffect, useState } from 'react';
import { apiFetch } from '../lib/apiClient';

export default function ComprobanteModal({ rutaId, onClose }) {
  const [comprobantes, setComprobantes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadComprobantes() {
      try {
        const res = await apiFetch(`/api/pagos/comprobante/${rutaId}`);
        if (res.ok) {
          // If the API now returns an array, use it directly.
          // Fallback to array if it's a single object (just in case)
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

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div 
        style={styles.modal} 
        onClick={(e) => e.stopPropagation()}
      >
        <div style={styles.header}>
          <div style={styles.headerIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 style={styles.title}>Comprobantes de Pago</h2>
          <button style={styles.closeBtn} onClick={onClose}>&times;</button>
        </div>

        <div style={styles.body}>
          {loading ? (
            <div style={styles.loadingContainer}>
              <div style={styles.spinner}></div>
              <p>Cargando comprobantes...</p>
            </div>
          ) : error ? (
            <div style={styles.errorBanner}>{error}</div>
          ) : comprobantes.length > 0 ? (
            <div style={styles.receiptContainer}>
              <div style={styles.receiptHeader}>
                <div style={styles.checkIcon}>✓</div>
                <div style={styles.successText}>Pagos Exitosos mediante Transbank Webpay</div>
                <div style={styles.amountText}>
                  {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(
                    comprobantes.reduce((sum, c) => sum + c.monto, 0)
                  )}
                  <div style={{ fontSize: '14px', marginTop: '4px', fontWeight: 'normal', opacity: 0.8 }}>Total Pagado</div>
                </div>
              </div>

              {comprobantes[0].rutas && (
                <div style={styles.routeSection}>
                  <div style={styles.routeTitle}>{comprobantes[0].rutas.nombre_ruta || 'Ruta LogiTrack'}</div>
                  <div style={styles.routePoint}>
                    <span style={styles.dot}></span> {comprobantes[0].rutas.origen}
                  </div>
                  <div style={styles.routePoint}>
                    <span style={{...styles.dot, background: '#3b82f6'}}></span> {comprobantes[0].rutas.destino}
                  </div>
                </div>
              )}

              {comprobantes.map((comp, index) => (
                <div key={comp.id || index} style={styles.detailsGrid}>
                  <div style={{ fontWeight: 'bold', color: '#38bdf8', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                    Pago {index + 1} ({new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(comp.monto)})
                  </div>
                  <DetailRow label="ID Transacción" value={comp.transaction_id} />
                  <DetailRow label="Fecha y Hora" value={new Date(comp.fecha_pago).toLocaleString('es-CL', { dateStyle: 'long', timeStyle: 'short' })} />
                  <DetailRow label="Ruta ID" value={comp.ruta_id} />
                  <DetailRow label="Método de Pago" value={comp.metodo_pago} capitalize />
                </div>
              ))}

              <div style={styles.footerInfo}>
                Estos comprobantes certifican que los pagos han sido procesados de forma segura.
              </div>

              <button style={styles.actionBtn} onClick={onClose} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                Cerrar
              </button>
            </div>
          ) : null}
        </div>
      </div>
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 0.8; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function DetailRow({ label, value, capitalize }) {
  return (
    <div style={styles.detailRow}>
      <span style={styles.detailLabel}>{label}</span>
      <span style={{...styles.detailValue, textTransform: capitalize ? 'capitalize' : 'none'}}>
        {value}
      </span>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    padding: '20px',
  },
  modal: {
    background: 'linear-gradient(145deg, #1e293b, #0f172a)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
    borderRadius: '24px',
    width: '100%',
    maxWidth: '460px',
    color: '#f8fafc',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '90vh',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    background: 'rgba(255, 255, 255, 0.02)',
  },
  headerIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    background: 'rgba(56, 189, 248, 0.1)',
    color: '#38bdf8',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    flex: 1,
    marginLeft: '16px',
    color: '#f8fafc',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '28px',
    lineHeight: '1',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    transition: 'color 0.2s',
  },
  body: {
    padding: '24px',
    overflowY: 'auto',
  },
  loadingContainer: {
    textAlign: 'center',
    padding: '40px 0',
    color: '#94a3b8',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid rgba(56, 189, 248, 0.2)',
    borderTopColor: '#38bdf8',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  errorBanner: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    color: '#fca5a5',
    padding: '16px',
    borderRadius: '12px',
    fontSize: '14px',
  },
  receiptContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  receiptHeader: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.05) 0%, transparent 100%)',
    borderRadius: '16px',
    padding: '24px 16px',
    border: '1px solid rgba(16, 185, 129, 0.1)',
  },
  checkIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    fontWeight: 'bold',
    marginBottom: '16px',
    boxShadow: '0 8px 16px -4px rgba(16, 185, 129, 0.4)',
    animation: 'pulse 2s infinite',
  },
  successText: {
    fontSize: '14px',
    color: '#34d399',
    fontWeight: '500',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  },
  amountText: {
    fontSize: '36px',
    fontWeight: '800',
    marginTop: '8px',
    color: '#ffffff',
    letterSpacing: '-1px',
  },
  routeSection: {
    background: 'rgba(15, 23, 42, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    padding: '16px',
  },
  routeTitle: {
    fontSize: '15px',
    fontWeight: '600',
    marginBottom: '12px',
    color: '#e2e8f0',
  },
  routePoint: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    fontSize: '13px',
    color: '#94a3b8',
    marginBottom: '8px',
    lineHeight: '1.4',
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#10b981',
    marginTop: '4px',
    flexShrink: 0,
  },
  detailsGrid: {
    display: 'flex',
    flexDirection: 'column',
    background: 'rgba(255, 255, 255, 0.02)',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    paddingBottom: '12px',
    marginBottom: '12px',
    borderBottom: '1px dashed rgba(255, 255, 255, 0.1)',
  },
  detailLabel: {
    color: '#94a3b8',
    fontSize: '13px',
    flexShrink: 0,
  },
  detailValue: {
    color: '#f8fafc',
    fontSize: '13px',
    fontWeight: '500',
    textAlign: 'right',
    wordBreak: 'break-all',
  },
  footerInfo: {
    fontSize: '12px',
    color: '#64748b',
    textAlign: 'center',
    padding: '0 16px',
    lineHeight: '1.5',
  },
  actionBtn: {
    background: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    padding: '14px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    marginTop: '8px',
  }
};

