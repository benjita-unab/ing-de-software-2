// src/components/OperatorDashboard.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Layout principal del Operador de Sucursal — HU-2
// Estructura: Sidebar | Cola de Alertas | Mapa
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from "react";
import Sidebar from "./Sidebar";
import AlertQueue from "./AlertQueue";
import MapView from "./MapView";
import { useAlerts } from "../hooks/useAlerts";

export default function OperatorDashboard() {
  const { alerts, loading, acknowledgeAlert, resolveAlert } = useAlerts();
  const [activeSection, setActiveSection] = useState("alertas");
  const [focusedAlert, setFocusedAlert] = useState(null);

  // Contar alertas urgentes sin acuse de recibo
  const urgentCount = alerts.filter(
    (a) => ["CRITICA", "ALTA"].includes(a.priority) && a.status === "PENDIENTE"
  ).length;

  function handleFocusMap(alert) {
    setFocusedAlert(alert);
    // Si el usuario está en otra sección, lo llevamos al mapa
    if (activeSection !== "alertas") setActiveSection("alertas");
  }

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        background: "#0a0e1a",
        color: "#fff",
        fontFamily: "'Syne', 'DM Mono', sans-serif",
        overflow: "hidden",
      }}
    >
      {/* ── Sidebar ── */}
      <Sidebar
        activeSection={activeSection}
        onNavigate={setActiveSection}
        urgentCount={urgentCount}
      />

      {/* ── Contenido principal ── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Topbar */}
        <TopBar urgentCount={urgentCount} section={activeSection} />

        {/* Vista de alertas + mapa (HU-2) */}
        {activeSection === "alertas" && (
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
            {/* Cola de alertas */}
            <div
              style={{
                width: "400px",
                flexShrink: 0,
                borderRight: "1px solid #1e2a3a",
                overflowY: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <AlertQueue
                alerts={alerts}
                loading={loading}
                onAcknowledge={acknowledgeAlert}
                onResolve={resolveAlert}
                onFocusMap={handleFocusMap}
              />
            </div>

            {/* Mapa */}
            <div style={{ flex: 1, position: "relative" }}>
              <MapView alerts={alerts} focusedAlert={focusedAlert} />
            </div>
          </div>
        )}

        {/* Placeholder para otras secciones */}
        {activeSection !== "alertas" && (
          <PlaceholderSection section={activeSection} />
        )}
      </main>

      {/* Estilos globales (animaciones) */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');

        * { box-sizing: border-box; }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.08); }
        }

        @keyframes pulseCard {
          0%, 100% { box-shadow: 0 0 18px #ff174455, 0 2px 8px #0008; }
          50%       { box-shadow: 0 0 32px #ff1744aa, 0 2px 8px #0008; }
        }

        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #0a0e1a; }
        ::-webkit-scrollbar-thumb { background: #1e2a3a; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #2a3a50; }

        button:hover { filter: brightness(1.15); }
        button:active { filter: brightness(0.9); }
      `}</style>
    </div>
  );
}

// ─── TopBar ─────────────────────────────────────────────────────────────────
function TopBar({ urgentCount, section }) {
  const SECTION_LABELS = {
    alertas:   "🚨 Gestión de Alertas Críticas",
    rutas:     "🗺️ Rutas Activas",
    despachos: "📋 Guías de Despacho",
    camiones:  "🚛 Estado de Flota",
    mensajes:  "💬 Mensajería",
  };

  return (
    <header
      style={{
        height: "56px",
        background: "#060910",
        borderBottom: "1px solid #1e2a3a",
        display: "flex",
        alignItems: "center",
        padding: "0 20px",
        gap: "16px",
        flexShrink: 0,
      }}
    >
      <h1
        style={{
          margin: 0,
          fontSize: "15px",
          fontWeight: 700,
          color: "#fff",
          fontFamily: "'Syne', sans-serif",
        }}
      >
        {SECTION_LABELS[section] ?? section}
      </h1>

      {urgentCount > 0 && (
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "#ff174418",
            border: "1px solid #ff174455",
            borderRadius: "20px",
            padding: "5px 14px",
            animation: "pulseCard 2s infinite",
          }}
        >
          <span style={{ fontSize: "12px", color: "#ff6b6b" }}>
            🚨 {urgentCount} alerta{urgentCount > 1 ? "s" : ""} urgente{urgentCount > 1 ? "s" : ""} sin atender
          </span>
        </div>
      )}

      {/* Indicador de conexión Realtime */}
      <div
        style={{
          marginLeft: urgentCount > 0 ? "0" : "auto",
          display: "flex",
          alignItems: "center",
          gap: "5px",
          fontSize: "11px",
          color: "#2e7d32",
          fontFamily: "'DM Mono', monospace",
        }}
      >
        <div
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "#4caf50",
            animation: "pulse 2s infinite",
          }}
        />
        REALTIME
      </div>
    </header>
  );
}

// ─── Placeholder para secciones en desarrollo ─────────────────────────────
function PlaceholderSection({ section }) {
  const ICONS = {
    rutas: "🗺️", despachos: "📋", camiones: "🚛", mensajes: "💬",
  };
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "#445",
      }}
    >
      <div style={{ fontSize: "48px", marginBottom: "16px" }}>{ICONS[section] ?? "🔧"}</div>
      <p style={{ margin: 0, fontSize: "15px", color: "#556" }}>
        Sección <strong style={{ color: "#778" }}>{section}</strong> en desarrollo
      </p>
      <p style={{ margin: "8px 0 0", fontSize: "12px", color: "#334", fontFamily: "'DM Mono', monospace" }}>
        Conecta tu backend y completa el schema
      </p>
    </div>
  );
}
