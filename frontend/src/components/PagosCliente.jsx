import React, { useCallback, useEffect, useMemo, useState } from "react";
import { DollarSign, RefreshCw, Search } from "lucide-react";
import { actualizarEstado, getPagos } from "../lib/pagosClienteService";
import Badge from "./ui/Badge";
import Card from "./ui/Card";
import EmptyState from "./ui/EmptyState";
import Spinner from "./ui/Spinner";

const FILTRO_TODOS = "todos";
const ESTADO_PENDIENTE = "PENDIENTE";
const ESTADO_PROCESANDO = "PROCESANDO";
const ESTADO_PAGADO = "PAGADO";

/**
 * Vista operador HU-34: solo consulta y cambio de estado manual.
 * Los pagos se originan desde pedido/ruta o checkout portal (Transbank), no desde aquí.
 */
function formatMoney(value) {
  const n = Number(value);
  const safe = Number.isFinite(n) ? n : 0;
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(safe);
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-CL");
}

function normalizarEstadoPago(estado) {
  const upper = String(estado || "").trim().toUpperCase();
  if (upper === ESTADO_PAGADO) return ESTADO_PAGADO;
  if (upper === ESTADO_PROCESANDO) return ESTADO_PROCESANDO;
  return ESTADO_PENDIENTE;
}

function estadoBadgeVariant(estado) {
  const e = normalizarEstadoPago(estado);
  if (e === ESTADO_PAGADO) return "success";
  if (e === ESTADO_PROCESANDO) return "info";
  return "warning";
}

function etiquetaMetodo(metodo) {
  const m = String(metodo || "").trim();
  return m || "—";
}

