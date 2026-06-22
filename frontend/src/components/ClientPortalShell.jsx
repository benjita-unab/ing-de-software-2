import React, { useCallback, useEffect, useMemo, useState } from "react";
import PortalEvidenciasModal from "./PortalEvidenciasModal";
import PortalPagos from "./PortalPagos";
import {
  getPortalPedidoById,
  getPortalPedidoEvidencias,
  getPortalPedidos,
} from "../lib/portalService";

const SECCION_PEDIDOS = "pedidos";
const SECCION_PAGOS = "pagos";

const TAB_PENDIENTES = "pendientes";
const TAB_COMPLETADOS = "completados";

/** HU-27 CA-4: ENTREGADO = completado; cualquier otro estado = pendiente. */
function isPedidoCompletado(estado) {
  return String(estado || "").trim().toUpperCase() === "ENTREGADO";
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#0a0e1a",
    color: "#e2e8f0",
    fontFamily: "'Inter', system-ui, sans-serif",
    padding: "24px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
    flexWrap: "wrap",
    gap: "12px",
  },
  card: {
    padding: "16px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(15,23,42,0.85)",
    marginBottom: "12px",
    cursor: "pointer",
  },
  cardActive: {
    borderColor: "#0ea5e9",
  },
  badge: (estado) => ({
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 600,
    background:
      estado === "ENTREGADO"
        ? "rgba(34,197,94,0.2)"
        : "rgba(14,165,233,0.2)",
    color: estado === "ENTREGADO" ? "#86efac" : "#7dd3fc",
  }),
  btn: {
    padding: "10px 16px",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.2)",
    background: "transparent",
    color: "#fff",
    cursor: "pointer",
  },
  btnEvidencias: {
    marginTop: "16px",
    padding: "10px 16px",
    borderRadius: "8px",
    border: "1px solid rgba(59,130,246,0.45)",
    background: "rgba(59,130,246,0.18)",
    color: "#93C5FD",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "14px",
    fontFamily: "inherit",
  },
  detail: {
    marginTop: "20px",
    padding: "20px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(8,12,24,0.9)",
  },
  timelineItem: {
    padding: "8px 0",
    borderLeft: "2px solid #0ea5e9",
    paddingLeft: "12px",
    marginBottom: "8px",
    fontSize: "14px",
  },
  tabs: {
    display: "flex",
    gap: "8px",
    marginBottom: "16px",
    flexWrap: "wrap",
  },
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
  tabCount: (variant) => ({
    display: "inline-block",
    minWidth: "22px",
    padding: "2px 8px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700,
    textAlign: "center",
    background:
      variant === "completados"
        ? "rgba(34,197,94,0.25)"
        : "rgba(14,165,233,0.25)",
    color: variant === "completados" ? "#86efac" : "#7dd3fc",
  }),
  emptyState: {
    textAlign: "center",
    padding: "48px 24px",
    borderRadius: "16px",
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(15,23,42,0.65)",
    maxWidth: "480px",
    margin: "24px auto 0",
  },
  emptyIcon: {
    fontSize: "48px",
    marginBottom: "16px",
    lineHeight: 1,
    opacity: 0.85,
  },
  emptyTitle: {
    margin: "0 0 10px",
    fontSize: "18px",
    fontWeight: 700,
    color: "#f1f5f9",
  },
  emptyMessage: {
    margin: 0,
    fontSize: "14px",
    lineHeight: 1.5,
    color: "#94a3b8",
  },
};

/** HU-27 CA-6: estado vacío cuando el cliente no tiene pedidos. */
function PortalPedidosEmptyState() {
  return (
    <div style={styles.emptyState} role="status" aria-live="polite">
      <div style={styles.emptyIcon} aria-hidden="true">
        📦
      </div>
      <h2 style={styles.emptyTitle}>No tienes pedidos disponibles</h2>
      <p style={styles.emptyMessage}>
        Los despachos asignados aparecerán aquí
      </p>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("es-CL");
  } catch {
    return value;
  }
}

