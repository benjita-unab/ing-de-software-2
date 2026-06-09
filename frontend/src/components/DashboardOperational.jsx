import React, { useEffect, useMemo, useState } from "react";
import {
  Truck,
  Package,
  Route,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
  ChevronRight,
  Activity,
  ArrowUpRight,
  Zap,
  X,
  SlidersHorizontal,
} from "lucide-react";
import MapView from "./MapView";
import PageHeader from "./ui/PageHeader";
import KpiCard from "./ui/KpiCard";
import Badge from "./ui/Badge";
import ProgressBar from "./ui/ProgressBar";
import Spinner from "./ui/Spinner";
import Card from "./ui/Card";
import { apiFetch } from "../lib/apiClient";
import { getClientes } from "../lib/clientesService";
import { geocodeAddresses } from "../lib/mapGeocoding";
import {
  buildMapRoutes,
  buildVehicleMarkers,
  countMapStats,
  isActiveRoute,
  routeProgress,
} from "../lib/mapRouteData";

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

const EMPTY_FILTERS = { clienteId: "", estado: "", desde: "", hasta: "" };

const KPI_CONFIG = [
  { key: "rutasActivas", label: "Rutas activas", icon: Truck, iconClass: "lt-kpi-icon--blue", isPercent: false },
  { key: "rutasCompletadas", label: "Completadas", icon: CheckCircle2, iconClass: "lt-kpi-icon--green", isPercent: false, trend: "up" },
  { key: "rutasPendientes", label: "Pendientes", icon: Clock, iconClass: "lt-kpi-icon--amber", isPercent: false },
  { key: "rutasConAlertas", label: "Con alertas", icon: AlertTriangle, iconClass: "lt-kpi-icon--red", isPercent: false },
  { key: "sla", label: "SLA entregas", icon: Package, iconClass: "lt-kpi-icon--purple", isPercent: true, trend: "up" },
];

const PRIORITY_VARIANT = {
  CRITICA: "danger",
  ALTA: "warning",
  NORMAL: "info",
  BAJA: "muted",
};

function buildResumenUrl(filters) {
  const params = new URLSearchParams();
  if (filters.clienteId?.trim()) params.set("clienteId", filters.clienteId.trim());
  if (filters.estado?.trim()) params.set("estado", filters.estado.trim());
  if (filters.desde?.trim()) params.set("desde", filters.desde.trim());
  if (filters.hasta?.trim()) params.set("hasta", filters.hasta.trim());
  const qs = params.toString();
  return qs ? `/api/dashboard/resumen?${qs}` : "/api/dashboard/resumen";
}

function formatKpiValue(key, value, isPercent) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  if (isPercent) {
    const n = Number(value);
    return `${Number.isInteger(n) ? n : n.toFixed(1)}%`;
  }
  return String(value);
}

