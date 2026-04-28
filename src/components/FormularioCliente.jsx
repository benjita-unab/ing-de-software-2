import React, { useEffect, useRef, useState } from "react";
import { apiFetch } from "../lib/apiClient";
import SelectorCoordenadas from "./SelectorCoordenadas";

const base = {
  container: {
    background: "#111827",
    border: "1px solid #1e2a3a",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "20px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
    color: "#fff",
    fontFamily: "'Syne', 'DM Mono', sans-serif",
  },
  title: {
    fontSize: "16px",
    fontWeight: 600,
    color: "#60A5FA",
    marginBottom: "16px",
  },
  label: {
    display: "block",
    fontSize: "13px",
    color: "#94A3B8",
    marginBottom: "8px",
    fontWeight: 500,
  },
  input: {
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
    boxSizing: "border-box"
  },
  button: {
    padding: "10px 16px",
    background: "#0EA5E9",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s ease",
    fontFamily: "inherit",
    width: "100%",
    marginTop: "16px"
  }
};

export default function FormularioCliente({ onGuardado }) {
  const MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  const direccionInputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const geocoderRef = useRef(null);
  const [formData, setFormData] = useState({
    nombre: "",
    rut: "",
    telefono: "",
    direccion: "",
    latitud: -33.4489, // Default Santiago
    longitud: -70.6693
  });
  const [loading, setLoading] = useState(false);
  const [mapsError, setMapsError] = useState("");

  useEffect(() => {
    if (!MAPS_API_KEY) {
      setMapsError("Configura REACT_APP_GOOGLE_MAPS_API_KEY para autocompletar direcciones.");
      return;
    }

    const initAutocomplete = () => {
      if (!direccionInputRef.current || !window.google?.maps) return;
      if (!geocoderRef.current) {
        geocoderRef.current = new window.google.maps.Geocoder();
      }
      if (!window.google.maps.places) {
        setMapsError("Places bloqueado. Puedes escribir dirección y presionar Enter para ubicar en el mapa.");
        return;
      }
      if (autocompleteRef.current) return;

      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        direccionInputRef.current,
        {
          fields: ["formatted_address", "geometry", "name"],
          componentRestrictions: { country: "cl" },
          types: ["address"],
        }
      );

      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current.getPlace();
        const direccionSeleccionada = place.formatted_address || place.name || "";
        const lat = place.geometry?.location?.lat?.();
        const lng = place.geometry?.location?.lng?.();

        setFormData((prev) => ({
          ...prev,
          direccion: direccionSeleccionada || prev.direccion,
          latitud: Number.isFinite(lat) ? lat : prev.latitud,
          longitud: Number.isFinite(lng) ? lng : prev.longitud,
        }));
      });
    };

    if (window.google?.maps?.places) {
      initAutocomplete();
      return;
    }

    const scriptId = "google-maps-script";
    const existingScript = document.getElementById(scriptId);
    if (existingScript) {
      existingScript.addEventListener("load", initAutocomplete);
      return () => existingScript.removeEventListener("load", initAutocomplete);
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}&libraries=places&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onload = initAutocomplete;
    script.onerror = () => setMapsError("No se pudo cargar Google Places para autocompletado.");
    document.head.appendChild(script);
  }, [MAPS_API_KEY]);

  const geocodeDireccion = (direccion) => {
    if (!direccion || !window.google?.maps || !geocoderRef.current) return;
    geocoderRef.current.geocode(
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
          setMapsError("");
        }
      }
    );
  };

  const formatRut = (value) => {
    let rut = value.replace(/[^0-9kK]/g, "").toUpperCase();
    if (rut.length > 9) {
      rut = rut.slice(0, 9);
    }
    if (rut.length <= 1) return rut;
    const dv = rut.slice(-1);
    let cuerpo = rut.slice(0, -1);
    cuerpo = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${cuerpo}-${dv}`;
  };

  const formatTelefono = (value) => {
    let numbers = value.replace(/\D/g, "");
    if (numbers.startsWith("56")) {
      numbers = numbers.slice(2);
    }
    if (numbers.length > 9) {
      numbers = numbers.slice(0, 9);
    }
    if (numbers.length === 0) return "";
    if (numbers.length <= 1) return `+56 ${numbers}`;
    if (numbers.length <= 5) return `+56 ${numbers.slice(0, 1)} ${numbers.slice(1)}`;
    return `+56 ${numbers.slice(0, 1)} ${numbers.slice(1, 5)} ${numbers.slice(5, 9)}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        nombre: formData.nombre,
        rut: formData.rut,
        contacto_telefono: formData.telefono,
        direccion: formData.direccion,
        latitud: formData.latitud,
        longitud: formData.longitud,
      };

      const res = await apiFetch("/api/clientes", {
        method: "POST",
        json: payload,
      });

      if (!res.ok) {
        if (res.status === 404 || res.status === 0) {
          alert(
            "⚠️ Endpoint de clientes no disponible aún en el backend. " +
            "El cliente no se guardó. Intenta más tarde."
          );
          return;
        }
        throw new Error(res.error || "Error al guardar cliente");
      }

      alert("✅ Cliente guardado exitosamente");
      setFormData({
        nombre: "",
        rut: "",
        telefono: "",
        direccion: "",
        latitud: -33.4489,
        longitud: -70.6693,
      });
      if (onGuardado) onGuardado();
    } catch (err) {
      alert("❌ Error al guardar cliente: " + err.message);
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
    <div style={base.container} className="client-form-card">
      <div style={base.title}>👤 Registrar Nuevo Cliente</div>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
        
        <label style={base.label}>Nombre Cliente o Empresa</label>
        <input 
          style={base.input}
          placeholder="Ej: Logística SpA" 
          value={formData.nombre}
          onChange={(e) => setFormData({...formData, nombre: e.target.value})}
          required
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div>
            <label style={base.label}>RUT</label>
            <input 
              style={base.input}
              placeholder="Ej: 76.000.000-K" 
              value={formData.rut}
              onChange={(e) => {
                const formattedRut = formatRut(e.target.value);
                setFormData({...formData, rut: formattedRut});
              }}
            />
          </div>
          <div>
            <label style={base.label}>Teléfono</label>
            <input 
              style={base.input}
              placeholder="+56 9 1234 5678" 
              value={formData.telefono}
              onChange={(e) => {
                const formattedPhone = formatTelefono(e.target.value);
                setFormData({...formData, telefono: formattedPhone});
              }}
            />
          </div>
        </div>

        <label style={base.label}>Dirección Base</label>
        {mapsError && (
          <div style={{ color: "#fca5a5", fontSize: "11px", marginBottom: "8px" }}>
            {mapsError}
          </div>
        )}
        <input 
          ref={direccionInputRef}
          style={base.input}
          placeholder="Escribe y selecciona una dirección sugerida..." 
          value={formData.direccion}
          onChange={(e) => setFormData({...formData, direccion: e.target.value})}
          onBlur={(e) => geocodeDireccion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              geocodeDireccion(formData.direccion);
            }
          }}
          autoComplete="off"
        />

        <label style={base.label}>Ubicación Exacta de Entrega</label>
        <SelectorCoordenadas 
          latInicial={formData.latitud} 
          lngInicial={formData.longitud} 
          onSelectUbicacion={handleCoordenadas}
          onAddressResolved={handleAddressResolved}
        />

        <button type="submit" style={{...base.button, opacity: loading ? 0.7 : 1}} disabled={loading}>
          {loading ? "Guardando..." : "💾 Guardar Cliente"}
        </button>
      </form>
    </div>
  );
}