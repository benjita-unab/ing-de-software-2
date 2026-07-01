import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  DollarSign,
  Package,
  Route,
  Truck,
  MapPin,
} from "lucide-react";
import {
  obtenerComparativaMetricasPago,
  obtenerMetricasPagoConductor,
} from "../lib/rutasService";
import { formatRutaCodigo } from "../lib/conductorUtils";
import KpiCard from "./ui/KpiCard";
import Spinner from "./ui/Spinner";

const PERIODOS = [
  { value: "diario", label: "Diario" },
  { value: "semanal", label: "Semanal" },
  { value: "mensual", label: "Mensual" },
  { value: "rango", label: "Rango personalizado" },
];

function formatMonto(valor) {
  if (valor == null || Number.isNaN(Number(valor))) return "—";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number(valor));
}

function formatNumero(valor, decimales = 0) {
  if (valor == null || Number.isNaN(Number(valor))) return "—";
  return new Intl.NumberFormat("es-CL", {
    maximumFractionDigits: decimales,
  }).format(Number(valor));
}

function formatFechaCorta(fecha) {
  if (!fecha) return "—";
  const parsed = new Date(fecha.includes("T") ? fecha : `${fecha}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return fecha;
  return parsed.toLocaleDateString("es-CL");
}

export default function MetricasPagoConductor({
  conductorId,
  conductorRut,
  configPagosVersion = 0,
}) {
  const [periodo, setPeriodo] = useState("mensual");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [metricas, setMetricas] = useState(null);
  const [comparativa, setComparativa] = useState(null);

  const filtros = useMemo(() => {
    const base = { periodo };
    if (periodo === "rango") {
      return { ...base, fechaInicio, fechaFin };
    }
    return base;
  }, [periodo, fechaInicio, fechaFin]);

  const cargarDatos = useCallback(async () => {
    void configPagosVersion;
    if (!conductorId) return;
    if (periodo === "rango" && (!fechaInicio || !fechaFin)) {
      setLoading(false);
      setError("Selecciona fecha de inicio y fin para el rango personalizado.");
      setMetricas(null);
      setComparativa(null);
      return;
    }

    setLoading(true);
    setError("");

    const [resMetricas, resComparativa] = await Promise.all([
      obtenerMetricasPagoConductor(conductorId, filtros),
      obtenerComparativaMetricasPago(filtros),
    ]);

    if (resMetricas.error) {
      setError(resMetricas.error);
      setMetricas(null);
    } else {
      setMetricas(resMetricas.data);
    }

    if (resComparativa.error) {
      if (!resMetricas.error) {
        setError(resComparativa.error);
      }
      setComparativa(null);
    } else {
      setComparativa(resComparativa.data);
    }

    setLoading(false);
  }, [conductorId, filtros, periodo, fechaInicio, fechaFin, configPagosVersion]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const desglose = metricas?.desglose;
  const ops = metricas?.metricas;
  const rango = metricas?.periodo;

  const filasDesglose = desglose
    ? [
        {
          concepto: "Pedidos entregados",
          cantidad: desglose.totalRutas,
          unitario: desglose.precioUnitarioRuta,
          subtotal: desglose.montoPorRutas,
        },
        {
          concepto: "Entregas realizadas",
          cantidad: desglose.totalEntregas,
          unitario: desglose.precioUnitarioEntrega,
          subtotal: desglose.montoPorEntregas,
        },
        {
          concepto: "Slots entregados",
          cantidad: desglose.totalBultos,
          unitario: desglose.precioUnitarioBulto,
          subtotal: desglose.montoPorBultos,
        },
        {
          concepto: "Kilómetros recorridos",
          cantidad: desglose.totalKilometros,
          unitario: desglose.precioUnitarioKm,
          subtotal: desglose.montoPorKilometros,
        },
      ]
    : [];

  const rankingConductor = comparativa?.conductores?.find(
    (c) => c.conductorId === conductorId,
  );

  return (
      <div className="lt-modal-section">
      <div className="lt-modal-section__title">Métricas y pago</div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 16,
          alignItems: "flex-end",
        }}
      >
        <div style={{ minWidth: 160 }}>
          <label className="lt-info-row__label" htmlFor="periodo-pago">
            Período
          </label>
          <select
            id="periodo-pago"
            className="lt-input"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            disabled={loading}
          >
            {PERIODOS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {periodo === "rango" && (
          <>
            <div>
              <label className="lt-info-row__label" htmlFor="fecha-inicio-pago">
                Desde
              </label>
              <input
                id="fecha-inicio-pago"
                type="date"
                className="lt-input"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <label className="lt-info-row__label" htmlFor="fecha-fin-pago">
                Hasta
              </label>
              <input
                id="fecha-fin-pago"
                type="date"
                className="lt-input"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                disabled={loading}
              />
            </div>
          </>
        )}

        {rango && !loading && (
          <div className="lt-card__subtitle" style={{ paddingBottom: 8 }}>
            {formatFechaCorta(rango.fechaInicio)} — {formatFechaCorta(rango.fechaFin)}
          </div>
        )}
      </div>

      {error && (
        <div className="lt-alert-banner lt-alert-banner--warning" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="lt-empty" style={{ display: "flex", justifyContent: "center", padding: "24px 0" }}>
          <Spinner />
        </div>
      ) : metricas ? (
        <>
          <div className="lt-kpi-strip lt-kpi-strip--compact" style={{ marginBottom: 16 }}>
            <KpiCard
              icon={Route}
              label="Rutas completadas"
              value={formatNumero(ops?.rutasCompletadas)}
              iconClass="lt-kpi-icon--blue"
            />
            <KpiCard
              icon={Package}
              label="Entregas realizadas"
              value={formatNumero(ops?.entregasRealizadas)}
              iconClass="lt-kpi-icon--purple"
            />
            <KpiCard
              icon={Truck}
              label="Slots entregados"
              value={formatNumero(ops?.bultosEntregados)}
              iconClass="lt-kpi-icon--amber"
            />
            <KpiCard
              icon={MapPin}
              label="Kilómetros"
              value={formatNumero(ops?.kilometrosRecorridos, 1)}
              iconClass="lt-kpi-icon--green"
            />
            <KpiCard
              icon={DollarSign}
              label="Total a pagar"
              value={formatMonto(desglose?.montoFinal)}
              sub={rankingConductor ? `#${rankingConductor.ranking} en flota` : undefined}
              iconClass="lt-kpi-icon--green"
            />
          </div>

          <div className="lt-modal-section lt-modal-section--flush">
            <div className="lt-modal-section__title">Desglose del cálculo</div>
            <div className="lt-table-wrap">
              <table className="lt-table">
                <thead>
                  <tr>
                    <th>Concepto</th>
                    <th>Cantidad</th>
                    <th>Valor unitario</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {filasDesglose.map((fila) => (
                    <tr key={fila.concepto}>
                      <td>{fila.concepto}</td>
                      <td>{formatNumero(fila.cantidad, fila.concepto.includes("Kiló") ? 1 : 0)}</td>
                      <td>{formatMonto(fila.unitario)}</td>
                      <td>{formatMonto(fila.subtotal)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={3} style={{ fontWeight: 700, textAlign: "right" }}>
                      Monto final
                    </td>
                    <td style={{ fontWeight: 700 }}>{formatMonto(desglose?.montoFinal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {comparativa?.conductores?.length > 0 && (
            <div className="lt-modal-section lt-modal-section--flush">
              <div className="lt-modal-section__title">Comparativa de flota</div>
              <div className="lt-table-wrap">
                <table className="lt-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Conductor</th>
                      <th>Pedidos</th>
                      <th>Entregas</th>
                      <th>Slots</th>
                      <th>Km</th>
                      <th>Total pago</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparativa.conductores.map((item) => {
                      const esActual = item.conductorId === conductorId;
                      return (
                        <tr
                          key={item.conductorId}
                          style={esActual ? { background: "rgba(37,99,235,0.12)" } : undefined}
                        >
                          <td>{item.ranking}</td>
                          <td>
                            {item.conductorRut || "—"}
                            {esActual ? " (actual)" : ""}
                          </td>
                          <td>{formatNumero(item.metricas?.rutasCompletadas)}</td>
                          <td>{formatNumero(item.metricas?.entregasRealizadas)}</td>
                          <td>{formatNumero(item.metricas?.bultosEntregados)}</td>
                          <td>{formatNumero(item.metricas?.kilometrosRecorridos, 1)}</td>
                          <td>{formatMonto(item.desglose?.montoFinal)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {metricas.rutas?.length > 0 && (
            <div className="lt-modal-section lt-modal-section--flush">
              <div className="lt-modal-section__title">
                Rutas incluidas ({metricas.rutas.length})
              </div>
              <div className="lt-table-wrap">
                <table className="lt-table">
                  <thead>
                    <tr>
                      <th>Pedido</th>
                      <th>Origen</th>
                      <th>Destino</th>
                      <th>Completada</th>
                      <th>Slots</th>
                      <th>Km</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metricas.rutas.map((ruta) => (
                      <tr key={ruta.id}>
                        <td title={ruta.id}>{formatRutaCodigo(ruta)}</td>
                        <td>{ruta.origen || "—"}</td>
                        <td>{ruta.destino || "—"}</td>
                        <td>{formatFechaCorta(ruta.fechaCompletado)}</td>
                        <td>{formatNumero(ruta.bultosEntregados)}</td>
                        <td>{formatNumero(ruta.distanciaKm, 1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {metricas.rutas?.length === 0 && (
            <p className="lt-empty">No hay rutas completadas en el período seleccionado.</p>
          )}
        </>
      ) : null}
    </div>
  );
}
