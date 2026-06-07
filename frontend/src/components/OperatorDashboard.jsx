// src/components/OperatorDashboard.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Layout principal del Operador de Sucursal — HU-2
// Estructura: Topbar horizontal | Cola de Alertas | Panel de Detalle
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef } from "react";
import AlertQueue from "./AlertQueue";
import AlertDetailPanel from "./AlertDetailPanel";
import MensajesConductor from "./MensajesConductor";
import MonitoreoLicencias from "./MonitoreoLicencias";
import AsignacionRutas from "./AsignacionRutas";
import RutasActivas from "./RutasActivas";
import GuiasDespacho from "./GuiasDespacho";
import Clientes from "./Clientes";
import HistorialDespachos from "./HistorialDespachos";
import { useAlerts } from "../hooks/useAlerts";
import { useMensajesConductor } from "../hooks/useMensajesConductor";
import { apiFetch } from "../lib/apiClient";

function playAlarmSound() {
  if (typeof window === 'undefined') return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 800;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {
    console.warn('Audio context failed:', e);
  }
}

export default function OperatorDashboard({ operator, onSignOut }) {
  const { alerts, loading, acknowledgeAlert, resolveAlert: rawResolveAlert } = useAlerts();
  const { mensajes, rutasMap, loading: mensajesLoading, error: mensajesError, acknowledgeMensaje } = useMensajesConductor();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [isLightMode, setIsLightMode] = useState(false);
  const playedUrgentIdsRef = useRef(new Set());

  // Alarma global para emergencias
  useEffect(() => {
    const urgentMessages = mensajes.filter(
      (m) => m.prioridad === 'ALTA' && !m.acknowledged,
    );
    const newUrgent = urgentMessages.filter((m) => !playedUrgentIdsRef.current.has(m.id));
    if (newUrgent.length > 0) {
      playAlarmSound();
      newUrgent.forEach((m) => playedUrgentIdsRef.current.add(m.id));
    }
  }, [mensajes]);

  const handleResolveAlert = async (alertId) => {
    const res = await rawResolveAlert(alertId);
    if (res?.ok) {
      alert("✅ El problema ya está resuelto y removido de la cola.");
      if (selectedAlert?.id === alertId) {
        setSelectedAlert(null);
      }
    } else if (res?.message) {
      alert(res.message);
    }
  };

  // Contar alertas urgentes sin acuse de recibo
  const urgentCount = alerts.filter(
    (a) => ["CRITICA", "ALTA"].includes(a.priority) && a.status === "PENDIENTE"
  ).length;

  const hasUnreadEmergencies = mensajes.some(
    (m) => m.prioridad === 'ALTA' && !m.acknowledged,
  );

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
          hasUnreadEmergencies={hasUnreadEmergencies}
          section={activeSection}
          operator={operator}
          onNavigate={setActiveSection}
          onSignOut={onSignOut}
          isLightMode={isLightMode}
          onToggleTheme={() => setIsLightMode((prev) => !prev)}
        />

        {/* Resumen KPI operacional (HU-28 / #245) */}
        {activeSection === "dashboard" && (
          <div
            style={{ flex: 1, minHeight: 0, overflow: "auto", padding: "10px" }}
            className="premium-scroll operator-section"
          >
            <DashboardKpiSection />
          </div>
        )}

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

        {activeSection === "mensajes" && (
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              height: "100%",
              padding: "10px",
            }}
            className="premium-scroll operator-section mensajes-section"
          >
            <MensajesConductor
              mensajes={mensajes}
              rutasMap={rutasMap}
              loading={mensajesLoading}
              error={mensajesError}
              acknowledgeMensaje={acknowledgeMensaje}
            />
          </div>
        )}

        {/* Sección de RRHH y placeholders para el resto */}
        {activeSection !== "alertas" && activeSection !== "mensajes" && activeSection !== "dashboard" && (
          <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
            {activeSection === "rrhh" ? (
              <div style={{ padding: "10px", height: "100%", overflow: "auto" }} className="premium-scroll operator-section">
                <MonitoreoLicencias />
              </div>
            ) : activeSection === "rutas" ? (
              <div style={{ padding: "10px", height: "100%", overflow: "auto" }} className="premium-scroll operator-section">
                <RutasActivas />
              </div>
            ) : activeSection === "asignacion" ? (
              <AsignacionRutas />
            ) : activeSection === "clientes" ? (
              <div style={{ padding: "10px", height: "100%", overflow: "auto", display: "flex", flexDirection: "column" }} className="premium-scroll operator-section">
                <Clientes />
              </div>
            ) : activeSection === "historial" ? (
              <HistorialDespachos />
            ) : activeSection === "despachos" ? (
              <GuiasDespacho />
            ) : activeSection === "mensajes" ? null : (
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

        @keyframes dashboardSpin {
          to { transform: rotate(360deg); }
        }

        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1f2362; border-radius: 8px; }
        ::-webkit-scrollbar-thumb:hover { background: #4cc9f0; }

        button:hover { filter: brightness(1.15); }
        button:active { filter: brightness(0.9); }
        .urgent-nav-link {
          animation: pulse-red 1.2s infinite;
          background: #dc2626 !important;
          color: #fff !important;
          box-shadow: 0 0 18px rgba(220, 38, 38, 0.45);
        }
      `}</style>
    </div>
  );
}

// ─── TopBar ─────────────────────────────────────────────────────────────────
function TopBar({ urgentCount, hasUnreadEmergencies, section, operator, onNavigate, onSignOut, isLightMode, onToggleTheme }) {
  const SECTION_LABELS = {
    dashboard: "Resumen",
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
  const TOP_LINKS = ["dashboard", "alertas", "asignacion", "rutas", "despachos", "historial", "clientes", "rrhh", "camiones", "mensajes"];

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
          {TOP_LINKS.map((key) => {
            const isMessagesTab = key === 'mensajes';
            const urgentClass = isMessagesTab && hasUnreadEmergencies ? 'urgent-nav-link' : '';
            return (
              <button
                key={key}
                className={`premium-nav-link ${section === key ? "active" : ""} ${urgentClass}`}
                onClick={() => onNavigate?.(key)}
              >
                {SECTION_LABELS[key] ?? key}
              </button>
            );
          })}
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

// ─── KPI Dashboard (HU-28 / #245) ───────────────────────────────────────────
const DASHBOARD_KPI_ITEMS = [
  { key: "rutasActivas", label: "Rutas activas", icon: "🚛", accent: "#4cc9f0" },
  { key: "rutasCompletadas", label: "Rutas completadas", icon: "✅", accent: "#22c55e" },
  { key: "rutasPendientes", label: "Rutas pendientes", icon: "⏳", accent: "#f59e0b" },
  { key: "rutasConAlertas", label: "Rutas con alertas", icon: "🚨", accent: "#f72585" },
  { key: "rutasAtrasadas", label: "Rutas atrasadas", icon: "⚠️", accent: "#ef4444" },
  { key: "sla", label: "SLA entregas", icon: "📊", accent: "#a855f7", isPercent: true },
  { key: "anomaliasPrioritarias", label: "Anomalías prioritarias", icon: "🔍", accent: "#fb923c" },
];

function formatKpiValue(key, value, isPercent) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  if (isPercent) {
    const n = Number(value);
    return `${Number.isInteger(n) ? n : n.toFixed(1)}%`;
  }
  return String(value);
}

function DashboardKpiSection() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchDashboardResumen() {
      setLoading(true);
      setError(null);

      try {
        const result = await apiFetch("/api/dashboard/resumen");
        if (cancelled) return;

        if (!result.ok) {
          throw new Error(
            result.error ||
              result.data?.message ||
              `No se pudo cargar el resumen (HTTP ${result.status})`,
          );
        }

        setDashboardData(result.data ?? null);
      } catch (err) {
        if (!cancelled) {
          setDashboardData(null);
          setError(err?.message || "Error al cargar el resumen operacional.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchDashboardResumen();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
      <div style={{ marginBottom: "18px" }}>
        <h2
          style={{
            margin: 0,
            fontSize: "20px",
            fontWeight: 800,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          Resumen operacional
        </h2>
        <p
          style={{
            margin: "8px 0 0",
            fontSize: "13px",
            color: "rgba(226,232,240,0.75)",
            lineHeight: 1.5,
          }}
        >
          Indicadores en tiempo real de rutas, entregas e incidencias.
        </p>
      </div>

      {loading && <DashboardKpiSpinner />}

      {!loading && error && (
        <div
          style={{
            padding: "14px 16px",
            borderRadius: "12px",
            background: "rgba(239,68,68,0.12)",
            border: "1px solid rgba(248,113,113,0.45)",
            color: "#fecaca",
            fontSize: "14px",
            marginBottom: "16px",
          }}
          role="alert"
        >
          {error}
        </div>
      )}

      {!loading && !error && dashboardData && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "14px",
          }}
        >
          {DASHBOARD_KPI_ITEMS.map(({ key, label, icon, accent, isPercent }) => (
            <div
              key={key}
              className="premium-card"
              style={{
                padding: "18px 16px",
                borderRadius: "16px",
                border: `1px solid ${accent}44`,
                background: `linear-gradient(145deg, rgba(8,8,12,0.85), ${accent}14)`,
                boxShadow: `0 8px 24px ${accent}22`,
                minHeight: "120px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "22px" }} aria-hidden="true">
                  {icon}
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "rgba(226,232,240,0.8)",
                    lineHeight: 1.3,
                  }}
                >
                  {label}
                </span>
              </div>
              <div
                style={{
                  fontSize: "32px",
                  fontWeight: 800,
                  color: accent,
                  marginTop: "12px",
                  lineHeight: 1,
                }}
              >
                {formatKpiValue(key, dashboardData[key], isPercent)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DashboardKpiSpinner() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 20px",
        gap: "14px",
      }}
      aria-live="polite"
      aria-busy="true"
    >
      <div
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          border: "3px solid rgba(76,201,240,0.25)",
          borderTopColor: "#4cc9f0",
          animation: "dashboardSpin 0.8s linear infinite",
        }}
      />
      <p style={{ margin: 0, fontSize: "14px", color: "rgba(226,232,240,0.75)" }}>
        Cargando indicadores...
      </p>
    </div>
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

