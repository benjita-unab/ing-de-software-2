import React, { useCallback, useEffect, useMemo, useState } from "react";
import { getPagosCliente } from "../lib/pagosClienteService";
import {
  ESTADO_PAGADO,
  ESTADO_PENDIENTE,
  ESTADO_PROCESANDO,
  formatMontoPago,
  normalizarEstadoPago,
  etiquetaMetodo,
  etiquetaPedido,
} from "../lib/pagosClienteUtils";

const TAB_PENDIENTE = "PENDIENTE";
const TAB_PAGADO = "PAGADO";

const styles = {
  badge: (estado) => {
    const e = normalizarEstadoPago(estado);
    const map = {
      [ESTADO_PAGADO]: { bg: "rgba(34,197,94,0.2)", color: "#86efac" },
      [ESTADO_PROCESANDO]: { bg: "rgba(59,130,246,0.2)", color: "#93c5fd" },
      [ESTADO_PENDIENTE]: { bg: "rgba(234,179,8,0.2)", color: "#fde047" },
    };
    const tone = map[e] || map[ESTADO_PENDIENTE];
    return {
      display: "inline-block",
      padding: "4px 10px",
      borderRadius: "999px",
      fontSize: "12px",
      fontWeight: 600,
      background: tone.bg,
      color: tone.color,
    };
  },
  tableWrap: {
    overflowX: "auto",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.12)",
    marginBottom: "16px",
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "14px" },
  th: {
    textAlign: "left",
    padding: "12px 14px",
    borderBottom: "1px solid rgba(255,255,255,0.12)",
    color: "rgba(226,232,240,0.75)",
    fontWeight: 600,
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  td: {
    padding: "12px 14px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    verticalAlign: "middle",
  },
  rowActive: { background: "rgba(14,165,233,0.1)" },
  btnPagar: {
    padding: "8px 14px",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.06)",
    color: "rgba(226,232,240,0.45)",
    cursor: "not-allowed",
    fontSize: "13px",
    fontWeight: 600,
    fontFamily: "inherit",
  },
  avisoOnline: {
    padding: "12px 16px",
    borderRadius: "10px",
    border: "1px solid rgba(59,130,246,0.35)",
    background: "rgba(59,130,246,0.12)",
    color: "#93c5fd",
    fontSize: "14px",
    marginBottom: "20px",
  },
  detail: {
    padding: "20px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(8,12,24,0.9)",
  },
  tabs: { display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" },
  tab: (active) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 16px",
    borderRadius: "10px",
    border: active
      ? "1px solid rgba(14,165,233,0.65)"
      : "1px solid rgba(255,255,255,0.12)",
    background: active ? "rgba(14,165,233,0.18)" : "rgba(15,23,42,0.6)",
    color: active ? "#e0f2fe" : "rgba(226,232,240,0.85)",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: active ? 600 : 500,
    fontFamily: "inherit",
  }),
  kpiRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: "12px",
    marginBottom: "20px",
  },
  kpi: {
    padding: "14px 16px",
    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(15,23,42,0.7)",
  },
};

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("es-CL");
  } catch {
    return value;
  }
}

function formatKpi(value) {
  const n = Number(value);
  const safe = Number.isFinite(n) ? n : 0;
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(safe);
}

function puedeIntentarPagoOnline(estado) {
  const e = normalizarEstadoPago(estado);
  return e === ESTADO_PENDIENTE || e === ESTADO_PROCESANDO;
}

/**
 * Portal cliente — historial de pagos asociados a pedidos.
 * Botón Pagar: placeholder Transbank (HU futura).
 */