export default function ClientPortalShell({ user, onSignOut }) {
  const [seccionActiva, setSeccionActiva] = useState(SECCION_PEDIDOS);
  const [pedidos, setPedidos] = useState([]);
  const [activeTab, setActiveTab] = useState(TAB_PENDIENTES);
  const [selectedId, setSelectedId] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [error, setError] = useState("");
  const [evidenciasOpen, setEvidenciasOpen] = useState(false);
  const [evidencias, setEvidencias] = useState(null);
  const [evidenciasLoading, setEvidenciasLoading] = useState(false);
  const [evidenciasError, setEvidenciasError] = useState(null);

  const loadPedidos = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await getPortalPedidos();
    if (!res.ok) {
      setError(res.error || "No se pudieron cargar los pedidos");
      setPedidos([]);
    } else {
      setPedidos(res.data?.data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPedidos();
  }, [loadPedidos]);

  const { pedidosPendientes, pedidosCompletados } = useMemo(() => {
    const pendientes = [];
    const completados = [];
    for (const p of pedidos) {
      if (isPedidoCompletado(p.estado)) {
        completados.push(p);
      } else {
        pendientes.push(p);
      }
    }
    return { pedidosPendientes: pendientes, pedidosCompletados: completados };
  }, [pedidos]);

  const pedidosVisibles =
    activeTab === TAB_COMPLETADOS ? pedidosCompletados : pedidosPendientes;

  async function handleSelectPedido(id) {
    setSelectedId(id);
    setEvidenciasOpen(false);
    setEvidencias(null);
    setEvidenciasError(null);
    setLoadingDetalle(true);
    setError("");
    const res = await getPortalPedidoById(id);
    if (!res.ok) {
      setDetalle(null);
      setError(res.error || "No se pudo cargar el detalle");
    } else {
      setDetalle(res.data);
    }
    setLoadingDetalle(false);
  }

  async function handleVerEvidencias() {
    if (!selectedId) return;
    setEvidenciasOpen(true);
    setEvidencias(null);
    setEvidenciasError(null);
    setEvidenciasLoading(true);

    const res = await getPortalPedidoEvidencias(selectedId);
    if (!res.ok) {
      setEvidenciasError(res.error || "Error al cargar evidencias");
      setEvidencias(null);
    } else {
      setEvidencias(res.data?.data ?? res.data ?? null);
    }
    setEvidenciasLoading(false);
  }

  function cerrarEvidencias() {
    setEvidenciasOpen(false);
    setEvidencias(null);
    setEvidenciasError(null);
    setEvidenciasLoading(false);
  }

  function renderPedidoCard(p) {
    return (
      <div
        key={p.id}
        role="button"
        tabIndex={0}
        style={{
          ...styles.card,
          ...(selectedId === p.id ? styles.cardActive : {}),
        }}
        onClick={() => handleSelectPedido(p.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            handleSelectPedido(p.id);
          }
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
          <strong>
            {p.nombre_ruta || `${p.origen || "—"} → ${p.destino || "—"}`}
          </strong>
          <span style={styles.badge(p.estado)}>{p.estado || "—"}</span>
        </div>
        <p style={{ margin: "8px 0 0", fontSize: "13px", opacity: 0.8 }}>
          Entrega estimada: {formatDate(p.fecha_estimada_entrega)}
          {p.bultos_despachados != null ? ` · ${p.bultos_despachados} bultos` : ""}
        </p>
      </div>
    );
  }

  function emptyMessageForTab() {
    if (activeTab === TAB_COMPLETADOS) {
      return "No hay pedidos completados en este momento.";
    }
    return "No hay pedidos en curso en este momento.";
  }

  const tituloSeccion =
    seccionActiva === SECCION_PAGOS ? "Mis pagos" : "Mis pedidos";

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={{ margin: 0, fontSize: "22px" }}>{tituloSeccion}</h1>
          <p style={{ margin: "6px 0 0", opacity: 0.7, fontSize: "14px" }}>
            {user?.email}
          </p>
        </div>
        <button type="button" style={styles.btn} onClick={onSignOut}>
          Cerrar sesión
        </button>
      </header>

      <div style={styles.tabs} role="tablist" aria-label="Secciones del portal">
        <button
          type="button"
          role="tab"
          aria-selected={seccionActiva === SECCION_PEDIDOS}
          style={styles.tab(seccionActiva === SECCION_PEDIDOS)}
          onClick={() => setSeccionActiva(SECCION_PEDIDOS)}
        >
          Pedidos
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={seccionActiva === SECCION_PAGOS}
          style={styles.tab(seccionActiva === SECCION_PAGOS)}
          onClick={() => setSeccionActiva(SECCION_PAGOS)}
        >
          Pagos
        </button>
      </div>

      {seccionActiva === SECCION_PAGOS ? (
        <PortalPagos clienteId={user?.clienteId} />
      ) : null}

      {seccionActiva !== SECCION_PEDIDOS ? null : (
        <>
      {error ? (
        <p style={{ color: "#f87171", marginBottom: "16px" }} role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p style={{ opacity: 0.7 }}>Cargando pedidos…</p>
      ) : pedidos.length === 0 ? (
        <PortalPedidosEmptyState />
      ) : (
        <>
          <div style={styles.tabs} role="tablist" aria-label="Pedidos por estado">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === TAB_PENDIENTES}
              style={styles.tab(activeTab === TAB_PENDIENTES)}
              onClick={() => setActiveTab(TAB_PENDIENTES)}
            >
              Pendientes
              <span style={styles.tabCount("pendientes")}>{pedidosPendientes.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === TAB_COMPLETADOS}
              style={styles.tab(activeTab === TAB_COMPLETADOS)}
              onClick={() => setActiveTab(TAB_COMPLETADOS)}
            >
              Completados
              <span style={styles.tabCount("completados")}>{pedidosCompletados.length}</span>
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div role="tabpanel">
              {pedidosVisibles.length === 0 ? (
                <p style={{ opacity: 0.7 }}>{emptyMessageForTab()}</p>
              ) : (
                pedidosVisibles.map(renderPedidoCard)
              )}
            </div>

            <div style={styles.detail}>
              {!selectedId ? (
                <p style={{ opacity: 0.7 }}>Selecciona un pedido para ver el detalle.</p>
              ) : loadingDetalle ? (
                <p style={{ opacity: 0.7 }}>Cargando detalle…</p>
              ) : detalle?.ruta ? (
                <>
                  <h2 style={{ marginTop: 0, fontSize: "18px" }}>Detalle del pedido</h2>
                  <p>
                    <span style={styles.badge(detalle.ruta.estado)}>
                      {detalle.ruta.estado}
                    </span>
                  </p>
                  <p style={{ fontWeight: 600 }}>
                    {detalle.ruta.nombre_ruta || `${detalle.ruta.origen} → ${detalle.ruta.destino}`}
                  </p>

                  <h3 style={{ fontSize: "15px", marginTop: "20px" }}>Historial de estados</h3>
                  {(detalle.historial_estados || []).length === 0 ? (
                    <p style={{ opacity: 0.7, fontSize: "14px" }}>Sin historial.</p>
                  ) : (
                    detalle.historial_estados.map((h) => (
                      <div key={h.id} style={styles.timelineItem}>
                        <strong>{h.estado}</strong>
                        <div style={{ opacity: 0.75 }}>{formatDate(h.created_at)}</div>
                      </div>
                    ))
                  )}

                  <h3 style={{ fontSize: "15px", marginTop: "16px" }}>Entregas</h3>
                  {(detalle.entregas || []).length === 0 ? (
                    <p style={{ opacity: 0.7, fontSize: "14px" }}>Sin registro de entrega.</p>
                  ) : (
                    detalle.entregas.map((e) => (
                      <div key={e.id} style={{ fontSize: "14px", marginBottom: "8px" }}>
                        {e.estado || "—"} · validado: {e.validado ? "sí" : "no"}
                        {e.fecha_entrega_real
                          ? ` · ${formatDate(e.fecha_entrega_real)}`
                          : ""}
                      </div>
                    ))
                  )}

                  <h3 style={{ fontSize: "15px", marginTop: "16px" }}>Rutas activas</h3>
                  {(detalle.guias_despacho || []).length === 0 ? (
                    <p style={{ opacity: 0.7, fontSize: "14px" }}>Sin rutas activas.</p>
                  ) : (
                    detalle.guias_despacho.map((g) => (
                      <div key={g.id} style={{ fontSize: "14px", marginBottom: "8px" }}>
                        {g.numero_guia} · {g.estado_recepcion || "—"}
                        {g.url_pdf ? (
                          <>
                            {" · "}
                            <a href={g.url_pdf} target="_blank" rel="noreferrer">
                              PDF
                            </a>
                          </>
                        ) : null}
                      </div>
                    ))
                  )}

                  <button
                    type="button"
                    style={styles.btnEvidencias}
                    onClick={handleVerEvidencias}
                  >
                    Ver evidencias
                  </button>
                </>
              ) : (
                <p style={{ opacity: 0.7 }}>Sin datos de detalle.</p>
              )}
            </div>
          </div>
        </>
      )}

      {evidenciasOpen && detalle?.ruta ? (
        <PortalEvidenciasModal
          pedido={detalle.ruta}
          evidencias={evidencias}
          loading={evidenciasLoading}
          error={evidenciasError}
          onClose={cerrarEvidencias}
        />
      ) : null}
        </>
      )}
    </div>
  );
}
