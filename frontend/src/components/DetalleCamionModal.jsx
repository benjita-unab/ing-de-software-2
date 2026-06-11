import React, { useEffect, useState } from "react";
import { CalendarCheck, Pencil, X } from "lucide-react";
import {
  calcularDiasRestantesRevision,
  estadoCamionBadge,
  formatCapacidadKg,
  formatDiasRestantesText,
  formatFechaCamion,
  obtenerEstadoRevision,
  puedeGestionarCamiones,
  resolveProximaMantencion,
  resolveUltimaMantencion,
} from "../lib/camionUtils";
import { registrarRevisionTecnica } from "../lib/camionesService";
import Badge from "./ui/Badge";
import FormularioCamion from "./FormularioCamion";

export default function DetalleCamionModal({
  camion,
  operator,
  onClose,
  onCamionActualizado,
}) {
  const [camionActual, setCamionActual] = useState(camion);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [mostrarRevision, setMostrarRevision] = useState(false);
  const [proximaRevision, setProximaRevision] = useState("");
  const [loadingRevision, setLoadingRevision] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });

  useEffect(() => {
    setCamionActual(camion);
    setModoEdicion(false);
    setMostrarRevision(false);
    setProximaRevision("");
    setMensaje({ tipo: "", texto: "" });
  }, [camion]);

  if (!camionActual) return null;

  const puedeEditar = puedeGestionarCamiones(operator?.role);
  const proximaMantencion = resolveProximaMantencion(camionActual);
  const ultimaMantencion = resolveUltimaMantencion(camionActual);
  const revision = obtenerEstadoRevision(proximaMantencion);
  const diasRestantes = calcularDiasRestantesRevision(proximaMantencion);
  const estadoBadge = estadoCamionBadge(camionActual.estado);

  const filas = [
    { label: "Patente", value: camionActual.patente || "—" },
    { label: "Capacidad (kg)", value: formatCapacidadKg(camionActual.capacidad_kg) },
    {
      label: "Estado",
      badge: estadoBadge,
    },
    { label: "Última mantención", value: formatFechaCamion(ultimaMantencion) },
    { label: "Próxima mantención", value: formatFechaCamion(proximaMantencion) },
    {
      label: "Días restantes revisión",
      value: formatDiasRestantesText(diasRestantes),
      badge: revision.status !== "SIN_FECHA" ? revision : null,
    },
    {
      label: "Estado revisión",
      badge: revision,
    },
  ];

  const handleGuardadoEdicion = (actualizado) => {
    setModoEdicion(false);
    if (actualizado) {
      setCamionActual(actualizado);
      setMensaje({ tipo: "success", texto: "Camión actualizado correctamente." });
      onCamionActualizado?.(actualizado);
    }
  };

  const handleRegistrarRevision = async (event) => {
    event.preventDefault();
    setMensaje({ tipo: "", texto: "" });

    if (!proximaRevision) {
      setMensaje({ tipo: "error", texto: "Indica la fecha de la próxima revisión." });
      return;
    }

    setLoadingRevision(true);
    const res = await registrarRevisionTecnica(camionActual.id, proximaRevision);
    setLoadingRevision(false);

    if (res.error) {
      setMensaje({ tipo: "error", texto: res.error });
      return;
    }

    setCamionActual(res.data);
    setMostrarRevision(false);
    setProximaRevision("");
    setMensaje({
      tipo: "success",
      texto: "Revisión técnica registrada. Última mantención actualizada a hoy.",
    });
    onCamionActualizado?.(res.data);
  };

  const alertClass =
    mensaje.tipo === "success"
      ? "lt-alert-banner--success"
      : "lt-alert-banner--error";

  return (
    <>
      <div
        className="lt-modal-overlay"
        onClick={onClose}
        role="presentation"
      >
        <div
          className="lt-modal-dialog"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-labelledby="detalle-camion-title"
        >
          <div className="lt-modal-header">
            <div>
              <div className="lt-modal-header__title" id="detalle-camion-title">
                Detalle del camión
              </div>
              <div className="lt-modal-header__sub">
                {camionActual.patente || "Camión"}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              {puedeEditar && (
                <>
                  <button
                    type="button"
                    className="lt-btn lt-btn--secondary"
                    onClick={() => {
                      setMostrarRevision(false);
                      setModoEdicion(true);
                    }}
                  >
                    <Pencil size={14} />
                    Editar
                  </button>
                  <button
                    type="button"
                    className="lt-btn lt-btn--ghost"
                    onClick={() => {
                      setModoEdicion(false);
                      setMostrarRevision((v) => !v);
                    }}
                  >
                    <CalendarCheck size={14} />
                    Registrar revisión técnica
                  </button>
                </>
              )}
              <button type="button" className="lt-modal-close" onClick={onClose} aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="lt-modal-body">
            {mensaje.texto && (
              <div className={`lt-alert-banner ${alertClass}`} role="alert" style={{ marginBottom: 16 }}>
                {mensaje.texto}
              </div>
            )}

            {mostrarRevision && puedeEditar && (
              <form
                className="lt-modal-section"
                onSubmit={handleRegistrarRevision}
                style={{ marginBottom: 16 }}
              >
                <div className="lt-modal-section__title">Registrar revisión técnica</div>
                <p className="lt-module-card__subtitle" style={{ marginBottom: 12 }}>
                  Se actualizará la última mantención a la fecha de hoy.
                </p>
                <div className="lt-field-group" style={{ marginBottom: 12 }}>
                  <label className="lt-label" htmlFor="proxima-revision">
                    Próxima revisión técnica *
                  </label>
                  <input
                    id="proxima-revision"
                    type="date"
                    className="lt-input"
                    value={proximaRevision}
                    onChange={(e) => setProximaRevision(e.target.value)}
                    required
                  />
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    className="lt-btn lt-btn--ghost"
                    onClick={() => setMostrarRevision(false)}
                    disabled={loadingRevision}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="lt-btn lt-btn--primary" disabled={loadingRevision}>
                    {loadingRevision ? "Registrando..." : "Confirmar revisión"}
                  </button>
                </div>
              </form>
            )}

            <div className="lt-modal-section">
              {filas.map((fila) => (
                <div key={fila.label} className="lt-info-row">
                  <span className="lt-info-row__label">{fila.label}</span>
                  <span className="lt-info-row__value">
                    {fila.badge ? (
                      <Badge variant={fila.badge.variant} showDot={false}>
                        {fila.badge.texto}
                      </Badge>
                    ) : (
                      fila.value
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {modoEdicion && (
        <FormularioCamion
          mode="edit"
          camion={camionActual}
          onCancel={() => setModoEdicion(false)}
          onGuardado={handleGuardadoEdicion}
        />
      )}
    </>
  );
}
