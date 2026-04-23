// src/components/AsignacionRutas.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Componente para asignar conductores a rutas con validación de licencia
// Implementa HU-5 CA-3: "Bloquear asignación si licencia está vencida"
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from "react";
import {
  obtenerRutasSinAsignar,
  obtenerConductoresActivos,
  asignarConductorARuta,
  obtenerEstadoLicencia,
  obtenerCamionesDisponibles
} from "../lib/rutasService";

const base = {
  container: {
    height: "100%",
    minHeight: 0,
    maxHeight: "100%",
    overflowY: "auto",
    background: "transparent",
    color: "#fff",
    padding: "10px",
    boxSizing: "border-box",
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
  subtitle: {
    fontSize: "16px",
    fontWeight: 800,
    color: "#fff",
    marginBottom: "16px",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "20px",
  },
  label: {
    display: "block",
    fontSize: "14px",
    color: "#94A3B8",
    marginBottom: "8px",
    fontWeight: 500,
  },
  select: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "999px",
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(8,8,12,0.8)",
    color: "#F8FAFC",
    marginBottom: "14px",
    outline: "none",
    fontSize: "15px",
    fontFamily: "inherit",
    cursor: "pointer",
  },
  button: {
    padding: "10px 16px",
    border: "none",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s ease",
    fontFamily: "inherit",
  },
  buttonPrimary: {
    background: "linear-gradient(135deg, #3a0ca3, #12185c)",
    color: "#fff",
  },
  buttonDanger: {
    background: "#ef4444",
    color: "#fff",
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  alert: {
    padding: "12px 14px",
    borderRadius: "8px",
    marginBottom: "14px",
    fontSize: "13px",
  },
  alertSuccess: {
    background: "rgba(18,24,92,0.6)",
    color: "#D1FAE5",
    border: "1px solid rgba(76,201,240,0.45)",
  },
  alertError: {
    background: "#7F1D1D",
    color: "#FEE2E2",
    border: "1px solid #ef4444",
  },
  alertWarning: {
    background: "#78350F",
    color: "#FEF3C7",
    border: "1px solid #f59e0b",
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
    padding: "12px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    fontSize: "15px",
  },
  badge: {
    display: "inline-block",
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "11px",
    fontWeight: 600,
  },
  badgeVencida: {
    background: "#dc2626",
    color: "#fca5a5",
  },
  badgeProxima: {
    background: "#ea580c",
    color: "#fed7aa",
  },
  badgeVigente: {
    background: "#059669",
    color: "#a7f3d0",
  },
  spinner: {
    display: "inline-block",
    width: "14px",
    height: "14px",
    border: "2px solid #60A5FA44",
    borderTop: "2px solid #60A5FA",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  loadingText: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: "#4cc9f0",
  },
};

export default function AsignacionRutas() {
  const [rutas, setRutas] = useState([]);
  const [conductores, setConductores] = useState([]);
  const [camiones, setCamiones] = useState([]);
  const [cargandoRutas, setCargandoRutas] = useState(true);
  const [cargandoConductores, setCargandoConductores] = useState(true);
  const [cargandoCamiones, setCargandoCamiones] = useState(true);
  const [cargandoAsignacion, setCargandoAsignacion] = useState(false);

  const [rutaSeleccionada, setRutaSeleccionada] = useState("");
  const [conductorSeleccionado, setConductorSeleccionado] = useState("");
  const [camionSeleccionado, setCamionSeleccionado] = useState("");
  const [estadoLicencia, setEstadoLicencia] = useState(null);

  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });

  // Cargar rutas sin asignar e conductores activos al montar
  useEffect(() => {
    cargarDatos();
  }, []);

  // Cargar estado de licencia cuando se selecciona un conductor
  useEffect(() => {
    if (conductorSeleccionado) {
      cargarEstadoLicencia(conductorSeleccionado);
    } else {
      setEstadoLicencia(null);
    }
  }, [conductorSeleccionado]);

  const cargarDatos = async () => {
    setCargandoRutas(true);
    setCargandoConductores(true);
    setCargandoCamiones(true);

    const [resRutas, resConductores, resCamiones] = await Promise.all([
      obtenerRutasSinAsignar(),
      obtenerConductoresActivos(),
      obtenerCamionesDisponibles(),
    ]);

    if (resRutas.error) {
      setMensaje({ tipo: "error", texto: `Error cargando rutas: ${resRutas.error}` });
    } else {
      setRutas(resRutas.data || []);
    }

    if (resConductores.error) {
      setMensaje({ tipo: "error", texto: `Error cargando conductores: ${resConductores.error}` });
    } else {
      setConductores(resConductores.data || []);
    }

    if (resCamiones.error) {
      setMensaje({ tipo: "error", texto: `Error cargando camiones: ${resCamiones.error}` });
    } else {
      setCamiones(resCamiones.data || []);
    }

    setCargandoRutas(false);
    setCargandoConductores(false);
    setCargandoCamiones(false);
  };

  const cargarEstadoLicencia = async (conductorId) => {
    const res = await obtenerEstadoLicencia(conductorId);

    if (res.error) {
      setEstadoLicencia(null);
    } else {
      setEstadoLicencia(res.data);
    }
  };

  const handleAsignar = async () => {
    if (!rutaSeleccionada || !conductorSeleccionado || !camionSeleccionado) {
      setMensaje({ tipo: "error", texto: "Selecciona ruta, conductor y camión" });
      return;
    }

    setCargandoAsignacion(true);
    setMensaje({ tipo: "", texto: "" });

    // Buscar carga requerida (opcional, si existe ese campo en los datos de la ruta)
    // La columna fue eliminada temporalmente, usaremos 0
    const cargaRequeridaKg = 0;

    const res = await asignarConductorARuta(rutaSeleccionada, conductorSeleccionado, camionSeleccionado, cargaRequeridaKg);

    if (res.success) {
      setMensaje({
        tipo: "success",
        texto: `✅ Ruta asignada exitosamente con conductor y camión seleccionados.`,
      });

      // Actualizar listas
      setRutaSeleccionada("");
      setConductorSeleccionado("");
      setCamionSeleccionado("");
      setEstadoLicencia(null);

      await cargarDatos();
    } else {
      setMensaje({
        tipo: "error",
        texto: `❌ ${res.error}`,
      });
    }

    setCargandoAsignacion(false);
  };

  const getLicenciaTextoBadge = (estado) => {
    if (!estado) return null;

    if (estado.vencida) {
      return {
        texto: "🔴 VENCIDA",
        estilo: base.badgeVencida,
      };
    }

    if (estado.proximaAVencer) {
      return {
        texto: `🟡 VENCE EN ${estado.diasRestantes} DÍAS`,
        estilo: base.badgeProxima,
      };
    }

    return {
      texto: `🟢 VIGENTE (${estado.diasRestantes} días)`,
      estilo: base.badgeVigente,
    };
  };

  return (
    <div style={base.container} className="premium-scroll operator-section">
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* PANEL DE ASIGNACIÓN */}
      <div style={base.card} className="operator-glass-card">
        <div style={base.subtitle}>📋 Asignar Conductor a Ruta</div>

        {mensaje.texto && (
          <div
            style={{
              ...base.alert,
              ...(mensaje.tipo === "success"
                ? base.alertSuccess
                : mensaje.tipo === "warning"
                ? base.alertWarning
                : base.alertError),
            }}
          >
            {mensaje.texto}
          </div>
        )}

        <div style={base.grid}>
          {/* Columna 1: Seleccionar ruta */}
          <div>
            <label style={base.label}>Ruta (sin asignar)</label>
            {cargandoRutas ? (
              <div style={base.loadingText}>
                <div style={base.spinner} />
                Cargando rutas...
              </div>
            ) : (
              <select
                style={base.select}
                value={rutaSeleccionada}
                onChange={(e) => setRutaSeleccionada(e.target.value)}
                disabled={cargandoAsignacion}
              >
                <option value="">-- Selecciona una ruta --</option>
                {rutas.map((ruta) => (
                  <option key={ruta.id} value={ruta.id}>
                    {ruta.origen} → {ruta.destino}
                  </option>
                ))}
              </select>
            )}
            {rutas.length === 0 && !cargandoRutas && (
              <div style={{ ...base.alert, ...base.alertWarning }}>
                ℹ️ No hay rutas sin asignar
              </div>
            )}
          </div>

          {/* Columna 2: Seleccionar conductor */}
          <div>
            <label style={base.label}>Conductor (activo)</label>
            {cargandoConductores ? (
              <div style={base.loadingText}>
                <div style={base.spinner} />
                Cargando conductores...
              </div>
            ) : (
              <select
                style={base.select}
                value={conductorSeleccionado}
                onChange={(e) => setConductorSeleccionado(e.target.value)}
                disabled={cargandoAsignacion}
              >
                <option value="">-- Selecciona un conductor --</option>
                {conductores.map((conductor) => (
                  <option key={conductor.id} value={conductor.id}>
                    {conductor.rut}
                  </option>
                ))}
              </select>
            )}
          </div>
          
          {/* Columna 3: Seleccionar camión */}
          <div>
            <label style={base.label}>Camión (disponible)</label>
            {cargandoCamiones ? (
              <div style={base.loadingText}>
                <div style={base.spinner} />
                Cargando camiones...
              </div>
            ) : (
              <select
                style={base.select}
                value={camionSeleccionado}
                onChange={(e) => setCamionSeleccionado(e.target.value)}
                disabled={cargandoAsignacion}
              >
                <option value="">-- Selecciona un camión --</option>
                {camiones.map((camion) => (
                  <option key={camion.id} value={camion.id}>
                    {camion.patente || camion.placa} {camion.capacidad_kg ? `- ${camion.capacidad_kg}kg` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Mostrar estado de licencia */}
        {estadoLicencia && (
          <div
            style={{
              ...base.alert,
              background: "#111827",
              border: "1px solid #1e2a3a",
              marginTop: "14px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Estado de licencia:</span>
              <span style={getLicenciaTextoBadge(estadoLicencia).estilo}>
                {getLicenciaTextoBadge(estadoLicencia).texto}
              </span>
            </div>
          </div>
        )}

        {/* Botón asignar */}
        <button
          style={{
            ...base.button,
            ...base.buttonPrimary,
            width: "100%",
            marginTop: "16px",
            ...((cargandoAsignacion || !rutaSeleccionada || !conductorSeleccionado || !camionSeleccionado) ? base.buttonDisabled : {}),
          }}
          onClick={handleAsignar}
          disabled={cargandoAsignacion || !rutaSeleccionada || !conductorSeleccionado || !camionSeleccionado}
        >
          {cargandoAsignacion ? "Asignando..." : "✅ Asignar Ruta"}
        </button>
      </div>

      {/* TABLA DE RUTAS DISPONIBLES */}
      <div style={base.card} className="operator-glass-card">
        <div style={base.subtitle}>
          📍 Rutas Disponibles ({rutas.length})
        </div>

        {cargandoRutas ? (
          <div style={base.loadingText}>
            <div style={base.spinner} />
            Cargando rutas...
          </div>
        ) : rutas.length === 0 ? (
          <div style={{ ...base.alert, ...base.alertWarning }}>
            ℹ️ Todas las rutas ya están asignadas
          </div>
        ) : (
          <table style={base.table}>
            <thead>
              <tr>
                <th style={base.th}>Origen → Destino</th>
                <th style={base.th}>Cliente</th>
                <th style={base.th}>ETA</th>
                <th style={base.th}>Creada</th>
              </tr>
            </thead>
            <tbody>
              {rutas.map((ruta) => (
                <tr key={ruta.id}>
                  <td style={base.td}>
                    {ruta.origen} → {ruta.destino}
                  </td>
                  <td style={base.td}>{ruta.clientes?.nombre || "—"}</td>
                  <td style={base.td}>
                    {ruta.eta ? new Date(ruta.eta).toLocaleTimeString("es-CL") : "—"}
                  </td>
                  <td style={base.td}>
                    {new Date(ruta.created_at).toLocaleDateString("es-CL")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* TABLA DE CONDUCTORES */}
      <div style={base.card} className="operator-glass-card">
        <div style={base.subtitle}>
          👥 Conductores Activos ({conductores.length})
        </div>

        {cargandoConductores ? (
          <div style={base.loadingText}>
            <div style={base.spinner} />
            Cargando conductores...
          </div>
        ) : conductores.length === 0 ? (
          <div style={{ ...base.alert, ...base.alertWarning }}>
            ⚠️ No hay conductores activos
          </div>
        ) : (
          <table style={base.table}>
            <thead>
              <tr>
                <th style={base.th}>RUT</th>
                <th style={base.th}>Licencia</th>
                <th style={base.th}>Vencimiento</th>
                <th style={base.th}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {conductores.map((conductor) => {
                // Calcular estado de licencia
                const vencimiento = new Date(conductor.licencia_vencimiento);
                const hoy = new Date();
                vencimiento.setHours(0, 0, 0, 0);
                hoy.setHours(0, 0, 0, 0);
                const diasRestantes = Math.ceil(
                  (vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)
                );

                let badge = base.badgeVigente;
                let texto = `🟢 VIGENTE (${diasRestantes}d)`;

                if (diasRestantes < 0) {
                  badge = base.badgeVencida;
                  texto = "🔴 VENCIDA";
                } else if (diasRestantes <= 30) {
                  badge = base.badgeProxima;
                  texto = `🟡 VENCE (${diasRestantes}d)`;
                }

                return (
                  <tr key={conductor.id}>
                    <td style={base.td}>{conductor.rut}</td>
                    <td style={base.td}>{conductor.licencia_numero || "—"}</td>
                    <td style={base.td}>
                      {conductor.licencia_vencimiento
                        ? new Date(conductor.licencia_vencimiento).toLocaleDateString(
                            "es-CL"
                          )
                        : "—"}
                    </td>
                    <td style={base.td}>
                      <span style={{ ...base.badge, ...badge }}>{texto}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
