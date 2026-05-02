import React, { useEffect, useState } from "react";
import { apiFetch } from "../lib/apiClient";

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
// Tolerancia de casing: el enum real es "ENTREGADO"/"CANCELADO" pero
// dejamos las variantes femeninas por si quedan rutas antiguas con ese valor.
const ESTADOS_FINALIZADOS = new Set([
  "ENTREGADO",
  "ENTREGADA",
  "CANCELADO",
  "CANCELADA",
]);

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}

export default function GuiasDespacho() {
  const [rutas, setRutas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState(null);

  const cargarRutasEnCurso = async () => {
    setLoading(true);
    const res = await apiFetch("/api/rutas");

    if (!res.ok) {
      console.error("Error cargando rutas activas:", res.error);
      setRutas([]);
      setLoading(false);
      return;
    }

    const payload = res.data;
    const lista = Array.isArray(payload) ? payload : payload?.data ?? [];

    const activas = lista.filter(
      (ruta) =>
        ruta?.conductor_id != null ||
        ruta?.conductores != null
    ).filter(
      (ruta) => !ESTADOS_FINALIZADOS.has(String(ruta?.estado || "").toUpperCase())
    );

    setRutas(activas);
    setLoading(false);
  };

  useEffect(() => {
    cargarRutasEnCurso();
  }, []);

  const handleSubirFicha = async (rutaId, event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingId(rutaId);
    try {
      const dataUrl = await readFileAsDataUrl(file);

      const res = await apiFetch(`/api/entregas/${rutaId}/photo`, {
        method: "POST",
        json: { base64Photo: dataUrl },
      });

      if (!res.ok) {
        throw new Error(res.error || "No se pudo subir la ficha");
      }

      const fotoUrl = res.data?.data?.fotoUrl ?? res.data?.fotoUrl ?? null;

      // Actualizar estado local sin recargar todo (la URL no la expone GET /api/rutas).
      setRutas((prev) =>
        prev.map((r) =>
          r.id === rutaId ? { ...r, ficha_despacho_url: fotoUrl } : r
        )
      );

      alert("Ficha de despacho subida exitosamente.");
    } catch (err) {
      console.error("Error subiendo ficha:", err);
      alert(`No se pudo subir la ficha de despacho: ${err.message}`);
    } finally {
      setUploadingId(null);
    }
  };

  const handleFinalizarDespacho = async (ruta) => {
    if (!ruta.ficha_despacho_url) {
      alert(
        "Acción bloqueada: No se puede finalizar el despacho. Debes adjuntar al menos una Ficha de Despacho física."
      );
      return;
    }

    if (!window.confirm("¿Estás seguro de finalizar este despacho?")) return;

    try {
      // El enum real `estado_ruta` en Supabase usa "ENTREGADO" (masculino).
      const res = await apiFetch(`/api/rutas/${ruta.id}/status`, {
        method: "PATCH",
        json: { estado: "ENTREGADO" },
      });

      if (!res.ok) {
        throw new Error(res.error || "Error al finalizar el despacho");
      }

      alert("Despacho finalizado con éxito.");
      cargarRutasEnCurso();
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
          La ficha de despacho también puede cargarse desde la app móvil (categoría «Ficha»); aparecerá en Historial bajo «Ficha de despacho».
        </p>

        {loading ? (
          <p style={{ color: "#94A3B8", fontSize: "14px" }}>Cargando guías en curso...</p>
        ) : rutas.length === 0 ? (
          <p style={{ color: "#94A3B8", fontSize: "14px" }}>No hay rutas pendientes de guías en este momento.</p>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table style={base.table}>
                <thead>
                  <tr>
                    <th style={base.th}>ID</th>
                    <th style={base.th}>Cliente / Destino</th>
                    <th style={base.th}>Vehículo / Conductor</th>
                    <th style={base.th}>Inicio</th>
                    <th style={base.th}>Estado</th>
                    <th style={base.th}>Acciones / Ficha</th>
                  </tr>
                </thead>
                <tbody>
                  {rutas.map((ruta) => (
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
                        <span style={{ ...base.badge, background: ruta.estado === "PENDIENTE" ? "#F59E0B" : "#2563EB", color: "#fff" }}>
                          {ruta.estado === "PENDIENTE" ? "⏳" : "🚛"} {ruta.estado || "EN CURSO"}
                        </span>
                      </td>
                      <td style={base.td}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          {ruta.ficha_despacho_url ? (
                            <a href={ruta.ficha_despacho_url} target="_blank" rel="noopener noreferrer" style={{ color: "#3B82F6", fontSize: "14px", textDecoration: "none", fontWeight: 600 }}>
                              📄 Ver Ficha Adjunta
                            </a>
                          ) : (
                            <label style={{ fontSize: "14px", color: "#10B981", cursor: "pointer", fontWeight: 600 }}>
                              {uploadingId === ruta.id ? "⏳ Subiendo..." : "📸 Subir Ficha"}
                              <input
                                type="file"
                                accept="image/*"
                                style={{ display: "none" }}
                                onChange={(e) => handleSubirFicha(ruta.id, e)}
                                disabled={uploadingId === ruta.id}
                              />
                            </label>
                          )}

                          <button
                            onClick={() => handleFinalizarDespacho(ruta)}
                            style={{
                              background: ruta.ficha_despacho_url ? "#10B981" : "#4B5563",
                              color: "#fff",
                              border: "none",
                              padding: "8px 14px",
                              borderRadius: "8px",
                              fontSize: "14px",
                              cursor: "pointer",
                              fontWeight: 600,
                            }}
                            title={!ruta.ficha_despacho_url ? "Debe subir la ficha para finalizar" : "Finalizar Despacho"}
                          >
                            ✅ Finalizar Despacho
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
