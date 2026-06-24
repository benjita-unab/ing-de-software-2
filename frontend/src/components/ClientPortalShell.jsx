import React, { useCallback, useEffect, useMemo, useState } from "react";
import PortalEvidenciasModal from "./PortalEvidenciasModal";
import ComprobanteModal from "./ComprobanteModal";
import {
  getPortalPedidoById,
  getPortalPedidoEvidencias,
  getPortalPedidos,
} from "../lib/portalService";

const SECCION_PEDIDOS = "pedidos";

const TAB_TODOS = "todos";
const TAB_PENDIENTES = "pendientes";
const TAB_EN_CURSO = "en_curso";
const TAB_COMPLETADOS = "completados";
const TAB_PAGO_ATRASO = "pago_atraso";

const getStyles = (isLight) => ({
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
      estado === "ENTREGADO" || estado === "COMPLETADO"
        ? "rgba(34,197,94,0.2)"
        : estado === "PAGO_ATRASO_PENDIENTE"
        ? "rgba(239,68,68,0.2)"
        : "rgba(14,165,233,0.2)",
    color: 
      estado === "ENTREGADO" || estado === "COMPLETADO"
        ? "#86efac"
        : estado === "PAGO_ATRASO_PENDIENTE"
        ? "#fca5a5"
        : "#7dd3fc",
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
  },
});

