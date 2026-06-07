// src/components/OperatorDashboard.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Layout principal del Operador de Sucursal — HU-2
// Estructura: Topbar horizontal | Cola de Alertas | Panel de Detalle
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";
import { Pie, Bar } from "react-chartjs-2";
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
import { getClientes } from "../lib/clientesService";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
);

const CHART_ESTADO_COLORS = {
  PENDIENTE: "#f59e0b",
  ASIGNADO: "#4cc9f0",
  EN_TRANSITO: "#a855f7",
  ENTREGADO: "#22c55e",
  CANCELADO: "#64748b",
};

const CHART_ESTADO_LABELS = {
  PENDIENTE: "Pendiente",
  ASIGNADO: "Asignado",
  EN_TRANSITO: "En tránsito",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
};

function formatChartDate(isoDate) {
  if (!isoDate) return "";
  const [, m, d] = String(isoDate).split("-");
  return `${d}/${m}`;
}

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
const DASHBOARD_ESTADO_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "ASIGNADO", label: "Asignado" },
  { value: "EN_CAMINO_ORIGEN", label: "En camino origen" },
  { value: "EN_CARGA", label: "En carga" },
  { value: "EN_TRANSITO", label: "En tránsito" },
  { value: "EN_DESTINO", label: "En destino" },
  { value: "ENTREGADO", label: "Entregado" },
  { value: "CANCELADO", label: "Cancelado" },
];

const EMPTY_DASHBOARD_FILTERS = {
  clienteId: "",
  estado: "",
  desde: "",
  hasta: "",
};

function buildDashboardResumenUrl(filters) {
  const params = new URLSearchParams();
  if (filters.clienteId?.trim()) params.set("clienteId", filters.clienteId.trim());
  if (filters.estado?.trim()) params.set("estado", filters.estado.trim());
  if (filters.desde?.trim()) params.set("desde", filters.desde.trim());
  if (filters.hasta?.trim()) params.set("hasta", filters.hasta.trim());
  const qs = params.toString();
  return qs ? `/api/dashboard/resumen?${qs}` : "/api/dashboard/resumen";
}

const dashboardFilterStyles = {
  bar: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
    gap: "12px",
    marginBottom: "18px",
    padding: "16px",
    borderRadius: "16px",
    border: "1px solid rgba(76,201,240,0.22)",
    background: "rgba(8,8,12,0.72)",
  },
  label: {
    display: "block",
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "rgba(226,232,240,0.75)",
    marginBottom: "6px",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(15,23,42,0.95)",
    color: "#f8fafc",
    fontSize: "13px",
    boxSizing: "border-box",
  },
  clearBtn: {
    alignSelf: "end",
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.06)",
    color: "rgba(226,232,240,0.9)",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
    letterSpacing: "0.04em",
  },
};

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
  const [chartsLoading, setChartsLoading] = useState(true);
  const [chartsError, setChartsError] = useState(null);
  const [chartsData, setChartsData] = useState(null);
  const [filters, setFilters] = useState(EMPTY_DASHBOARD_FILTERS);
  const [clientes, setClientes] = useState([]);
  const [clientesLoading, setClientesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadClientes() {
      setClientesLoading(true);
      try {
        const data = await getClientes();
        if (!cancelled) {
          setClientes(Array.isArray(data) ? data : []);
        }
      } catch {
        if (!cancelled) setClientes([]);
      } finally {
        if (!cancelled) setClientesLoading(false);
      }
    }

    loadClientes();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchDashboardResumen() {
      setLoading(true);
      setError(null);

      try {
        const result = await apiFetch(buildDashboardResumenUrl(filters));
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
  }, [filters]);

  useEffect(() => {
    let cancelled = false;

    async function fetchDashboardGraficos() {
      setChartsLoading(true);
      setChartsError(null);

      try {
        const result = await apiFetch("/api/dashboard/graficos");
        if (cancelled) return;

        if (!result.ok) {
          throw new Error(
            result.error ||
              result.data?.message ||
              `No se pudieron cargar los gráficos (HTTP ${result.status})`,
          );
        }

        setChartsData(result.data ?? null);
      } catch (err) {
        if (!cancelled) {
          setChartsData(null);
          setChartsError(err?.message || "Error al cargar los gráficos.");
        }
      } finally {
        if (!cancelled) setChartsLoading(false);
      }
    }

    fetchDashboardGraficos();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasActiveFilters = Boolean(
    filters.clienteId || filters.estado || filters.desde || filters.hasta,
  );

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters(EMPTY_DASHBOARD_FILTERS);
  };

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

      <DashboardFiltersBar
        filters={filters}
        clientes={clientes}
        clientesLoading={clientesLoading}
        hasActiveFilters={hasActiveFilters}
        onFilterChange={updateFilter}
        onClearFilters={clearFilters}
      />

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

      {!loading && !error && dashboardData && (
        <DashboardChartsPanel
          chartsLoading={chartsLoading}
          chartsError={chartsError}
          chartsData={chartsData}
        />
      )}
    </div>
  );
}