function DetallePagoModal({ pago, onClose, onCambiarEstado, updating }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!pago) return null;

  const estado = normalizarEstadoPago(pago.estado);
  const puedeMarcarPagado = estado === ESTADO_PENDIENTE || estado === ESTADO_PROCESANDO;

  return (
    <div
      className="lt-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="lt-modal-dialog lt-modal-dialog--lg">
        <div className="lt-modal-header">
          <div>
            <div className="lt-modal-header__title">Detalle del pago</div>
            <div className="lt-modal-header__sub">
              {pago.clienteNombre || "Cliente"} · {formatDate(pago.fechaCreacion)}
            </div>
          </div>
          <button type="button" onClick={onClose} className="lt-modal-close" aria-label="Cerrar">
            ×
          </button>
        </div>
        <div className="lt-modal-body">
          <div className="lt-info-row" style={{ marginBottom: "16px" }}>
            <div>
              <div className="lt-info-row__label">Monto total</div>
              <div className="lt-info-row__value">{formatMoney(pago.montoTotal)}</div>
            </div>
            <div>
              <div className="lt-info-row__label">Estado</div>
              <Badge variant={estadoBadgeVariant(estado)}>{estado}</Badge>
            </div>
            <div>
              <div className="lt-info-row__label">Fecha pago</div>
              <div className="lt-info-row__value">{formatDate(pago.fechaPago)}</div>
            </div>
            <div>
              <div className="lt-info-row__label">Método</div>
              <div className="lt-info-row__value">{etiquetaMetodo(pago.metodoPago)}</div>
            </div>
            {pago.referenciaTransaccion ? (
              <div>
                <div className="lt-info-row__label">Ref. transacción</div>
                <div className="lt-info-row__value">{pago.referenciaTransaccion}</div>
              </div>
            ) : null}
          </div>

          <h3 className="lt-section-title">Rutas incluidas</h3>
          <div className="lt-table-wrap">
            <table className="lt-table">
              <thead>
                <tr>
                  <th>Origen → Destino</th>
                  <th>Estado</th>
                  <th>Fecha fin</th>
                  <th>Monto</th>
                </tr>
              </thead>
              <tbody>
                {(pago.rutas || []).length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", opacity: 0.7 }}>
                      Sin rutas asociadas
                    </td>
                  </tr>
                ) : (
                  pago.rutas.map((r) => (
                    <tr key={r.id}>
                      <td>
                        {r.origen || "—"} → {r.destino || "—"}
                      </td>
                      <td>
                        <Badge variant="muted">{r.estado}</Badge>
                      </td>
                      <td>{formatDate(r.fechaFin)}</td>
                      <td>{formatMoney(r.montoRuta)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <p className="lt-text-muted" style={{ marginTop: "16px", fontSize: "13px" }}>
            Cambio de estado manual solo para pruebas y contingencias. En producción el pago
            se confirmará vía Transbank desde el portal cliente.
          </p>

          {puedeMarcarPagado ? (
            <div style={{ marginTop: "16px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button
                type="button"
                className="lt-btn lt-btn--ghost"
                disabled={updating}
                onClick={() => onCambiarEstado(pago, ESTADO_PROCESANDO, "transbank")}
              >
                {updating ? "Guardando…" : "Marcar PROCESANDO"}
              </button>
              <button
                type="button"
                className="lt-btn lt-btn--primary"
                disabled={updating}
                onClick={() => onCambiarEstado(pago, ESTADO_PAGADO, "manual")}
              >
                {updating ? "Guardando…" : "Marcar PAGADO"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function PagosCliente() {
  const [pagos, setPagos] = useState([]);
  const [totales, setTotales] = useState({
    totalAcumulado: 0,
    totalPendiente: 0,
    totalPagado: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState(FILTRO_TODOS);
  const [detalle, setDetalle] = useState(null);
  const [updating, setUpdating] = useState(false);

  const loadPagos = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await getPagos();
    if (res.error) {
      setError(res.error);
      setPagos([]);
    } else {
      setPagos(res.data?.data || []);
      setTotales({
        totalAcumulado: res.data?.totalAcumulado ?? 0,
        totalPendiente: res.data?.totalPendiente ?? 0,
        totalPagado: res.data?.totalPagado ?? 0,
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPagos();
  }, [loadPagos]);

  const pagosFiltrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pagos.filter((p) => {
      if (
        filtroEstado !== FILTRO_TODOS &&
        normalizarEstadoPago(p.estado) !== filtroEstado
      ) {
        return false;
      }
      if (!q) return true;
      const cliente = String(p.clienteNombre || "").toLowerCase();
      const id = String(p.id || "").toLowerCase();
      const metodo = String(p.metodoPago || "").toLowerCase();
      return cliente.includes(q) || id.includes(q) || metodo.includes(q);
    });
  }, [pagos, search, filtroEstado]);

  async function handleCambiarEstado(pago, estado, metodoPago) {
    setUpdating(true);
    const res = await actualizarEstado(pago.id, { estado, metodoPago });
    setUpdating(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setDetalle(res.data);
    await loadPagos();
  }

  if (loading) {
    return (
      <div className="lt-module-inner" style={{ padding: "48px", textAlign: "center" }}>
        <Spinner />
      </div>
    );
  }

  return (
    <div className="lt-module-inner">
      <div className="lt-kpi-grid" style={{ marginBottom: "20px" }}>
        <Card>
          <div className="lt-kpi-card">
            <div className="lt-kpi-card__icon">
              <DollarSign size={20} />
            </div>
            <div>
              <div className="lt-kpi-card__label">Total acumulado</div>
              <div className="lt-kpi-card__value">{formatMoney(totales.totalAcumulado)}</div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="lt-kpi-card">
            <div>
              <div className="lt-kpi-card__label">Pendiente / procesando</div>
              <div className="lt-kpi-card__value">{formatMoney(totales.totalPendiente)}</div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="lt-kpi-card">
            <div>
              <div className="lt-kpi-card__label">Pagado</div>
              <div className="lt-kpi-card__value">{formatMoney(totales.totalPagado)}</div>
            </div>
          </div>
        </Card>
      </div>

      <div className="lt-toolbar" style={{ marginBottom: "16px" }}>
        <div className="lt-search-wrap">
          <Search size={16} className="lt-search-wrap__icon" />
          <input
            type="search"
            className="lt-input"
            placeholder="Buscar por cliente, ID o método…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="lt-select"
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          aria-label="Filtrar por estado"
        >
          <option value={FILTRO_TODOS}>Todos los estados</option>
          <option value={ESTADO_PENDIENTE}>PENDIENTE</option>
          <option value={ESTADO_PROCESANDO}>PROCESANDO</option>
          <option value={ESTADO_PAGADO}>PAGADO</option>
        </select>
        <button type="button" className="lt-btn lt-btn--ghost" onClick={loadPagos}>
          <RefreshCw size={16} />
          Actualizar
        </button>
      </div>

      {error ? (
        <p className="lt-alert lt-alert--danger" role="alert">
          {error}
        </p>
      ) : null}

      {pagosFiltrados.length === 0 ? (
        <EmptyState
          title="Sin pagos registrados"
          message="Los pagos aparecerán aquí cuando se generen desde pedidos o el portal cliente."
        />
      ) : (
        <div className="lt-card lt-module-card">
          <div className="lt-card__body">
            <div className="lt-table-wrap">
              <table className="lt-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Monto</th>
                    <th>Estado</th>
                    <th>Método</th>
                    <th>Fecha creación</th>
                    <th>Fecha pago</th>
                    <th>Rutas</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {pagosFiltrados.map((p) => (
                    <tr key={p.id}>
                      <td>{p.clienteNombre || "—"}</td>
                      <td>{formatMoney(p.montoTotal)}</td>
                      <td>
                        <Badge variant={estadoBadgeVariant(p.estado)}>
                          {normalizarEstadoPago(p.estado)}
                        </Badge>
                      </td>
                      <td>{etiquetaMetodo(p.metodoPago)}</td>
                      <td>{formatDate(p.fechaCreacion)}</td>
                      <td>{formatDate(p.fechaPago)}</td>
                      <td>{(p.rutas || []).length}</td>
                      <td>
                        <button
                          type="button"
                          className="lt-btn lt-btn--ghost lt-btn--sm"
                          onClick={() => setDetalle(p)}
                        >
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {detalle ? (
        <DetallePagoModal
          pago={detalle}
          onClose={() => setDetalle(null)}
          onCambiarEstado={handleCambiarEstado}
          updating={updating}
        />
      ) : null}
    </div>
  );
}
