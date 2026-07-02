import React, { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  CircleDollarSign,
  Clock,
  Fuel,
  MapPin,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import KpiCard from "./ui/KpiCard";
import Card, { CardBody, CardHeader } from "./ui/Card";
import {
  DASHBOARD_PERIODO_PRESETS,
  resolveDashboardPeriodoRange,
} from "../lib/dashboardFinancieroService";
import { getDashboardRentabilidadResumen } from "../lib/dashboardRentabilidadService";

const ROW_MARGEN = [
  {
    key: "margenBrutoTotal",
    label: "Margen bruto total",
    icon: TrendingUp,
    iconClass: "lt-kpi-icon--purple",
    format: "clp",
  },
  {
    key: "margenPromedioPorRuta",
    label: "Margen promedio por ruta",
    icon: BarChart3,
    iconClass: "lt-kpi-icon--blue",
    format: "clpNullable",
  },
  {
    key: "costoOperativoTotal",
    label: "Costo operativo total",
    icon: CircleDollarSign,
    iconClass: "lt-kpi-icon--amber",
    format: "clp",
  },
];

const ROW_COSTOS = [
  {
    key: "costoTotalCombustible",
    label: "Combustible",
    icon: Fuel,
    iconClass: "lt-kpi-icon--amber",
    format: "clp",
  },
  {
    key: "costoTotalConductores",
    label: "Conductores",
    icon: Users,
    iconClass: "lt-kpi-icon--blue",
    format: "clp",
  },
  {
    key: "costoTotalPeajes",
    label: "Peajes",
    icon: MapPin,
    iconClass: "lt-kpi-icon--green",
    format: "clp",
  },
  {
    key: "costoTotalEspera",
    label: "Espera",
    icon: Clock,
    iconClass: "lt-kpi-icon--red",
    format: "clp",
  },
];

function formatClp(value) {
  const n = Number(value);
  const safe = Number.isFinite(n) ? n : 0;
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(safe);
}

function formatKpiValue(item, data) {
  if (!data) return "—";
  const raw = data[item.key];
  if (item.format === "clpNullable") {
    if (raw === null || raw === undefined) return "—";
    return formatClp(raw);
  }
  if (item.format === "clp") return formatClp(raw);
  const n = Number(raw);
  return Number.isFinite(n) ? String(n) : "—";
}

function KpiSkeleton({ label }) {
  return (
    <div className="lt-kpi-card lt-kpi-card--skeleton" aria-hidden="true">
      <div className="lt-kpi-card__icon lt-kpi-icon--blue" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="lt-kpi-card__label">{label || "···"}</div>
        <div className="lt-kpi-card__value">—</div>
      </div>
    </div>
  );
}

function KpiRow({ items, data, loading }) {
  return (
    <div className="lt-kpi-strip lt-kpi-strip--dashboard">
      {items.map((item) =>
        loading ? (
          <KpiSkeleton key={item.key} label={item.label} />
        ) : (
          <KpiCard
            key={item.key}
            icon={item.icon}
            label={item.label}
            value={formatKpiValue(item, data)}
            iconClass={item.iconClass}
          />
        ),
      )}
    </div>
  );
}

function RutaExtremaSkeleton({ title }) {
  return (
    <Card aria-hidden="true" style={{ opacity: 0.5 }}>
      <CardHeader title={title} />
      <CardBody>
        <p className="lt-card__subtitle" style={{ margin: 0 }}>
          Cargando…
        </p>
      </CardBody>
    </Card>
  );
}

function RutaExtremaCard({ title, icon: Icon, iconClass, ruta, emptyLabel }) {
  const nombre = ruta?.nombreRuta?.trim() || "Ruta sin nombre";

  return (
    <Card>
      <CardHeader
        title={title}
        actions={
          <div className={`lt-kpi-card__icon ${iconClass}`} style={{ width: 36, height: 36 }}>
            <Icon size={18} />
          </div>
        }
      />
      <CardBody flushTop>
        {!ruta ? (
          <p className="lt-card__subtitle" style={{ margin: 0 }}>
            {emptyLabel}
          </p>
        ) : (
          <dl
            style={{
              margin: 0,
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: "8px 16px",
              fontSize: "13px",
            }}
          >
            <dt className="lt-text-muted">Pedido</dt>
            <dd style={{ margin: 0, fontWeight: 600 }}>{nombre}</dd>
            <dt className="lt-text-muted">Ingresos</dt>
            <dd style={{ margin: 0 }}>{formatClp(ruta.ingresos)}</dd>
            <dt className="lt-text-muted">Costos</dt>
            <dd style={{ margin: 0 }}>{formatClp(ruta.costos)}</dd>
            <dt className="lt-text-muted">Margen</dt>
            <dd style={{ margin: 0, fontWeight: 700 }}>{formatClp(ruta.margen)}</dd>
          </dl>
        )}
      </CardBody>
    </Card>
  );
}

export default function DashboardRentabilidad() {
  const [periodo, setPeriodo] = useState("1m");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadResumen = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await getDashboardRentabilidadResumen(resolveDashboardPeriodoRange(periodo));
    if (res.error) {
      setError(res.error);
      setData(null);
    } else {
      setData(res.data);
    }
    setLoading(false);
  }, [periodo]);

  useEffect(() => {
    loadResumen();
  }, [loadResumen]);

  const periodoSub =
    !loading && data?.filtros?.periodoDesde && data?.filtros?.periodoHasta
      ? `Período: ${data.filtros.periodoDesde} → ${data.filtros.periodoHasta}`
      : null;

  return (
    <div className="lt-module-inner">
      <div
        className="lt-toolbar"
        style={{
          marginBottom: "var(--lt-space-4)",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "var(--lt-space-3)",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--lt-space-3)", alignItems: "center" }}>
          <div style={{ minWidth: 160 }}>
            <label className="lt-info-row__label" htmlFor="periodo-rentabilidad">
              Período
            </label>
            <select
              id="periodo-rentabilidad"
              className="lt-input"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              disabled={loading}
            >
              {DASHBOARD_PERIODO_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          {periodoSub && !error ? (
            <p className="lt-dashboard-period-note">
              <CircleDollarSign size={14} aria-hidden="true" />
              {periodoSub}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className="lt-btn lt-btn--ghost"
          onClick={loadResumen}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Actualizar
        </button>
      </div>

      {error ? (
        <div
          className="lt-error-banner lt-error-banner--compact"
          role="alert"
          style={{ marginBottom: "var(--lt-space-4)" }}
        >
          <span>{error}</span>
          <button
            type="button"
            className="lt-btn lt-btn--secondary"
            style={{ marginLeft: "12px" }}
            onClick={loadResumen}
          >
            Reintentar
          </button>
        </div>
      ) : null}

      <section aria-label="Indicadores de margen">
        <h2 className="lt-section-label">Margen y costos totales</h2>
        <KpiRow items={ROW_MARGEN} data={data} loading={loading} />
      </section>

      <section aria-label="Desglose de costos" style={{ marginTop: "var(--lt-space-5)" }}>
        <h2 className="lt-section-label">Desglose de costos</h2>
        <KpiRow items={ROW_COSTOS} data={data} loading={loading} />
      </section>

      <section aria-label="Rutas extremas" style={{ marginTop: "var(--lt-space-5)" }}>
        <h2 className="lt-section-label">Rutas destacadas</h2>
        <div className="lt-dashboard-rutas-grid">
          {loading ? (
            <>
              <RutaExtremaSkeleton title="Pedido más rentable" />
              <RutaExtremaSkeleton title="Pedido menos rentable" />
            </>
          ) : (
            <>
              <RutaExtremaCard
                title="Pedido más rentable"
                icon={Trophy}
                iconClass="lt-kpi-icon--green"
                ruta={data?.rutaMasRentable}
                emptyLabel="Sin pedidos con comprobante en el período"
              />
              <RutaExtremaCard
                title="Pedido menos rentable"
                icon={TrendingDown}
                iconClass="lt-kpi-icon--red"
                ruta={data?.rutaMenosRentable}
                emptyLabel="Sin pedidos con comprobante en el período"
              />
            </>
          )}
        </div>
      </section>
    </div>
  );
}
