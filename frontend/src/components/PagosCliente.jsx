import React, { useState, useEffect } from "react";
import { getApiBaseUrl, getAuthToken } from "../lib/apiClient";

const styles = {
  container: {
    marginTop: "16px",
    background: "rgba(15,23,42,0.4)",
    padding: "16px",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.05)"
  },
  sectionTitle: {
    fontSize: "15px",
    fontWeight: "bold",
    marginBottom: "12px",
    color: "#fff",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
    paddingBottom: "8px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "13px",
    marginBottom: "24px",
  },
  th: {
    textAlign: "left",
    padding: "10px",
    borderBottom: "1px solid rgba(255,255,255,0.2)",
    color: "#94a3b8",
  },
  td: {
    padding: "10px",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
    color: "#cbd5e1",
  },
  badge: (estado) => {
    let bg = "#334155";
    if (estado === "PAGADO") bg = "#166534";
    if (estado === "PENDIENTE") bg = "#b45309";
    return {
      padding: "4px 8px",
      borderRadius: "12px",
      fontSize: "11px",
      background: bg,
      color: "#fff",
      fontWeight: "bold",
    };
  },
  buttonAction: {
    padding: "6px 12px",
    background: "rgba(255,255,255,0.1)",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "12px",
  },
  buttonPrimary: {
    padding: "8px 16px",
    background: "#0EA5E9",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "13px",
  }
};

export default function PagosCliente({ clienteId }) {
  const [pagos, setPagos] = useState([]);
  const [rutasPendientes, setRutasPendientes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const urlPagos = `${getApiBaseUrl()}/api/pagos/cliente/${clienteId}`;
      const urlPendientes = `${getApiBaseUrl()}/api/pagos/cliente/${clienteId}/pendientes`;
      
      const [resPagos, resPendientes] = await Promise.all([
        fetch(urlPagos, { headers: { Authorization: `Bearer ${getAuthToken()}` } }),
        fetch(urlPendientes, { headers: { Authorization: `Bearer ${getAuthToken()}` } })
      ]);

      if (resPagos.ok) {
        setPagos(await resPagos.json());
      }
      if (resPendientes.ok) {
        setRutasPendientes(await resPendientes.json());
      }
    } catch (err) {
      console.error("Error obteniendo info de pagos", err);
    } finally {
      setLoading(false);
    }
  };

  const generarPago = async () => {
    if (rutasPendientes.length === 0) return;
    try {
      const montoTotal = rutasPendientes.reduce((acc, ruta) => acc + Number(ruta.costo_servicio || 25000), 0);
      const rutasIds = rutasPendientes.map(r => r.id);

      const url = `${getApiBaseUrl()}/api/pagos/generar`;
      const res = await fetch(url, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAuthToken()}` 
        },
        body: JSON.stringify({ 
          cliente_id: clienteId, 
          rutas_ids: rutasIds,
          monto_total: montoTotal
        })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error("Error generando pago", err);
    }
  };

  const marcarComo = async (pagoId, estado) => {
    try {
      const url = `${getApiBaseUrl()}/api/pagos/${pagoId}/estado`;
      const res = await fetch(url, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAuthToken()}` 
        },
        body: JSON.stringify({ estado })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error("Error actualizando pago", err);
    }
  };

  useEffect(() => {
    if (clienteId) fetchData();
  }, [clienteId]);

  if (loading) return <p style={{ fontSize: "13px", color: "#94a3b8" }}>Cargando información financiera...</p>;

  const sumPendientes = rutasPendientes.reduce((acc, r) => acc + Number(r.costo_servicio || 25000), 0);

  return (
    <div style={styles.container}>
      <div style={styles.sectionTitle}>Servicios Pendientes de Cobro</div>
      {rutasPendientes.length === 0 ? (
        <p style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "20px" }}>No hay despachos entregados pendientes de facturar.</p>
      ) : (
        <div style={{ marginBottom: "24px" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>ID Ruta / Destino</th>
                <th style={styles.th}>Estado</th>
                <th style={styles.th}>Costo Estimado</th>
              </tr>
            </thead>
            <tbody>
              {rutasPendientes.map((ruta) => (
                <tr key={ruta.id}>
                  <td style={styles.td}>{ruta.destino}</td>
                  <td style={styles.td}>{ruta.estado}</td>
                  <td style={styles.td}>${Number(ruta.costo_servicio || 25000).toLocaleString("es-CL")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.2)", padding: "10px 16px", borderRadius: "8px" }}>
            <div>
              <span style={{ color: "#94a3b8", marginRight: "8px" }}>Total Pagar:</span>
              <strong style={{ fontSize: "16px", color: "#10b981" }}>${sumPendientes.toLocaleString("es-CL")}</strong>
            </div>
            <button style={styles.buttonPrimary} onClick={generarPago}>
              Generar Documento de Pago
            </button>
          </div>
        </div>
      )}

      <div style={styles.sectionTitle}>Historial de Pagos Generados</div>
      {pagos.length === 0 ? (
        <p style={{ fontSize: "13px", color: "#94a3b8" }}>No hay historial de pagos registrados para este cliente.</p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Fecha Emisión</th>
              <th style={styles.th}>Monto Total</th>
              <th style={styles.th}>Estado</th>
              <th style={styles.th}>Detalle</th>
              <th style={styles.th}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pagos.map((pago) => (
              <tr key={pago.id}>
                <td style={styles.td}>
                  {new Date(pago.fecha_creacion).toLocaleDateString("es-CL")}
                </td>
                <td style={styles.td}>
                  ${Number(pago.monto_total).toLocaleString("es-CL")}
                </td>
                <td style={styles.td}>
                  <span style={styles.badge(pago.estado)}>{pago.estado}</span>
                </td>
                <td style={styles.td}>
                  {(pago.rutas || []).length} ruta(s)
                </td>
                <td style={styles.td}>
                  {pago.estado === "PENDIENTE" && (
                    <button 
                      style={styles.buttonAction} 
                      onClick={() => marcarComo(pago.id, "PAGADO")}
                    >
                      Marcar Pagado
                    </button>
                  )}
                  {pago.estado === "PAGADO" && (
                     <span style={{ fontSize: "11px", color: "#94a3b8" }}>Pagado el {new Date(pago.fecha_pago).toLocaleDateString("es-CL")}</span>
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