function formatHeaderDate() {
  return new Date().toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function fmtEta(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
}

function routeBadgeVariant(estado) {
  const e = String(estado || "").toUpperCase();
  if (["ENTREGADO", "COMPLETADO"].includes(e)) return "success";
  if (["CANCELADO", "CANCELADA"].includes(e)) return "danger";
  if (["EN_TRANSITO", "EN_DESTINO", "ASIGNADO", "EN_CARGA", "EN_CAMINO_ORIGEN"].includes(e)) return "accent";
  if (e === "PENDIENTE") return "warning";
  return "muted";
}

function routeStatusLabel(estado) {
  if (!estado) return "Sin estado";
  return String(estado).replace(/_/g, " ");
}

export default function DashboardOperational({
  alerts = [],
  alertsLoading = false,
  mensajes = [],
  operator,
  onNavigate,
  isDark = false,
}) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [clientesLoading, setClientesLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState(null);
  const [rutas, setRutas] = useState([]);
  const [rutasLoading, setRutasLoading] = useState(true);
  const [camiones, setCamiones] = useState([]);
  const [, setCamionesLoading] = useState(true);
  const [geocodeMap, setGeocodeMap] = useState({});
  const [geocoding, setGeocoding] = useState(false);
  const [mapFilter, setMapFilter] = useState("todos");
  const [selectedRouteId, setSelectedRouteId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setClientesLoading(true);
      try {
        const data = await getClientes();
        if (!cancelled) setClientes(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setClientes([]);
      } finally {
        if (!cancelled) setClientesLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchResumen() {
      setDashboardLoading(true);
      setDashboardError(null);
      try {
        const result = await apiFetch(buildResumenUrl(filters));
        if (cancelled) return;
        if (!result.ok) throw new Error(result.error || result.data?.message || `HTTP ${result.status}`);
        setDashboardData(result.data ?? null);
      } catch (err) {
        if (!cancelled) {
          setDashboardData(null);
          setDashboardError(err?.message || "Error al cargar el resumen.");
        }
      } finally {
        if (!cancelled) setDashboardLoading(false);
      }
    }
    fetchResumen();
    return () => { cancelled = true; };
  }, [filters]);

  useEffect(() => {
    let cancelled = false;
    async function fetchRutas() {
      setRutasLoading(true);
      try {
        const result = await apiFetch("/api/rutas");
        if (cancelled) return;
        if (!result.ok) { setRutas([]); return; }
        const payload = result.data;
        setRutas(Array.isArray(payload) ? payload : payload?.data ?? []);
      } catch {
        if (!cancelled) setRutas([]);
      } finally {
        if (!cancelled) setRutasLoading(false);
      }
    }
    fetchRutas();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchCamiones() {
      setCamionesLoading(true);
      try {
        let result = await apiFetch("/api/camiones/disponibles");
        if (!result.ok) result = await apiFetch("/api/camiones");
        if (cancelled) return;
        if (!result.ok) { setCamiones([]); return; }
        const payload = result.data;
        setCamiones(Array.isArray(payload) ? payload : payload?.data ?? []);
      } catch {
        if (!cancelled) setCamiones([]);
      } finally {
        if (!cancelled) setCamionesLoading(false);
      }
    }
    fetchCamiones();
    return () => { cancelled = true; };
  }, []);

  const activeRoutesRaw = useMemo(() => rutas.filter(isActiveRoute), [rutas]);

  useEffect(() => {
    let cancelled = false;
    const addresses = activeRoutesRaw.flatMap((r) => [r.origen, r.destino].filter(Boolean));
    if (addresses.length === 0) return undefined;

    async function geocode() {
      setGeocoding(true);
      try {
        const map = await geocodeAddresses(addresses);
        if (!cancelled) setGeocodeMap((prev) => ({ ...prev, ...map }));
      } catch {
        /* geocoding opcional — rutas sin coords muestran solo marcador si hay GPS */
      } finally {
        if (!cancelled) setGeocoding(false);
      }
    }
    geocode();
    return () => { cancelled = true; };
  }, [activeRoutesRaw]);

  const mapAlerts = useMemo(() => {
    const withCoords = alerts.filter((a) => a.lat && a.lng && a.status !== "RESUELTA");
    if (mapFilter === "alertas") {
      return withCoords.filter((a) => ["CRITICA", "ALTA"].includes(a.priority));
    }
    if (mapFilter === "completados") {
      return alerts.filter((a) => a.lat && a.lng && a.status === "RESUELTA");
    }
    return withCoords;
  }, [alerts, mapFilter]);

  const mapRoutes = useMemo(
    () => buildMapRoutes(activeRoutesRaw, geocodeMap, alerts, mensajes),
    [activeRoutesRaw, geocodeMap, alerts, mensajes],
  );

  const vehicleMarkers = useMemo(
    () => buildVehicleMarkers(camiones, mapRoutes),
    [camiones, mapRoutes],
  );

  const mapStats = useMemo(
    () => countMapStats(mapRoutes, camiones, alerts, vehicleMarkers),
    [mapRoutes, camiones, alerts, vehicleMarkers],
  );

  const selectedRoute = useMemo(
    () => mapRoutes.find((r) => r.id === selectedRouteId) ?? null,
    [mapRoutes, selectedRouteId],
  );

  const selectedRuta = useMemo(
    () => rutas.find((r) => r.id === selectedRouteId) ?? null,
    [rutas, selectedRouteId],
  );

  const focusedRoute = selectedRoute;

  /** Solo la ruta seleccionada se dibuja en el mapa (visor individual). */
  const visibleMapRoutes = useMemo(
    () => (selectedRoute ? [selectedRoute] : []),
    [selectedRoute],
  );

  const visibleVehicleMarkers = useMemo(
    () =>
      selectedRouteId
        ? vehicleMarkers.filter((v) => v.routeId === selectedRouteId)
        : [],
    [vehicleMarkers, selectedRouteId],
  );

  const hasActiveFilters = Boolean(filters.clienteId || filters.estado || filters.desde || filters.hasta);

  const handleRouteSelect = (routeId) => {
    setSelectedRouteId((prev) => (prev === routeId ? null : routeId));
  };

  const kpiValues = KPI_CONFIG.map((cfg) => ({
    ...cfg,
    value: formatKpiValue(cfg.key, dashboardData?.[cfg.key], cfg.isPercent),
    sub: cfg.isPercent && dashboardData?.[cfg.key] != null ? "Cumplimiento SLA" : undefined,
  }));

  const mapOverlay = (
    <>
      <div className="lt-map-overlay lt-map-overlay--top-left">
        <div className="lt-map-live-pill">
          <span className="lt-map-live-pill__dot" />
          LIVE · {mapStats.vehiclesOnMap} vehículos
        </div>
      </div>

      <div className="lt-map-overlay lt-map-overlay--top-right">
        <div className="lt-map-stat-card">
          <div className="lt-map-stat-card__label">Vehículos activos</div>
          <div className="lt-map-stat-card__value">{mapStats.vehiclesOnMap}</div>
        </div>
        <div className="lt-map-stat-card">
          <div className="lt-map-stat-card__label">Rutas en tránsito</div>
          <div className="lt-map-stat-card__value" style={{ color: "var(--lt-accent)" }}>
            {mapStats.inTransit}
          </div>
        </div>
        <div className="lt-map-stat-card">
          <div className="lt-map-stat-card__label">Alertas abiertas</div>
          <div className="lt-map-stat-card__value" style={{ color: "var(--lt-danger)" }}>
            {mapStats.openAlerts}
          </div>
        </div>
      </div>

      {!selectedRouteId && (
        <div className="lt-map-overlay lt-map-overlay--center">
          <p className="lt-map-select-hint">
            Selecciona una ruta para visualizarla en el mapa
          </p>
        </div>
      )}

      {selectedRoute && selectedRuta && (
        <div className="lt-map-route-panel">
          <button
            type="button"
            className="lt-map-route-panel__close"
            onClick={() => setSelectedRouteId(null)}
            aria-label="Cerrar panel"
          >
            <X size={14} />
          </button>
          <div className="lt-map-route-panel__header">
            <span className="lt-map-route-panel__id">
              {selectedRuta.id?.slice?.(0, 8) ?? selectedRuta.id}
            </span>
            <Badge variant={routeBadgeVariant(selectedRoute.estado)}>
              {routeStatusLabel(selectedRoute.estado)}
            </Badge>
            {selectedRoute.hasAlert && <Badge variant="danger">ALERTA</Badge>}
          </div>
          <div className="lt-map-route-panel__grid">
            <div>
              <div className="lt-map-route-panel__label">Vehículo</div>
              <div className="lt-map-route-panel__value">{selectedRoute.patente || "—"}</div>
            </div>
            <div>
              <div className="lt-map-route-panel__label">Conductor</div>
              <div className="lt-map-route-panel__value">{selectedRoute.conductor || "—"}</div>
            </div>
            <div>
              <div className="lt-map-route-panel__label">Estado</div>
              <div className="lt-map-route-panel__value">{routeStatusLabel(selectedRoute.estado)}</div>
            </div>
            <div>
              <div className="lt-map-route-panel__label">ETA</div>
              <div className="lt-map-route-panel__value lt-map-route-panel__value--accent">
                {fmtEta(selectedRoute.eta)}
              </div>
            </div>
          </div>
          <div className="lt-map-route-panel__progress">
            <div className="lt-map-route-panel__progress-header">
              <span>Progreso</span>
              <strong>{selectedRoute.progress}%</strong>
            </div>
            <ProgressBar
              value={selectedRoute.progress}
              color={selectedRoute.hasAlert ? "var(--lt-danger)" : "var(--lt-accent)"}
            />
          </div>
          <div className="lt-map-route-panel__route">
            <MapPin size={11} /> {selectedRoute.origen || "—"}
            <ArrowUpRight size={11} style={{ margin: "0 4px" }} />
            {selectedRoute.destino || "—"}
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="lt-dashboard lt-dashboard--map-first">
      <div className="lt-dashboard__top-bar">
        <PageHeader
          title="Centro de Operaciones"
          subtitle={`${formatHeaderDate()} · ${operator?.branch ?? "Todas las sucursales"}`}
          actions={
            <>
              <div className="lt-status-pill">
                <Activity size={14} color="var(--lt-success)" />
                Sistema operativo
              </div>
              <button
                type="button"
                className={`lt-btn lt-btn--secondary ${showFilters ? "lt-btn--filter-active" : ""}`}
                onClick={() => setShowFilters((v) => !v)}
              >
                <SlidersHorizontal size={14} />
                Filtros
              </button>
              <button
                type="button"
                className="lt-btn lt-btn--primary"
                onClick={() => onNavigate?.("rutas")}
              >
                <Route size={14} />
                Ver rutas
              </button>
            </>
          }
        />

        {showFilters && (
          <Card className="lt-dashboard__filters-pop">
            <div className="lt-filters-bar lt-filters-bar--compact">
              <div>
                <label className="lt-label" htmlFor="dash-filter-cliente">Cliente</label>
                <select
                  id="dash-filter-cliente"
                  className="lt-select"
                  value={filters.clienteId}
                  onChange={(e) => setFilters((p) => ({ ...p, clienteId: e.target.value }))}
                  disabled={clientesLoading}
                >
                  <option value="">{clientesLoading ? "Cargando..." : "Todos"}</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre || c.id}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="lt-label" htmlFor="dash-filter-estado">Estado</label>
                <select
                  id="dash-filter-estado"
                  className="lt-select"
                  value={filters.estado}
                  onChange={(e) => setFilters((p) => ({ ...p, estado: e.target.value }))}
                >
                  {DASHBOARD_ESTADO_OPTIONS.map((opt) => (
                    <option key={opt.value || "all"} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="lt-label" htmlFor="dash-filter-desde">Desde</label>
                <input id="dash-filter-desde" type="date" className="lt-input" value={filters.desde}
                  onChange={(e) => setFilters((p) => ({ ...p, desde: e.target.value }))} />
              </div>
              <div>
                <label className="lt-label" htmlFor="dash-filter-hasta">Hasta</label>
                <input id="dash-filter-hasta" type="date" className="lt-input" value={filters.hasta}
                  onChange={(e) => setFilters((p) => ({ ...p, hasta: e.target.value }))} />
              </div>
              <div style={{ alignSelf: "end" }}>
                <button type="button" className="lt-btn lt-btn--secondary" disabled={!hasActiveFilters}
                  onClick={() => setFilters(EMPTY_FILTERS)}>Limpiar</button>
              </div>
            </div>
          </Card>
        )}

        {dashboardError && (
          <div className="lt-error-banner lt-error-banner--compact" role="alert">{dashboardError}</div>
        )}

        {!dashboardLoading && dashboardData && (
          <div className="lt-kpi-strip lt-kpi-strip--compact">
            {kpiValues.map((kpi) => (
              <KpiCard key={kpi.key} icon={kpi.icon} label={kpi.label} value={kpi.value}
                sub={kpi.sub} iconClass={kpi.iconClass} trend={kpi.trend} />
            ))}
          </div>
        )}
        {dashboardLoading && <Spinner message="Cargando indicadores..." />}
      </div>

      <div className="lt-dashboard__map-hero">
        <div className="lt-dashboard__map-wrap">
          <div className="lt-dashboard__map-toolbar">
            <span className="lt-dashboard__map-title">Mapa de operaciones</span>
            <div className="lt-dashboard__map-filters">
              {[
                { key: "todos", label: "Todos" },
                { key: "alertas", label: "Alertas" },
                { key: "completados", label: "Completados" },
              ].map((f) => (
                <button
                  key={f.key}
                  type="button"
                  className={`lt-btn--filter ${mapFilter === f.key ? "lt-btn--filter-active" : ""}`}
                  onClick={() => setMapFilter(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>
            {geocoding && <span className="lt-dashboard__geocode-hint">Geocodificando rutas…</span>}
          </div>
          <MapView
            alerts={mapAlerts}
            mapRoutes={visibleMapRoutes}
            vehicleMarkers={visibleVehicleMarkers}
            selectedRouteId={selectedRouteId}
            focusedRoute={focusedRoute}
            isDark={isDark}
            onRouteSelect={handleRouteSelect}
            overlay={mapOverlay}
          />
        </div>

        <aside className="lt-dashboard__side-panel">
          <div className="lt-dashboard__side-header">
            <span>Entregas activas</span>
            <span className="lt-tab__count">{activeRoutesRaw.length}</span>
          </div>
          <div className="lt-dashboard__side-scroll lt-scroll">
            {rutasLoading ? (
              <div className="lt-empty">Cargando rutas...</div>
            ) : activeRoutesRaw.length === 0 ? (
              <div className="lt-empty">No hay rutas activas.</div>
            ) : (
              activeRoutesRaw.map((ruta) => {
                const mapRoute = mapRoutes.find((mr) => mr.id === ruta.id);
                const progress = mapRoute?.progress ?? routeProgress(ruta.estado);
                const hasAlert = mapRoute?.hasAlert;
                return (
                  <div
                    key={ruta.id}
                    className={`lt-list-item lt-list-item--compact ${selectedRouteId === ruta.id ? "lt-list-item--selected" : ""}`}
                    onClick={() => handleRouteSelect(ruta.id)}
                  >
                    <div className="lt-list-item__row">
                      <div>
                        <div className="lt-list-item__title">
                          <span>{ruta.id?.slice?.(0, 8) ?? ruta.id}</span>
                          <Badge variant={routeBadgeVariant(ruta.estado)}>{routeStatusLabel(ruta.estado)}</Badge>
                          {hasAlert && <Badge variant="danger">!</Badge>}
                        </div>
                        <div className="lt-list-item__sub">
                          <MapPin size={10} /> {ruta.origen || "—"} → {ruta.destino || "—"}
                        </div>
                      </div>
                      <div className="lt-list-item__eta">{fmtEta(ruta.eta)}</div>
                    </div>
                    <ProgressBar value={progress} color={hasAlert ? "var(--lt-danger)" : "var(--lt-accent)"} />
                  </div>
                );
              })
            )}
          </div>
          <div className="lt-dashboard__side-footer">
            <button type="button" className="lt-btn lt-btn--secondary lt-btn--full"
              onClick={() => onNavigate?.("alertas")}>
              <AlertTriangle size={13} />
              Alertas ({mapStats.openAlerts})
            </button>
            <button type="button" className="lt-btn lt-btn--ghost lt-btn--full"
              onClick={() => onNavigate?.("rutas")}>
              Ver todas <ChevronRight size={13} />
            </button>
          </div>
        </aside>
      </div>

      {!alertsLoading && alerts.length > 0 && (
        <div className="lt-dashboard__alert-ticker">
          {alerts.filter((a) => a.status !== "RESUELTA").slice(0, 3).map((alert) => {
            const variant = PRIORITY_VARIANT[alert.priority] || "muted";
            return (
              <button
                key={alert.id}
                type="button"
                className="lt-dashboard__alert-chip"
                onClick={() => onNavigate?.("alertas")}
              >
                <Zap size={11} />
                <span>{alert.vehicle_plate}</span>
                <Badge variant={variant} showDot={false}>{alert.priority}</Badge>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
