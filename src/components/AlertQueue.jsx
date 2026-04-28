// src/components/AlertQueue.jsx
import React, { useState } from "react";
import AlertCard from "./AlertCard";

const FILTERS = ["TODAS", "PENDIENTE", "EN_GESTION", "RESUELTA"];

const PRIORITY_SECTIONS = [
  { key: "CRITICA", label: "🚨 Críticas",       color: "#f72585" },
  { key: "ALTA",    label: "⚠️ Alta Prioridad",  color: "#4cc9f0" },
  { key: "NORMAL",  label: "ℹ️ Normales",        color: "rgba(255,255,255,0.8)" },
  { key: "BAJA",    label: "📋 Baja Prioridad",  color: "rgba(255,255,255,0.6)" },
];

export default function AlertQueue({
  alerts,
  loading,
  onAcknowledge,
  onResolve,
  onSelectAlert,
  selectedAlertId,
  operatorId,
}) {
  const [statusFilter, setStatusFilter] = useState("TODAS");
  const [searchText, setSearchText]     = useState("");

  const filtered = alerts.filter((a) => {
    const matchStatus = statusFilter === "TODAS" || a.status === statusFilter;
    const matchSearch =
      !searchText ||
      a.driver_name?.toLowerCase().includes(searchText.toLowerCase()) ||
      a.vehicle_plate?.toLowerCase().includes(searchText.toLowerCase());
    return matchStatus && matchSearch;
  });

  const pendingCritical = alerts.filter(
    (a) => ["CRITICA", "ALTA"].includes(a.priority) && a.status === "PENDIENTE"
  ).length;

  return (
    <div
      className="alert-queue"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "transparent",
      }}
    >
      {/* ── Header de la cola ── */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.12)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
          <h2 style={{ color: "#fff", margin: 0, fontSize: "13px", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Cola de Alertas
          </h2>
          {pendingCritical > 0 && (
            <span
              style={{
                background: "#f72585",
                color: "#fff",
                fontSize: "11px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "12px",
                animation: "pulse 1s infinite",
              }}
            >
              {pendingCritical} URGENTE{pendingCritical > 1 ? "S" : ""}
            </span>
          )}
          <span
            style={{
              marginLeft: "auto",
              color: "rgba(255,255,255,0.7)",
              fontSize: "11px",
            }}
          >
            {filtered.length} alerta{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Búsqueda */}
        <input
          className="alert-search-input"
          type="text"
          placeholder="Buscar conductor o patente..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{
            width: "100%",
            background: "rgba(8,8,12,0.7)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: "999px",
            padding: "8px 12px",
            color: "#fff",
            fontSize: "13px",
            outline: "none",
            marginBottom: "10px",
            boxSizing: "border-box",
            fontFamily: "inherit",
            boxShadow: "inset 0 0 12px rgba(76,201,240,0.12)",
          }}
        />

        {/* Filtros de estado */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              style={{
                background: statusFilter === f ? "linear-gradient(135deg, #3a0ca3, #12185c)" : "rgba(255,255,255,0.05)",
                color: statusFilter === f ? "#fff" : "rgba(255,255,255,0.75)",
                border: `1px solid ${statusFilter === f ? "rgba(76,201,240,0.6)" : "rgba(255,255,255,0.14)"}`,
                borderRadius: "999px",
                padding: "4px 10px",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
                letterSpacing: "0.06em",
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* ── Lista de alertas ── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "14px 14px",
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(76,201,240,0.4) transparent",
        }}
        className="premium-scroll"
      >
        {loading ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <EmptyState filter={statusFilter} />
        ) : (
          PRIORITY_SECTIONS.map(({ key, label, color }) => {
            const section = filtered.filter((a) => a.priority === key);
            if (section.length === 0) return null;
            return (
              <div key={key} style={{ marginBottom: "8px" }}>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color,
                    padding: "4px 0",
                    marginBottom: "6px",
                    borderBottom: `1px solid ${color}33`,
                    fontFamily: "'DM Mono', monospace",
                    letterSpacing: "0.06em",
                  }}
                >
                  {label} ({section.length})
                </div>
                {section.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    onAcknowledge={onAcknowledge}
                    onResolve={onResolve}
                    onSelect={onSelectAlert}
                    isSelected={alert.id === selectedAlertId}
                    currentOperatorId={operatorId}
                  />
                ))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div style={{ textAlign: "center", padding: "40px 20px", color: "#555" }}>
      <div style={{ fontSize: "28px", marginBottom: "12px" }}>⏳</div>
      <p style={{ margin: 0, fontSize: "13px" }}>Cargando alertas...</p>
    </div>
  );
}

function EmptyState({ filter }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 20px", color: "#555" }}>
      <div style={{ fontSize: "32px", marginBottom: "12px" }}>✅</div>
      <p style={{ margin: 0, fontSize: "14px", color: "#666" }}>
        {filter === "TODAS"
          ? "Sin alertas activas"
          : `Sin alertas con estado "${filter}"`}
      </p>
    </div>
  );
}
