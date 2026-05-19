import React, { useMemo, useState } from 'react';
import { groupMensajesByRuta, sortMensajes } from '../hooks/useMensajesConductor';

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

export default function MensajesConductor({ mensajes, rutasMap = {}, loading, error, acknowledgeMensaje }) {
  const [searchRuta, setSearchRuta] = useState('');
  const [expandedRoutes, setExpandedRoutes] = useState(() => new Set());

  const mensajesOrdenados = useMemo(() => sortMensajes(mensajes), [mensajes]);
  const routeGroups = useMemo(
    () => groupMensajesByRuta(mensajesOrdenados, searchRuta, rutasMap),
    [mensajesOrdenados, rutasMap, searchRuta],
  );

  const handleAcknowledge = async (mensajeId) => {
    const res = await acknowledgeMensaje(mensajeId);
    if (!res.ok) {
      alert(`Error: ${res.message}`);
    }
  };

  const toggleRoute = (rutaId) => {
    setExpandedRoutes((prev) => {
      const next = new Set(prev);
      if (next.has(rutaId)) {
        next.delete(rutaId);
      } else {
        next.add(rutaId);
      }
      return next;
    });
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div
        style={{
          borderRadius: '16px',
          background: '#151d3f',
          border: '1px solid rgba(255,255,255,0.1)',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '16px', color: '#fff' }}>
              Mensajes del conductor
            </h2>
            <p style={{ margin: '6px 0 0', color: '#bfc7e4', fontSize: '13px', maxWidth: '620px' }}>
              Estados rápidos enviados desde la app móvil. Actualización automática cada 10 segundos.
            </p>
          </div>
          <div style={{ flex: '0 0 320px', minWidth: 0 }}>
            <label htmlFor="ruta-search" style={{ display: 'block', marginBottom: '6px', color: '#cbd5e1', fontSize: '12px' }}>
              Buscar rutas por nombre o ID de ruta
            </label>
            <input
              id="ruta-search"
              type="text"
              value={searchRuta}
              onChange={(event) => setSearchRuta(event.target.value)}
              placeholder="Ej: 5a8c3d2f-..."
              style={{
                width: '100%',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.14)',
                background: '#0f172a',
                color: '#fff',
                padding: '10px 14px',
                fontSize: '13px',
              }}
            />
          </div>
        </div>
      </div>

      {loading && mensajes.length === 0 && (
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

      <div
        style={{
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.1)',
          background: '#1a2747',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
        {routeGroups.length === 0 && !loading ? (
          <div
            style={{
              padding: '20px',
              textAlign: 'center',
              color: '#8b92b8',
              fontSize: '13px',
            }}
          >
            No hay mensajes para la ruta indicada.
          </div>
        ) : (
          <div style={{ overflowY: 'auto', flex: 1, minHeight: 0, padding: '12px' }}>
            {routeGroups.map((route) => {
              const isOpen = expandedRoutes.has(route.rutaId);
              return (
                <div
                  key={route.rutaId}
                  style={{
                    marginBottom: '14px',
                    borderRadius: '18px',
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: '#121b38',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => toggleRoute(route.rutaId)}
                    style={{
                      width: '100%',
                      border: 'none',
                      background: 'transparent',
                      textAlign: 'left',
                      padding: '18px 20px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      color: '#fff',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.02em' }}>
                        {route.rutaLabel}
                      </span>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                        {route.mensajes.length} mensaje{route.mensajes.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                      {route.hasUrgent && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 10px',
                            borderRadius: '999px',
                            background: 'rgba(220, 38, 38, 0.16)',
                            color: '#fee2e2',
                            fontWeight: 700,
                            fontSize: '12px',
                          }}
                        >
                          🚨 EMERGENCIA
                        </span>
                      )}
                      <span style={{ color: '#94a3b8', fontSize: '12px' }}>
                        {isOpen ? '▲' : '▼'}
                      </span>
                    </div>
                  </button>

                  {isOpen && (
                    <div style={{ padding: '0 16px 18px', background: '#111a34' }}>
                      <div style={{ overflowX: 'auto' }}>
                        <table
                          style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            fontSize: '13px',
                          }}
                        >
                          <thead>
                            <tr style={{ background: '#0f1629', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                              <th
                                style={{
                                  padding: '12px 14px',
                                  textAlign: 'left',
                                  color: '#bfc7e4',
                                  fontWeight: '600',
                                }}
                              >
                                Mensaje
                              </th>
                              <th
                                style={{
                                  padding: '12px 14px',
                                  textAlign: 'left',
                                  color: '#bfc7e4',
                                  fontWeight: '600',
                                }}
                              >
                                Fecha y Hora
                              </th>
                              <th
                                style={{
                                  padding: '12px 14px',
                                  textAlign: 'center',
                                  color: '#bfc7e4',
                                  fontWeight: '600',
                                }}
                              >
                                Prioridad
                              </th>
                              <th
                                style={{
                                  padding: '12px 14px',
                                  textAlign: 'center',
                                  color: '#bfc7e4',
                                  fontWeight: '600',
                                }}
                              >
                                Acción
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {route.mensajes.map((mensaje) => {
                              const isUrgentUnack = mensaje.prioridad === 'ALTA' && !mensaje.acknowledged;
                              return (
                                <tr
                                  key={mensaje.id}
                                  style={{
                                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                                    background: isUrgentUnack
                                      ? 'rgba(220, 38, 38, 0.18)'
                                      : mensaje.prioridad === 'ALTA'
                                      ? 'rgba(220, 38, 38, 0.06)'
                                      : 'transparent',
                                    animation: isUrgentUnack ? 'pulse-red 1.5s infinite' : 'none',
                                    transition: 'background 0.2s',
                                  }}
                                >
                                  <td style={{ padding: '12px 14px', color: '#e2e8f0' }}>
                                    {mensaje.mensaje || '—'}
                                  </td>
                                  <td style={{ padding: '12px 14px', color: '#bfc7e4' }}>
                                    {formatTimestamp(mensaje.timestamp_evento)}
                                  </td>
                                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
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
                                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                    {mensaje.prioridad === 'ALTA' ? (
                                      !mensaje.acknowledged ? (
                                        <button
                                          onClick={() => handleAcknowledge(mensaje.id)}
                                          style={{
                                            background: '#22c55e',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: '6px',
                                            padding: '6px 12px',
                                            fontSize: '11px',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            transition: 'opacity 0.2s',
                                          }}
                                          onMouseEnter={(e) => {
                                            e.currentTarget.style.opacity = '0.8';
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.opacity = '1';
                                          }}
                                        >
                                          Confirmar
                                        </button>
                                      ) : (
                                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                          ✓ Notificado
                                        </span>
                                      )
                                    ) : null}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div
        style={{
          fontSize: '12px',
          color: '#64748b',
          textAlign: 'center',
        }}
      >
        ↻ Polling automático cada 10 segundos
      </div>

      <style>{`
        @keyframes pulse-red {
          0%, 100% { background-color: rgba(220, 38, 38, 0.18); }
          50% { background-color: rgba(220, 38, 38, 0.38); }
        }
      `}</style>
    </div>
  );
}
