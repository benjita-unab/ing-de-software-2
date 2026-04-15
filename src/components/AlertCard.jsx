// src/components/AlertCard.jsx
import React, { useState } from "react";

const PRIORITY_CONFIG = {
  CRITICA: { label: "CRÍTICA",  bg: "#1a0000", border: "#ff1744", badgeBg: "#ff1744", badgeText: "#fff", pulse: true,  icon: "🚨" },
  ALTA:    { label: "ALTA",     bg: "#1a0800", border: "#ff6d00", badgeBg: "#ff6d00", badgeText: "#fff", pulse: true,  icon: "⚠️" },
  NORMAL:  { label: "NORMAL",   bg: "#0d1a2e", border: "#1565c0", badgeBg: "#1565c0", badgeText: "#fff", pulse: false, icon: "ℹ️" },
  BAJA:    { label: "BAJA",     bg: "#0d1a0d", border: "#2e7d32", badgeBg: "#2e7d32", badgeText: "#fff", pulse: false, icon: "📋" },
};

const ALERT_TYPE_LABELS = {
  DESVIO_RUTA:  "Desvío de Ruta",
  BOTON_PANICO: "Botón de Pánico",
  ANOMALIA:     "Anomalía en Ruta",
  MANTENCION:   "Mantención Requerida",
  ALERTA:       "Alerta Identificada",
  NORMAL:       "Incidencia Normal",
  EMERGENCIA:   "Emergencia Grave",
};

