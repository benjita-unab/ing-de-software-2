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
        width: "250px",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        height: "100%",
        borderRadius: "18px",
        overflow: "hidden",
      }}
      className="glass-nav"
    >
      {/* Logo */}
      <div
        style={{
          padding: "24px 20px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        <div style={{ fontSize: "20px", marginBottom: "4px" }}>🚚</div>
        <div
          style={{
            color: "#fff",
            fontWeight: 800,
            fontSize: "16px",
            lineHeight: 1.2,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          LogiTrack
        </div>
        <div
          style={{
            color: "rgba(255,255,255,0.65)",
            fontSize: "10px",
            marginTop: "2px",
            letterSpacing: "0.18em",
          }}
        >
          PANEL OPERADOR
        </div>
      </div>

      {/* Navegación */}
      <nav style={{ flex: 1, padding: "12px 10px", overflow: "auto" }} className="premium-scroll">
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
                background: isActive ? "linear-gradient(135deg, rgba(58,12,163,0.45), rgba(18,24,92,0.6))" : "rgba(0,0,0,0.05)",
                border: isActive ? "1px solid rgba(76,201,240,0.55)" : "1px solid transparent",
                borderRadius: "999px",
                padding: "10px 12px",
                cursor: "pointer",
                marginBottom: "4px",
                color: isActive ? "#fff" : "rgba(255,255,255,0.78)",
                fontSize: "11px",
                fontWeight: isActive ? 700 : 400,
                textAlign: "left",
                transition: "all 0.15s ease",
                position: "relative",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                boxShadow: isActive ? "0 0 16px rgba(76,201,240,0.2)" : "none",
              }}
            >
              <span style={{ fontSize: "16px" }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {showBadge && (
                <span
                  style={{
                    background: "#f72585",
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
          borderTop: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        {/* Avatar inicial */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #12185c, #3a0ca3)",
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
                color: "#fff",
                fontSize: "13px",
                fontWeight: 600,
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
                  color: "rgba(255,255,255,0.65)",
                  fontSize: "10px",
                  marginTop: "1px",
                  letterSpacing: "0.08em",
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
            borderRadius: "999px",
            padding: "7px",
            color: "#fff",
            fontSize: "11px",
            cursor: "pointer",
            transition: "border-color 0.2s, color 0.2s",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
          className="premium-pill-btn"
        >
          ⎋ Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
