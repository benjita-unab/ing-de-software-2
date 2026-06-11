import React, { useCallback, useEffect, useMemo, useState } from "react";
import PortalEvidenciasModal from "./PortalEvidenciasModal";
import {
  getPortalPedidoById,
  getPortalPedidoEvidencias,
  getPortalPedidos,
} from "../lib/portalService";

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
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.75)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    padding: "20px",
  },
  modalContent: {
    background: "#0f172a",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    borderRadius: "16px",
    padding: "24px",
    width: "100%",
    maxWidth: "600px",
    maxHeight: "90vh",
    overflowY: "auto",
    color: "#e2e8f0",
  },
  input: {
    background: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    borderRadius: "8px",
    padding: "10px 12px",
    color: "#fff",
    width: "100%",
    marginTop: "4px",
    fontSize: "14px",
  },
  bultoRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr 1fr auto",
    gap: "10px",
    alignItems: "end",
    marginBottom: "10px",
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

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newOrderForm, setNewOrderForm] = useState({
    origen: "",
    destino: "",
    distancia_km: "",
    bultos_detalle: [{ alto_cm: "", ancho_cm: "", largo_cm: "", peso_kg: "" }]
  });
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [createError, setCreateError] = useState("");

  const handleAddBulto = () => {
    setNewOrderForm(prev => ({
      ...prev,
      bultos_detalle: [...prev.bultos_detalle, { alto_cm: "", ancho_cm: "", largo_cm: "", peso_kg: "" }]
    }));
  };

  const handleRemoveBulto = (index) => {
    if (newOrderForm.bultos_detalle.length === 1) return;
    setNewOrderForm(prev => ({
      ...prev,
      bultos_detalle: prev.bultos_detalle.filter((_, i) => i !== index)
    }));
  };

  const handleChangeBulto = (index, field, value) => {
    setNewOrderForm(prev => ({
      ...prev,
      bultos_detalle: prev.bultos_detalle.map((b, i) => i === index ? { ...b, [field]: value } : b)
    }));
  };

  const handleCreateOrderSubmit = async (e) => {
    e.preventDefault();
    setCreateError("");
    setCreatingOrder(true);

    const origen = newOrderForm.origen.trim();
    const destino = newOrderForm.destino.trim();
    const dist = Number(newOrderForm.distancia_km);

    if (!origen || !destino || isNaN(dist) || dist <= 0) {
      setCreateError("Por favor completa origen, destino y kilómetros aproximados.");
      setCreatingOrder(false);
      return;
    }

    // validate packages
    let volumenAcumulado = 0;
    for (let i = 0; i < newOrderForm.bultos_detalle.length; i++) {
      const b = newOrderForm.bultos_detalle[i];
      const alto = Number(b.alto_cm);
      const ancho = Number(b.ancho_cm);
      const largo = Number(b.largo_cm);
      const peso = Number(b.peso_kg);

      if (isNaN(alto) || alto <= 0 || isNaN(ancho) || ancho <= 0 || isNaN(largo) || largo <= 0 || isNaN(peso) || peso <= 0) {
        setCreateError(`El bulto #${i + 1} tiene dimensiones o peso inválidos.`);
        setCreatingOrder(false);
        return;
      }

      const volumen = alto * ancho * largo;
      if (largo > 500 || ancho > 200 || alto > 250 || volumen > 25000000) {
        setCreateError(`El bulto #${i + 1}: Excede capacidad física permitida.`);
        setCreatingOrder(false);
        return;
      }
      volumenAcumulado += volumen;
    }

    if (volumenAcumulado > 25000000) {
      setCreateError("Capacidad de volumen excedida para este envío. Requiere coordinar un camión adicional.");
      setCreatingOrder(false);
      return;
    }

    try {
      const payload = {
        origen,
        destino,
        distancia_km: dist,
        bultos_despachados: newOrderForm.bultos_detalle.length,
        bultos_detalle: newOrderForm.bultos_detalle.map(b => ({
          alto_cm: Number(b.alto_cm),
          ancho_cm: Number(b.ancho_cm),
          largo_cm: Number(b.largo_cm),
          peso_kg: Number(b.peso_kg),
        }))
      };

      const { createPortalPedido } = await import("../lib/portalService");
      const res = await createPortalPedido(payload);

      if (!res.ok) {
        setCreateError(res.error || "No se pudo crear el pedido.");
      } else {
        alert("✅ Pedido creado exitosamente en estado PENDIENTE_CONFIRMACION.");
        setShowCreateModal(false);
        setNewOrderForm({
          origen: "",
          destino: "",
          distancia_km: "",
          bultos_detalle: [{ alto_cm: "", ancho_cm: "", largo_cm: "", peso_kg: "" }]
        });
        loadPedidos();
      }
    } catch (err) {
      setCreateError(err.message || "Error inesperado al crear pedido.");
    } finally {
      setCreatingOrder(false);
    }
  };

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
            {p.origen || "—"} → {p.destino || "—"}
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

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={{ margin: 0, fontSize: "22px" }}>Mis pedidos</h1>
          <p style={{ margin: "6px 0 0", opacity: 0.7, fontSize: "14px" }}>
            {user?.email}
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            type="button"
            style={{ ...styles.btn, background: "#0ea5e9", borderColor: "#0ea5e9", fontWeight: 600 }}
            onClick={() => setShowCreateModal(true)}
          >
            Crear nuevo pedido
          </button>
          <button type="button" style={styles.btn} onClick={onSignOut}>
            Cerrar sesión
          </button>
        </div>
      </header>

      {error ? (
        <p style={{ color: "#f87171", marginBottom: "16px" }} role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p style={{ opacity: 0.7 }}>Cargando pedidos…</p>
      ) : pedidos.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <PortalPedidosEmptyState />
        </div>
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
                  <p>
                    <strong>Origen:</strong> {detalle.ruta.origen} <br />
                    <strong>Destino:</strong> {detalle.ruta.destino} <br />
                    {detalle.ruta.distancia_km != null ? (
                      <><strong>Distancia:</strong> {detalle.ruta.distancia_km} km</>
                    ) : null}
                  </p>

                  <h3 style={{ fontSize: "15px", marginTop: "20px" }}>Detalle Económico</h3>
                  {detalle.ruta?.tarifa_base_total != null ? (
                    <div style={{ fontSize: "14px", lineHeight: "1.6", background: "rgba(255,255,255,0.03)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)", marginBottom: "16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Tarifa Base Bultos:</span>
                        <strong>
                          {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(Number(detalle.ruta.tarifa_base_total))}
                        </strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                        <span>Costo de Espera en Destino:</span>
                        <strong style={{ color: Number(detalle.ruta.costo_espera_total) > 0 ? "#f87171" : "#e2e8f0" }}>
                          {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(Number(detalle.ruta.costo_espera_total || 0))}
                        </strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", paddingTop: "8px", borderTop: "1px dashed rgba(255,255,255,0.12)" }}>
                        <span>Total a Pagar:</span>
                        <strong style={{ color: "#38bdf8", fontSize: "16px" }}>
                          {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(Number(detalle.ruta.total_pagar || detalle.ruta.tarifa_base_total))}
                        </strong>
                      </div>
                    </div>
                  ) : (
                    <p style={{ opacity: 0.7, fontSize: "14px", marginBottom: "16px" }}>La tarifa se calculará automáticamente cuando el Administrador confirme y asigne el pedido.</p>
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
                        {e.estado || "—"} · validado: {e.validado ? "sí" : "no"}
                        {e.fecha_entrega_real
                          ? ` · ${formatDate(e.fecha_entrega_real)}`
                          : ""}
                      </div>
                    ))
                  )}

                  <h3 style={{ fontSize: "15px", marginTop: "16px" }}>Guías de despacho</h3>
                  {(detalle.guias_despacho || []).length === 0 ? (
                    <p style={{ opacity: 0.7, fontSize: "14px" }}>Sin guías.</p>
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

      {showCreateModal ? (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ margin: 0, fontSize: "20px", color: "#38bdf8" }}>Crear Nuevo Pedido</h2>
              <button
                type="button"
                style={{ ...styles.btn, padding: "4px 8px", fontSize: "12px" }}
                onClick={() => setShowCreateModal(false)}
              >
                ✕
              </button>
            </div>

            {createError ? (
              <div style={{ color: "#f87171", background: "rgba(248,113,113,0.1)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(248,113,113,0.2)", marginBottom: "16px", fontSize: "14px" }} role="alert">
                ⚠️ {createError}
              </div>
            ) : null}

            <form onSubmit={handleCreateOrderSubmit}>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ fontSize: "13px", color: "#94a3b8" }}>Dirección de Origen *</label>
                <input
                  type="text"
                  style={styles.input}
                  required
                  placeholder="Ej: Av. Vitacura 1234, Santiago"
                  value={newOrderForm.origen}
                  onChange={(e) => setNewOrderForm(prev => ({ ...prev, origen: e.target.value }))}
                />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ fontSize: "13px", color: "#94a3b8" }}>Dirección de Destino *</label>
                <input
                  type="text"
                  style={styles.input}
                  required
                  placeholder="Ej: Calle Valparaíso 456, Viña del Mar"
                  value={newOrderForm.destino}
                  onChange={(e) => setNewOrderForm(prev => ({ ...prev, destino: e.target.value }))}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ fontSize: "13px", color: "#94a3b8" }}>Distancia Vial Aproximada (Km) *</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  style={styles.input}
                  required
                  placeholder="Ej: 120"
                  value={newOrderForm.distancia_km}
                  onChange={(e) => setNewOrderForm(prev => ({ ...prev, distancia_km: e.target.value }))}
                />
              </div>

              <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "14px", marginBottom: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <span style={{ fontWeight: 600, fontSize: "15px" }}>Detalle de Bultos ({newOrderForm.bultos_detalle.length})</span>
                  <button
                    type="button"
                    style={{ ...styles.btn, padding: "6px 12px", fontSize: "13px", borderColor: "#0ea5e9", color: "#38bdf8" }}
                    onClick={handleAddBulto}
                  >
                    + Agregar Bulto
                  </button>
                </div>

                {newOrderForm.bultos_detalle.map((b, idx) => (
                  <div key={idx} style={styles.bultoRow}>
                    <div>
                      <label style={{ fontSize: "11px", color: "#94a3b8" }}>Alto (cm)</label>
                      <input
                        type="number"
                        min="1"
                        required
                        style={styles.input}
                        placeholder="cm"
                        value={b.alto_cm}
                        onChange={(e) => handleChangeBulto(idx, "alto_cm", e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "11px", color: "#94a3b8" }}>Ancho (cm)</label>
                      <input
                        type="number"
                        min="1"
                        required
                        style={styles.input}
                        placeholder="cm"
                        value={b.ancho_cm}
                        onChange={(e) => handleChangeBulto(idx, "ancho_cm", e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "11px", color: "#94a3b8" }}>Largo (cm)</label>
                      <input
                        type="number"
                        min="1"
                        required
                        style={styles.input}
                        placeholder="cm"
                        value={b.largo_cm}
                        onChange={(e) => handleChangeBulto(idx, "largo_cm", e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "11px", color: "#94a3b8" }}>Peso (Kg)</label>
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        required
                        style={styles.input}
                        placeholder="Kg"
                        value={b.peso_kg}
                        onChange={(e) => handleChangeBulto(idx, "peso_kg", e.target.value)}
                      />
                    </div>
                    <div>
                      <button
                        type="button"
                        style={{ ...styles.btn, padding: "8px 12px", borderColor: "#f87171", color: "#f87171", opacity: newOrderForm.bultos_detalle.length === 1 ? 0.4 : 1 }}
                        disabled={newOrderForm.bultos_detalle.length === 1}
                        onClick={() => handleRemoveBulto(idx)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "24px", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "16px" }}>
                <button
                  type="button"
                  style={styles.btn}
                  onClick={() => setShowCreateModal(false)}
                  disabled={creatingOrder}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ ...styles.btn, background: "#0ea5e9", borderColor: "#0ea5e9", fontWeight: 600 }}
                  disabled={creatingOrder}
                >
                  {creatingOrder ? "Guardando..." : "Guardar Pedido"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