function formatTimestamp(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleString("es-CL", {
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

// Genera enlace a Google Maps sin API key (CA-2 placeholder de ubicación)
function buildMapsLink(alert) {
  if (alert.lat && alert.lng) return `https://www.google.com/maps?q=${alert.lat},${alert.lng}`;
  if (alert.last_location_label) return `https://www.google.com/maps/search/${encodeURIComponent(alert.last_location_label)}`;
  return null;
}

export default function AlertCard({
  alert,
  onAcknowledge,
  onResolve,
  onSelect,
  currentOperatorId,
  isSelected = false,
}) {
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [isResolving, setIsResolving]         = useState(false);

  const cfg       = PRIORITY_CONFIG[alert.priority] ?? PRIORITY_CONFIG.NORMAL;
  const isPending = alert.status === "PENDIENTE";
  const isManaging = alert.status === "EN_GESTION";

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

  const mapsLink = buildMapsLink(alert);

  return (
    <div
      onClick={() => onSelect?.(alert)}
      style={{
        background: isSelected ? `${cfg.border}18` : cfg.bg,
        border: isSelected ? `2px solid ${cfg.border}` : `2px solid ${isSelected ? cfg.border : cfg.border + "88"}`,
        borderRadius: "12px",
        padding: "16px 20px",
        marginBottom: "10px",
        position: "relative",
        boxShadow: isSelected
          ? `0 0 24px ${cfg.border}88, 0 2px 8px #0008`
          : cfg.pulse ? `0 0 18px ${cfg.border}55, 0 2px 8px #0008` : "0 2px 8px #0008",
        animation: cfg.pulse && isPending && !isSelected ? "pulseCard 2s infinite" : "none",
        transition: "all 0.25s ease",
        cursor: "pointer",
        outline: isSelected ? `1px solid ${cfg.border}55` : "none",
        outlineOffset: "2px",
      }}
    >
      {/* ── Badge de prioridad + tipo ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
        <span style={{
          background: cfg.badgeBg, color: cfg.badgeText, fontSize: "11px",
          fontWeight: 700, padding: "3px 10px", borderRadius: "20px",
          letterSpacing: "0.08em", fontFamily: "'DM Mono', monospace",
        }}>
          {cfg.icon} {cfg.label}
        </span>
        <span style={{
          background: "#ffffff15", color: "#ccc", fontSize: "11px",
          padding: "3px 10px", borderRadius: "20px", fontFamily: "'DM Mono', monospace",
        }}>
          {ALERT_TYPE_LABELS[alert.alert_type] ?? alert.alert_type}
        </span>
        <span style={{
          marginLeft: "auto", fontSize: "11px", padding: "3px 10px", borderRadius: "20px", fontWeight: 600,
          background: isPending ? "#ff174422" : isManaging ? "#ff6d0022" : "#ffffff15",
          color: isPending ? "#ff6b6b" : isManaging ? "#ffb347" : "#aaa",
          border: `1px solid ${isPending ? "#ff174455" : isManaging ? "#ff6d0055" : "#ffffff22"}`,
        }}>
          {isPending ? "⏳ Pendiente" : isManaging ? "🔧 En Gestión" : "✅ Resuelta"}
        </span>
      </div>

      {/* ── Datos del conductor y vehículo ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", marginBottom: "14px" }}>
        <DataRow icon="👤" label="Conductor"       value={alert.driver_name ?? "—"} />
        <DataRow icon="🚛" label="Patente"         value={alert.vehicle_plate ?? "—"} highlight />
        <DataRow icon="📍" label="Última posición" value={alert.last_location_label ?? `${alert.lat?.toFixed(5)}, ${alert.lng?.toFixed(5)}`} />
        <DataRow icon="🕐" label="Evento"          value={`${formatTimestamp(alert.created_at)} (${timeAgo(alert.created_at)})`} />
        {alert.acknowledged_by && (
          <DataRow icon="✅" label="Acusado por" value={`${alert.acknowledged_by} — ${formatTimestamp(alert.acknowledged_at)}`} />
        )}
      </div>

      {/* ── Descripción ── */}
      {alert.description && (
        <p style={{
          color: "#ccc", fontSize: "13px", margin: "0 0 14px",
          padding: "10px 12px", background: "#ffffff08",
          borderRadius: "8px", borderLeft: `3px solid ${cfg.border}`, lineHeight: 1.5,
        }}>
          {alert.description}
        </p>
      )}

      {/* ── Acciones ── */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }} onClick={(e) => e.stopPropagation()}>
        {/* Enlace directo a Google Maps — CA-2 (placeholder sin GPS) */}
        {mapsLink && (
          <a
            href={mapsLink}
            target="_blank"
            rel="noopener noreferrer"
            style={mapsLinkBtnStyle}
            title="Ver ubicación en Google Maps"
          >
            🗺️ Ver Ubicación
          </a>
        )}
        {isPending && (
          <button onClick={handleAcknowledge} disabled={isAcknowledging} style={btnStyle("#b71c1c")}>
            {isAcknowledging ? "Procesando..." : "✔ Acuse de Recibo"}
          </button>
        )}
        {isManaging && (
          <button onClick={handleResolve} disabled={isResolving} style={btnStyle("#1b5e20")}>
            {isResolving ? "Procesando..." : "✅ Marcar Resuelta"}
          </button>
        )}
        <button onClick={() => onSelect?.(alert)} style={btnStyle("#1a2a3a")}>
          {isSelected ? "✦ Seleccionada" : "Ver Detalle →"}
        </button>
      </div>
    </div>
  );
}

function DataRow({ icon, label, value, highlight }) {
  return (
    <div>
      <div style={{ fontSize: "10px", color: "#888", marginBottom: "2px", fontFamily: "'DM Mono', monospace" }}>
        {icon} {label.toUpperCase()}
      </div>
      <div style={{
        fontSize: "13px",
        color: highlight ? "#fff" : "#ddd",
        fontWeight: highlight ? 700 : 400,
        fontFamily: highlight ? "'DM Mono', monospace" : "inherit",
        letterSpacing: highlight ? "0.05em" : "normal",
      }}>
        {value}
      </div>
    </div>
  );
}

function btnStyle(bg) {
  return {
    background: bg, color: "#fff", border: "none", borderRadius: "8px",
    padding: "8px 14px", fontSize: "12px", fontWeight: 600,
    cursor: "pointer", transition: "background 0.2s", fontFamily: "inherit",
  };
}

const mapsLinkBtnStyle = {
  display: "inline-flex", alignItems: "center",
  background: "#1565c022", color: "#64b5f6",
  border: "1px solid #1565c055", borderRadius: "8px",
  padding: "7px 13px", fontSize: "12px", fontWeight: 600,
  textDecoration: "none", cursor: "pointer",
  transition: "background 0.2s", fontFamily: "inherit",
};