export default function PortalPagos({ clienteId }) {
  const [pagos, setPagos] = useState([]);
  const [totales, setTotales] = useState({
    totalPendiente: 0,
    totalPagado: 0,
    pagosSinMontoCalculado: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState(TAB_PENDIENTE);
  const [selectedId, setSelectedId] = useState(null);

  const loadPagos = useCallback(async () => {
    if (!clienteId) {
      setPagos([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    const res = await getPagosCliente(clienteId);
    if (res.error) {
      setError(res.error);
      setPagos([]);
    } else {
      setPagos(res.data?.data || []);
      setTotales({
        totalPendiente: res.data?.totalPendiente ?? 0,
        totalPagado: res.data?.totalPagado ?? 0,
        pagosSinMontoCalculado: res.data?.pagosSinMontoCalculado ?? 0,
      });
    }
    setLoading(false);
  }, [clienteId]);

  useEffect(() => {
    loadPagos();
  }, [loadPagos]);

  const { pendientes, pagados } = useMemo(() => {
    const p = [];
    const g = [];
    for (const item of pagos) {
      const e = normalizarEstadoPago(item.estado);
      if (e === ESTADO_PAGADO) g.push(item);
      else if (e === ESTADO_PENDIENTE || e === ESTADO_PROCESANDO) p.push(item);
    }
    return { pendientes: p, pagados: g };
  }, [pagos]);

  const visibles = activeTab === TAB_PAGADO ? pagados : pendientes;
  const selected = visibles.find((p) => p.id === selectedId) ?? null;

  return (
    <div>
      <p style={styles.avisoOnline} role="status">
        Pago online disponible próximamente
      </p>

      <div style={styles.kpiRow}>
        <div style={styles.kpi}>
          <div style={{ fontSize: "12px", opacity: 0.7 }}>Pendiente / procesando</div>
          <div style={{ fontSize: "20px", fontWeight: 700 }}>
            {formatKpi(totales.totalPendiente)}
          </div>
        </div>
        <div style={styles.kpi}>
          <div style={{ fontSize: "12px", opacity: 0.7 }}>Pagado</div>
          <div style={{ fontSize: "20px", fontWeight: 700 }}>
            {formatKpi(totales.totalPagado)}
          </div>
        </div>
      </div>

      {totales.pagosSinMontoCalculado > 0 ? (
        <p style={{ opacity: 0.75, fontSize: "13px", marginBottom: "12px" }}>
          {totales.pagosSinMontoCalculado} pago(s) con monto pendiente de cálculo.
        </p>
      ) : null}

      {error ? (
        <p style={{ color: "#f87171", marginBottom: "16px" }} role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p style={{ opacity: 0.7 }}>Cargando pagos…</p>
      ) : pagos.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", opacity: 0.75 }}>
          <p>No tienes pagos registrados.</p>
        </div>
      ) : (
        <>
          <div style={styles.tabs} role="tablist" aria-label="Historial de pagos">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === TAB_PENDIENTE}
              style={styles.tab(activeTab === TAB_PENDIENTE)}
              onClick={() => {
                setActiveTab(TAB_PENDIENTE);
                setSelectedId(null);
              }}
            >
              Pendientes ({pendientes.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === TAB_PAGADO}
              style={styles.tab(activeTab === TAB_PAGADO)}
              onClick={() => {
                setActiveTab(TAB_PAGADO);
                setSelectedId(null);
              }}
            >
              Pagados ({pagados.length})
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div role="tabpanel">
              {visibles.length === 0 ? (
                <p style={{ opacity: 0.7 }}>
                  {activeTab === TAB_PAGADO
                    ? "No hay pagos completados."
                    : "No hay pagos pendientes."}
                </p>
              ) : (
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Monto</th>
                        <th style={styles.th}>Estado</th>
                        <th style={styles.th}>Método</th>
                        <th style={styles.th}>Pedido</th>
                        <th style={styles.th}>Fecha</th>
                        <th style={styles.th}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibles.map((p) => (
                        <tr
                          key={p.id}
                          style={{
                            cursor: "pointer",
                            ...(selectedId === p.id ? styles.rowActive : {}),
                          }}
                          onClick={() => setSelectedId(p.id)}
                        >
                          <td style={styles.td}>{formatMontoPago(p)}</td>
                          <td style={styles.td}>
                            <span style={styles.badge(p.estado)}>
                              {normalizarEstadoPago(p.estado)}
                            </span>
                          </td>
                          <td style={styles.td}>{etiquetaMetodo(p.metodoPago)}</td>
                          <td style={styles.td}>{etiquetaPedido(p.pedidoId)}</td>
                          <td style={styles.td}>{formatDate(p.fechaCreacion)}</td>
                          <td style={styles.td}>
                            <button
                              type="button"
                              style={styles.btnPagar}
                              disabled
                              title="Pago online disponible próximamente"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Pagar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={styles.detail}>
              {!selected ? (
                <p style={{ opacity: 0.7 }}>Selecciona un pago para ver el detalle.</p>
              ) : (
                <>
                  <h2 style={{ marginTop: 0, fontSize: "18px" }}>Detalle del pago</h2>
                  <p>
                    <span style={styles.badge(selected.estado)}>
                      {normalizarEstadoPago(selected.estado)}
                    </span>
                  </p>
                  <p>
                    <strong>Monto:</strong> {formatMontoPago(selected)}
                  </p>
                  <p>
                    <strong>Pedido:</strong> {etiquetaPedido(selected.pedidoId)}
                  </p>
                  <p>
                    <strong>Método:</strong> {etiquetaMetodo(selected.metodoPago)}
                  </p>
                  <p>
                    <strong>Proveedor:</strong> {etiquetaMetodo(selected.proveedorPago)}
                  </p>
                  <p>
                    <strong>Fecha creación:</strong> {formatDate(selected.fechaCreacion)}
                  </p>
                  <p>
                    <strong>Fecha pago:</strong> {formatDate(selected.fechaPago)}
                  </p>
                  {selected.referenciaTransaccion ? (
                    <p>
                      <strong>Ref. transacción:</strong> {selected.referenciaTransaccion}
                    </p>
                  ) : null}

                  {puedeIntentarPagoOnline(selected.estado) ? (
                    <div style={{ marginTop: "20px" }}>
                      <button type="button" style={styles.btnPagar} disabled>
                        Pagar
                      </button>
                      <p style={{ marginTop: "10px", fontSize: "13px", opacity: 0.75 }}>
                        Pago online disponible próximamente
                      </p>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
