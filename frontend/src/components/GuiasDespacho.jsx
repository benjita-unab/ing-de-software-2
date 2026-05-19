import React, { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "../lib/apiClient";

const AUTO_REFRESH_MS = 15000;

const base = {
  container: {
    minHeight: "100%",
    maxHeight: "100%",
    overflowY: "auto",
    background: "transparent",
    color: "#fff",
    padding: "10px",
    fontFamily: "'Inter', 'Poppins', sans-serif",
  },
  card: {
    background: "rgba(8,8,12,0.72)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "16px",
    padding: "18px",
    marginBottom: "14px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
    backdropFilter: "blur(10px)",
  },
  title: {
    fontSize: "16px",
    fontWeight: 800,
    color: "#fff",
    marginBottom: "16px",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
  },
  toolbar: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "12px",
  },
  btnRefresh: {
    background: "rgba(37, 99, 235, 0.9)",
    color: "#fff",
    border: "none",
    padding: "10px 18px",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
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

// Estados que se consideran "entregados" para excluir de las guías activas.
const ESTADOS_FINALIZADOS = new Set([
  "ENTREGADO",
  "ENTREGADA",
  "CANCELADO",
  "CANCELADA",
]);

function esUrlPublica(valor) {
  const s = String(valor ?? "").trim();
  if (!s || s.toLowerCase() === "null") return false;
  return /^https?:\/\//i.test(s);
}

/** HU-20: ficha capturada en app móvil → rutas.ficha_despacho_url o traceability fichasDespacho */
function obtenerFichaUrl(ruta) {
  const candidatos = [
    ruta?.ficha_despacho_url,
    ruta?.fichaDespachoUrl,
    ruta?.fichasDespacho?.[0]?.url,
    ruta?.fichasDespacho?.[0]?.foto_url,
    ruta?.fichasDespacho?.[0]?.foto_uri,
  ];

  for (const c of candidatos) {
    const s = String(c ?? "").trim();
    if (s && s.toLowerCase() !== "null" && esUrlPublica(s)) return s;
  }

  return "";
}

export default function GuiasDespacho() {
  const [rutas, setRutas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const mountedRef = useRef(true);

  const cargarRutasEnCurso = useCallback(async (opts = {}) => {
    const silent = opts.silent === true;
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await apiFetch("/api/rutas");

      if (!mountedRef.current) return;

      if (!res.ok) {
        console.error("Error cargando rutas activas:", res.error);
        setRutas([]);
        return;
      }

      const payload = res.data;
      const lista = Array.isArray(payload) ? payload : payload?.data ?? [];

      const activas = lista
        .filter(
          (ruta) =>
            ruta?.conductor_id != null || ruta?.conductores != null,
        )
        .filter(
          (ruta) =>
            !ESTADOS_FINALIZADOS.has(String(ruta?.estado || "").toUpperCase()),
        );

      setRutas(activas);
    } finally {
      if (!mountedRef.current) return;
      if (!silent) setLoading(false);
      else setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void cargarRutasEnCurso();

    const intervalId = window.setInterval(() => {
      void cargarRutasEnCurso({ silent: true });
    }, AUTO_REFRESH_MS);

    return () => {
      mountedRef.current = false;
      window.clearInterval(intervalId);
    };
  }, [cargarRutasEnCurso]);

  const handleFinalizarDespacho = async (ruta) => {
    if (!obtenerFichaUrl(ruta)) {
      alert(
        "No se puede finalizar el despacho porque no hay ficha de despacho adjunta. Captúrela desde la app móvil.",
      );
      return;
    }

    if (!window.confirm("¿Estás seguro de finalizar este despacho?")) return;

    try {
      const res = await apiFetch(`/api/rutas/${ruta.id}/status`, {
        method: "PATCH",
        json: { estado: "ENTREGADO" },
      });

      if (!res.ok) {
        throw new Error(res.error || "Error al finalizar el despacho");
      }

      alert("Despacho finalizado con éxito.");
      await cargarRutasEnCurso({ silent: true });
    } catch (err) {
      console.error("Error al finalizar despacho:", err);
      alert(`Error al intentar finalizar el despacho: ${err.message}`);
    }
  };

  return (
    <div style={base.container} className="premium-scroll operator-section">
      <div style={base.card} className="operator-glass-card">
        <div style={base.title}>📑 Gestión de Guías de Despacho (Rutas en curso)</div>
        <p style={{ color: "#94A3B8", fontSize: "13px", marginBottom: "12px", lineHeight: 1.5 }}>
          La ficha de despacho se captura desde la app móvil («Hoja de despacho»). Esta pestaña es solo
          para consultar la ficha y finalizar el despacho cuando esté registrada.
        </p>

        <div style={base.toolbar}>
          <span style={{ color: "#64748b", fontSize: "12px" }}>
            {refreshing ? "Actualizando…" : `Auto-actualización cada ${AUTO_REFRESH_MS / 1000}s`}
          </span>
          <button
            type="button"
            style={{
              ...base.btnRefresh,
              opacity: loading || refreshing ? 0.7 : 1,
            }}
            onClick={() => void cargarRutasEnCurso({ silent: !!rutas.length })}
            disabled={loading || refreshing}
          >
            🔄 Actualizar
          </button>
        </div>

        {loading ? (
          <p style={{ color: "#94A3B8", fontSize: "14px" }}>Cargando guías en curso...</p>
        ) : rutas.length === 0 ? (
          <p style={{ color: "#94A3B8", fontSize: "14px" }}>No hay rutas pendientes de guías en este momento.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={base.table}>
              <thead>
                <tr>
                  <th style={base.th}>ID</th>
                  <th style={base.th}>Cliente / Destino</th>
                  <th style={base.th}>Vehículo / Conductor</th>
                  <th style={base.th}>Inicio</th>
                  <th style={base.th}>Estado</th>
                  <th style={base.th}>📑 Ficha de Despacho</th>
                  <th style={base.th}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rutas.map((ruta) => {
                  const fichaUrl = obtenerFichaUrl(ruta);
                  const tieneFicha = !!fichaUrl;

                  return (
                    <tr key={ruta.id}>
                      <td style={base.td}>
                        <span style={{ color: "#94A3B8" }}>#{String(ruta.id).substring(0, 8)}</span>
                      </td>
                      <td style={base.td}>
                        <div style={{ fontWeight: 500 }}>{ruta.clientes?.nombre || "Sin Asignar"}</div>
                        <div style={{ fontSize: "13px", color: "#94A3B8", marginTop: "4px" }}>🛑 {ruta.destino}</div>
                      </td>
                      <td style={base.td}>
                        <div style={{ fontWeight: 500 }}>🚚 {ruta.camiones?.patente || "-"}</div>
                        <div style={{ fontSize: "13px", color: "#94A3B8", marginTop: "4px" }}>
                          👤 {ruta.conductores?.usuarios?.nombre || ruta.conductores?.rut || "N/A"}
                        </div>
                      </td>
                      <td style={base.td}>
                        {(() => {
                          const fecha = ruta.fecha_inicio || ruta.created_at;
                          return fecha
                            ? new Date(fecha).toLocaleString("es-CL", {
                                hour: "2-digit",
                                minute: "2-digit",
                                day: "2-digit",
                                month: "short",
                              })
                            : "N/A";
                        })()}
                      </td>
                      <td style={base.td}>
                        <span
                          style={{
                            ...base.badge,
                            background: ruta.estado === "PENDIENTE" ? "#F59E0B" : "#2563EB",
                            color: "#fff",
                          }}
                        >
                          {ruta.estado === "PENDIENTE" ? "⏳" : "🚛"} {ruta.estado || "EN CURSO"}
                        </span>
                      </td>
                      <td style={base.td}>
                        {tieneFicha ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            <a
                              href={fichaUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: "#3B82F6",
                                fontSize: "14px",
                                textDecoration: "none",
                                fontWeight: 600,
                              }}
                            >
                              📄 Ver Ficha Adjunta
                            </a>
                            <span style={{ fontSize: "11px", color: "#94A3B8" }}>Ficha registrada</span>
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            <span style={{ fontSize: "13px", color: "#FBBF24", fontWeight: 600 }}>
                              Sin ficha de despacho registrada
                            </span>
                            <span style={{ fontSize: "12px", color: "#94A3B8", lineHeight: 1.4 }}>
                              Debe capturarse desde la app móvil
                            </span>
                          </div>
                        )}
                      </td>
                      <td style={base.td}>
                        <button
                          type="button"
                          onClick={() => void handleFinalizarDespacho(ruta)}
                          disabled={!tieneFicha}
                          style={{
                            background: tieneFicha ? "#10B981" : "#374151",
                            color: tieneFicha ? "#fff" : "#9CA3AF",
                            border: tieneFicha ? "none" : "1px solid #4B5563",
                            padding: "8px 14px",
                            borderRadius: "8px",
                            fontSize: "14px",
                            cursor: tieneFicha ? "pointer" : "not-allowed",
                            fontWeight: 600,
                            opacity: tieneFicha ? 1 : 0.85,
                          }}
                          title={
                            tieneFicha
                              ? "Finalizar despacho"
                              : "Requiere ficha capturada desde la app móvil"
                          }
                        >
                          {tieneFicha ? "✅ Finalizar Despacho" : "Requiere ficha"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
