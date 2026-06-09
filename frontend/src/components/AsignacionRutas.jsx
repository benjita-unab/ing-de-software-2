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
import Badge from "./ui/Badge";

function licenciaBadgeFromEstado(estado) {
  if (!estado) return null;

  if (estado.vencida) {
    return { texto: "🔴 VENCIDA", variant: "danger" };
  }

  if (estado.proximaAVencer) {
    return {
      texto: `🟡 VENCE EN ${estado.diasRestantes} DÍAS`,
      variant: "warning",
    };
  }

  return {
    texto: `🟢 VIGENTE (${estado.diasRestantes} días)`,
    variant: "success",
  };
}

function licenciaBadgeFromDias(diasRestantes) {
  if (diasRestantes < 0) {
    return { texto: "🔴 VENCIDA", variant: "danger" };
  }
  if (diasRestantes <= 30) {
    return { texto: `🟡 VENCE (${diasRestantes}d)`, variant: "warning" };
  }
  return { texto: `🟢 VIGENTE (${diasRestantes}d)`, variant: "success" };
}

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

  const licenciaSeleccionada = licenciaBadgeFromEstado(estadoLicencia);

  const alertClass =
    mensaje.tipo === "success"
      ? "lt-alert-banner--success"
      : mensaje.tipo === "warning"
      ? "lt-alert-banner--warning"
      : "lt-alert-banner--error";

  return (
    <div className="lt-module-inner">
      {/* PANEL DE ASIGNACIÓN */}
      <div className="lt-card lt-module-card">
        <div className="lt-card__body">
          <h3 className="lt-module-card__title">Asignar conductor a ruta</h3>

          {mensaje.texto && (
            <div className={`lt-alert-banner ${alertClass}`} role="alert">
              {mensaje.texto}
            </div>
          )}

          <div className="lt-form-grid lt-form-grid--3">
            {/* Columna 1: Seleccionar ruta */}
            <div className="lt-form-field">
              <label className="lt-label" htmlFor="asignacion-ruta">Ruta (sin asignar)</label>
              {cargandoRutas ? (
                <p className="lt-module-card__subtitle">Cargando rutas...</p>
              ) : (
                <select
                  id="asignacion-ruta"
                  className="lt-select"
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
                <div className="lt-alert-banner lt-alert-banner--warning">
                  ℹ️ No hay rutas sin asignar
                </div>
              )}
            </div>

            {/* Columna 2: Seleccionar conductor */}
            <div className="lt-form-field">
              <label className="lt-label" htmlFor="asignacion-conductor">Conductor (activo)</label>
              {cargandoConductores ? (
                <p className="lt-module-card__subtitle">Cargando conductores...</p>
              ) : (
                <select
                  id="asignacion-conductor"
                  className="lt-select"
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
            <div className="lt-form-field">
              <label className="lt-label" htmlFor="asignacion-camion">Camión (disponible)</label>
              {cargandoCamiones ? (
                <p className="lt-module-card__subtitle">Cargando camiones...</p>
              ) : (
                <select
                  id="asignacion-camion"
                  className="lt-select"
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
          {licenciaSeleccionada && (
            <div className="lt-info-row">
              <span className="lt-info-row__label">Estado de licencia:</span>
              <Badge variant={licenciaSeleccionada.variant} showDot={false}>
                {licenciaSeleccionada.texto}
              </Badge>
            </div>
          )}

          {/* Botón asignar */}
          <div className="lt-form-actions">
            <button
              type="button"
              className="lt-btn lt-btn--primary lt-btn--full"
              onClick={handleAsignar}
              disabled={cargandoAsignacion || !rutaSeleccionada || !conductorSeleccionado || !camionSeleccionado}
            >
              {cargandoAsignacion ? "Asignando..." : "✅ Asignar Ruta"}
            </button>
          </div>
        </div>
      </div>

      {/* TABLA DE RUTAS DISPONIBLES */}
      <div className="lt-card lt-module-card">
        <div className="lt-card__body">
          <h3 className="lt-module-card__title">Rutas disponibles ({rutas.length})</h3>

          {cargandoRutas ? (
            <p className="lt-empty">Cargando rutas...</p>
          ) : rutas.length === 0 ? (
            <div className="lt-alert-banner lt-alert-banner--warning">
              ℹ️ Todas las rutas ya están asignadas
            </div>
          ) : (
            <div className="lt-table-wrap">
              <table className="lt-table">
                <thead>
                  <tr>
                    <th>Origen → Destino</th>
                    <th>Cliente</th>
                    <th>ETA</th>
                    <th>Creada</th>
                  </tr>
                </thead>
                <tbody>
                  {rutas.map((ruta) => (
                    <tr key={ruta.id}>
                      <td>{ruta.origen} → {ruta.destino}</td>
                      <td>{ruta.clientes?.nombre || "—"}</td>
                      <td>{ruta.eta ? new Date(ruta.eta).toLocaleTimeString("es-CL") : "—"}</td>
                      <td>{new Date(ruta.created_at).toLocaleDateString("es-CL")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* TABLA DE CONDUCTORES */}
      <div className="lt-card lt-module-card">
        <div className="lt-card__body">
          <h3 className="lt-module-card__title">Conductores activos ({conductores.length})</h3>

          {cargandoConductores ? (
            <p className="lt-empty">Cargando conductores...</p>
          ) : conductores.length === 0 ? (
            <div className="lt-alert-banner lt-alert-banner--warning">
              ⚠️ No hay conductores activos
            </div>
          ) : (
            <div className="lt-table-wrap">
              <table className="lt-table">
                <thead>
                  <tr>
                    <th>RUT</th>
                    <th>Licencia</th>
                    <th>Vencimiento</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {conductores.map((conductor) => {
                    const vencimiento = new Date(conductor.licencia_vencimiento);
                    const hoy = new Date();
                    vencimiento.setHours(0, 0, 0, 0);
                    hoy.setHours(0, 0, 0, 0);
                    const diasRestantes = Math.ceil(
                      (vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)
                    );

                    const badge = licenciaBadgeFromDias(diasRestantes);

                    return (
                      <tr key={conductor.id}>
                        <td>{conductor.rut}</td>
                        <td>{conductor.licencia_numero || "—"}</td>
                        <td>
                          {conductor.licencia_vencimiento
                            ? new Date(conductor.licencia_vencimiento).toLocaleDateString("es-CL")
                            : "—"}
                        </td>
                        <td>
                          <Badge variant={badge.variant} showDot={false}>
                            {badge.texto}
                          </Badge>
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
    </div>
  );
}
