import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, RefreshCw, Search } from "lucide-react";
import { actualizarEstado, getPagos } from "../lib/pagosClienteService";
import {
  ESTADO_PAGADO,
  ESTADO_PENDIENTE,
  ESTADO_PROCESANDO,
  estadoBadgeVariant,
  etiquetaMetodo,
  etiquetaPedido,
  formatMontoPago,
  normalizarEstadoPago,
} from "../lib/pagosClienteUtils";
import Badge from "./ui/Badge";
import Card from "./ui/Card";
import EmptyState from "./ui/EmptyState";
import Pagination from "./ui/Pagination";
import Spinner from "./ui/Spinner";

const FILTRO_TODOS = "todos";

/**
 * Vista operador HU-34: consulta y cambio de estado.
 * Pagos asociados a pedidos — sin creación manual ni dependencia de rutas.
 */
function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-CL");
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
              <div className="lt-info-row__label">Monto</div>
              <div className="lt-info-row__value">{formatMontoPago(pago)}</div>
            </div>
            <div>
              <div className="lt-info-row__label">Estado</div>
              <Badge variant={estadoBadgeVariant(estado)}>{estado}</Badge>
            </div>
            <div>
              <div className="lt-info-row__label">Pedido</div>
              <div className="lt-info-row__value">{etiquetaPedido(pago.pedidoId)}</div>
            </div>
            <div>
              <div className="lt-info-row__label">Fecha pago</div>
              <div className="lt-info-row__value">{formatDate(pago.fechaPago)}</div>
            </div>
            <div>
              <div className="lt-info-row__label">Método</div>
              <div className="lt-info-row__value">{etiquetaMetodo(pago.metodoPago)}</div>
            </div>
            <div>
              <div className="lt-info-row__label">Proveedor</div>
              <div className="lt-info-row__value">{etiquetaMetodo(pago.proveedorPago)}</div>
            </div>
            {pago.referenciaTransaccion ? (
              <div>
                <div className="lt-info-row__label">Ref. transacción</div>
                <div className="lt-info-row__value">{pago.referenciaTransaccion}</div>
              </div>
            ) : null}
          </div>

          <p className="lt-text-muted">
            Cambio de estado manual del pago.
          </p>
        </div>

        <div className="lt-modal-footer">
          {puedeMarcarPagado ? (
            <>
              <button
                type="button"
                className="lt-btn lt-btn--secondary"
                disabled={updating}
                onClick={() => onCambiarEstado(pago, ESTADO_PROCESANDO, "transbank")}
              >
                {updating ? "Guardando…" : "Marcar procesando"}
              </button>
              <button
                type="button"
                className="lt-btn lt-btn--primary"
                disabled={updating}
                onClick={() => onCambiarEstado(pago, ESTADO_PAGADO, "manual")}
              >
                {updating ? "Guardando…" : "Marcar pagado"}
              </button>
            </>
          ) : null}
          <button type="button" className="lt-btn lt-btn--secondary" onClick={onClose}>
            Cerrar
          </button>
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
    pagosSinMontoCalculado: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState(FILTRO_TODOS);
  const [detalle, setDetalle] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

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
        pagosSinMontoCalculado: res.data?.pagosSinMontoCalculado ?? 0,
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
      const pedido = String(p.pedidoId || "").toLowerCase();
      const metodo = String(p.metodoPago || "").toLowerCase();
      return (
        cliente.includes(q) ||
        id.includes(q) ||
        pedido.includes(q) ||
        metodo.includes(q)
      );
    });
  }, [pagos, search, filtroEstado]);

  useEffect(() => {
    setPage(1);
  }, [search, filtroEstado]);

  const totalPagosFiltrados = pagosFiltrados.length;
  const totalPages = Math.max(1, Math.ceil(totalPagosFiltrados / limit) || 1);

  const pagosPaginados = useMemo(() => {
    const start = (page - 1) * limit;
    return pagosFiltrados.slice(start, start + limit);
  }, [pagosFiltrados, page, limit]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  async function handleCambiarEstado(pago, estado, metodoPago) {
    setUpdating(true);
    const res = await actualizarEstado(pago.id, {
      estado,
      metodoPago,
      proveedorPago: metodoPago === "transbank" ? "transbank" : "manual",
    });
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
      <div className="lt-kpi-strip lt-kpi-strip--dashboard">
        <Card>
          <div className="lt-kpi-card">
            <div>
              <div className="lt-kpi-card__label">Total</div>
              <div className="lt-kpi-card__value">
                {new Intl.NumberFormat("es-CL", {
                  style: "currency",
                  currency: "CLP",
                  maximumFractionDigits: 0,
                }).format(totales.totalAcumulado || 0)}
              </div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="lt-kpi-card">
            <div>
              <div className="lt-kpi-card__label">Pendiente</div>
              <div className="lt-kpi-card__value">
                {new Intl.NumberFormat("es-CL", {
                  style: "currency",
                  currency: "CLP",
                  maximumFractionDigits: 0,
                }).format(totales.totalPendiente || 0)}
              </div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="lt-kpi-card">
            <div>
              <div className="lt-kpi-card__label">Pagado</div>
              <div className="lt-kpi-card__value">
                {new Intl.NumberFormat("es-CL", {
                  style: "currency",
                  currency: "CLP",
                  maximumFractionDigits: 0,
                }).format(totales.totalPagado || 0)}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {totales.pagosSinMontoCalculado > 0 ? (
        <p className="lt-text-muted" style={{ marginBottom: "12px", fontSize: "13px" }}>
          {totales.pagosSinMontoCalculado} pago(s) con monto pendiente de cálculo.
        </p>
      ) : null}

      <div className="lt-toolbar" style={{ marginBottom: "16px" }}>
        <div className="lt-search-wrap">
          <Search size={16} className="lt-search-wrap__icon" />
          <input
            type="search"
            className="lt-input"
            placeholder="Buscar por cliente, pedido, ID o método…"
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
          description="Los pagos aparecerán aquí cuando se generen al crear pedidos."
        />
      ) : (
        <div className="lt-card lt-module-card">
          <div className="lt-card__body">
            <div className="lt-table-wrap">
              <table className="lt-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Pedido</th>
                    <th>Monto</th>
                    <th>Estado</th>
                    <th>Método</th>
                    <th>Fecha creación</th>
                    <th>Fecha pago</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pagosPaginados.map((p) => (
                    <tr key={p.id}>
                      <td>{p.clienteNombre || "—"}</td>
                      <td>{etiquetaPedido(p.pedidoId)}</td>
                      <td>{formatMontoPago(p)}</td>
                      <td>
                        <Badge variant={estadoBadgeVariant(p.estado)} showDot={false}>
                          {normalizarEstadoPago(p.estado)}
                        </Badge>
                      </td>
                      <td>{etiquetaMetodo(p.metodoPago)}</td>
                      <td>{formatDate(p.fechaCreacion)}</td>
                      <td>{formatDate(p.fechaPago)}</td>
                      <td>
                        <div className="lt-table__actions">
                          <button
                            type="button"
                            className="lt-btn lt-btn--secondary lt-btn--sm"
                            onClick={() => setDetalle(p)}
                          >
                            <Eye size={14} />
                            Ver detalle
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={totalPagosFiltrados}
                limit={limit}
                limitOptions={[5, 10, 20]}
                onPageChange={setPage}
                onLimitChange={(newLimit) => {
                  setLimit(newLimit);
                  setPage(1);
                }}
              />
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
