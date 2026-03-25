// src/components/AlertDetailPanel.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Panel de detalle de alerta seleccionada — reemplaza MapView (sin GPS por ahora).
// CA-2: muestra conductor, patente y enlace a ubicación (Google Maps link).
// CA-3: botones de Acuse de Recibo y Marcar Resuelta desde el panel.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from "react";

const PRIORITY_CONFIG = {
  CRITICA: { label: "CRÍTICA",  border: "#ff1744", glow: "#ff174440", icon: "🚨", badgeBg: "#ff1744" },
  ALTA:    { label: "ALTA",     border: "#ff6d00", glow: "#ff6d0040", icon: "⚠️", badgeBg: "#ff6d00" },
  NORMAL:  { label: "NORMAL",   border: "#1565c0", glow: "#1565c040", icon: "ℹ️", badgeBg: "#1565c0" },
  BAJA:    { label: "BAJA",     border: "#2e7d32", glow: "#2e7d3240", icon: "📋", badgeBg: "#2e7d32" },
};

const ALERT_TYPE_LABELS = {
  DESVIO_RUTA:  "Desvío de Ruta",
  BOTON_PANICO: "Botón de Pánico",
  ANOMALIA:     "Anomalía en Ruta",
  MANTENCION:   "Mantención Requerida",
};

