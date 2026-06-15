import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  obtenerParadas,
  crearParada,
  editarParada,
  eliminarParada,
  reordenarParadas,
  recalcularDistancia,
} from "../lib/paradasService";
import { useGooglePlacesAutocomplete } from "../hooks/useGooglePlacesAutocomplete";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────

const TIPOS_PARADA = [
  { value: "ENTREGA", label: "📦 Entrega" },
  { value: "RECOLECCION", label: "🔄 Recolección" },
  { value: "DESCANSO", label: "☕ Descanso" },
];

const ESTADO_BADGE = {
  PENDIENTE:   { label: "Pendiente",   color: "#f59e0b" },
  EN_CAMINO:   { label: "En camino",   color: "#3b82f6" },
  COMPLETADO:  { label: "Completado",  color: "#10b981" },
  OMITIDO:     { label: "Omitido",     color: "#6b7280" },
};

// ─────────────────────────────────────────────────────────────────────────────
// SUBCOMPONENTES INTERNOS
// ─────────────────────────────────────────────────────────────────────────────

function EstadoBadge({ estado }) {
  const info = ESTADO_BADGE[estado] ?? { label: estado, color: "#6b7280" };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 600,
        color: "#fff",
        background: info.color,
        letterSpacing: 0.3,
      }}
    >
      {info.label}
    </span>
  );
}

function TipoBadge({ tipo }) {
  const t = TIPOS_PARADA.find((t) => t.value === tipo) ?? { label: tipo };
  return (
    <span style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>
      {t.label}
    </span>
  );
}

