import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

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
    color: "#e2e8f0"
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
  mapContainer: {
    width: "100%",
    height: "350px",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(8,8,12,0.7)",
    marginTop: "20px",
    position: "relative",
    overflow: "hidden"
  }
};

export default function GuiasDespacho() {
  const [rutas, setRutas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState(null);

  // REMOVIENDO MAPA PARA ESTA VISTA DE GUIAS
  // ----------------------------------------

  // Cargar Rutas
  const cargarRutasEnCurso = async () => {
    setLoading(true);
    // Rutas asignadas (conductor_id is not null) y que no estén entregadas
    const { data, error } = await supabase
      .from("rutas")
      .select(`
        *,
        clientes(nombre), 
        conductores(usuario_id, rut, usuarios(nombre)),
        camiones(patente)
      `)
      .not("conductor_id", "is", null)
      .neq("estado", "ENTREGADO")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error cargando rutas activas:", error);
    }

    if (!error && data) {
      setRutas(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    cargarRutasEnCurso();
  }, []);

  const handleSubirFicha = async (rutaId, event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadingId(rutaId);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `ficha_${rutaId}_${Date.now()}.${fileExt}`;

      // 1. Subir a Supabase Storage
      const { data, error } = await supabase.storage
        .from("fichas_despacho")
        .upload(fileName, file);

      if (error) throw error;

      // 2. Obtener URL pública
      const { data: publicUrlData } = supabase.storage
        .from("fichas_despacho")
        .getPublicUrl(data.path);

      if (publicUrlData) {
        // 3. Actualizar la tabla de 'rutas' con la URL
        const { error: dbError } = await supabase
          .from("rutas")
          .update({ ficha_despacho_url: publicUrlData.publicUrl })
          .eq("id", rutaId);

        if (dbError) throw dbError;
        alert("Ficha de despacho subida exitosamente.");
        cargarRutasEnCurso();
      }
    } catch (err) {
      console.error("Error subiendo ficha:", err);
      alert("No se pudo subir la ficha de despacho. Verifica los permisos de almacenamiento en Supabase.");
    } finally {
      setUploadingId(null);
    }
  };

  const handleFinalizarDespacho = async (ruta) => {
    if (!ruta.ficha_despacho_url) {
      alert("Acción bloqueada: No se puede finalizar el despacho. Debes adjuntar al menos una Ficha de Despacho física.");
      return;
    }

    if (window.confirm("¿Estás seguro de finalizar este despacho?")) {
      try {
        const { error } = await supabase
          .from("rutas")
          .update({ estado: "ENTREGADO" })
          .eq("id", ruta.id);

        if (error) throw error;
        alert("Despacho finalizado con éxito.");
        cargarRutasEnCurso();
      } catch (err) {
        console.error("Error al finalizar despacho:", err);
        alert("Error al intentar finalizar el despacho.");
      }
    }
  };

  return (
    <div style={base.container} className="premium-scroll operator-section">
      <div style={base.card} className="operator-glass-card">
        <div style={base.title}>📑 Gestión de Guías de Despacho (Rutas en curso)</div>

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
                        {ruta.created_at ? new Date(ruta.created_at).toLocaleString('es-CL', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : "N/A"}
                      </td>
                      <td style={base.td}>
                        <span style={{ ...base.badge, background: ruta.estado === "PENDIENTE" ? "#F59E0B" : "#2563EB", color: "#fff" }}>
                          {ruta.estado === "PENDIENTE" ? "⏳" : "🚛"} {ruta.estado || "EN CURSO"}
                        </span>
                      </td>
                      <td style={base.td}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          {/* Botón para subir o ver ficha */}
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

                          {/* Botón de Finalizar Despacho */}
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
                              fontWeight: 600
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