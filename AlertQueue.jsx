// src/components/AlertQueue.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Cola de alertas del operador.
// Las alertas CRITICA y ALTA siempre aparecen primero (CA-1).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from "react";
import AlertCard from "./AlertCard";

const FILTERS = ["TODAS", "PENDIENTE", "EN_GESTION", "RESUELTA"];

const PRIORITY_SECTIONS = [
  { key: "CRITICA", label: "🚨 Críticas", color: "#ff1744" },
  { key: "ALTA",    label: "⚠️ Alta Prioridad", color: "#ff6d00" },
  { key: "NORMAL",  label: "ℹ️ Normales",       color: "#1565c0" },
  { key: "BAJA",    label: "📋 Baja Prioridad",  color: "#2e7d32" },
];

export default function AlertQueue({
  alerts,
  loading,
  onAcknowledge,
  onResolve,
  onFocusMap,
}) {
  const [statusFilter, setStatusFilter] = useState("TODAS");
  const [searchText, setSearchText] = useState("");

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
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#0a0e1a",
      }}
    >
      {/* ── Header de la cola ── */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid #1e2a3a",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
          <h2 style={{ color: "#fff", margin: 0, fontSize: "16px", fontWeight: 700, fontFamily: "'Syne', sans-serif" }}>
            Cola de Alertas
          </h2>
          {pendingCritical > 0 && (
            <span
              style={{
                background: "#ff1744",
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
              color: "#888",
              fontSize: "12px",
              fontFamily: "'DM Mono', monospace",
            }}
          >
            {filtered.length} alerta{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Búsqueda */}
        <input
          type="text"
          placeholder="Buscar conductor o patente..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{
            width: "100%",
            background: "#111827",
            border: "1px solid #1e2a3a",
            borderRadius: "8px",
            padding: "8px 12px",
            color: "#fff",
            fontSize: "13px",
            outline: "none",
            marginBottom: "10px",
            boxSizing: "border-box",
            fontFamily: "inherit",
          }}
        />

        {/* Filtros de estado */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              style={{
                background: statusFilter === f ? "#1565c0" : "#111827",
                color: statusFilter === f ? "#fff" : "#888",
                border: `1px solid ${statusFilter === f ? "#1565c0" : "#1e2a3a"}`,
                borderRadius: "6px",
                padding: "4px 10px",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "'DM Mono', monospace",
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
          scrollbarColor: "#1e2a3a #0a0e1a",
        }}
      >
        {loading ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <EmptyState filter={statusFilter} />
        ) : (
          // Agrupado por sección de prioridad
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
                    onFocusMap={onFocusMap}
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
