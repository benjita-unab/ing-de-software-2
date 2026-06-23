import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { useGooglePlacesAutocomplete } from "../hooks/useGooglePlacesAutocomplete";
import { calcularRutaPlantilla } from "../lib/rutasPlantillaService";
import { getClientes } from "../lib/clientesService";
import Card from "./ui/Card";
import ParadaPlantillaInput from "./ParadaPlantillaInput";
import Spinner from "./ui/Spinner";

const EMPTY = {
  nombre: "",
  origen: "",
  destino: "",
  origenLat: null,
  origenLng: null,
  destinoLat: null,
  destinoLng: null,
  distanciaEstimada: "",
  tiempoEstimado: "",
  activa: true,
  clienteId: "",
  paradas: [],
};

function extractCoords(place) {
  const lat = place?.geometry?.location?.lat?.();
  const lng = place?.geometry?.location?.lng?.();
  return {
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
  };
}

function formatDistanciaDisplay(value) {
  if (value === "" || value == null) return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return String(n);
}

function formatTiempoDisplay(value) {
  if (value === "" || value == null) return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return String(Math.round(n));
}

export default function FormularioRutaPlantilla({
  plantillaInicial = null,
  onGuardado,
  onCancel,
}) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [calculandoRuta, setCalculandoRuta] = useState(false);
  const [errorRuta, setErrorRuta] = useState("");
  const [clientes, setClientes] = useState([]);
  const [cargandoClientes, setCargandoClientes] = useState(false);

  const origenInputRef = useRef(null);
  const destinoInputRef = useRef(null);
  const calcRequestRef = useRef(0);

  const { error: mapsOrigenError } = useGooglePlacesAutocomplete(origenInputRef, {
    onPlaceSelected: (address, place) => {
      const { lat, lng } = extractCoords(place);
      setForm((prev) => ({
        ...prev,
        origen: address,
        origenLat: lat,
        origenLng: lng,
      }));
    },
  });

  const { error: mapsDestinoError } = useGooglePlacesAutocomplete(destinoInputRef, {
    onPlaceSelected: (address, place) => {
      const { lat, lng } = extractCoords(place);
      setForm((prev) => ({
        ...prev,
        destino: address,
        destinoLat: lat,
        destinoLng: lng,
      }));
    },
  });

  const mapsError = mapsOrigenError || mapsDestinoError;

  useEffect(() => {
    let cancelled = false;
    async function cargarClientes() {
      setCargandoClientes(true);
      try {
        const data = await getClientes();
        if (!cancelled) {
          setClientes(Array.isArray(data) ? data : data?.data || []);
        }
      } catch {
        if (!cancelled) setClientes([]);
      } finally {
        if (!cancelled) setCargandoClientes(false);
      }
    }
    cargarClientes();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (plantillaInicial) {
      setForm({
        nombre: plantillaInicial.nombre || "",
        origen: plantillaInicial.origen || "",
        destino: plantillaInicial.destino || "",
        origenLat: plantillaInicial.origenLat ?? null,
        origenLng: plantillaInicial.origenLng ?? null,
        destinoLat: plantillaInicial.destinoLat ?? null,
        destinoLng: plantillaInicial.destinoLng ?? null,
        distanciaEstimada:
          plantillaInicial.distanciaEstimada != null
            ? String(plantillaInicial.distanciaEstimada)
            : "",
        tiempoEstimado:
          plantillaInicial.tiempoEstimado != null
            ? String(plantillaInicial.tiempoEstimado)
            : "",
        activa: plantillaInicial.activa !== false,
        clienteId: plantillaInicial.clienteId || "",
        paradas: (plantillaInicial.paradas || []).map((p) => ({
          direccion: p.direccion,
          orden: p.orden,
          latitud: p.latitud ?? null,
          longitud: p.longitud ?? null,
        })),
      });
      setErrorRuta("");
    } else {
      setForm(EMPTY);
      setErrorRuta("");
    }
  }, [plantillaInicial]);

  const paradasSignature = useMemo(
    () =>
      form.paradas
        .map((p) => `${p.orden}:${p.direccion.trim()}`)
        .sort()
        .join("|"),
    [form.paradas],
  );

  const recalcularRuta = useCallback(async () => {
    const origen = form.origen.trim();
    const destino = form.destino.trim();

    if (!origen || !destino) {
      setForm((prev) => ({
        ...prev,
        distanciaEstimada: "",
        tiempoEstimado: "",
      }));
      setErrorRuta("");
      return;
    }

    const paradas = form.paradas
      .filter((p) => p.direccion.trim())
      .map((p) => ({
        direccion: p.direccion.trim(),
        orden: Number(p.orden) || 0,
      }))
      .filter((p) => p.orden > 0)
      .sort((a, b) => a.orden - b.orden);

    setCalculandoRuta(true);
    setErrorRuta("");

    const requestId = ++calcRequestRef.current;
    const res = await calcularRutaPlantilla({ origen, destino, paradas });

    if (requestId !== calcRequestRef.current) {
      return;
    }

    setCalculandoRuta(false);

    if (res.error) {
      setErrorRuta(res.error);
      setForm((prev) => ({
        ...prev,
        distanciaEstimada: "",
        tiempoEstimado: "",
      }));
      return;
    }

    const { distanciaEstimada, tiempoEstimado } = res.data || {};
    setForm((prev) => ({
      ...prev,
      distanciaEstimada:
        distanciaEstimada != null ? String(distanciaEstimada) : "",
      tiempoEstimado: tiempoEstimado != null ? String(tiempoEstimado) : "",
    }));
  }, [form.origen, form.destino, form.paradas]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      recalcularRuta();
    }, 600);
    return () => window.clearTimeout(timer);
  }, [form.origen, form.destino, paradasSignature, recalcularRuta]);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function agregarParada() {
    setForm((prev) => ({
      ...prev,
      paradas: [
        ...prev.paradas,
        { direccion: "", orden: prev.paradas.length + 1, latitud: null, longitud: null },
      ],
    }));
  }

  function actualizarParada(index, field, value) {
    setForm((prev) => {
      const paradas = [...prev.paradas];
      paradas[index] = { ...paradas[index], [field]: value };
      return { ...prev, paradas };
    });
  }

  function actualizarParadaDesdePlaces(index, datos) {
    setForm((prev) => {
      const paradas = [...prev.paradas];
      paradas[index] = { ...paradas[index], ...datos };
      return { ...prev, paradas };
    });
  }

  function eliminarParada(index) {
    setForm((prev) => {
      const paradas = prev.paradas
        .filter((_, i) => i !== index)
        .map((p, i) => ({ ...p, orden: i + 1 }));
      return { ...prev, paradas };
    });
  }

  function buildPayload() {
    const distancia = form.distanciaEstimada.trim();
    const tiempo = form.tiempoEstimado.trim();

    return {
      nombre: form.nombre.trim(),
      origen: form.origen.trim(),
      destino: form.destino.trim(),
      distanciaEstimada: distancia ? Number(distancia) : null,
      tiempoEstimado: tiempo ? Number(tiempo) : null,
      origenLat: form.origenLat,
      origenLng: form.origenLng,
      destinoLat: form.destinoLat,
      destinoLng: form.destinoLng,
      activa: form.activa,
      clienteId: form.clienteId?.trim() || null,
      paradas: form.paradas
        .filter((p) => p.direccion.trim())
        .map((p, i) => ({
          direccion: p.direccion.trim(),
          orden: Number(p.orden) || i + 1,
          latitud: p.latitud ?? undefined,
          longitud: p.longitud ?? undefined,
        })),
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.nombre.trim() || !form.origen.trim() || !form.destino.trim()) {
      setError("Nombre, origen y destino son obligatorios.");
      return;
    }

    if (calculandoRuta) {
      setError("Espera a que termine el cálculo de distancia y tiempo.");
      return;
    }

    if (!form.distanciaEstimada.trim()) {
      setError(
        errorRuta ||
          "No se pudo calcular la distancia. Verifica origen y destino.",
      );
      return;
    }

    setSaving(true);
    await onGuardado(buildPayload(), plantillaInicial?.id);
    setSaving(false);
  }

  return (
    <Card className="lt-module-card">
      <h3 className="lt-module-card__title">
        {plantillaInicial ? "Editar ruta plantilla" : "Nueva ruta plantilla"}
      </h3>

      {error ? (
        <div className="lt-alert-banner lt-alert-banner--error" role="alert">
          {error}
        </div>
      ) : null}

      {mapsError ? (
        <div className="lt-alert-banner lt-alert-banner--warning" role="alert">
          {mapsError}
        </div>
      ) : null}

      <form onSubmit={handleSubmit}>
        <div className="lt-form-grid">
          <div className="lt-field-group">
            <label className="lt-label" htmlFor="rp-nombre">
              Nombre *
            </label>
            <input
              id="rp-nombre"
              className="lt-input"
              placeholder="Ej: Santiago - Valparaíso"
              value={form.nombre}
              onChange={(e) => updateField("nombre", e.target.value)}
              maxLength={150}
              required
            />
          </div>

          <div className="lt-field-group">
            <label className="lt-label" htmlFor="rp-cliente">
              Cliente adjudicado
            </label>
            <select
              id="rp-cliente"
              className="lt-input"
              value={form.clienteId}
              onChange={(e) => updateField("clienteId", e.target.value)}
              disabled={cargandoClientes}
            >
              <option value="">Sin cliente (plantilla global)</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="lt-field-group lt-field-group--full">
            <label className="lt-label" htmlFor="rp-origen">
              Origen *
            </label>
            <input
              id="rp-origen"
              ref={origenInputRef}
              className="lt-input"
              placeholder="Escribe y selecciona una dirección sugerida…"
              value={form.origen}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  origen: e.target.value,
                  origenLat: null,
                  origenLng: null,
                }))
              }
              autoComplete="off"
              required
            />
          </div>

          <div className="lt-field-group lt-field-group--full">
            <label className="lt-label" htmlFor="rp-destino">
              Destino *
            </label>
            <input
              id="rp-destino"
              ref={destinoInputRef}
              className="lt-input"
              placeholder="Escribe y selecciona una dirección sugerida…"
              value={form.destino}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  destino: e.target.value,
                  destinoLat: null,
                  destinoLng: null,
                }))
              }
              autoComplete="off"
              required
            />
          </div>

          <div className="lt-field-group">
            <label className="lt-label" htmlFor="rp-distancia">
              Distancia estimada (km)
            </label>
            <input
              id="rp-distancia"
              className="lt-input lt-input--readonly"
              readOnly
              tabIndex={-1}
              placeholder={calculandoRuta ? "Calculando…" : "Se calcula automáticamente"}
              value={
                calculandoRuta
                  ? ""
                  : formatDistanciaDisplay(form.distanciaEstimada)
              }
            />
          </div>

          <div className="lt-field-group">
            <label className="lt-label" htmlFor="rp-tiempo">
              Tiempo estimado (min)
            </label>
            <input
              id="rp-tiempo"
              className="lt-input lt-input--readonly"
              readOnly
              tabIndex={-1}
              placeholder={calculandoRuta ? "Calculando…" : "Se calcula automáticamente"}
              value={
                calculandoRuta ? "" : formatTiempoDisplay(form.tiempoEstimado)
              }
            />
          </div>

          <div className="lt-field-group lt-checkbox-field">
            <input
              id="rp-activa"
              type="checkbox"
              checked={form.activa}
              onChange={(e) => updateField("activa", e.target.checked)}
            />
            <label className="lt-label" htmlFor="rp-activa">
              Activa
            </label>
          </div>
        </div>

        {calculandoRuta ? (
          <div className="lt-form-calc-status">
            <Spinner size={16} />
            Calculando distancia y tiempo de la ruta…
          </div>
        ) : null}

        {errorRuta && !calculandoRuta ? (
          <div className="lt-alert-banner lt-alert-banner--warning" role="alert">
            {errorRuta}
          </div>
        ) : null}

        <div className="lt-form-subsection">
          <div className="lt-form-subsection__header">
            <h4 className="lt-form-subsection__title">Paradas intermedias</h4>
            <button
              type="button"
              className="lt-btn lt-btn--ghost lt-btn--sm"
              onClick={agregarParada}
            >
              <Plus size={14} /> Agregar parada
            </button>
          </div>

          {form.paradas.length === 0 ? (
            <p className="lt-form-subsection__hint">Sin paradas intermedias.</p>
          ) : (
            form.paradas.map((p, index) => (
              <ParadaPlantillaInput
                key={`parada-${index}`}
                index={index}
                parada={p}
                onChange={actualizarParada}
                onPlaceSelected={actualizarParadaDesdePlaces}
                onRemove={eliminarParada}
              />
            ))
          )}
        </div>

        <div className="lt-form-actions">
          <button
            type="submit"
            className="lt-btn lt-btn--primary"
            disabled={saving || calculandoRuta}
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
          <button type="button" className="lt-btn lt-btn--ghost" onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </form>
    </Card>
  );
}