function AlertaBanner({ tipo, texto }) {
  if (!texto) return null;
  const classMap = {
    ok: "lt-alert-banner lt-alert-banner--success",
    error: "lt-alert-banner lt-alert-banner--error",
    warn: "lt-alert-banner lt-alert-banner--warning",
  };
  return (
    <div
      className={classMap[tipo] ?? "lt-alert-banner lt-alert-banner--warning"}
      role={tipo === "error" ? "alert" : "status"}
      style={{ marginTop: 8, marginBottom: 0 }}
    >
      {texto}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMULARIO INLINE DE PARADA
// ─────────────────────────────────────────────────────────────────────────────

function FormParada({ rutaId, paradaInicial, onSuccess, onCancel }) {
  const isEditing = Boolean(paradaInicial?.id);
  const [form, setForm] = useState({
    direccion: paradaInicial?.direccion ?? "",
    tipo_parada: paradaInicial?.tipo_parada ?? "ENTREGA",
    lat: paradaInicial?.lat ?? "",
    lng: paradaInicial?.lng ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const direccionRef = useRef(null);
  const { error: mapsError } = useGooglePlacesAutocomplete(direccionRef, {
    enabled: true,
    onPlaceSelected: (address, place) => {
      const lat = place?.geometry?.location?.lat?.() ?? null;
      const lng = place?.geometry?.location?.lng?.() ?? null;
      setForm((prev) => ({
        ...prev,
        direccion: address,
        lat: lat !== null ? String(lat) : prev.lat,
        lng: lng !== null ? String(lng) : prev.lng,
      }));
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!form.direccion.trim()) {
      setError("La dirección es obligatoria");
      return;
    }

    setSaving(true);

    const body = {
      direccion: form.direccion.trim(),
      tipo_parada: form.tipo_parada,
    };

    const latNum = parseFloat(form.lat);
    const lngNum = parseFloat(form.lng);
    if (Number.isFinite(latNum)) body.lat = latNum;
    if (Number.isFinite(lngNum)) body.lng = lngNum;

    const result = isEditing
      ? await editarParada(rutaId, paradaInicial.id, body)
      : await crearParada(rutaId, body);

    setSaving(false);

    if (!result.success) {
      setError(result.error ?? "Error desconocido");
      return;
    }

    onSuccess(result.data);
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: "var(--lt-surface, #f8fafc)",
        border: "1px solid var(--lt-border, #e2e8f0)",
        borderRadius: 10,
        padding: "14px 16px",
        marginBottom: 12,
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, color: "var(--lt-text, #1e293b)" }}>
        {isEditing ? "✏️ Editar parada" : "➕ Nueva parada"}
      </div>

      {mapsError && <AlertaBanner tipo="warn" texto={mapsError} />}
      {error && <AlertaBanner tipo="error" texto={error} />}

      <div className="lt-form-grid" style={{ gap: 10 }}>
        {/* Dirección */}
        <div className="lt-field-group" style={{ gridColumn: "1 / -1" }}>
          <label className="lt-label" htmlFor={`parada-dir-${paradaInicial?.id ?? "new"}`}>
            Dirección *
          </label>
          <input
            id={`parada-dir-${paradaInicial?.id ?? "new"}`}
            ref={direccionRef}
            className="lt-input"
            autoComplete="off"
            value={form.direccion}
            onChange={(e) => setForm((p) => ({ ...p, direccion: e.target.value }))}
            placeholder="Escribe y selecciona una dirección sugerida…"
            disabled={saving}
          />
        </div>

        {/* Tipo de parada */}
        <div className="lt-field-group">
          <label className="lt-label" htmlFor={`parada-tipo-${paradaInicial?.id ?? "new"}`}>
            Tipo de parada
          </label>
          <select
            id={`parada-tipo-${paradaInicial?.id ?? "new"}`}
            className="lt-select"
            value={form.tipo_parada}
            onChange={(e) => setForm((p) => ({ ...p, tipo_parada: e.target.value }))}
            disabled={saving}
          >
            {TIPOS_PARADA.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Lat/Lng (opcionales, auto-rellenados por Google Places) */}
        <div className="lt-field-group">
          <label className="lt-label" htmlFor={`parada-lat-${paradaInicial?.id ?? "new"}`}>
            Latitud
          </label>
          <input
            id={`parada-lat-${paradaInicial?.id ?? "new"}`}
            className="lt-input"
            type="text"
            inputMode="decimal"
            value={form.lat}
            onChange={(e) => setForm((p) => ({ ...p, lat: e.target.value }))}
            placeholder="Auto (Google Places)"
            disabled={saving}
          />
        </div>
        <div className="lt-field-group">
          <label className="lt-label" htmlFor={`parada-lng-${paradaInicial?.id ?? "new"}`}>
            Longitud
          </label>
          <input
            id={`parada-lng-${paradaInicial?.id ?? "new"}`}
            className="lt-input"
            type="text"
            inputMode="decimal"
            value={form.lng}
            onChange={(e) => setForm((p) => ({ ...p, lng: e.target.value }))}
            placeholder="Auto (Google Places)"
            disabled={saving}
          />
        </div>
      </div>

      <div className="lt-form-actions" style={{ marginTop: 12 }}>
        <button
          type="submit"
          className="lt-btn lt-btn--primary"
          disabled={saving}
          style={{ fontSize: 13 }}
        >
          {saving ? "Guardando…" : isEditing ? "Guardar cambios" : "Agregar parada"}
        </button>
        <button
          type="button"
          className="lt-btn lt-btn--secondary"
          onClick={onCancel}
          disabled={saving}
          style={{ fontSize: 13 }}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL: GestionParadas
// ─────────────────────────────────────────────────────────────────────────────

/**
 * HU-61 — Panel de gestión de paradas intermedias para una ruta.
 *
 * Props:
 *   rutaId     {string}  — ID de la ruta (obligatorio)
 *   rutaOrigen {string}  — dirección de origen (para mostrar en la secuencia)
 *   rutaDestino {string} — dirección de destino (para mostrar en la secuencia)
 *   readOnly   {boolean} — si es true, solo muestra las paradas sin edición
 *
 * Zero Breaking Change: si la API devuelve error 404/500 por tabla inexistente,
 * el componente muestra estado vacío sin romper la UI del padre.
 */
export default function GestionParadas({
  rutaId,
  rutaOrigen,
  rutaDestino,
  readOnly = false,
}) {
  const [paradas, setParadas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [paradaEditando, setParadaEditando] = useState(null);
  const [recalculando, setRecalculando] = useState(false);
  const [eliminandoId, setEliminandoId] = useState(null);
  const [moviendoId, setMoviendoId] = useState(null);

  // ── Carga inicial
  const cargarParadas = useCallback(async () => {
    if (!rutaId) return;
    setLoading(true);
    const result = await obtenerParadas(rutaId);
    setParadas(result.data ?? []);
    setLoading(false);
    if (result.error && result.data.length === 0) {
      // Tabla puede no existir aún — silenciamos para no romper UI del padre
      console.warn("GestionParadas:", result.error);
    }
  }, [rutaId]);

  useEffect(() => {
    cargarParadas();
  }, [cargarParadas]);

  // ── Helpers de estado
  const mostrarMensaje = (tipo, texto, ms = 4000) => {
    setMensaje({ tipo, texto });
    if (ms) setTimeout(() => setMensaje(null), ms);
  };

  // ── REORDENAMIENTO: mover parada hacia arriba o abajo
  const moverParada = useCallback(
    async (paradaId, direccion) => {
      const idx = paradas.findIndex((p) => p.id === paradaId);
      if (idx === -1) return;

      const nuevoIdx = direccion === "arriba" ? idx - 1 : idx + 1;
      if (nuevoIdx < 0 || nuevoIdx >= paradas.length) return;

      // Intercambiar en el array local (optimistic update)
      const nuevo = [...paradas];
      [nuevo[idx], nuevo[nuevoIdx]] = [nuevo[nuevoIdx], nuevo[idx]];

      // Reasignar números de orden
      const conOrden = nuevo.map((p, i) => ({ ...p, orden: i + 1 }));
      setParadas(conOrden);

      setMoviendoId(paradaId);
      const resultado = await reordenarParadas(
        rutaId,
        conOrden.map(({ id, orden }) => ({ id, orden })),
      );
      setMoviendoId(null);

      if (!resultado.success) {
        // Revertir si falla
        await cargarParadas();
        mostrarMensaje("error", resultado.error ?? "Error al reordenar");
        return;
      }

      // Actualizar con datos del servidor
      await cargarParadas();
      mostrarMensaje("ok", "Orden actualizado y distancia recalculada.");
    },
    [paradas, rutaId, cargarParadas],
  );

  // ── ELIMINAR
  const handleEliminar = async (paradaId) => {
    if (!window.confirm("¿Eliminar esta parada? Se recalculará la distancia total.")) {
      return;
    }

    setEliminandoId(paradaId);
    const result = await eliminarParada(rutaId, paradaId);
    setEliminandoId(null);

    if (!result.success) {
      mostrarMensaje("error", result.error ?? "No se pudo eliminar la parada");
      return;
    }

    await cargarParadas();
    mostrarMensaje("ok", "Parada eliminada y distancia recalculada.");
  };

  // ── RECALCULAR MANUAL
  const handleRecalcular = async () => {
    setRecalculando(true);
    const result = await recalcularDistancia(rutaId);
    setRecalculando(false);

    if (!result.success) {
      mostrarMensaje("error", result.error ?? "Error en el recálculo");
      return;
    }

    const km = result.data?.distancia_total_km;
    mostrarMensaje(
      "ok",
      km != null
        ? `Distancia total recalculada: ${km} km (${paradas.length} parada(s) intermedias)`
        : result.data?.mensaje ?? "Recálculo completado.",
    );
  };

  // ── ÉXITO AL GUARDAR FORMULARIO
  const handleFormSuccess = async () => {
    setShowForm(false);
    setParadaEditando(null);
    await cargarParadas();
    mostrarMensaje(
      "ok",
      paradaEditando ? "Parada actualizada." : "Parada añadida y distancia recalculada.",
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        marginTop: 16,
        padding: "16px",
        background: "var(--lt-surface-alt, #f1f5f9)",
        borderRadius: 12,
        border: "1px solid var(--lt-border, #e2e8f0)",
      }}
    >
      {/* ── Cabecera */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <div>
          <span style={{ fontWeight: 700, fontSize: 14, color: "var(--lt-text, #1e293b)" }}>
            🗺️ Paradas intermedias
          </span>
          {paradas.length > 0 && (
            <span
              style={{
                marginLeft: 8,
                background: "var(--lt-accent, #6366f1)",
                color: "#fff",
                borderRadius: 10,
                padding: "1px 7px",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {paradas.length}
            </span>
          )}
        </div>

        {!readOnly && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              id="btn-agregar-parada"
              className="lt-btn lt-btn--primary"
              style={{ fontSize: 12, padding: "5px 12px" }}
              onClick={() => {
                setParadaEditando(null);
                setShowForm((v) => !v);
              }}
              disabled={loading}
            >
              {showForm && !paradaEditando ? "Cancelar" : "＋ Agregar parada"}
            </button>

            {paradas.length > 0 && (
              <button
                type="button"
                id="btn-recalcular-distancia"
                className="lt-btn lt-btn--secondary"
                style={{ fontSize: 12, padding: "5px 12px" }}
                onClick={handleRecalcular}
                disabled={recalculando || loading}
              >
                {recalculando ? "Calculando…" : "↺ Recalcular distancia"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Mensajes */}
      {mensaje && <AlertaBanner tipo={mensaje.tipo} texto={mensaje.texto} />}

      {/* ── Formulario de nueva parada */}
      {showForm && !paradaEditando && !readOnly && (
        <FormParada
          rutaId={rutaId}
          paradaInicial={null}
          onSuccess={handleFormSuccess}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* ── Estado vacío */}
      {!loading && paradas.length === 0 && !showForm && (
        <div
          style={{
            textAlign: "center",
            color: "#94a3b8",
            fontSize: 13,
            padding: "20px 0",
          }}
        >
          {readOnly
            ? "Esta ruta no tiene paradas intermedias."
            : "No hay paradas intermedias. Usa el botón para añadir la primera."}
        </div>
      )}

      {/* ── Loading */}
      {loading && (
        <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, padding: 16 }}>
          Cargando paradas…
        </div>
      )}

      {/* ── Lista de paradas */}
      {paradas.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {/* Origen (fijo, no editable) */}
          <PuntoFijo
            label="Origen"
            direccion={rutaOrigen}
            icono="🟢"
            index={0}
          />

          {/* Paradas intermedias */}
          {paradas.map((parada, idx) => (
            <React.Fragment key={parada.id}>
              {/* Formulario de edición inline */}
              {paradaEditando?.id === parada.id && !readOnly ? (
                <FormParada
                  rutaId={rutaId}
                  paradaInicial={paradaEditando}
                  onSuccess={handleFormSuccess}
                  onCancel={() => setParadaEditando(null)}
                />
              ) : (
                <FilaParada
                  parada={parada}
                  index={idx}
                  total={paradas.length}
                  readOnly={readOnly}
                  moviendo={moviendoId === parada.id}
                  eliminando={eliminandoId === parada.id}
                  onSubir={() => moverParada(parada.id, "arriba")}
                  onBajar={() => moverParada(parada.id, "abajo")}
                  onEditar={() => {
                    setParadaEditando(parada);
                    setShowForm(false);
                  }}
                  onEliminar={() => handleEliminar(parada.id)}
                />
              )}
            </React.Fragment>
          ))}

          {/* Destino (fijo, no editable) */}
          <PuntoFijo
            label="Destino"
            direccion={rutaDestino}
            icono="🔴"
            index={paradas.length + 1}
          />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBCOMPONENTES DE LISTA
// ─────────────────────────────────────────────────────────────────────────────

function PuntoFijo({ label, direccion, icono, index }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 10px",
        opacity: 0.7,
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
          flexShrink: 0,
        }}
      >
        {icono}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", letterSpacing: 0.5 }}>
          {label}
        </div>
        <div style={{ fontSize: 13, color: "var(--lt-text, #1e293b)", fontWeight: 500 }}>
          {direccion || <em style={{ color: "#cbd5e1" }}>No especificado</em>}
        </div>
      </div>
    </div>
  );
}

function FilaParada({
  parada,
  index,
  total,
  readOnly,
  moviendo,
  eliminando,
  onSubir,
  onBajar,
  onEditar,
  onEliminar,
}) {
  const esPrimera = index === 0;
  const esUltima = index === total - 1;
  const cargando = moviendo || eliminando;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 10px",
        background: "#fff",
        borderRadius: 8,
        border: "1px solid var(--lt-border, #e2e8f0)",
        marginBottom: 6,
        opacity: cargando ? 0.6 : 1,
        transition: "opacity 0.2s",
      }}
    >
      {/* Número de orden */}
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: "50%",
          background: "var(--lt-accent, #6366f1)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {parada.orden}
      </div>

      {/* Info parada */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--lt-text, #1e293b)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {parada.direccion}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 2 }}>
          <TipoBadge tipo={parada.tipo_parada} />
          <EstadoBadge estado={parada.estado} />
          {parada.distancia_desde_anterior_km != null && (
            <span style={{ fontSize: 11, color: "#64748b" }}>
              +{parada.distancia_desde_anterior_km} km
            </span>
          )}
        </div>
      </div>

      {/* Controles */}
      {!readOnly && (
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          {/* Subir */}
          <button
            type="button"
            id={`btn-subir-parada-${parada.id}`}
            title="Mover arriba"
            className="lt-btn"
            onClick={onSubir}
            disabled={esPrimera || cargando}
            style={{
              padding: "3px 7px",
              fontSize: 13,
              opacity: esPrimera ? 0.3 : 1,
              background: "transparent",
              border: "1px solid var(--lt-border, #e2e8f0)",
              borderRadius: 6,
              cursor: esPrimera ? "not-allowed" : "pointer",
            }}
          >
            ↑
          </button>
          {/* Bajar */}
          <button
            type="button"
            id={`btn-bajar-parada-${parada.id}`}
            title="Mover abajo"
            className="lt-btn"
            onClick={onBajar}
            disabled={esUltima || cargando}
            style={{
              padding: "3px 7px",
              fontSize: 13,
              opacity: esUltima ? 0.3 : 1,
              background: "transparent",
              border: "1px solid var(--lt-border, #e2e8f0)",
              borderRadius: 6,
              cursor: esUltima ? "not-allowed" : "pointer",
            }}
          >
            ↓
          </button>
          {/* Editar */}
          <button
            type="button"
            id={`btn-editar-parada-${parada.id}`}
            title="Editar parada"
            className="lt-btn lt-btn--secondary"
            onClick={onEditar}
            disabled={cargando}
            style={{ padding: "3px 9px", fontSize: 12 }}
          >
            ✏️
          </button>
          {/* Eliminar */}
          <button
            type="button"
            id={`btn-eliminar-parada-${parada.id}`}
            title="Eliminar parada"
            className="lt-btn"
            onClick={onEliminar}
            disabled={cargando}
            style={{
              padding: "3px 9px",
              fontSize: 12,
              background: "#fef2f2",
              color: "#ef4444",
              border: "1px solid #fecaca",
              borderRadius: 6,
            }}
          >
            {eliminando ? "…" : "🗑️"}
          </button>
        </div>
      )}
    </div>
  );
}
