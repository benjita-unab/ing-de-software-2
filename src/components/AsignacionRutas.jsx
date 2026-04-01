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
  validarLicenciaConductor,
  obtenerEstadoLicencia,
} from "../lib/rutasService";

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
  subtitle: {
    fontSize: "16px",
    fontWeight: 600,
    color: "#60A5FA",
    marginBottom: "16px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px",
  },
  label: {
    display: "block",
    fontSize: "13px",
    color: "#94A3B8",
    marginBottom: "8px",
    fontWeight: 500,
  },
  select: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #334155",
    background: "#0F172A",
    color: "#F8FAFC",
    marginBottom: "14px",
    outline: "none",
    fontSize: "13px",
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
    background: "#0EA5E9",
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
    background: "#0F766E",
    color: "#D1FAE5",
    border: "1px solid #14b8a6",
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
    padding: "10px",
    borderBottom: "1px solid #1e2a3a",
    color: "#94A3B8",
    fontSize: "12px",
    fontWeight: 600,
    background: "#0F172A",
  },
  td: {
    padding: "10px",
    borderBottom: "1px solid #1e2a3a",
    fontSize: "13px",
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
    color: "#60A5FA",
  },
};

export default function AsignacionRutas() {
  const [rutas, setRutas] = useState([]);
  const [conductores, setConductores] = useState([]);
  const [cargandoRutas, setCargandoRutas] = useState(true);
  const [cargandoConductores, setCargandoConductores] = useState(true);
  const [cargandoAsignacion, setCargandoAsignacion] = useState(false);

  const [rutaSeleccionada, setRutaSeleccionada] = useState("");
  const [conductorSeleccionado, setConductorSeleccionado] = useState("");
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

    const [resRutas, resConductores] = await Promise.all([
      obtenerRutasSinAsignar(),
      obtenerConductoresActivos(),
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

    setCargandoRutas(false);
    setCargandoConductores(false);
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
    if (!rutaSeleccionada || !conductorSeleccionado) {
      setMensaje({ tipo: "error", texto: "Selecciona ruta y conductor" });
      return;
    }

    setCargandoAsignacion(true);
    setMensaje({ tipo: "", texto: "" });

    const res = await asignarConductorARuta(rutaSeleccionada, conductorSeleccionado);

    if (res.success) {
      setMensaje({
        tipo: "success",
        texto: `✅ Ruta asignada exitosamente a ${rutaSeleccionada}`,
      });

      // Actualizar listas
      setRutaSeleccionada("");
      setConductorSeleccionado("");
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
    <div style={base.container}>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* PANEL DE ASIGNACIÓN */}
      <div style={base.card}>
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
            ...(cargandoAsignacion ? base.buttonDisabled : {}),
          }}
          onClick={handleAsignar}
          disabled={cargandoAsignacion || !rutaSeleccionada || !conductorSeleccionado}
        >
          {cargandoAsignacion ? "Asignando..." : "✅ Asignar Ruta"}
        </button>
      </div>

      {/* TABLA DE RUTAS DISPONIBLES */}
      <div style={base.card}>
        <div style={base.subtitle}>
          📍 Rutas Disponibles ({rutas.length})
        </div>

        {cargandoRutas ? (
          <div style={base.loadingText}>
            <div style={base.spinner} />
            Cargando rutas...
          </div>
        ) : rutas.length === 0 ? (
          <div style={base.alert} style={{ ...base.alert, ...base.alertWarning }}>
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
      <div style={base.card}>
        <div style={base.subtitle}>
          👥 Conductores Activos ({conductores.length})
        </div>

        {cargandoConductores ? (
          <div style={base.loadingText}>
            <div style={base.spinner} />
            Cargando conductores...
          </div>
        ) : conductores.length === 0 ? (
          <div style={base.alert} style={{ ...base.alert, ...base.alertWarning }}>
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
