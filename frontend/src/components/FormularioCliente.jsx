import React, { useRef, useState, useEffect } from "react";
import { formatRut } from "../lib/formatRut";
import { useGooglePlacesAutocomplete } from "../hooks/useGooglePlacesAutocomplete";
import { loadGoogleMaps } from "../lib/googleMapsLoader";
import SelectorCoordenadas from "./SelectorCoordenadas";
import { createCliente, updateCliente } from "../lib/clientesService";

const base = {
  container: {
    background: "rgba(8,8,12,0.72)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "16px",
    padding: "20px",
    marginBottom: "20px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
    backdropFilter: "blur(8px)",
    color: "#fff",
    fontFamily: "'Inter', 'Poppins', sans-serif",
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
    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(15,23,42,0.65)",
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

export default function FormularioCliente({ onGuardado, clienteInicial = null, onCancel }) {
  const direccionInputRef = useRef(null);
  const [formData, setFormData] = useState({
    nombre: "",
    rut: "",
    telefono: "",
    direccion: "",
    latitud: -33.4489, // Default Santiago
    longitud: -70.6693
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
      }
    );
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
    setErrorMsg("");
    
    // CA-6 Validaciones de campos obligatorios
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
      // La tabla `clientes` NO tiene columnas latitud/longitud,
      // por lo que solo enviamos las columnas reales del schema.
      const payload = {
        nombre: formData.nombre,
        rut: formData.rut,
        contacto_telefono: formData.telefono,
        direccion: formData.direccion,
      };

      if (clienteInicial && clienteInicial.id) {
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
      alert("❌ " + err.message);
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
    <div style={base.container} className="client-form-card operator-glass-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{...base.title, marginBottom: 0}} className="client-form-title">
          {clienteInicial ? "✏️ Editar Cliente" : "👤 Registrar Nuevo Cliente"}
        </div>
        {onCancel && (
          <button type="button" onClick={onCancel} style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '14px' }}>
            ✖ Cerrar
          </button>
        )}
      </div>

      {errorMsg && (
        <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.5)', color: '#FCA5A5', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
          ⚠️ {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
        
        <label style={base.label} className="client-form-label">Nombre Cliente o Empresa</label>
        <input 
          style={base.input}
          placeholder="Ej: Logística SpA" 
          value={formData.nombre}
          onChange={(e) => setFormData({...formData, nombre: e.target.value})}
          required
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div>
            <label style={base.label} className="client-form-label">RUT</label>
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
            <label style={base.label} className="client-form-label">Teléfono</label>
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

        <label style={base.label} className="client-form-label">Dirección Base</label>
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

        <label style={base.label} className="client-form-label">Ubicación Exacta de Entrega</label>
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