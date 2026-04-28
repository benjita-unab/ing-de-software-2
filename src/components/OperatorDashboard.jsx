// src/components/OperatorDashboard.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Layout principal del Operador de Sucursal — HU-2
// Estructura: Topbar horizontal | Cola de Alertas | Panel de Detalle
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from "react";
import AlertQueue from "./AlertQueue";
import AlertDetailPanel from "./AlertDetailPanel";
import MonitoreoLicencias from "./MonitoreoLicencias";
import AsignacionRutas from "./AsignacionRutas";
import GuiasDespacho from "./GuiasDespacho";
import FormularioCliente from "./FormularioCliente";
import HistorialDespachos from "./HistorialDespachos";
import { useAlerts } from "../hooks/useAlerts";

export default function OperatorDashboard({ operator, onSignOut }) {
  const { alerts, loading, acknowledgeAlert, resolveAlert: rawResolveAlert } = useAlerts();
  const [activeSection, setActiveSection] = useState("alertas");
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [isLightMode, setIsLightMode] = useState(false);

  const handleResolveAlert = async (alertId) => {
    const success = await rawResolveAlert(alertId);
    if (success) {
      alert("✅ El problema ya está resuelto y removido de la cola.");
      if (selectedAlert?.id === alertId) {
        setSelectedAlert(null);
      }
    }
  };

  // Contar alertas urgentes sin acuse de recibo
  const urgentCount = alerts.filter(
    (a) => ["CRITICA", "ALTA"].includes(a.priority) && a.status === "PENDIENTE"
  ).length;

  // Cuando la alerta seleccionada es actualizada en Supabase (ej: acuse de recibo),
  // sincronizar el estado local del panel de detalle.
  const selectedAlertLive = selectedAlert
    ? alerts.find((a) => a.id === selectedAlert.id) ?? selectedAlert
    : null;

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        color: "#fff",
        fontFamily: "'Inter', 'Poppins', sans-serif",
        overflow: "hidden",
      }}
      className={`premium-app ${isLightMode ? "light-mode" : ""}`}
    >
      <span className="premium-decor one" />
      <span className="premium-decor two" />
      <span className="premium-decor three" />

      {/* ── Contenido principal ── */}
      <main
        className="stellar-shell"
        style={{
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Topbar */}
        <TopBar
          urgentCount={urgentCount}
          section={activeSection}
          operator={operator}
          onNavigate={setActiveSection}
          onSignOut={onSignOut}
          isLightMode={isLightMode}
          onToggleTheme={() => setIsLightMode((prev) => !prev)}
        />

        {/* Vista de alertas + panel de detalle (HU-2) */}
        {activeSection === "alertas" && (
          <div style={{ flex: 1, display: "flex", overflow: "hidden", gap: "14px", minHeight: 0 }}>
            {/* Cola de alertas */}
            <div
              style={{
                width: "430px",
                flexShrink: 0,
                overflowY: "hidden",
                display: "flex",
                flexDirection: "column",
                borderRadius: "18px",
              }}
              className="premium-card"
            >
              <AlertQueue
                alerts={alerts}
                loading={loading}
                onAcknowledge={acknowledgeAlert}
                onResolve={handleResolveAlert}
                onSelectAlert={setSelectedAlert}
                selectedAlertId={selectedAlert?.id}
                operatorId={operator?.id}
              />
            </div>

            {/* Panel de detalle de alerta — reemplaza al mapa (GPS se implementará después) */}
            <div style={{ flex: 1, position: "relative", overflow: "hidden", borderRadius: "18px" }} className="premium-card">
              <AlertDetailPanel
                alert={selectedAlertLive}
                onAcknowledge={acknowledgeAlert}
                onResolve={handleResolveAlert}
                currentOperatorId={operator?.id}
              />
            </div>
          </div>
        )}

        {/* Sección de RRHH y placeholders para el resto */}
        {activeSection !== "alertas" && (
          <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
            {activeSection === "rrhh" ? (
              <MonitoreoLicencias />
            ) : activeSection === "rutas" ? (
              <SectionComingSoon
                title="Sincronización con Waze en progreso"
                description="Estamos trabajando esta pestaña para integrar datos y funciones en tiempo real con Waze."
                note="Por ahora no hay funcionalidades ni datos disponibles para mostrar."
                icon="🛣️"
              />
            ) : activeSection === "asignacion" ? (
              <AsignacionRutas />
            ) : activeSection === "clientes" ? (
              <div style={{ padding: "10px", height: "100%", overflow: "auto" }} className="premium-scroll operator-section">
                <FormularioCliente />
              </div>
            ) : activeSection === "historial" ? (
              <HistorialDespachos />
            ) : activeSection === "despachos" ? (
              <GuiasDespacho />
            ) : (
              <PlaceholderSection section={activeSection} />
            )}
          </div>
        )}
      </main>

      {/* Estilos globales */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Poppins:wght@400;600;700;800&display=swap');

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
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1f2362; border-radius: 8px; }
        ::-webkit-scrollbar-thumb:hover { background: #4cc9f0; }

        button:hover { filter: brightness(1.15); }
        button:active { filter: brightness(0.9); }
      `}</style>
    </div>
  );
}

// ─── TopBar ─────────────────────────────────────────────────────────────────
function TopBar({ urgentCount, section, operator, onNavigate, onSignOut, isLightMode, onToggleTheme }) {
  const SECTION_LABELS = {
    alertas: "Alertas",
    asignacion: "Asignar",
    clientes: "Clientes",
    rutas: "Rutas",
    despachos: "Guías",
    historial: "Historial",
    rrhh: "RRHH",
    camiones: "Flota",
    mensajes: "Mensajes",
  };
  const TOP_LINKS = ["alertas", "asignacion", "rutas", "despachos", "historial", "clientes", "rrhh", "camiones", "mensajes"];

  return (
    <header
      style={{
        height: "62px",
        display: "flex",
        alignItems: "center",
        padding: "0 12px",
        gap: "6px",
        flexShrink: 0,
        borderRadius: "16px",
      }}
      className="glass-nav"
    >
      <div style={{ minWidth: "122px", display: "flex", flexDirection: "column", lineHeight: 1 }}>
        <h1
        style={{
          margin: 0,
            fontSize: "10px",
          fontWeight: 800,
          color: isLightMode ? "#0f172a" : "#fff",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
        }}
      >
          LogiTrack
        </h1>
        <span style={{ fontSize: "9px", color: isLightMode ? "rgba(15,23,42,0.6)" : "rgba(255,255,255,0.64)", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: "4px" }}>
          Panel Operador
        </span>
      </div>

      <nav
        style={{
          display: "flex",
          alignItems: "center",
          gap: "5px",
          marginLeft: "2px",
          flex: 1,
          minWidth: 0,
          justifyContent: "flex-start",
        }}
      >
          {TOP_LINKS.map((key) => (
            <button
              key={key}
              className={`premium-nav-link ${section === key ? "active" : ""}`}
              onClick={() => onNavigate?.(key)}
            >
              {SECTION_LABELS[key] ?? key}
            </button>
          ))}
        </nav>

      {urgentCount > 0 && (
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "linear-gradient(135deg, rgba(247,37,133,0.2), rgba(58,12,163,0.35))",
            border: "1px solid rgba(76, 201, 240, 0.5)",
            borderRadius: "999px",
            padding: "4px 9px",
            animation: "pulseCard 2s infinite",
            boxShadow: "0 0 16px rgba(247,37,133,0.32)",
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ fontSize: "9px", color: "#fff", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            {urgentCount} urgente{urgentCount > 1 ? "s" : ""}
          </span>
        </div>
      )}

      <button
        className="premium-nav-link"
        onClick={onToggleTheme}
        style={{ padding: "5px 8px", fontSize: "8px" }}
      >
        {isLightMode ? "Modo oscuro" : "Modo claro"}
      </button>

      <button
        className="premium-pill-btn"
        style={{
          marginLeft: urgentCount > 0 ? "0" : "auto",
          padding: "5px 9px",
          fontSize: "9px",
          fontWeight: 700,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
        onClick={() => onNavigate?.("alertas")}
      >
        Alertas
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "2px" }}>
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: "999px",
            background: "linear-gradient(135deg, #12185c, #3a0ca3)",
            display: "grid",
            placeItems: "center",
            fontSize: "10px",
            fontWeight: 700,
          }}
        >
          {operator?.full_name?.[0]?.toUpperCase() ?? "O"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0, maxWidth: 100 }}>
          <span
            style={{
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {operator?.full_name ?? "Operador"}
          </span>
          <span
            style={{
              fontSize: "8px",
              color: isLightMode ? "rgba(15,23,42,0.7)" : "rgba(255,255,255,0.7)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {operator?.branch ?? "Sucursal"}
          </span>
        </div>
        <button
          className="premium-pill-btn"
          onClick={onSignOut}
          style={{ padding: "5px 8px", fontSize: "8px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
        >
          Salir
        </button>
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

function SectionComingSoon({ title, description, note, icon = "🚧" }) {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        className="premium-card"
        style={{
          width: "min(760px, 100%)",
          textAlign: "center",
          padding: "38px 28px",
          borderRadius: "18px",
        }}
      >
        <div style={{ fontSize: "42px", marginBottom: "14px" }}>{icon}</div>
        <h2
          style={{
            margin: "0 0 12px",
            fontSize: "18px",
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {title}
        </h2>
        <p style={{ margin: "0 0 8px", color: "rgba(255,255,255,0.78)", fontSize: "14px" }}>
          {description}
        </p>
        <p style={{ margin: 0, color: "rgba(255,255,255,0.62)", fontSize: "12px", letterSpacing: "0.04em" }}>
          {note}
        </p>
      </div>
    </div>
  );
}
