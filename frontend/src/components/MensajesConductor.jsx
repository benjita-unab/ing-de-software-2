import React, { useMemo } from 'react';
import { useMensajesConductor } from '../hooks/useMensajesConductor';

function formatTimestamp(value) {
  if (!value) return '—';
  try {
    const date = new Date(value);
    return date.toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '—';
  }
}

function getPrioridadColor(prioridad) {
  return prioridad === 'ALTA' ? '#dc2626' : '#3b82f6';
}

function getPrioridadLabel(prioridad) {
  return prioridad === 'ALTA' ? 'ALTA' : 'NORMAL';
}

export default function MensajesConductor() {
  const { mensajes, loading, error } = useMensajesConductor();

  const mensajesOrdenados = useMemo(
    () => [...mensajes].sort((a, b) => {
      if (a.prioridad !== b.prioridad) {
        return a.prioridad === 'ALTA' ? -1 : 1;
      }
      return new Date(b.timestamp_evento) - new Date(a.timestamp_evento);
    }),
    [mensajes],
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Encabezado */}
      <div
        style={{
          borderRadius: '16px',
          background: '#151d3f',
          border: '1px solid rgba(255,255,255,0.1)',
          padding: '16px 20px',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '16px', color: '#fff' }}>
          Mensajes del conductor
        </h2>
        <p style={{ margin: '6px 0 0', color: '#bfc7e4', fontSize: '13px' }}>
          Estados rápidos enviados desde la app móvil. Actualización automática cada 10 segundos.
        </p>
      </div>

      {/* Estado de carga y error */}
      {loading && mensajesOrdenados.length === 0 && (
        <div
          style={{
            padding: '20px',
            textAlign: 'center',
            color: '#bfc7e4',
            fontSize: '13px',
          }}
        >
          Cargando mensajes...
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            background: 'rgba(220, 38, 38, 0.1)',
            border: '1px solid rgba(220, 38, 38, 0.3)',
            color: '#fca5a5',
            fontSize: '13px',
          }}
        >
          {error}
        </div>
      )}

      {/* Tabla de mensajes */}
      <div
        style={{
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.1)',
          background: '#1a2747',
        }}
      >
        {mensajesOrdenados.length === 0 && !loading ? (
          <div
            style={{
              padding: '20px',
              textAlign: 'center',
              color: '#8b92b8',
              fontSize: '13px',
            }}
          >
            No hay mensajes
          </div>
        ) : (
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '13px',
            }}
          >
            <thead>
              <tr style={{ background: '#0f1629', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    color: '#bfc7e4',
                    fontWeight: '600',
                  }}
                >
                  Ruta
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    color: '#bfc7e4',
                    fontWeight: '600',
                  }}
                >
                  Mensaje
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    color: '#bfc7e4',
                    fontWeight: '600',
                  }}
                >
                  Fecha y Hora
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'center',
                    color: '#bfc7e4',
                    fontWeight: '600',
                  }}
                >
                  Prioridad
                </th>
              </tr>
            </thead>
            <tbody>
              {mensajesOrdenados.map((mensaje) => (
                <tr
                  key={mensaje.id}
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    background: mensaje.prioridad === 'ALTA' 
                      ? 'rgba(220, 38, 38, 0.05)' 
                      : 'transparent',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = mensaje.prioridad === 'ALTA'
                      ? 'rgba(220, 38, 38, 0.1)'
                      : 'rgba(255,255,255,0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = mensaje.prioridad === 'ALTA'
                      ? 'rgba(220, 38, 38, 0.05)'
                      : 'transparent';
                  }}
                >
                  <td style={{ padding: '12px 16px', color: '#e2e8f0' }}>
                    {mensaje.ruta_id || '—'}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#e2e8f0' }}>
                    {mensaje.mensaje || '—'}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#bfc7e4' }}>
                    {formatTimestamp(mensaje.timestamp_evento)}
                  </td>
                  <td
                    style={{
                      padding: '12px 16px',
                      textAlign: 'center',
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: getPrioridadColor(mensaje.prioridad),
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: '600',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {getPrioridadLabel(mensaje.prioridad)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Indicador de polling */}
      <div
        style={{
          fontSize: '12px',
          color: '#64748b',
          textAlign: 'center',
        }}
      >
        ↻ Polling automático cada 10 segundos
      </div>
    </div>
  );
}