/** HU-27 CA-6: estado vacío cuando el cliente no tiene pedidos. */
function PortalPedidosEmptyState({ stylesObj }) {
  return (
    <div style={stylesObj.emptyState} role="status" aria-live="polite">
      <div style={stylesObj.emptyIcon} aria-hidden="true">
        📦
      </div>
      <h2 style={stylesObj.emptyTitle}>No tienes pedidos disponibles</h2>
      <p style={stylesObj.emptyMessage}>
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
  const [isLight, setIsLight] = useState(false);
  const stylesObj = useMemo(() => getStyles(isLight), [isLight]);

  const [seccionActiva, setSeccionActiva] = useState(SECCION_PEDIDOS);
  const [pedidos, setPedidos] = useState([]);
  const [activeTab, setActiveTab] = useState(TAB_TODOS);
  const [selectedId, setSelectedId] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [error, setError] = useState("");
  const [evidenciasOpen, setEvidenciasOpen] = useState(false);
  const [evidencias, setEvidencias] = useState(null);
  const [evidenciasLoading, setEvidenciasLoading] = useState(false);
  const [evidenciasError, setEvidenciasError] = useState(null);
  const [comprobanteRutaId, setComprobanteRutaId] = useState(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newOrderForm, setNewOrderForm] = useState({
    origen: "",
    destino: "",
    distancia_km: "",
    bultos_detalle: [{ categoria: "S" }]
  });
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [createError, setCreateError] = useState("");

  const handleAddBulto = () => {
    setNewOrderForm(prev => ({
      ...prev,
      bultos_detalle: [...prev.bultos_detalle, { categoria: "S" }]
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

    // No need to validate dimensions since we use fixed sizes now

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
          bultos_detalle: [{ categoria: "S" }]
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentResult = params.get("payment_result");
    if (paymentResult) {
      if (paymentResult === "success") {
        alert("Pago completado con éxito. Su pedido pasará a estar 'En Curso' en breve mientras verificamos la transacción.");
        // Polling para dar tiempo al webhook
        let retries = 0;
        const interval = setInterval(() => {
          loadPedidos();
          retries++;
          if (retries > 3) clearInterval(interval); // Poll for ~15 seconds max
        }, 5000);
      } else if (paymentResult === "failed") {
        alert("El pago no se ha podido completar. Por favor, inténtelo de nuevo.");
      }
      // Limpiar la URL para evitar que la alerta vuelva a aparecer al recargar
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [loadPedidos]);

  const { pedidosTodos, pedidosPendientes, pedidosEnCurso, pedidosCompletados, pedidosAtraso } = useMemo(() => {
    const todos = pedidos;
    const pendientes = [];
    const enCurso = [];
    const completados = [];
    const atraso = [];
    for (const p of pedidos) {
      if (p.estado_pago !== "pagado") {
        pendientes.push(p);
      } else if (p.estado === "PAGO_ATRASO_PENDIENTE") {
        atraso.push(p);
      } else if (p.estado === "ENTREGADO" || p.estado === "FINALIZADO" || p.estado === "COMPLETADO") {
        completados.push(p);
      } else {
        enCurso.push(p);
      }
    }
    return { pedidosTodos: todos, pedidosPendientes: pendientes, pedidosEnCurso: enCurso, pedidosCompletados: completados, pedidosAtraso: atraso };
  }, [pedidos]);

  const pedidosVisibles = useMemo(() => {
    if (activeTab === TAB_TODOS) return pedidosTodos;
    if (activeTab === TAB_PENDIENTES) return pedidosPendientes;
    if (activeTab === TAB_EN_CURSO) return pedidosEnCurso;
    if (activeTab === TAB_COMPLETADOS) return pedidosCompletados;
    if (activeTab === TAB_PAGO_ATRASO) return pedidosAtraso;
    return [];
  }, [activeTab, pedidosTodos, pedidosPendientes, pedidosEnCurso, pedidosCompletados, pedidosAtraso]);

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

  function emptyMessageForTab() {
    if (activeTab === TAB_TODOS) return "No tienes pedidos en el sistema.";
    if (activeTab === TAB_PENDIENTES) return "No tienes pedidos pendientes de pago.";
    if (activeTab === TAB_EN_CURSO) return "No tienes pedidos en curso.";
    if (activeTab === TAB_COMPLETADOS) return "No hay pedidos completados.";
    if (activeTab === TAB_PAGO_ATRASO) return "No tienes cobros por atraso.";
    return "No hay pedidos en esta sección.";
  }

  const [pagandoBase, setPagandoBase] = useState(false);
  const [pagandoRetraso, setPagandoRetraso] = useState(false);

  const handlePagarKhipu = async (id, monto, tipo = 'base', e) => {
    e.stopPropagation();
    setPagandoBase(true);
    try {
      const { apiFetch } = await import("../lib/apiClient");
      const res = await apiFetch('/api/pagos/crear-cobro', { method: 'POST', json: { rutaId: id, monto, tipo } });
      if (res.ok && res.data && res.data.paymentUrl) {
        window.location.href = res.data.paymentUrl;
      } else {
        alert(res?.error || "Error al crear el cobro en Transbank Webpay");
      }
    } catch (err) {
      alert("Error al comunicarse con Transbank Webpay");
    }
    setPagandoBase(false);
  };

  const handlePagarRetraso = async (id, e) => {
    e.stopPropagation();
    setPagandoRetraso(true);
    try {
      const { pagarPortalPedidoRetraso } = await import("../lib/portalService");
      const res = await pagarPortalPedidoRetraso(id);
      if (res.ok) {
        alert("Pago de retraso procesado correctamente.");
        await loadPedidos();
        if (selectedId === id) {
          handleSelectPedido(id);
        }
      } else {
        alert("Error: " + res.error);
      }
    } catch(err) {
      alert("Error inesperado: " + err.message);
    } finally {
      setPagandoRetraso(false);
    }
  };

  const tituloSeccion = "Mis pedidos";

  return (
    <div style={stylesObj.page}>
      <header style={stylesObj.header}>
        <div>
          <h1 style={{ margin: 0, fontSize: "22px" }}>{tituloSeccion}</h1>
          <p style={{ margin: "6px 0 0", opacity: 0.7, fontSize: "14px" }}>
            {user?.email}
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>

          <button type="button" style={stylesObj.btn} onClick={onSignOut}>
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
          <PortalPedidosEmptyState stylesObj={stylesObj} />
        </div>
      ) : (
        <>
          <div style={{...stylesObj.tabs, borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "12px"}} role="tablist" aria-label="Pedidos por estado">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === TAB_TODOS}
              style={stylesObj.tab(activeTab === TAB_TODOS)}
              onClick={() => setActiveTab(TAB_TODOS)}
            >
              Todos
              <span style={stylesObj.tabCount("todos")}>{pedidosTodos.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === TAB_PENDIENTES}
              style={stylesObj.tab(activeTab === TAB_PENDIENTES)}
              onClick={() => setActiveTab(TAB_PENDIENTES)}
            >
              Pendientes de Pago
              <span style={stylesObj.tabCount("pendientes")}>{pedidosPendientes.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === TAB_EN_CURSO}
              style={stylesObj.tab(activeTab === TAB_EN_CURSO)}
              onClick={() => setActiveTab(TAB_EN_CURSO)}
            >
              En Curso
              <span style={stylesObj.tabCount("en_curso")}>{pedidosEnCurso.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === TAB_COMPLETADOS}
              style={stylesObj.tab(activeTab === TAB_COMPLETADOS)}
              onClick={() => setActiveTab(TAB_COMPLETADOS)}
            >
              Completados
              <span style={stylesObj.tabCount("completados")}>{pedidosCompletados.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === TAB_PAGO_ATRASO}
              style={stylesObj.tab(activeTab === TAB_PAGO_ATRASO)}
              onClick={() => setActiveTab(TAB_PAGO_ATRASO)}
            >
              Pagos por Atraso
              <span style={stylesObj.tabCount("atraso")}>{pedidosAtraso.length}</span>
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
            <div role="tabpanel" style={{ width: "100%", maxWidth: "800px", margin: "0 auto" }}>
              {pedidosVisibles.length === 0 ? (
                <p style={{ opacity: 0.7, textAlign: "center", marginTop: "24px" }}>{emptyMessageForTab()}</p>
              ) : (
                pedidosVisibles.map((p) => {
                  const isExpanded = selectedId === p.id;
                  return (
                    <div key={p.id} style={{ marginBottom: "12px", background: "rgba(15,23,42,0.85)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.12)", overflow: "hidden" }}>
                      <div 
                        role="button" 
                        tabIndex={0} 
                        style={{ padding: "16px", cursor: "pointer", display: "flex", justifyContent: "space-between", gap: "8px", background: isExpanded ? "rgba(14,165,233,0.1)" : "transparent" }}
                        onClick={() => isExpanded ? setSelectedId(null) : handleSelectPedido(p.id)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { isExpanded ? setSelectedId(null) : handleSelectPedido(p.id); } }}
                      >
                        <div>
                          <strong style={{ display: "block", fontSize: "16px", marginBottom: "4px", color: isExpanded ? "#38bdf8" : "#fff" }}>
                            {p.nombre_ruta || `${p.origen || "—"} → ${p.destino || "—"}`}
                          </strong>
                          <div style={{ fontSize: "13px", opacity: 0.8 }}>
                            Entrega estimada: {formatDate(p.fecha_estimada_entrega)}
                            {p.bultos_despachados != null ? ` · ${p.bultos_despachados} paquetes` : ""}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <span style={stylesObj.badge(p.estado)}>{p.estado || "—"}</span>
                          <span style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▼</span>
                        </div>
                      </div>

                      {isExpanded && (
                        <div style={{ padding: "16px", borderTop: "1px solid rgba(255,255,255,0.08)", background: "rgba(8,12,24,0.6)" }}>
                          {loadingDetalle ? (
                            <p style={{ opacity: 0.7, margin: 0 }}>Cargando detalle…</p>
                          ) : !detalle?.ruta ? (
                            <p style={{ opacity: 0.7, margin: 0 }}>Sin datos de detalle.</p>
                          ) : (
                            <>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                                <div>
                                  <h3 style={{ fontSize: "14px", marginTop: 0, color: "#94a3b8", marginBottom: "8px" }}>Ruta</h3>
                                  <p style={{ margin: "0 0 4px 0", fontSize: "14px" }}><strong>Origen:</strong> {detalle.ruta.origen}</p>
                                  <p style={{ margin: "0 0 4px 0", fontSize: "14px" }}><strong>Destino:</strong> {detalle.ruta.destino}</p>
                                  {detalle.ruta.distancia_km != null && <p style={{ margin: "0", fontSize: "14px" }}><strong>Distancia:</strong> {detalle.ruta.distancia_km} km</p>}
                                </div>
                                <div>
                                  {detalle.bultos && detalle.bultos.length > 0 && (
                                    <>
                                      <h3 style={{ fontSize: "14px", marginTop: 0, color: "#94a3b8", marginBottom: "8px" }}>Paquetes Registrados</h3>
                                      {Object.entries(
                                        detalle.bultos.reduce((acc, b) => {
                                          const label = b.categoria ? `Tipo ${b.categoria}` : `${b.alto_cm}x${b.ancho_cm}x${b.largo_cm} cm (${b.peso_kg} kg)`;
                                          acc[label] = (acc[label] || 0) + 1;
                                          return acc;
                                        }, {})
                                      ).map(([desc, count]) => (
                                        <div key={desc} style={{ fontSize: "13px", color: "#e2e8f0" }}>• {count}x {desc}</div>
                                      ))}
                                    </>
                                  )}
                                </div>
                              </div>

                              <h3 style={{ fontSize: "15px", marginTop: 0, color: "#94a3b8", marginBottom: "12px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "4px" }}>Detalle Económico</h3>
                              {detalle.ruta?.tarifa_base_total != null ? (
                                <div style={{ fontSize: "14px", lineHeight: "1.6", background: "rgba(255,255,255,0.03)", padding: "16px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)", marginBottom: "16px" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span>Valor total base a pagar:</span>
                                    <strong>{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(Number(detalle.ruta.costo_servicio || detalle.ruta.tarifa_base_total || 0))}</strong>
                                  </div>
                                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                                    <span>Costo de Espera en Destino (Retraso):</span>
                                    <strong style={{ color: Number(detalle.ruta.costo_espera_total) > 0 ? "#f87171" : "#e2e8f0" }}>{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(Number(detalle.ruta.costo_espera_total || 0))}</strong>
                                  </div>
                                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px", paddingTop: "12px", borderTop: "1px dashed rgba(255,255,255,0.12)" }}>
                                    <span>Total a Pagar:</span>
                                    <strong style={{ color: "#38bdf8", fontSize: "18px" }}>
                                      {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(Number((detalle.ruta.costo_servicio || detalle.ruta.tarifa_base_total || 0) + (detalle.ruta.costo_espera_total || 0)))}
                                    </strong>
                                  </div>

                                  <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
                                    {detalle.ruta.estado === 'PAGO_ATRASO_PENDIENTE' ? (
                                      <button type="button" disabled={pagandoBase} style={{ ...stylesObj.btn, background: pagandoBase ? "#64748b" : "#ef4444", borderColor: pagandoBase ? "#64748b" : "#ef4444", fontWeight: 600, padding: "10px 24px" }} onClick={(e) => handlePagarKhipu(p.id, Number(detalle.ruta.costo_espera_total), 'atraso', e)}>
                                        {pagandoBase ? "Redirigiendo..." : "Pagar Atraso"}
                                      </button>
                                    ) : detalle.ruta.estado_pago === 'pagado' ? (
                                      <button type="button" style={{ ...stylesObj.btn, background: "#3B82F6", borderColor: "#3B82F6", fontWeight: 600, padding: "10px 24px" }} onClick={(e) => { e.stopPropagation(); setComprobanteRutaId(p.id); }}>
                                        Ver Comprobante
                                      </button>
                                    ) : (
                                      <button type="button" disabled={pagandoBase} style={{ ...stylesObj.btn, background: pagandoBase ? "#64748b" : "#10b981", borderColor: pagandoBase ? "#64748b" : "#10b981", fontWeight: 600, padding: "10px 24px" }} onClick={(e) => handlePagarKhipu(p.id, Number((detalle.ruta.costo_servicio || detalle.ruta.tarifa_base_total || 0)), 'base', e)}>
                                        {pagandoBase ? "Redirigiendo..." : "Pagar"}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <p style={{ opacity: 0.7, fontSize: "14px", marginBottom: "16px" }}>La tarifa se calculará automáticamente cuando se confirme el pedido.</p>
                              )}

                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "24px", marginBottom: "12px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "4px" }}>
                                <h3 style={{ fontSize: "15px", margin: 0, color: "#94a3b8" }}>Historial de estados</h3>
                                <button type="button" style={{ ...stylesObj.btnEvidencias, margin: 0, padding: "6px 12px", fontSize: "12px" }} onClick={(e) => { e.stopPropagation(); handleVerEvidencias(); }}>
                                  Ver Evidencias Fotográficas
                                </button>
                              </div>
                              
                              <div style={{ display: "flex", gap: "16px", overflowX: "auto", paddingBottom: "8px" }}>
                                {(detalle.historial_estados || []).length === 0 ? (
                                  <p style={{ opacity: 0.7, fontSize: "14px" }}>Sin historial.</p>
                                ) : (
                                  detalle.historial_estados.map((h) => (
                                    <div key={h.id} style={{ ...stylesObj.timelineItem, flexShrink: 0, minWidth: "140px" }}>
                                      <strong>{h.estado}</strong>
                                      <div style={{ opacity: 0.75, fontSize: "12px" }}>{formatDate(h.created_at)}</div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
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
        <div style={stylesObj.modalOverlay}>
          <div style={stylesObj.modalContent}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ margin: 0, fontSize: "20px", color: "#38bdf8" }}>Crear Nuevo Pedido</h2>
              <button
                type="button"
                style={{ ...stylesObj.btn, padding: "4px 8px", fontSize: "12px" }}
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
                  style={stylesObj.input}
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
                  style={stylesObj.input}
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
                  style={stylesObj.input}
                  required
                  placeholder="Ej: 120"
                  value={newOrderForm.distancia_km}
                  onChange={(e) => setNewOrderForm(prev => ({ ...prev, distancia_km: e.target.value }))}
                />
              </div>

              <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "14px", marginBottom: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <span style={{ fontWeight: 600, fontSize: "15px" }}>Detalle de Paquetes ({newOrderForm.bultos_detalle.length})</span>
                  <button
                    type="button"
                    style={{ ...stylesObj.btn, padding: "6px 12px", fontSize: "13px", borderColor: "#0ea5e9", color: "#38bdf8" }}
                    onClick={handleAddBulto}
                  >
                    + Agregar Paquete
                  </button>
                </div>

                {newOrderForm.bultos_detalle.map((b, idx) => (
                  <div key={idx} style={stylesObj.bultoRow}>
                    <div>
                      <label style={{ fontSize: "11px", color: "#94a3b8" }}>Alto (cm)</label>
                      <input
                        type="number"
                        min="1"
                        required
                        style={stylesObj.input}
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
                        style={stylesObj.input}
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
                        style={stylesObj.input}
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
                        style={stylesObj.input}
                        placeholder="Kg"
                        value={b.peso_kg}
                        onChange={(e) => handleChangeBulto(idx, "peso_kg", e.target.value)}
                      />
                    </div>
                    <div>
                      <button
                        type="button"
                        style={{ ...stylesObj.btn, padding: "8px 12px", borderColor: "#f87171", color: "#f87171", opacity: newOrderForm.bultos_detalle.length === 1 ? 0.4 : 1 }}
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
                  style={stylesObj.btn}
                  onClick={() => setShowCreateModal(false)}
                  disabled={creatingOrder}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ ...stylesObj.btn, background: "#0ea5e9", borderColor: "#0ea5e9", fontWeight: 600 }}
                  disabled={creatingOrder}
                >
                  {creatingOrder ? "Guardando..." : "Guardar Pedido"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      {comprobanteRutaId && <ComprobanteModal rutaId={comprobanteRutaId} onClose={() => setComprobanteRutaId(null)} stylesObj={stylesObj} />}
    </div>
  );
}