function formatTimestamp(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("es-CL", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function timeAgo(ts) {
  if (!ts) return "";
  const diff = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (diff < 60)   return `hace ${diff}s`;
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
  return `hace ${Math.floor(diff / 3600)}h`;
}

// Genera el enlace a Google Maps (CA-2 placeholder — sin API key requerida)
function buildMapsLink(alert) {
  if (alert.lat && alert.lng) {
    return `https://www.google.com/maps?q=${alert.lat},${alert.lng}`;
  }
  if (alert.last_location_label) {
    return `https://www.google.com/maps/search/${encodeURIComponent(alert.last_location_label)}`;
  }
  return null;
}

export default function AlertDetailPanel({ alert, onAcknowledge, onResolve, currentOperatorId }) {
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [isResolving, setIsResolving]         = useState(false);

  // ── Estado vacío ────────────────────────────────────────────────────────
  if (!alert) {
    return (
      <div style={emptyContainerStyle}>
        <div style={{ fontSize: "52px", marginBottom: "16px", opacity: 0.3 }}>📋</div>
        <p style={{ color: "#334", margin: 0, fontSize: "14px", fontWeight: 600 }}>
          Selecciona una alerta
        </p>
        <p style={{ color: "#2a3a4a", margin: "8px 0 0", fontSize: "12px", fontFamily: "'DM Mono', monospace" }}>
          Haz click en una alerta de la cola para ver su detalle completo
        </p>
      </div>
    );
  }

  const cfg        = PRIORITY_CONFIG[alert.priority] ?? PRIORITY_CONFIG.NORMAL;
  const isPending  = alert.status === "PENDIENTE";
  const isManaging = alert.status === "EN_GESTION";
  const mapsLink   = buildMapsLink(alert);

  async function handleAcknowledge() {
    setIsAcknowledging(true);
    await onAcknowledge(alert.id, currentOperatorId);
    setIsAcknowledging(false);
  }

  async function handleResolve() {
    setIsResolving(true);
    await onResolve(alert.id);
    setIsResolving(false);
  }

  return (
    <div style={panelStyle}>
      {/* ── Encabezado con glow de prioridad ── */}
      <div
        style={{
          padding: "24px 28px 20px",
          borderBottom: `1px solid ${cfg.border}33`,
          background: `linear-gradient(180deg, ${cfg.glow} 0%, transparent 100%)`,
        }}
      >
        {/* Badges */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
          <span style={{ ...badgeStyle, background: cfg.badgeBg }}>
            {cfg.icon} {cfg.label}
          </span>
          <span style={{ ...badgeStyle, background: "#ffffff12", color: "#ccc" }}>
            {ALERT_TYPE_LABELS[alert.alert_type] ?? alert.alert_type}
          </span>
          <span style={{
            ...badgeStyle,
            marginLeft: "auto",
            background: isPending ? "#ff174422" : isManaging ? "#ff6d0022" : "#ffffff12",
            color: isPending ? "#ff6b6b" : isManaging ? "#ffb347" : "#aaa",
            border: `1px solid ${isPending ? "#ff174455" : isManaging ? "#ff6d0055" : "#ffffff22"}`,
          }}>
            {isPending ? "⏳ Pendiente" : isManaging ? "🔧 En Gestión" : "✅ Resuelta"}
          </span>
        </div>

        <h2 style={{ color: "#fff", margin: "0 0 4px", fontSize: "18px", fontFamily: "'Syne', sans-serif", fontWeight: 700 }}>
          {ALERT_TYPE_LABELS[alert.alert_type] ?? alert.alert_type}
        </h2>
        <p style={{ color: "#556", margin: 0, fontSize: "12px", fontFamily: "'DM Mono', monospace" }}>
          ID #{String(alert.id).slice(0, 8).toUpperCase()} · {formatTimestamp(alert.created_at)} ({timeAgo(alert.created_at)})
        </p>
      </div>

      {/* ── Cuerpo del detalle ── */}
      <div style={{ padding: "20px 28px", overflowY: "auto", flex: 1 }}>

        {/* Conductor y vehículo — CA-2 */}
        <Section title="Vehículo y Conductor">
          <InfoRow icon="👤" label="Conductor"  value={alert.driver_name   ?? "—"} />
          <InfoRow icon="🚛" label="Patente"    value={alert.vehicle_plate ?? "—"} highlight />
        </Section>

        {/* Ubicación con enlace a Google Maps — CA-2 placeholder */}
        <Section title="Ubicación">
          <InfoRow
            icon="📍"
            label="Última posición conocida"
            value={
              alert.last_location_label
                ?? (alert.lat && alert.lng ? `${alert.lat?.toFixed(5)}, ${alert.lng?.toFixed(5)}` : "Sin datos de ubicación")
            }
          />
          {mapsLink ? (
            <a
              href={mapsLink}
              target="_blank"
              rel="noopener noreferrer"
              id="btn-ver-ubicacion-maps"
              style={mapsLinkStyle}
            >
              🗺️ Ver ubicación en Google Maps
              <span style={{ fontSize: "10px", opacity: 0.6, marginLeft: "6px" }}>↗</span>
            </a>
          ) : (
            <div style={noLocationStyle}>
              📡 Datos de GPS no disponibles aún
            </div>
          )}
        </Section>

        {/* Descripción */}
        {alert.description && (
          <Section title="Descripción del Evento">
            <p style={{
              color: "#ccc", fontSize: "13px", margin: 0, lineHeight: 1.6,
              padding: "12px 14px", background: "#ffffff06",
              borderRadius: "8px", borderLeft: `3px solid ${cfg.border}`,
            }}>
              {alert.description}
            </p>
          </Section>
        )}

        {/* Acuse de recibo — CA-3 */}
        {alert.acknowledged_by && (
          <Section title="Registro de Gestión">
            <InfoRow icon="✅" label="Acusado por"  value={alert.acknowledged_by} />
            <InfoRow icon="🕐" label="Hora de acuse" value={formatTimestamp(alert.acknowledged_at)} />
            {alert.resolved_at && (
              <InfoRow icon="🏁" label="Resuelto a las" value={formatTimestamp(alert.resolved_at)} />
            )}
          </Section>
        )}
      </div>

      {/* ── Acciones — CA-3 ── */}
      <div style={{
        padding: "16px 28px",
        borderTop: "1px solid #1e2a3a",
        display: "flex",
        gap: "10px",
        flexShrink: 0,
        background: "#060910",
      }}>
        {isPending && (
          <button
            id="btn-acuse-recibo"
            onClick={handleAcknowledge}
            disabled={isAcknowledging}
            style={actionBtn("#b71c1c", "#c62828")}
          >
            {isAcknowledging ? "Procesando..." : "✔ Acuse de Recibo"}
          </button>
        )}
        {isManaging && (
          <button
            id="btn-marcar-resuelta"
            onClick={handleResolve}
            disabled={isResolving}
            style={actionBtn("#1b5e20", "#2e7d32")}
          >
            {isResolving ? "Procesando..." : "✅ Marcar como Resuelta"}
          </button>
        )}
        {!isPending && !isManaging && (
          <p style={{ color: "#445", fontSize: "13px", margin: 0, fontFamily: "'DM Mono', monospace" }}>
            Esta alerta ya fue resuelta.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Sub-componentes ──────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <div style={{
        fontSize: "10px", fontWeight: 700, color: "#445",
        fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em",
        marginBottom: "10px", paddingBottom: "6px",
        borderBottom: "1px solid #1e2a3a",
      }}>
        {title.toUpperCase()}
      </div>
      {children}
    </div>
  );
}

function InfoRow({ icon, label, value, highlight }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "10px" }}>
      <span style={{ fontSize: "14px", flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "10px", color: "#556", marginBottom: "2px", fontFamily: "'DM Mono', monospace" }}>
          {label.toUpperCase()}
        </div>
        <div style={{
          fontSize: "14px",
          color: highlight ? "#fff" : "#ccc",
          fontWeight: highlight ? 700 : 400,
          fontFamily: highlight ? "'DM Mono', monospace" : "inherit",
          letterSpacing: highlight ? "0.08em" : "normal",
        }}>
          {value}
        </div>
      </div>
    </div>
  );
}

// ── Estilos ──────────────────────────────────────────────────────────────────

const panelStyle = {
  width: "100%", height: "100%",
  background: "#0a0e1a",
  display: "flex", flexDirection: "column",
  overflowY: "hidden",
};

const emptyContainerStyle = {
  width: "100%", height: "100%",
  display: "flex", flexDirection: "column",
  alignItems: "center", justifyContent: "center",
  background: "#0a0e1a",
};

const badgeStyle = {
  fontSize: "11px", fontWeight: 700,
  padding: "3px 10px", borderRadius: "20px",
  color: "#fff", fontFamily: "'DM Mono', monospace",
  letterSpacing: "0.06em",
};

const mapsLinkStyle = {
  display: "inline-flex",
  alignItems: "center",
  marginTop: "8px",
  padding: "8px 14px",
  background: "#1565c022",
  border: "1px solid #1565c066",
  borderRadius: "8px",
  color: "#64b5f6",
  fontSize: "13px",
  fontWeight: 600,
  textDecoration: "none",
  transition: "background 0.2s",
  fontFamily: "'Syne', sans-serif",
};

const noLocationStyle = {
  marginTop: "8px",
  padding: "8px 14px",
  background: "#ffffff06",
  border: "1px dashed #334",
  borderRadius: "8px",
  color: "#445",
  fontSize: "12px",
  fontFamily: "'DM Mono', monospace",
};

function actionBtn(bg, hoverBg) {
  return {
    flex: 1, background: bg, color: "#fff",
    border: "none", borderRadius: "8px",
    padding: "10px 16px", fontSize: "13px",
    fontWeight: 700, cursor: "pointer",
    transition: "background 0.2s",
    fontFamily: "'Syne', sans-serif",
  };
}
