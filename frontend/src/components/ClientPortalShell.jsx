import React, { useCallback, useEffect, useState } from "react";
import { getPortalPedidoById, getPortalPedidos } from "../lib/portalService";

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
};

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
  const [total, setTotal] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [error, setError] = useState("");

  const loadPedidos = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await getPortalPedidos();
    if (!res.ok) {
      setError(res.error || "No se pudieron cargar los pedidos");
      setPedidos([]);
      setTotal(0);
    } else {
      setPedidos(res.data?.data || []);
      setTotal(res.data?.total ?? 0);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPedidos();
  }, [loadPedidos]);

  async function handleSelectPedido(id) {
    setSelectedId(id);
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

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={{ margin: 0, fontSize: "22px" }}>Mis pedidos</h1>
          <p style={{ margin: "6px 0 0", opacity: 0.7, fontSize: "14px" }}>
            {user?.email}
          </p>
        </div>
        <button type="button" style={styles.btn} onClick={onSignOut}>
          Cerrar sesión
        </button>
      </header>

      {error ? (
        <p style={{ color: "#f87171", marginBottom: "16px" }} role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p style={{ opacity: 0.7 }}>Cargando pedidos…</p>
      ) : (
        <>
          <p style={{ fontSize: "14px", opacity: 0.75, marginBottom: "12px" }}>
            {total} pedido{total === 1 ? "" : "s"}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              {pedidos.length === 0 ? (
                <p style={{ opacity: 0.7 }}>No hay pedidos para mostrar.</p>
              ) : (
                pedidos.map((p) => (
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
                      {p.bultos_despachados != null
                        ? ` · ${p.bultos_despachados} bultos`
                        : ""}
                    </p>
                  </div>
                ))
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
                    {detalle.ruta.origen} → {detalle.ruta.destino}
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
                </>
              ) : (
                <p style={{ opacity: 0.7 }}>Sin datos de detalle.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
