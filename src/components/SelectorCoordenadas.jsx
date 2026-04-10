import React, { useEffect, useRef, useState } from "react";

const MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

export default function SelectorCoordenadas({ latInicial, lngInicial, onSelectUbicacion }) {
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!MAPS_API_KEY) {
      setError("No se encontró la API Key de Google Maps");
      return;
    }
    if (window.google?.maps) {
      setMapLoaded(true);
      return;
    }

    const scriptId = "google-maps-script";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}&libraries=marker&v=beta`;
      script.async = true;
      script.defer = true;
      script.onload = () => setMapLoaded(true);
      script.onerror = () => setError("Error cargando Google Maps");
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;

    const centro = { 
      lat: Number(latInicial) || -33.4489, 
      lng: Number(lngInicial) || -70.6693 
    };

    const map = new window.google.maps.Map(mapRef.current, {
      center: centro,
      zoom: 14,
      mapTypeId: "roadmap",
      styles: [
        { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
      ],
      disableDefaultUI: false,
    });

    markerRef.current = new window.google.maps.Marker({
      position: centro,
      map: map,
      draggable: true,
      animation: window.google.maps.Animation.DROP
    });

    // Evento de arrastre de marcador
    markerRef.current.addListener("dragend", () => {
      const position = markerRef.current.getPosition();
      onSelectUbicacion({
        lat: position.lat(),
        lng: position.lng()
      });
    });

    // Evento click en mapa
    map.addListener("click", (e) => {
      const pos = e.latLng;
      markerRef.current.setPosition(pos);
      onSelectUbicacion({
        lat: pos.lat(),
        lng: pos.lng()
      });
    });
  }, [mapLoaded, latInicial, lngInicial, onSelectUbicacion]);

  if (error) {
    return <div style={{ color: "#ef4444", fontSize: "12px", padding: "10px", background: "#7f1d1d20", borderRadius: "8px" }}>{error}</div>;
  }

  return (
    <div style={{ marginTop: "10px", marginBottom: "16px" }}>
      <p style={{ fontSize: "12px", color: "#94A3B8", marginBottom: "8px" }}>
        📍 Arrastra el pin rojo o haz clic en el mapa para establecer la ubicación exacta.
      </p>
      <div 
        ref={mapRef} 
        style={{ 
          width: "100%", 
          height: "300px", 
          borderRadius: "8px", 
          border: "1px solid #1e2a3a",
          background: "#0F172A"
        }} 
      >
        {!mapLoaded && (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#60A5FA" }}>
            Cargando mapa...
          </div>
        )}
      </div>
    </div>
  );
}