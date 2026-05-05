import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useMensajesConductor } from '../hooks/useMensajesConductor';

function formatTimestamp(value) {
  if (!value) return '—';
  const date = new Date(value);
  return date.toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function playAlarmSound() {
  if (typeof window === 'undefined') return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 520;
  gain.gain.value = 0.15;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.45);
  osc.onended = () => {
    gain.disconnect();
    osc.disconnect();
    ctx.close().catch(() => null);
  };
}

export default function MensajesConductor({ operatorId }) {
  const { mensajes, loading, acknowledgeMensaje } = useMensajesConductor();
  const [selectedMensaje, setSelectedMensaje] = useState(null);
  const [muted, setMuted] = useState(false);
  const playedHighIdsRef = useRef(new Set());

  const mensajesOrdenados = useMemo(
    () => [...mensajes].sort((a, b) => {
      if (a.prioridad !== b.prioridad) return a.prioridad === 'ALTA' ? -1 : 1;
      return new Date(b.timestamp_evento) - new Date(a.timestamp_evento);
    }),
    [mensajes],
  );

  const pendingHigh = mensajesOrdenados.filter(
    (m) => m.prioridad === 'ALTA' && !m.acknowledged,
  );

  useEffect(() => {
    if (muted) return;
    const newHigh = pendingHigh.filter((m) => !playedHighIdsRef.current.has(m.id));
    if (newHigh.length > 0) {
      playAlarmSound();
      newHigh.forEach((m) => playedHighIdsRef.current.add(m.id));
    }
  }, [pendingHigh, muted]);

  const handleAcknowledge = async (mensajeId) => {
    const res = await acknowledgeMensaje(mensajeId, operatorId);
    if (!res.ok) {
      alert(res.message || 'No se pudo confirmar recepción. Intenta de nuevo.');
    }
  };

  const selectedLive = selectedMensaje
    ? mensajesOrdenados.find((m) => m.id === selectedMensaje.id) || selectedMensaje
    : null;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div
        style={{
          borderRadius: '18px',
          background: '#151d3f',
          border: '1px solid rgba(255,255,255,0.1)',
          padding: '18px 22px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '17px', color: '#fff', letterSpacing: '0.03em' }}>
              Mensajes del conductor
            </h2>
            <p style={{ margin: '6px 0 0', color: '#bfc7e4', fontSize: '13px', maxWidth: 620 }}>
              En esta sección se reciben los estados rápidos enviados desde la app móvil. Las emergencias de alta prioridad suenan y se marcan con fuerza visual.
            </p>
          </div>
          <button
            onClick={() => setMuted((current) => !current)}
            style={{
              marginLeft: 'auto',
              background: muted ? '#334155' : '#f97316',
              color: '#fff',
              border: 'none',
              borderRadius: '999px',
              padding: '10px 16px',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            {muted ? 'Sonido silenciado' : 'Silenciar alarmas'}
          </button>
        </div>
        {pendingHigh.length > 0 ? (
          <div
            style={{
              marginTop: '18px',
              padding: '14px 16px',
              background: '#661f1f',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div>
              <strong style={{ color: '#ffe4e6' }}>
                {pendingHigh.length} mensaje{pendingHigh.length > 1 ? 's' : ''} ALTA prioridad sin confirmar
              </strong>
              <p style={{ margin: '6px 0 0', color: '#f8d7da', fontSize: '13px' }}>
                {pendingHigh[0].tipo === 'EMERGENCIA' ? 'Emergencia activa' : 'Alerta alta prioridad'}.
              </p>
            </div>
            <button
              onClick={() => setMuted(true)}
              style={{
                border: '1px solid rgba(255,255,255,0.18)',
                borderRadius: '12px',
                background: 'transparent',
                color: '#fff',
                padding: '10px 14px',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              Silenciar temporal
            </button>
          </div>
        ) : null}
      </div>

      <div style={{ display: 'flex', gap: '14px', flex: 1, minHeight: 0 }}>
        <div style={{ width: '430px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              background: '#0d122e',
              borderRadius: '18px',
              border: '1px solid rgba(255,255,255,0.07)',
              padding: '18px',
              marginBottom: '12px',
            }}
          >
            <h3 style={{ margin: 0, color: '#fff', fontSize: '14px' }}>Filtros rápidos</h3>
            <p style={{ margin: '8px 0 0', color: '#bac8ff', fontSize: '13px' }}>
              Consulta rápidamente los mensajes más recientes. El panel se actualiza automáticamente cada 10 segundos.
            </p>
          </div>
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              paddingRight: '4px',
              borderRadius: '18px',
              background: '#0a0f2e',
              border: '1px solid rgba(255,255,255,0.08)',
              padding: '10px',
            }}
            className="premium-scroll"
          >
            {loading ? (
              <div style={{ padding: '28px 16px', textAlign: 'center', color: '#9ca3af' }}>
                Cargando mensajes…
              </div>
            ) : mensajesOrdenados.length === 0 ? (
              <div style={{ padding: '28px 16px', color: '#cbd5e1', textAlign: 'center' }}>
                No hay mensajes recientes.
              </div>
            ) : (
              mensajesOrdenados.map((mensaje) => (
                <div
                  key={mensaje.id}
                  onClick={() => setSelectedMensaje(mensaje)}
                  style={{
                    cursor: 'pointer',
                    borderRadius: '14px',
                    padding: '14px 16px',
                    marginBottom: '10px',
                    border: mensaje.id === selectedLive?.id ? '2px solid #4f46e5' : '1px solid rgba(255,255,255,0.12)',
                    background: mensaje.prioridad === 'ALTA' ? '#3f1b1b' : '#10172c',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ color: '#c7d2fe', fontSize: '11px' }}>
                      {mensaje.tipo === 'EMERGENCIA' ? '🚨 Emergencia' : 'ℹ️ Estado'}
                    </span>
                    <span style={{ color: mensaje.prioridad === 'ALTA' ? '#fda4af' : '#94a3b8', fontSize: '11px' }}>
                      {mensaje.prioridad}
                    </span>
                    {!mensaje.acknowledged && (
                      <span style={{ marginLeft: 'auto', color: '#fbbf24', fontSize: '11px' }}>
                        Pendiente
                      </span>
                    )}
                  </div>
                  <p style={{ margin: 0, color: '#fff', fontSize: '14px', fontWeight: 700, lineHeight: 1.4 }}>
                    {mensaje.mensaje}
                  </p>
                  <p style={{ margin: '8px 0 0', color: '#9ca3af', fontSize: '12px' }}>
                    Ruta: {mensaje.ruta?.origen ?? '–'} → {mensaje.ruta?.destino ?? '–'}
                  </p>
                  <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '11px' }}>
                    {formatTimestamp(mensaje.timestamp_evento)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, borderRadius: '18px', background: '#0b1128', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ padding: '20px' }}>
            <h3 style={{ margin: 0, color: '#fff', fontSize: '16px' }}>
              Detalle del Mensaje
            </h3>
            {selectedLive ? (
              <>
                <div style={{ marginTop: '18px', display: 'grid', gap: '16px' }}>
                  <DetailRow label="Mensaje" value={selectedLive.mensaje} />
                  <DetailRow label="Prioridad" value={selectedLive.prioridad} />
                  <DetailRow label="Tipo" value={selectedLive.tipo} />
                  <DetailRow
                    label="Ruta"
                    value={selectedLive.ruta ? `${selectedLive.ruta.origen} → ${selectedLive.ruta.destino}` : selectedLive.ruta_id}
                  />
                  <DetailRow label="Patente" value={selectedLive.ruta?.camion ?? '—'} />
                  <DetailRow label="Fecha / Hora" value={formatTimestamp(selectedLive.timestamp_evento)} />
                  <DetailRow
                    label="Acusado"
                    value={selectedLive.acknowledged ? `Sí — ${formatTimestamp(selectedLive.acknowledged_at)}` : 'No' }
                  />
                </div>
                <div style={{ marginTop: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {!selectedLive.acknowledged && (
                    <button
                      onClick={() => handleAcknowledge(selectedLive.id)}
                      style={{
                        background: '#22c55e',
                        color: '#081c15',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '12px 18px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Confirmar recepción
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedMensaje(null)}
                    style={{
                      background: '#1f2937',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '12px',
                      padding: '12px 18px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Limpiar selección
                  </button>
                </div>
              </>
            ) : (
              <p style={{ marginTop: '18px', color: '#cbd5e1', fontSize: '14px' }}>
                Selecciona un mensaje para ver su detalle y confirmar recepción.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'baseline', flexWrap: 'wrap' }}>
      <span style={{ color: '#94a3b8', fontSize: '12px', minWidth: 120 }}>{label}</span>
      <span style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>{value || '—'}</span>
    </div>
  );
}
