// src/components/Sidebar.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Sidebar de navegación del portal web del Operador de Sucursal.
// Incluye datos reales del operador autenticado y botón de cerrar sesión.
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";

const NAV_ITEMS = [
  { id: "alertas",   icon: "🚨", label: "Alertas Críticas",   badge: true },
  { id: "asignacion",icon: "📋", label: "Asignar Rutas" },
  { id: "historial", icon: "📜", label: "Historial Despachos" },
  { id: "clientes",  icon: "👤", label: "Crear Cliente" },
  { id: "rutas",     icon: "🗺️",  label: "Rutas Activas" },
  { id: "despachos", icon: "📑", label: "Guías de Despacho" },
  { id: "camiones",  icon: "🚛", label: "Estado de Flota" },
  { id: "mensajes",  icon: "💬", label: "Mensajería" },
  { id: "rrhh",      icon: "👥", label: "Recursos Humanos" }, // <-- NUEVO BOTÓN
];

export default function Sidebar({
  activeSection,
  onNavigate,
  urgentCount = 0,
  operator,
  onSignOut,
}) {
  return (
    <aside
      style={{
        width: "220px",
        background: "#060910",
        borderRight: "1px solid #1e2a3a",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        height: "100%",
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "24px 20px 20px",
          borderBottom: "1px solid #1e2a3a",
        }}
      >
        <div style={{ fontSize: "20px", marginBottom: "4px" }}>🚚</div>
        <div
          style={{
            color: "#fff",
            fontWeight: 700,
            fontSize: "15px",
            fontFamily: "'Syne', sans-serif",
            lineHeight: 1.2,
          }}
        >
          LogiTrack
        </div>
        <div
          style={{
            color: "#556",
            fontSize: "11px",
            marginTop: "2px",
            fontFamily: "'DM Mono', monospace",
          }}
        >
          PANEL OPERADOR
        </div>
      </div>

      {/* Navegación */}
      <nav style={{ flex: 1, padding: "12px 10px" }}>
        {NAV_ITEMS.map((item) => {
          const isActive  = activeSection === item.id;
          const showBadge = item.badge && urgentCount > 0;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                width: "100%",
                background: isActive ? "#1565c022" : "transparent",
                border: isActive ? "1px solid #1565c044" : "1px solid transparent",
                borderRadius: "8px",
                padding: "10px 12px",
                cursor: "pointer",
                marginBottom: "4px",
                color: isActive ? "#fff" : "#778",
                fontFamily: "'Syne', sans-serif",
                fontSize: "13px",
                fontWeight: isActive ? 700 : 400,
                textAlign: "left",
                transition: "all 0.15s ease",
                position: "relative",
              }}
            >
              <span style={{ fontSize: "16px" }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {showBadge && (
                <span
                  style={{
                    background: "#ff1744",
                    color: "#fff",
                    fontSize: "10px",
                    fontWeight: 700,
                    minWidth: "18px",
                    height: "18px",
                    borderRadius: "9px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 4px",
                    animation: "pulse 1.5s infinite",
                  }}
                >
                  {urgentCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer con datos del operador autenticado */}
      <div
        style={{
          padding: "16px 20px",
          borderTop: "1px solid #1e2a3a",
        }}
      >
        {/* Avatar inicial */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #1565c0, #1976d2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "14px",
              fontWeight: 700,
              color: "#fff",
              flexShrink: 0,
            }}
          >
            {operator?.full_name?.[0]?.toUpperCase() ?? "O"}
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                color: "#ccc",
                fontSize: "13px",
                fontWeight: 600,
                fontFamily: "'Syne', sans-serif",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {operator?.full_name ?? "Operador"}
            </div>
            {operator?.branch && (
              <div
                style={{
                  color: "#445",
                  fontSize: "10px",
                  fontFamily: "'DM Mono', monospace",
                  marginTop: "1px",
                }}
              >
                {operator.branch}
              </div>
            )}
          </div>
        </div>

        {/* Botón cerrar sesión */}
        <button
          onClick={onSignOut}
          style={{
            width: "100%",
            background: "transparent",
            border: "1px solid #1e2a3a",
            borderRadius: "7px",
            padding: "7px",
            color: "#445",
            fontSize: "11px",
            cursor: "pointer",
            fontFamily: "'DM Mono', monospace",
            transition: "border-color 0.2s, color 0.2s",
            letterSpacing: "0.04em",
          }}
        >
          ⎋ Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
