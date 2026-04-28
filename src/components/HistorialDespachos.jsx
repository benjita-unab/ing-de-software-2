import React, { useEffect, useState } from "react";
import { apiFetch } from "../lib/apiClient";

const base = {
  container: {
    minHeight: "100%",
    background: "transparent",
    color: "#fff",
    padding: "10px",
    fontFamily: "'Inter', 'Poppins', sans-serif",
    overflow: "auto",
  },
  card: {
    background: "rgba(8,8,12,0.72)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "16px",
    padding: "18px",
    marginBottom: "14px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
    backdropFilter: "blur(8px)",
  },
  title: {
    fontSize: "16px",
    fontWeight: 800,
    color: "#fff",
    marginBottom: "16px",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "14px",
  },
  th: {
    textAlign: "left",
    padding: "12px",
    borderBottom: "1px solid rgba(255,255,255,0.12)",
    color: "rgba(255,255,255,0.75)",
    fontSize: "14px",
    fontWeight: 600,
    background: "rgba(255,255,255,0.03)",
  },
  td: {
    padding: "14px 12px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    fontSize: "15px",
    color: "#e2e8f0",
  },
  badge: {
    display: "inline-block",
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "11px",
    fontWeight: 600,
    background: "rgba(58,12,163,0.45)",
    color: "#ffffff",
    border: "1px solid rgba(76,201,240,0.45)",
  },
};

const ESTADOS_FINALIZADOS = ["ENTREGADA", "ENTREGADO"];

export default function HistorialDespachos() {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function cargarHistorial() {
      setLoading(true);

      // Intento 1: pedir directamente filtrado por backend (estado=ENTREGADA).
      let lista = [];
      let firstError = null;

      for (const estado of ESTADOS_FINALIZADOS) {
        const res = await apiFetch(`/api/rutas?estado=${encodeURIComponent(estado)}`);
        if (res.ok) {
          const payload = res.data;
          const data = Array.isArray(payload) ? payload : payload?.data ?? [];
          lista = lista.concat(data);
        } else if (!firstError) {
          firstError = res.error;
        }
      }

      // Fallback: si los dos intentos anteriores fallaron, traer todo y filtrar.
      if (lista.length === 0 && firstError) {
        const resAll = await apiFetch("/api/rutas");
        if (resAll.ok) {
          const payload = resAll.data;
          const data = Array.isArray(payload) ? payload : payload?.data ?? [];
          lista = data.filter((ruta) =>
            ESTADOS_FINALIZADOS.includes(String(ruta?.estado || "").toUpperCase())
          );
        } else {
          console.error("Error cargando historial de rutas:", resAll.error);
        }
      }

      // Deduplicar por id por si el backend retorna ambos casings.
      const dedup = Array.from(new Map(lista.map((r) => [r.id, r])).values());
      // Ordenar más recientes primero (fecha_fin > fecha_inicio > created_at).
      dedup.sort((a, b) => {
        const da = new Date(a.fecha_fin || a.fecha_inicio || a.created_at || 0).getTime();
        const db = new Date(b.fecha_fin || b.fecha_inicio || b.created_at || 0).getTime();
        return db - da;
      });

      if (!cancelled) {
        setHistorial(dedup);
        setLoading(false);
      }
    }

    cargarHistorial();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={base.container} className="premium-scroll operator-section">
      <div style={base.card} className="operator-glass-card">
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
                      <span style={{ color: "#94A3B8" }}>#{String(despacho.id).substring(0, 8)}</span>
                    </td>
                    <td style={base.td}>{despacho.clientes?.nombre || "N/A"}</td>
                    <td style={base.td}>
                      <div style={{ fontWeight: 500 }}>
                        {despacho.conductores?.usuarios?.nombre || despacho.conductores?.rut || "N/A"}
                      </div>
                      <div style={{ fontSize: "13px", color: "#94A3B8", marginTop: "4px" }}>
                        🚚 {despacho.camiones?.patente || "-"}
                      </div>
                    </td>
                    <td style={base.td}>{despacho.destino}</td>
                    <td style={base.td}>
                      {(() => {
                        const fecha = despacho.fecha_fin || despacho.fecha_inicio || despacho.created_at;
                        return fecha ? new Date(fecha).toLocaleString("es-CL") : "—";
                      })()}
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