function DashboardFiltersBar({
  filters,
  clientes,
  clientesLoading,
  hasActiveFilters,
  onFilterChange,
  onClearFilters,
}) {
  return (
    <div className="premium-card" style={dashboardFilterStyles.bar}>
      <div>
        <label htmlFor="dashboard-filter-cliente" style={dashboardFilterStyles.label}>
          Cliente
        </label>
        <select
          id="dashboard-filter-cliente"
          value={filters.clienteId}
          onChange={(e) => onFilterChange("clienteId", e.target.value)}
          style={dashboardFilterStyles.input}
          disabled={clientesLoading}
        >
          <option value="">
            {clientesLoading ? "Cargando clientes..." : "Todos los clientes"}
          </option>
          {clientes.map((cliente) => (
            <option key={cliente.id} value={cliente.id}>
              {cliente.nombre || cliente.id}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="dashboard-filter-estado" style={dashboardFilterStyles.label}>
          Estado
        </label>
        <select
          id="dashboard-filter-estado"
          value={filters.estado}
          onChange={(e) => onFilterChange("estado", e.target.value)}
          style={dashboardFilterStyles.input}
        >
          {DASHBOARD_ESTADO_OPTIONS.map((opt) => (
            <option key={opt.value || "all"} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="dashboard-filter-desde" style={dashboardFilterStyles.label}>
          Fecha desde
        </label>
        <input
          id="dashboard-filter-desde"
          type="date"
          value={filters.desde}
          onChange={(e) => onFilterChange("desde", e.target.value)}
          style={dashboardFilterStyles.input}
        />
      </div>

      <div>
        <label htmlFor="dashboard-filter-hasta" style={dashboardFilterStyles.label}>
          Fecha hasta
        </label>
        <input
          id="dashboard-filter-hasta"
          type="date"
          value={filters.hasta}
          onChange={(e) => onFilterChange("hasta", e.target.value)}
          style={dashboardFilterStyles.input}
        />
      </div>

      <button
        type="button"
        onClick={onClearFilters}
        disabled={!hasActiveFilters}
        style={{
          ...dashboardFilterStyles.clearBtn,
          opacity: hasActiveFilters ? 1 : 0.45,
          cursor: hasActiveFilters ? "pointer" : "not-allowed",
        }}
      >
        Limpiar filtros
      </button>
    </div>
  );
}

function DashboardChartsPanel({ chartsLoading, chartsError, chartsData }) {
  const rutasChart = useMemo(() => {
    const items = chartsData?.rutasPorEstado ?? [];
    return {
      labels: items.map(
        (item) => CHART_ESTADO_LABELS[item.estado] ?? item.estado,
      ),
      datasets: [
        {
          data: items.map((item) => item.cantidad),
          backgroundColor: items.map(
            (item) => CHART_ESTADO_COLORS[item.estado] ?? "#94a3b8",
          ),
          borderColor: "rgba(8,8,12,0.9)",
          borderWidth: 2,
        },
      ],
    };
  }, [chartsData]);

  const entregasChart = useMemo(() => {
    const items = chartsData?.entregasPorDia ?? [];
    return {
      labels: items.map((item) => formatChartDate(item.fecha)),
      datasets: [
        {
          label: "Entregas",
          data: items.map((item) => item.cantidad),
          backgroundColor: "rgba(76, 201, 240, 0.55)",
          borderColor: "#4cc9f0",
          borderWidth: 1,
          borderRadius: 8,
        },
      ],
    };
  }, [chartsData]);

  const pieOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "rgba(226,232,240,0.85)",
            padding: 14,
            font: { size: 11, family: "'Inter', sans-serif" },
          },
        },
        tooltip: {
          backgroundColor: "rgba(8,8,12,0.92)",
          titleColor: "#fff",
          bodyColor: "rgba(226,232,240,0.9)",
          borderColor: "rgba(76,201,240,0.35)",
          borderWidth: 1,
        },
      },
    }),
    [],
  );

  const barOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(8,8,12,0.92)",
          titleColor: "#fff",
          bodyColor: "rgba(226,232,240,0.9)",
          borderColor: "rgba(76,201,240,0.35)",
          borderWidth: 1,
        },
      },
      scales: {
        x: {
          ticks: { color: "rgba(226,232,240,0.75)", font: { size: 11 } },
          grid: { color: "rgba(255,255,255,0.06)" },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: "rgba(226,232,240,0.75)",
            font: { size: 11 },
            stepSize: 1,
            precision: 0,
          },
          grid: { color: "rgba(255,255,255,0.06)" },
        },
      },
    }),
    [],
  );

  return (
    <div style={{ marginTop: "28px" }}>
      <h3
        style={{
          margin: "0 0 14px",
          fontSize: "14px",
          fontWeight: 800,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "rgba(226,232,240,0.9)",
        }}
      >
        Gráficos
      </h3>

      {chartsLoading && <DashboardKpiSpinner message="Cargando gráficos..." />}

      {!chartsLoading && chartsError && (
        <div
          style={{
            padding: "14px 16px",
            borderRadius: "12px",
            background: "rgba(239,68,68,0.12)",
            border: "1px solid rgba(248,113,113,0.45)",
            color: "#fecaca",
            fontSize: "14px",
          }}
          role="alert"
        >
          {chartsError}
        </div>
      )}

      {!chartsLoading && !chartsError && chartsData && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "14px",
          }}
        >
          <div
            className="premium-card"
            style={{
              padding: "18px 16px 12px",
              borderRadius: "16px",
              border: "1px solid rgba(76,201,240,0.25)",
              background: "rgba(8,8,12,0.72)",
              minHeight: "340px",
            }}
          >
            <p
              style={{
                margin: "0 0 12px",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "rgba(226,232,240,0.8)",
              }}
            >
              Distribución de rutas por estado
            </p>
            <div style={{ height: "260px" }}>
              <Pie data={rutasChart} options={pieOptions} />
            </div>
          </div>

          <div
            className="premium-card"
            style={{
              padding: "18px 16px 12px",
              borderRadius: "16px",
              border: "1px solid rgba(76,201,240,0.25)",
              background: "rgba(8,8,12,0.72)",
              minHeight: "340px",
            }}
          >
            <p
              style={{
                margin: "0 0 12px",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "rgba(226,232,240,0.8)",
              }}
            >
              Entregas por día (últimos 7 días)
            </p>
            <div style={{ height: "260px" }}>
              <Bar data={entregasChart} options={barOptions} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardKpiSpinner({ message = "Cargando indicadores..." }) {
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
        {message}
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

