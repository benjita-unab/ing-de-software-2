// src/components/PagosCliente.jsx
// ─────────────────────────────────────────────────────────────────────────────
// HU-34: Gestión de pagos para clientes B2B
// Muestra servicios pendientes de cobro, permite generar documentos de pago,
// visualiza historial con estados PENDIENTE/PAGADO y permite marcar pagos.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback } from "react";
import { getApiBaseUrl, getAuthToken } from "../lib/apiClient";

const S = {
  container: {
    marginTop: "16px",
    background: "rgba(15,23,42,0.4)",
    padding: "20px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.07)",
  },
  sectionTitle: {
    fontSize: "13px",
    fontWeight: 700,
    marginBottom: "14px",
    color: "#94a3b8",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    paddingBottom: "8px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "13px",
    marginBottom: "20px",
  },
  th: {
    textAlign: "left",
    padding: "10px 12px",
    borderBottom: "1px solid rgba(255,255,255,0.12)",
    color: "#64748b",
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  td: {
    padding: "10px 12px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    color: "#cbd5e1",
    verticalAlign: "middle",
  },
  totalBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "rgba(0,0,0,0.25)",
    padding: "12px 18px",
    borderRadius: "10px",
    marginBottom: "6px",
    border: "1px solid rgba(16,185,129,0.2)",
  },
  emptyMsg: {
    fontSize: "13px",
    color: "#475569",
    fontStyle: "italic",
    marginBottom: "20px",
    padding: "14px",
    background: "rgba(0,0,0,0.15)",
    borderRadius: "8px",
    textAlign: "center",
  },
  btnPrimary: {
    padding: "8px 18px",
    background: "linear-gradient(135deg, #0EA5E9, #0284c7)",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: "12px",
    transition: "opacity 0.15s",
  },
  btnAction: {
    padding: "5px 12px",
    background: "rgba(16,185,129,0.15)",
    color: "#10b981",
    border: "1px solid rgba(16,185,129,0.3)",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "11px",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  btnDanger: {
    padding: "5px 12px",
    background: "rgba(239,68,68,0.12)",
    color: "#ef4444",
    border: "1px solid rgba(239,68,68,0.25)",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "11px",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  alertBox: (type) => ({
    padding: "10px 14px",
    borderRadius: "8px",
    marginBottom: "14px",
    fontSize: "12px",
    background: type === "success" ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
    border: `1px solid ${type === "success" ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
    color: type === "success" ? "#10b981" : "#ef4444",
  }),
};

function estadoBadge(estado) {
  const map = {
    PAGADO:   { bg: "#166534", color: "#4ade80" },
    PENDIENTE:{ bg: "#7c2d12", color: "#fb923c" },
    ANULADO:  { bg: "#1e293b", color: "#94a3b8" },
  };
  const c = map[estado] || map.ANULADO;
  return (
    <span style={{
      padding: "3px 10px",
      borderRadius: "999px",
      fontSize: "10px",
      background: c.bg,
      color: c.color,
      fontWeight: 700,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
    }}>
      {estado}
    </span>
  );
}

function formatPeso(n) {
  return `$${Number(n || 0).toLocaleString("es-CL")}`;
}

function formatFecha(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export default function PagosCliente({ clienteId }) {
  const [pagos, setPagos]                     = useState([]);
  const [rutasPendientes, setRutasPendientes] = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [generando, setGenerando]             = useState(false);
  const [marcando, setMarcando]               = useState(null); // pagoId en proceso
  const [feedback, setFeedback]               = useState(null); // { type, msg }

  const showFeedback = (type, msg) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 4000);
  };

  const fetchData = useCallback(async () => {
    if (!clienteId) return;
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${getAuthToken()}` };
      const base    = getApiBaseUrl();

      const [resPagos, resPend] = await Promise.all([
        fetch(`${base}/api/pagos/cliente/${clienteId}`,            { headers }),
        fetch(`${base}/api/pagos/cliente/${clienteId}/pendientes`, { headers }),
      ]);

      if (resPagos.ok)  setPagos(await resPagos.json());
      if (resPend.ok)   setRutasPendientes(await resPend.json());
    } catch (err) {
      console.error("Error obteniendo info de pagos:", err);
      showFeedback("error", "No se pudo cargar la información de pagos.");
    } finally {
      setLoading(false);
    }
  }, [clienteId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Generar nuevo documento de pago ────────────────────────────────────────
  const generarPago = async () => {
    if (rutasPendientes.length === 0) return;
    setGenerando(true);
    try {
      const montoTotal = rutasPendientes.reduce(
        (acc, r) => acc + Number(r.costo_servicio || 25000), 0,
      );
      const res = await fetch(`${getApiBaseUrl()}/api/pagos/generar`, {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          cliente_id:  clienteId,
          rutas_ids:   rutasPendientes.map((r) => r.id),
          monto_total: montoTotal,
        }),
      });
      if (res.ok) {
        showFeedback("success", "Documento de pago generado correctamente.");
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        showFeedback("error", err?.message || "No se pudo generar el pago.");
      }
    } catch (err) {
      showFeedback("error", "Error de red al generar el pago.");
    } finally {
      setGenerando(false);
    }
  };

  // ── Marcar pago como PAGADO / PENDIENTE ─────────────────────────────────
  const marcarComo = async (pagoId, nuevoEstado) => {
    setMarcando(pagoId);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/pagos/${pagoId}/estado`, {
        method:  "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      if (res.ok) {
        showFeedback("success",
          nuevoEstado === "PAGADO"
            ? "Pago marcado como pagado exitosamente."
            : "Pago revertido a pendiente.",
        );
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        showFeedback("error", err?.message || "No se pudo actualizar el estado.");
      }
    } catch {
      showFeedback("error", "Error de red al actualizar el pago.");
    } finally {
      setMarcando(null);
    }
  };

  // ── Cálculo totales ────────────────────────────────────────────────────────
  const totalPendiente = rutasPendientes.reduce(
    (acc, r) => acc + Number(r.costo_servicio || 25000), 0,
  );
  const totalPagado    = pagos
    .filter((p) => p.estado === "PAGADO")
    .reduce((acc, p) => acc + Number(p.monto_total || 0), 0);
  const totalEmitido   = pagos.reduce((acc, p) => acc + Number(p.monto_total || 0), 0);

  if (loading) {
    return (
      <div style={{ ...S.emptyMsg, fontStyle: "normal" }}>
        ⏳ Cargando información financiera...
      </div>
    );
  }

  return (
    <div style={S.container}>

      {/* Feedback */}
      {feedback && (
        <div style={S.alertBox(feedback.type)}>
          {feedback.type === "success" ? "✅" : "⚠️"} {feedback.msg}
        </div>
      )}

      {/* ── Resumen financiero ── */}
      <div style={S.sectionTitle}>Resumen financiero</div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "10px",
        marginBottom: "24px",
      }}>
        {[
          { label: "Por cobrar",  value: totalPendiente, color: "#fb923c" },
          { label: "Total emitido", value: totalEmitido,  color: "#94a3b8" },
          { label: "Total pagado", value: totalPagado,   color: "#4ade80" },
        ].map((stat) => (
          <div key={stat.label} style={{
            background: "rgba(0,0,0,0.2)",
            borderRadius: "10px",
            padding: "14px 16px",
            border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>
              {stat.label}
            </div>
            <div style={{ fontSize: "18px", fontWeight: 700, color: stat.color }}>
              {formatPeso(stat.value)}
            </div>
          </div>
        ))}
      </div>

      {/* ── Servicios pendientes de cobro ── */}
      <div style={S.sectionTitle}>Servicios pendientes de cobro</div>
      {rutasPendientes.length === 0 ? (
        <div style={S.emptyMsg}>No hay despachos entregados pendientes de facturar.</div>
      ) : (
        <>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Destino</th>
                <th style={S.th}>Estado despacho</th>
                <th style={S.th}>Fecha</th>
                <th style={S.th} align="right">Costo estimado</th>
              </tr>
            </thead>
            <tbody>
              {rutasPendientes.map((ruta) => (
                <tr key={ruta.id}>
                  <td style={S.td}>{ruta.destino || "—"}</td>
                  <td style={S.td}>{ruta.estado}</td>
                  <td style={S.td}>{formatFecha(ruta.fecha_inicio)}</td>
                  <td style={{ ...S.td, textAlign: "right", fontWeight: 600 }}>
                    {formatPeso(ruta.costo_servicio || 25000)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={S.totalBar}>
            <div>
              <span style={{ color: "#64748b", fontSize: "12px", marginRight: "8px" }}>
                Total a generar ({rutasPendientes.length} ruta{rutasPendientes.length > 1 ? "s" : ""}):
              </span>
              <strong style={{ fontSize: "18px", color: "#10b981" }}>
                {formatPeso(totalPendiente)}
              </strong>
            </div>
            <button
              style={{ ...S.btnPrimary, opacity: generando ? 0.6 : 1 }}
              onClick={generarPago}
              disabled={generando}
            >
              {generando ? "Generando..." : "Generar documento de pago"}
            </button>
          </div>
        </>
      )}

      {/* ── Historial de pagos ── */}
      <div style={{ ...S.sectionTitle, marginTop: "28px" }}>Historial de pagos</div>
      {pagos.length === 0 ? (
        <div style={S.emptyMsg}>No hay historial de pagos registrados para este cliente.</div>
      ) : (
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Fecha emisión</th>
              <th style={S.th}>Monto total</th>
              <th style={S.th}>Estado</th>
              <th style={S.th}>Rutas incluidas</th>
              <th style={S.th}>Fecha pago</th>
              <th style={S.th}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pagos.map((pago) => (
              <tr key={pago.id}>
                <td style={S.td}>{formatFecha(pago.fecha_creacion)}</td>
                <td style={{ ...S.td, fontWeight: 600 }}>{formatPeso(pago.monto_total)}</td>
                <td style={S.td}>{estadoBadge(pago.estado)}</td>
                <td style={{ ...S.td, color: "#64748b" }}>
                  {(pago.rutas || []).length} ruta{(pago.rutas || []).length !== 1 ? "s" : ""}
                </td>
                <td style={{ ...S.td, color: "#64748b" }}>
                  {pago.estado === "PAGADO" ? formatFecha(pago.fecha_pago) : "—"}
                </td>
                <td style={S.td}>
                  {pago.estado === "PENDIENTE" && (
                    <button
                      style={{ ...S.btnAction, opacity: marcando === pago.id ? 0.6 : 1 }}
                      onClick={() => marcarComo(pago.id, "PAGADO")}
                      disabled={marcando === pago.id}
                    >
                      {marcando === pago.id ? "..." : "✓ Marcar pagado"}
                    </button>
                  )}
                  {pago.estado === "PAGADO" && (
                    <button
                      style={{ ...S.btnDanger, opacity: marcando === pago.id ? 0.6 : 1 }}
                      onClick={() => marcarComo(pago.id, "PENDIENTE")}
                      disabled={marcando === pago.id}
                    >
                      {marcando === pago.id ? "..." : "↩ Revertir"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
