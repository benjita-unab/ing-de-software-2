import React, { useRef, useState, useEffect } from "react";
import { X } from "lucide-react";
import { formatRut } from "../lib/formatRut";
import { useGooglePlacesAutocomplete } from "../hooks/useGooglePlacesAutocomplete";
import { loadGoogleMaps } from "../lib/googleMapsLoader";
import SelectorCoordenadas from "./SelectorCoordenadas";
import { createCliente, updateCliente } from "../lib/clientesService";
import Card from "./ui/Card";

export default function FormularioCliente({ onGuardado, clienteInicial = null, onCancel }) {
  const direccionInputRef = useRef(null);
  const [formData, setFormData] = useState({
    nombre: "",
    rut: "",
    telefono: "",
    direccion: "",
    latitud: -33.4489,
    longitud: -70.6693,
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (clienteInicial) {
      setFormData({
        nombre: clienteInicial.nombre || "",
        rut: clienteInicial.rut || "",
        telefono: clienteInicial.contacto_telefono || "",
        direccion: clienteInicial.direccion || "",
        latitud: clienteInicial.latitud || -33.4489,
        longitud: clienteInicial.longitud || -70.6693,
      });
      setErrorMsg("");
    }
  }, [clienteInicial]);

  const { error: mapsError } = useGooglePlacesAutocomplete(direccionInputRef, {
    onPlaceSelected: (address, place) => {
      const lat = place.geometry?.location?.lat?.();
      const lng = place.geometry?.location?.lng?.();
      setFormData((prev) => ({
        ...prev,
        direccion: address || prev.direccion,
        latitud: Number.isFinite(lat) ? lat : prev.latitud,
        longitud: Number.isFinite(lng) ? lng : prev.longitud,
      }));
    },
  });

  const geocodeDireccion = async (direccion) => {
    if (!direccion) return;
    try {
      await loadGoogleMaps({ libraries: ["geocoding"] });
    } catch {
      return;
    }
    if (!window.google?.maps) return;
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode(
      { address: direccion, componentRestrictions: { country: "CL" } },
      (results, status) => {
        if (status === "OK" && results?.[0]) {
          const location = results[0].geometry.location;
          setFormData((prev) => ({
            ...prev,
            direccion: results[0].formatted_address || prev.direccion,
            latitud: location.lat(),
            longitud: location.lng(),
          }));
        }
      },
    );
  };

  const formatTelefono = (value) => {
    let numbers = value.replace(/\D/g, "");
    if (numbers.startsWith("56")) numbers = numbers.slice(2);
    if (numbers.length > 9) numbers = numbers.slice(0, 9);
    if (numbers.length === 0) return "";
    if (numbers.length <= 1) return `+56 ${numbers}`;
    if (numbers.length <= 5) return `+56 ${numbers.slice(0, 1)} ${numbers.slice(1)}`;
    return `+56 ${numbers.slice(0, 1)} ${numbers.slice(1, 5)} ${numbers.slice(5, 9)}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    if (!formData.nombre.trim()) {
      setErrorMsg("El campo 'Nombre Cliente o Empresa' es obligatorio.");
      setLoading(false);
      return;
    }
    if (!formData.rut.trim()) {
      setErrorMsg("El campo 'RUT' es obligatorio.");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        nombre: formData.nombre,
        rut: formData.rut,
        contacto_telefono: formData.telefono,
        direccion: formData.direccion,
      };

      if (clienteInicial?.id) {
        await updateCliente(clienteInicial.id, payload);
        alert("✅ Cliente actualizado exitosamente");
      } else {
        await createCliente(payload);
        alert("✅ Cliente guardado exitosamente");
        setFormData({
          nombre: "",
          rut: "",
          telefono: "",
          direccion: "",
          latitud: -33.4489,
          longitud: -70.6693,
        });
      }

      if (onGuardado) onGuardado();
    } catch (err) {
      alert(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCoordenadas = (coords) => {
    setFormData((prev) => ({
      ...prev,
      latitud: coords.lat,
      longitud: coords.lng,
    }));
  };

  const handleAddressResolved = (direccion) => {
    setFormData((prev) => ({
      ...prev,
      direccion: direccion || prev.direccion,
    }));
  };

  return (
    <Card className="lt-module-card">
      <div className="lt-clientes-form-header">
        <h3 className="lt-module-card__title">
          {clienteInicial ? "Editar cliente" : "Registrar nuevo cliente"}
        </h3>
        {onCancel && (
          <button type="button" className="lt-btn lt-btn--ghost" onClick={onCancel}>
            <X size={14} />
            Cerrar
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="lt-alert-banner lt-alert-banner--error">{errorMsg}</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="lt-field-group">
          <label className="lt-label">Nombre cliente o empresa</label>
          <input
            className="lt-input"
            placeholder="Ej: Logística SpA"
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            required
          />
        </div>

        <div className="lt-form-grid">
          <div className="lt-field-group">
            <label className="lt-label">RUT</label>
            <input
              className="lt-input"
              placeholder="Ej: 76.000.000-K"
              value={formData.rut}
              onChange={(e) => setFormData({ ...formData, rut: formatRut(e.target.value) })}
            />
          </div>
          <div className="lt-field-group">
            <label className="lt-label">Teléfono</label>
            <input
              className="lt-input"
              placeholder="+56 9 1234 5678"
              value={formData.telefono}
              onChange={(e) =>
                setFormData({ ...formData, telefono: formatTelefono(e.target.value) })
              }
            />
          </div>
        </div>

        <div className="lt-field-group">
          <label className="lt-label">Dirección base</label>
          {mapsError && (
            <div className="lt-alert-banner lt-alert-banner--warning">{mapsError}</div>
          )}
          <input
            ref={direccionInputRef}
            className="lt-input"
            placeholder="Escribe y selecciona una dirección sugerida..."
            value={formData.direccion}
            onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
            onBlur={(e) => geocodeDireccion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                geocodeDireccion(formData.direccion);
              }
            }}
            autoComplete="off"
          />
        </div>

        <div className="lt-field-group">
          <label className="lt-label">Ubicación exacta de entrega</label>
          <SelectorCoordenadas
            latInicial={formData.latitud}
            lngInicial={formData.longitud}
            onSelectUbicacion={handleCoordenadas}
            onAddressResolved={handleAddressResolved}
          />
        </div>

        <button
          type="submit"
          className="lt-btn lt-btn--primary lt-btn--full"
          disabled={loading}
        >
          {loading ? "Guardando..." : "Guardar cliente"}
        </button>
      </form>
    </Card>
  );
}
