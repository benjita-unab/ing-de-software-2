import React, { useCallback, useEffect, useMemo, useState } from "react";
import PortalEvidenciasModal from "./PortalEvidenciasModal";
import ComprobanteModal from "./ComprobanteModal";
import PortalPagos from "./PortalPagos";
import PortalRecurrencias from "./PortalRecurrencias";
import ModalRecurrencia from "./ModalRecurrencia";
import {
  getPortalPedidoById,
  getPortalPedidoEvidencias,
  getPortalPedidos,
} from "../lib/portalService";

const SECCION_PEDIDOS = "pedidos";
const SECCION_PAGOS = "pagos";
const SECCION_RECURRENCIAS = "recurrencias";

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

/** HU-27 CA-6: estado vac├¡o cuando el cliente no tiene pedidos. */
function PortalPedidosEmptyState() {
  return (
    <div style={styles.emptyState} role="status" aria-live="polite">
      <div style={styles.emptyIcon} aria-hidden="true">
        ­ƒôª
      </div>
      <h2 style={styles.emptyTitle}>No tienes pedidos disponibles</h2>
      <p style={styles.emptyMessage}>
        Los despachos asignados aparecer├ín aqu├¡
      </p>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "ÔÇö";
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
  const [modalRecurrenciaOpen, setModalRecurrenciaOpen] = useState(false);
  const [comprobanteRutaId, setComprobanteRutaId] = useState(null);
  const [pagandoBase, setPagandoBase] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newOrderForm, setNewOrderForm] = useState({
    origen: "",
    destino: "",
    distancia_km: "",
    bultos_detalle: [{ categoria: "S" }],
  });
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [createError, setCreateError] = useState("");

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentResult = params.get("payment_result");
    if (!paymentResult) return;

    if (paymentResult === "success") {
      alert(
        "Pago completado con éxito. Su pedido pasará a estar 'En Curso' en breve mientras verificamos la transacción.",
      );
      let retries = 0;
      const interval = setInterval(() => {
        loadPedidos();
        retries += 1;
        if (retries > 3) clearInterval(interval);
      }, 5000);
    } else if (paymentResult === "failed") {
      alert("El pago no se ha podido completar. Por favor, inténtelo de nuevo.");
    }
    window.history.replaceState({}, document.title, window.location.pathname);
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
            {p.nombre_ruta || `${p.origen || "ÔÇö"} ÔåÆ ${p.destino || "ÔÇö"}`}
          </strong>
          <span style={styles.badge(p.estado)}>{p.estado || "ÔÇö"}</span>
        </div>
        <p style={{ margin: "8px 0 0", fontSize: "13px", opacity: 0.8 }}>
          Entrega estimada: {formatDate(p.fecha_estimada_entrega)}
          {p.bultos_despachados != null ? ` ┬À ${p.bultos_despachados} bultos` : ""}
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

  const handlePagarKhipu = async (id, monto, tipo = "base", e) => {
    e?.stopPropagation?.();
    setPagandoBase(true);
    try {
      const { apiFetch } = await import("../lib/apiClient");
      const res = await apiFetch("/api/pagos/crear-cobro", {
        method: "POST",
        json: { rutaId: id, monto, tipo },
      });
      if (res.ok && res.data?.paymentUrl) {
        window.location.href = res.data.paymentUrl;
      } else {
        alert(res?.error || "Error al crear el cobro en Transbank Webpay");
      }
    } catch {
      alert("Error al comunicarse con Transbank Webpay");
    }
    setPagandoBase(false);
  };

  const handleCreateOrderSubmit = async (e) => {
    e.preventDefault();
    setCreateError("");
    setCreatingOrder(true);

    const origen = newOrderForm.origen.trim();
    const destino = newOrderForm.destino.trim();
    const dist = Number(newOrderForm.distancia_km);

    if (!origen || !destino || Number.isNaN(dist) || dist <= 0) {
      setCreateError("Por favor completa origen, destino y kilómetros aproximados.");
      setCreatingOrder(false);
      return;
    }

    try {
      const payload = {
        origen,
        destino,
        distancia_km: dist,
        bultos_despachados: newOrderForm.bultos_detalle.length,
        bultos_detalle: newOrderForm.bultos_detalle.map((b) => ({
          categoria: b.categoria || "S",
        })),
      };

      const { createPortalPedido } = await import("../lib/portalService");
      const res = await createPortalPedido(payload);

      if (!res.ok) {
        setCreateError(res.error || "No se pudo crear el pedido.");
      } else {
        setShowCreateModal(false);
        setNewOrderForm({
          origen: "",
          destino: "",
          distancia_km: "",
          bultos_detalle: [{ categoria: "S" }],
        });
        loadPedidos();
      }
    } catch (err) {
      setCreateError(err.message || "Error inesperado al crear pedido.");
    } finally {
      setCreatingOrder(false);
    }
  };

  const tituloSeccion =
    seccionActiva === SECCION_PAGOS
      ? "Mis pagos"
      : seccionActiva === SECCION_RECURRENCIAS
        ? "Mis recurrencias"
        : "Mis pedidos";

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
        {seccionActiva === SECCION_PEDIDOS ? (
          <button
            type="button"
            style={{ ...styles.btn, borderColor: "#0ea5e9", color: "#38bdf8" }}
            onClick={() => setShowCreateModal(true)}
          >
            Crear pedido
          </button>
        ) : null}
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
        <button
          type="button"
          role="tab"
          aria-selected={seccionActiva === SECCION_RECURRENCIAS}
          style={styles.tab(seccionActiva === SECCION_RECURRENCIAS)}
          onClick={() => setSeccionActiva(SECCION_RECURRENCIAS)}
        >
          Recurrencias
        </button>
      </div>

      {seccionActiva === SECCION_PAGOS ? (
        <PortalPagos clienteId={user?.clienteId} />
      ) : null}

      {seccionActiva === SECCION_RECURRENCIAS ? (
        <PortalRecurrencias />
      ) : null}

      {seccionActiva !== SECCION_PEDIDOS ? null : (
        <>
      {error ? (
        <p style={{ color: "#f87171", marginBottom: "16px" }} role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p style={{ opacity: 0.7 }}>Cargando pedidosÔÇª</p>
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
                <p style={{ opacity: 0.7 }}>Cargando detalleÔÇª</p>
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

                  {detalle.bultos?.length > 0 && (
                    <>
                      <h3 style={{ fontSize: "15px", marginTop: "16px" }}>Paquetes registrados</h3>
                      {Object.entries(
                        detalle.bultos.reduce((acc, b) => {
                          const label = b.categoria
                            ? `Tipo ${b.categoria}`
                            : `${b.alto_cm}x${b.ancho_cm}x${b.largo_cm} cm`;
                          acc[label] = (acc[label] || 0) + 1;
                          return acc;
                        }, {}),
                      ).map(([desc, count]) => (
                        <div key={desc} style={{ fontSize: "13px" }}>
                          • {count}x {desc}
                        </div>
                      ))}
                    </>
                  )}

                  {detalle.ruta?.tarifa_base_total != null && (
                    <>
                      <h3 style={{ fontSize: "15px", marginTop: "16px" }}>Detalle económico</h3>
                      <div style={{ fontSize: "14px", lineHeight: 1.6 }}>
                        <div>
                          Total base:{" "}
                          {new Intl.NumberFormat("es-CL", {
                            style: "currency",
                            currency: "CLP",
                          }).format(
                            Number(
                              detalle.ruta.costo_servicio ||
                                detalle.ruta.tarifa_base_total ||
                                0,
                            ),
                          )}
                        </div>
                        <div>
                          Espera en destino:{" "}
                          {new Intl.NumberFormat("es-CL", {
                            style: "currency",
                            currency: "CLP",
                          }).format(Number(detalle.ruta.costo_espera_total || 0))}
                        </div>
                      </div>
                      <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {detalle.ruta.estado === "PAGO_ATRASO_PENDIENTE" ? (
                          <button
                            type="button"
                            disabled={pagandoBase}
                            style={{ ...styles.btn, background: "#ef4444", borderColor: "#ef4444" }}
                            onClick={(e) =>
                              handlePagarKhipu(
                                selectedId,
                                Number(detalle.ruta.costo_espera_total || 0),
                                "atraso",
                                e,
                              )
                            }
                          >
                            {pagandoBase ? "Redirigiendo..." : "Pagar atraso"}
                          </button>
                        ) : detalle.ruta.estado_pago === "pagado" ? (
                          <button
                            type="button"
                            style={{ ...styles.btn, background: "#3B82F6", borderColor: "#3B82F6" }}
                            onClick={() => setComprobanteRutaId(selectedId)}
                          >
                            Ver comprobante
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={pagandoBase}
                            style={{ ...styles.btn, background: "#10b981", borderColor: "#10b981" }}
                            onClick={(e) =>
                              handlePagarKhipu(
                                selectedId,
                                Number(
                                  detalle.ruta.costo_servicio ||
                                    detalle.ruta.tarifa_base_total ||
                                    0,
                                ),
                                "base",
                                e,
                              )
                            }
                          >
                            {pagandoBase ? "Redirigiendo..." : "Pagar"}
                          </button>
                        )}
                      </div>
                    </>
                  )}

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
                        {e.estado || "ÔÇö"} ┬À validado: {e.validado ? "s├¡" : "no"}
                        {e.fecha_entrega_real
                          ? ` ┬À ${formatDate(e.fecha_entrega_real)}`
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
                        {g.numero_guia} ┬À {g.estado_recepcion || "ÔÇö"}
                        {g.url_pdf ? (
                          <>
                            {" ┬À "}
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

                  <button
                    type="button"
                    style={{ ...styles.btnEvidencias, marginLeft: 8 }}
                    onClick={() => setModalRecurrenciaOpen(true)}
                  >
                    Repetir pedido
                  </button>
                </>
              ) : (
                <p style={{ opacity: 0.7 }}>Sin datos de detalle.</p>
              )}
            </div>
          </div>
        </>
      )}
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

      <ModalRecurrencia
        open={modalRecurrenciaOpen}
        onClose={() => setModalRecurrenciaOpen(false)}
        onSuccess={() => {
          setModalRecurrenciaOpen(false);
          setSeccionActiva(SECCION_RECURRENCIAS);
        }}
        clienteId={user?.clienteId || detalle?.ruta?.cliente_id}
        rutaOrigenId={selectedId}
        portalMode
        titulo="Repetir pedido"
      />

      {comprobanteRutaId ? (
        <ComprobanteModal
          rutaId={comprobanteRutaId}
          onClose={() => setComprobanteRutaId(null)}
          stylesObj={styles}
        />
      ) : null}

      {showCreateModal ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#0f172a",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 16,
              padding: 24,
              width: "100%",
              maxWidth: 560,
              color: "#e2e8f0",
            }}
          >
            <h2 style={{ marginTop: 0 }}>Crear nuevo pedido</h2>
            {createError ? (
              <p style={{ color: "#f87171" }} role="alert">
                {createError}
              </p>
            ) : null}
            <form onSubmit={handleCreateOrderSubmit}>
              <label style={{ display: "block", marginBottom: 12 }}>
                Origen
                <input
                  className="lt-input"
                  style={{ display: "block", width: "100%", marginTop: 4 }}
                  value={newOrderForm.origen}
                  onChange={(e) =>
                    setNewOrderForm((prev) => ({ ...prev, origen: e.target.value }))
                  }
                  required
                />
              </label>
              <label style={{ display: "block", marginBottom: 12 }}>
                Destino
                <input
                  className="lt-input"
                  style={{ display: "block", width: "100%", marginTop: 4 }}
                  value={newOrderForm.destino}
                  onChange={(e) =>
                    setNewOrderForm((prev) => ({ ...prev, destino: e.target.value }))
                  }
                  required
                />
              </label>
              <label style={{ display: "block", marginBottom: 12 }}>
                Distancia aproximada (km)
                <input
                  type="number"
                  min="1"
                  className="lt-input"
                  style={{ display: "block", width: "100%", marginTop: 4 }}
                  value={newOrderForm.distancia_km}
                  onChange={(e) =>
                    setNewOrderForm((prev) => ({ ...prev, distancia_km: e.target.value }))
                  }
                  required
                />
              </label>
              <label style={{ display: "block", marginBottom: 16 }}>
                Cantidad de paquetes
                <input
                  type="number"
                  min="1"
                  className="lt-input"
                  style={{ display: "block", width: "100%", marginTop: 4 }}
                  value={newOrderForm.bultos_detalle.length}
                  onChange={(e) => {
                    const n = Math.max(1, Number(e.target.value) || 1);
                    setNewOrderForm((prev) => ({
                      ...prev,
                      bultos_detalle: Array.from({ length: n }, () => ({ categoria: "S" })),
                    }));
                  }}
                />
              </label>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" style={styles.btn} onClick={() => setShowCreateModal(false)}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ ...styles.btn, background: "#0ea5e9", borderColor: "#0ea5e9" }}
                  disabled={creatingOrder}
                >
                  {creatingOrder ? "Guardando..." : "Guardar pedido"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
