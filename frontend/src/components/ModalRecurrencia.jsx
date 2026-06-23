import React, { useEffect, useMemo, useState } from "react";
import {
  buildRecurrenciaPayload,
  crearRecurrencia,
  crearPortalRecurrencia,
  DIAS_SEMANA,
  FRECUENCIAS,
} from "../lib/recurrenciasService";

const EMPTY = {
  frecuencia: "semanal",
  intervalo: 1,
  dia_semana: 1,
  dia_mes: 1,
  hora_ejecucion: "08:00",
  fecha_inicio: new Date().toISOString().split("T")[0],
  fecha_fin: "",
};

function formatFecha(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("es-CL");
  } catch {
    return value;
  }
}

/**
 * Modal para configurar recurrencia de un pedido/ruta o plantilla.
 */
export default function ModalRecurrencia({
  open,
  onClose,
  onSuccess,
  clienteId,
  rutaOrigenId,
  rutaPlantillaId,
  titulo = "Repetir pedido",
  portalMode = false,
}) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const resolvedClienteId = useMemo(
    () => String(clienteId || "").trim(),
    [clienteId],
  );

  useEffect(() => {
    if (open) {
      setForm(EMPTY);
      setError("");
    }
  }, [open]);

  if (!open) return null;

  function updateField(field, value) {
    if (field === "frecuencia") {
      setForm((prev) => ({
        ...prev,
        frecuencia: String(value).trim().toLowerCase(),
      }));
      return;
    }
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!rutaOrigenId && !rutaPlantillaId) {
      setError("Debe indicar un pedido o plantilla de origen.");
      return;
    }

    const horaRaw = String(form.hora_ejecucion || "08:00").trim();
    const hora_ejecucion = horaRaw.length === 5 ? `${horaRaw}:00` : horaRaw;

    const payload = buildRecurrenciaPayload({
      cliente_id: resolvedClienteId,
      clienteId: resolvedClienteId,
      frecuencia: form.frecuencia,
      intervalo: form.intervalo,
      dia_semana: form.frecuencia === "semanal" ? form.dia_semana : undefined,
      dia_mes: form.frecuencia === "mensual" ? form.dia_mes : undefined,
      hora_ejecucion,
      fecha_inicio: form.fecha_inicio,
      fecha_fin: form.fecha_fin,
      ruta_origen_id: rutaOrigenId,
      ruta_plantilla_id: rutaPlantillaId,
    });

    if (!payload.cliente_id) {
      setError(
        portalMode
          ? "No se pudo identificar su cliente. Cierre sesión y vuelva a entrar."
          : "Cliente requerido para la recurrencia.",
      );
      return;
    }

    setSaving(true);
    const res = portalMode
      ? await crearPortalRecurrencia(payload)
      : await crearRecurrencia(payload);
    setSaving(false);

    if (res.error) {
      setError(res.error);
      return;
    }

    onSuccess?.(res.data);
    onClose();
  }

  return (
    <div
      className="lt-modal-overlay"
      style={{ zIndex: 1050 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-recurrencia-title"
    >
      <div
        className="lt-modal-dialog"
        style={{
          maxWidth: 560,
          background: "var(--lt-bg-surface, #fff)",
          boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lt-modal-header">
          <div>
            <div className="lt-modal-header__title" id="modal-recurrencia-title">
              {titulo}
            </div>
            <div className="lt-modal-header__sub">
              Programación automática del pedido
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="lt-modal-close"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="lt-modal-body">
          {error ? (
            <div className="lt-alert-banner lt-alert-banner--danger" role="alert">
              {error}
            </div>
          ) : null}

          <p className="lt-form-subsection__hint" style={{ marginBottom: 16 }}>
            Se generará un pedido automáticamente según la frecuencia indicada,
            copiando la configuración logística del pedido o plantilla seleccionada.
          </p>

          <div className="lt-form-grid">
            <div className="lt-field-group">
              <label className="lt-label" htmlFor="rec-frecuencia">
                Frecuencia
              </label>
              <select
                id="rec-frecuencia"
                className="lt-input"
                value={form.frecuencia}
                onChange={(e) => updateField("frecuencia", e.target.value)}
              >
                {FRECUENCIAS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="lt-field-group">
              <label className="lt-label" htmlFor="rec-intervalo">
                Cada (intervalo)
              </label>
              <input
                id="rec-intervalo"
                type="number"
                min="1"
                className="lt-input"
                value={form.intervalo}
                onChange={(e) => updateField("intervalo", e.target.value)}
              />
            </div>

            {form.frecuencia === "semanal" ? (
              <div className="lt-field-group">
                <label className="lt-label" htmlFor="rec-dia-semana">
                  Día de la semana
                </label>
                <select
                  id="rec-dia-semana"
                  className="lt-input"
                  value={form.dia_semana}
                  onChange={(e) => updateField("dia_semana", e.target.value)}
                >
                  {DIAS_SEMANA.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {form.frecuencia === "mensual" ? (
              <div className="lt-field-group">
                <label className="lt-label" htmlFor="rec-dia-mes">
                  Día del mes (1–28 recomendado)
                </label>
                <input
                  id="rec-dia-mes"
                  type="number"
                  min="1"
                  max="31"
                  className="lt-input"
                  value={form.dia_mes}
                  onChange={(e) => updateField("dia_mes", e.target.value)}
                />
              </div>
            ) : null}

            <div className="lt-field-group">
              <label className="lt-label" htmlFor="rec-hora">
                Hora de generación
              </label>
              <input
                id="rec-hora"
                type="time"
                className="lt-input"
                value={form.hora_ejecucion}
                onChange={(e) => updateField("hora_ejecucion", e.target.value)}
              />
            </div>

            <div className="lt-field-group">
              <label className="lt-label" htmlFor="rec-inicio">
                Fecha inicio
              </label>
              <input
                id="rec-inicio"
                type="date"
                className="lt-input"
                value={form.fecha_inicio}
                onChange={(e) => updateField("fecha_inicio", e.target.value)}
              />
            </div>

            <div className="lt-field-group">
              <label className="lt-label" htmlFor="rec-fin">
                Fecha fin (opcional)
              </label>
              <input
                id="rec-fin"
                type="date"
                className="lt-input"
                value={form.fecha_fin}
                onChange={(e) => updateField("fecha_fin", e.target.value)}
              />
            </div>
          </div>

          <div className="lt-form-actions" style={{ marginTop: 20 }}>
            <button type="submit" className="lt-btn lt-btn--primary" disabled={saving}>
              {saving ? "Guardando…" : "Activar recurrencia"}
            </button>
            <button type="button" className="lt-btn lt-btn--ghost" onClick={onClose}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export { formatFecha as formatFechaRecurrencia };
