import React, { useCallback, useEffect, useState } from "react";
import {
  Banknote,
  CalendarDays,
  CircleDollarSign,
  Clock,
  Loader2,
  RefreshCw,
  TrendingUp,
  Wallet,
  CheckCircle2,
} from "lucide-react";
import KpiCard from "./ui/KpiCard";
import {
  DASHBOARD_PERIODO_PRESETS,
  getDashboardFinancieroResumen,
  resolveDashboardPeriodoRange,
} from "../lib/dashboardFinancieroService";

const ROW_INGRESOS = [
  {
    key: "ingresosHoy",
    label: "Ingresos de hoy",
    icon: Banknote,
    iconClass: "lt-kpi-icon--green",
    format: "clp",
  },
  {
    key: "ingresosMesMtd",
    label: "Ingresos del mes",
    icon: CalendarDays,
    iconClass: "lt-kpi-icon--blue",
    format: "clp",
  },
  {
    key: "montoPorCobrar",
    label: "Monto por cobrar",
    icon: Wallet,
    iconClass: "lt-kpi-icon--amber",
    format: "clp",
  },
  {
    key: "margenBrutoBasico",
    label: "Margen bruto",
    icon: TrendingUp,
    iconClass: "lt-kpi-icon--purple",
    format: "clp",
  },
];

const ROW_PAGOS = [
  {
    key: "pagosPendientes",
    label: "Pagos pendientes",
    icon: Clock,
    iconClass: "lt-kpi-icon--amber",
    format: "count",
  },
  {
    key: "pagosProcesando",
    label: "Pagos procesando",
    icon: Loader2,
    iconClass: "lt-kpi-icon--blue",
    format: "count",
  },
  {
    key: "pagosCompletados",
    label: "Pagos completados",
    icon: CheckCircle2,
    iconClass: "lt-kpi-icon--green",
    format: "count",
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

export default function DashboardFinanciero() {
  const [periodo, setPeriodo] = useState("1m");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadResumen = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await getDashboardFinancieroResumen(resolveDashboardPeriodoRange(periodo));
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

  const margenSub =
    !loading && data?.filtros?.margenDesde && data?.filtros?.margenHasta
      ? `Período margen: ${data.filtros.margenDesde} → ${data.filtros.margenHasta}`
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
            <label className="lt-info-row__label" htmlFor="periodo-financiero">
              Período
            </label>
            <select
              id="periodo-financiero"
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
          {margenSub && !error ? (
            <p className="lt-dashboard-period-note">
              <CircleDollarSign size={14} aria-hidden="true" />
              {margenSub}
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

      <section aria-label="Indicadores de ingresos y cartera">
        <h2 className="lt-section-label">Ingresos y cartera</h2>
        <KpiRow items={ROW_INGRESOS} data={data} loading={loading} />
      </section>

      <section aria-label="Estado de pagos" style={{ marginTop: "var(--lt-space-5)" }}>
        <h2 className="lt-section-label">Estado de pagos</h2>
        <KpiRow items={ROW_PAGOS} data={data} loading={loading} />
      </section>
    </div>
  );
}
