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
  slots: "",
  km_l: "",
  slots_utilizados: 0,
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
        slots:
          camion.slots != null ? String(camion.slots) : "",
        km_l: camion.km_l != null ? String(camion.km_l) : "",
        slots_utilizados: camion.slots_utilizados ?? 0,
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
    const capacidad = Number(form.slots);
    const kmL = Number(form.km_l);

    if (!isEdit && !patente) {
      setError("La patente es obligatoria.");
      return;
    }

    if (!form.slots || Number.isNaN(capacidad) || capacidad <= 0 || capacidad > 96) {
      setError("La capacidad debe ser entre 1 y 96 slots.");
      return;
    }

    if (!isEdit && (Number.isNaN(kmL) || kmL < 0.01)) {
      setError("El rendimiento (Km/L) es obligatorio y debe ser mayor o igual a 0.01.");
      return;
    }

    if (isEdit && form.km_l.trim() && (Number.isNaN(kmL) || kmL < 0.01)) {
      setError("El rendimiento (Km/L) debe ser mayor o igual a 0.01.");
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
          slots: capacidad,
          slots_utilizados: Number(form.slots_utilizados),
          estado: form.estado,
          ultima_mantencion: form.ultima_mantencion || null,
          proxima_mantencion: form.proxima_mantencion || null,
        };
        if (form.km_l.trim()) {
          payload.km_l = kmL;
        }

        const res = await actualizarCamion(camion.id, payload);
        if (res.error) {
          setError(res.error);
          return;
        }
        onGuardado?.(res.data);
      } else {
        const payload = {
          patente,
          slots: capacidad,
          km_l: kmL,
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
              Capacidad (slots) *
            </label>
            <input
              id="camion-capacidad"
              type="number"
              min="1"
              max="96"
              step="1"
              className="lt-input"
              value={form.slots}
              onChange={(e) => actualizarCampo("slots", e.target.value)}
              required
            />
          </div>

          <div className="lt-field-group" style={{ marginBottom: 16 }}>
            <label className="lt-label" htmlFor="camion-km-l">
              Rendimiento (Km/L) {!isEdit ? "*" : ""}
            </label>
            <input
              id="camion-km-l"
              type="number"
              min="0.01"
              step="0.01"
              className="lt-input"
              value={form.km_l}
              onChange={(e) => actualizarCampo("km_l", e.target.value)}
              placeholder="Ej: 8.5"
              required={!isEdit}
            />
            <div className="lt-card__subtitle" style={{ marginTop: 4 }}>
              Consumo de combustible para costos operativos (HU-50)
            </div>
          </div>

          {isEdit && (
            <div className="lt-field-group" style={{ marginBottom: 16 }}>
              <label className="lt-label" htmlFor="camion-utilizados">
                Slots Utilizados
              </label>
              <input
                id="camion-utilizados"
                type="number"
                min="0"
                max={form.slots || 96}
                step="1"
                className="lt-input"
                value={form.slots_utilizados}
                onChange={(e) => actualizarCampo("slots_utilizados", e.target.value)}
              />
            </div>
          )}

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
