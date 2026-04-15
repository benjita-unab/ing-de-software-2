import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const base = {
  container: {
    minHeight: "100vh",
    background: "#0a0e1a",
    color: "#fff",
    padding: "20px",
    fontFamily: "'Syne', 'DM Mono', sans-serif",
  },
  card: {
    background: "#111827",
    border: "1px solid #1e2a3a",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "20px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
  },
  title: {
    fontSize: "18px",
    fontWeight: 600,
    color: "#60A5FA",
    marginBottom: "16px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "14px",
  },
  th: {
    textAlign: "left",
    padding: "10px",
    borderBottom: "1px solid #1e2a3a",
    color: "#94A3B8",
    fontSize: "13px",
    fontWeight: 600,
    background: "#0F172A",
  },
  td: {
    padding: "12px 10px",
    borderBottom: "1px solid #1e2a3a",
    fontSize: "13px",
    color: "#e2e8f0"
  },
  badge: {
    display: "inline-block",
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "11px",
    fontWeight: 600,
    background: "#059669",
    color: "#a7f3d0",
  }
};

export default function HistorialDespachos() {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function cargarHistorial() {
      setLoading(true);
      // Intentamos traer fecha_fin, si no existe en la BD caerá en error, así que podemos probar con created_at
      const { data, error } = await supabase
        .from("rutas")
        .select(`
          *,
          clientes(nombre), 
          conductores(usuario_id, rut, usuarios(nombre)),
          camiones(patente)
        `)
        .eq("estado", "ENTREGADO")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error cargando historial de rutas:", error);
      }
      if (!error && data) {
        setHistorial(data);
      }
      setLoading(false);
    }
    cargarHistorial();
  }, []);

  return (
    <div style={base.container}>
      <div style={base.card}>
        <div style={base.title}>📜 Historial de Despachos</div>
        
        {loading ? (
          <p style={{ color: "#94A3B8", fontSize: "14px" }}>Cargando historial...</p>
        ) : historial.length === 0 ? (
          <p style={{ color: "#94A3B8", fontSize: "14px" }}>No hay despachos finalizados todavía.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={base.table}>
              <thead>
                <tr>
                  <th style={base.th}>ID</th>
                  <th style={base.th}>Cliente</th>
                  <th style={base.th}>Conductor / Vehículo</th>
                  <th style={base.th}>Destino</th>
                  <th style={base.th}>Finalizado</th>
                  <th style={base.th}>Estado</th>
                  <th style={base.th}>Ficha Adjunta</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((despacho) => (
                  <tr key={despacho.id}>
                    <td style={base.td}>
                      <span style={{color: "#94A3B8"}}>#{String(despacho.id).substring(0, 8)}</span>
                    </td>
                    <td style={base.td}>{despacho.clientes?.nombre || "N/A"}</td>
                    <td style={base.td}>
                      <div style={{fontWeight: 500}}>{despacho.conductores?.usuarios?.nombre || despacho.conductores?.rut || "N/A"}</div>
                      <div style={{fontSize: "11px", color: "#94A3B8", marginTop: "4px"}}>🚚 {despacho.camiones?.patente || "-"}</div>
                    </td>
                    <td style={base.td}>{despacho.destino}</td>
                    <td style={base.td}>
                      {/* En caso de que no tengas fecha de finalizado como tal, puedes usar created_at o similar */}
                      {despacho.created_at ? new Date(despacho.created_at).toLocaleString('es-CL') : "—"}
                    </td>
                    <td style={base.td}>
                      <span style={base.badge}>✅ {despacho.estado}</span>
                    </td>
                    <td style={base.td}>
                      {despacho.ficha_despacho_url ? (
                        <a 
                          href={despacho.ficha_despacho_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          style={{ color: "#3B82F6", textDecoration: "none", fontWeight: 600, fontSize: "12px" }}
                        >
                          📄 Ver Ficha
                        </a>
                      ) : (
                        <span style={{ color: "#94A3B8", fontSize: "12px" }}>Sin ficha</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}