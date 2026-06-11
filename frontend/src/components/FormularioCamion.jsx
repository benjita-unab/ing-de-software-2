import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { toDateInputValue } from "../lib/camionUtils";
import { actualizarCamion, crearCamion } from "../lib/camionesService";

const ESTADOS_OPCIONES = [
  { value: "DISPONIBLE", label: "Disponible" },
  { value: "EN_RUTA", label: "En ruta" },
  { value: "MANTENCION", label: "Mantención" },
];

const INITIAL_FORM = {
  patente: "",
  capacidad_kg: "",
  estado: "DISPONIBLE",
  ultima_mantencion: "",
  proxima_mantencion: "",
};

export default function FormularioCamion({
  mode = "create",
  camion = null,
  onGuardado,
  onCancel,
}) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isEdit = mode === "edit";

  useEffect(() => {
    if (isEdit && camion) {
      setForm({
        patente: camion.patente || "",
        capacidad_kg:
          camion.capacidad_kg != null ? String(camion.capacidad_kg) : "",
        estado: camion.estado || "DISPONIBLE",
        ultima_mantencion: toDateInputValue(
          camion.ultima_mantencion ?? camion.ultimaMantencion,
        ),
        proxima_mantencion: toDateInputValue(
          camion.proxima_mantencion ?? camion.proximaMantencion,
        ),
      });
    } else {
      setForm(INITIAL_FORM);
    }
    setError("");
  }, [camion, isEdit, mode]);

  const actualizarCampo = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const patente = form.patente.trim();
    const capacidad = Number(form.capacidad_kg);

    if (!isEdit && !patente) {
      setError("La patente es obligatoria.");
      return;
    }

    if (!form.capacidad_kg || Number.isNaN(capacidad) || capacidad <= 0) {
      setError("La capacidad debe ser mayor a 0 kg.");
      return;
    }

    setLoading(true);

    try {
      if (isEdit) {
        if (!camion?.id) {
          setError("Camión no válido.");
          return;
        }

        const payload = {
          capacidad_kg: capacidad,
          estado: form.estado,
          ultima_mantencion: form.ultima_mantencion || null,
          proxima_mantencion: form.proxima_mantencion || null,
        };

        const res = await actualizarCamion(camion.id, payload);
        if (res.error) {
          setError(res.error);
          return;
        }
        onGuardado?.(res.data);
      } else {
        const payload = {
          patente,
          capacidad_kg: capacidad,
          estado: form.estado || "DISPONIBLE",
          ultima_mantencion: form.ultima_mantencion || undefined,
          proxima_mantencion: form.proxima_mantencion || undefined,
        };

        const res = await crearCamion(payload);
        if (res.error) {
          setError(res.error);
          return;
        }
        onGuardado?.(res.data);
      }
    } finally {
      setLoading(false);
    }
  };

  const titulo = isEdit ? "Editar camión" : "Agregar camión";
  const subtitulo = isEdit
    ? camion?.patente || "Camión"
    : "Complete los datos del nuevo vehículo";

  return (
    <div
      className="lt-modal-overlay"
      onClick={onCancel}
      role="presentation"
      style={{ zIndex: 1100 }}
    >
      <div
        className="lt-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="formulario-camion-title"
      >
        <div className="lt-modal-header">
          <div>
            <div className="lt-modal-header__title" id="formulario-camion-title">
              {titulo}
            </div>
            <div className="lt-modal-header__sub">{subtitulo}</div>
          </div>
          <button type="button" className="lt-modal-close" onClick={onCancel} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <form className="lt-modal-body" onSubmit={handleSubmit}>
          {error && (
            <div className="lt-alert-banner lt-alert-banner--error" role="alert">
              {error}
            </div>
          )}

          {!isEdit && (
            <div className="lt-field-group" style={{ marginBottom: 16 }}>
              <label className="lt-label" htmlFor="camion-patente">
                Patente *
              </label>
              <input
                id="camion-patente"
                type="text"
                className="lt-input"
                value={form.patente}
                onChange={(e) => actualizarCampo("patente", e.target.value.toUpperCase())}
                placeholder="Ej: ABCD-12"
                required
                autoComplete="off"
              />
            </div>
          )}

          {isEdit && (
            <div className="lt-field-group" style={{ marginBottom: 16 }}>
              <label className="lt-label">Patente</label>
              <input
                type="text"
                className="lt-input"
                value={form.patente}
                disabled
                readOnly
              />
            </div>
          )}

          <div className="lt-field-group" style={{ marginBottom: 16 }}>
            <label className="lt-label" htmlFor="camion-capacidad">
              Capacidad (kg) *
            </label>
            <input
              id="camion-capacidad"
              type="number"
              min="1"
              step="1"
              className="lt-input"
              value={form.capacidad_kg}
              onChange={(e) => actualizarCampo("capacidad_kg", e.target.value)}
              required
            />
          </div>

          <div className="lt-field-group" style={{ marginBottom: 16 }}>
            <label className="lt-label" htmlFor="camion-estado">
              Estado
            </label>
            <select
              id="camion-estado"
              className="lt-select"
              value={form.estado}
              onChange={(e) => actualizarCampo("estado", e.target.value)}
            >
              {ESTADOS_OPCIONES.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>
          </div>

          <div className="lt-field-group" style={{ marginBottom: 16 }}>
            <label className="lt-label" htmlFor="camion-ultima">
              Última mantención
            </label>
            <input
              id="camion-ultima"
              type="date"
              className="lt-input"
              value={form.ultima_mantencion}
              onChange={(e) => actualizarCampo("ultima_mantencion", e.target.value)}
            />
          </div>

          <div className="lt-field-group" style={{ marginBottom: 16 }}>
            <label className="lt-label" htmlFor="camion-proxima">
              Próxima mantención / revisión técnica
            </label>
            <input
              id="camion-proxima"
              type="date"
              className="lt-input"
              value={form.proxima_mantencion}
              onChange={(e) => actualizarCampo("proxima_mantencion", e.target.value)}
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              marginTop: 8,
            }}
          >
            <button
              type="button"
              className="lt-btn lt-btn--ghost"
              onClick={onCancel}
              disabled={loading}
            >
              Cancelar
            </button>
            <button type="submit" className="lt-btn lt-btn--primary" disabled={loading}>
              {loading ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
