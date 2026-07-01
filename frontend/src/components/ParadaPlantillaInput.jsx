import React, { useRef } from "react";
import { Trash2 } from "lucide-react";
import { useGooglePlacesAutocomplete } from "../hooks/useGooglePlacesAutocomplete";

function extractCoords(place) {
  const lat = place?.geometry?.location?.lat?.();
  const lng = place?.geometry?.location?.lng?.();
  return {
    latitud: Number.isFinite(lat) ? lat : null,
    longitud: Number.isFinite(lng) ? lng : null,
  };
}

export default function ParadaPlantillaInput({
  index,
  parada,
  onChange,
  onPlaceSelected,
  onRemove,
  soloLectura = false,
}) {
  const inputRef = useRef(null);

  useGooglePlacesAutocomplete(inputRef, {
    onPlaceSelected: (address, place) => {
      const coords = extractCoords(place);
      onPlaceSelected(index, {
        direccion: address,
        ...coords,
      });
    },
  });

  return (
    <div className="lt-form-row">
      <input
        type="number"
        min="1"
        className="lt-input lt-input--orden"
        aria-label={`Orden parada ${index + 1}`}
        value={parada.orden}
        onChange={(e) => onChange(index, "orden", e.target.value)}
        readOnly={soloLectura}
      />
      <input
        ref={inputRef}
        className="lt-input lt-input--grow"
        placeholder="Escribe y selecciona una dirección sugerida…"
        value={parada.direccion}
        onChange={(e) => onChange(index, "direccion", e.target.value)}
        autoComplete="off"
        readOnly={soloLectura}
      />
      {onRemove ? (
        <button
          type="button"
          className="lt-btn lt-btn--ghost lt-btn--sm"
          onClick={() => onRemove(index)}
          aria-label="Eliminar parada"
        >
          <Trash2 size={14} />
        </button>
      ) : null}
    </div>
  );
}
