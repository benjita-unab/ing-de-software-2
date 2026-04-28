import React, { useCallback, useEffect, useRef, useState } from "react";

const MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

export default function SelectorCoordenadas({
  latInicial,
  lngInicial,
  onSelectUbicacion,
  onAddressResolved,
}) {
  const mapElementRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const geocoderRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState("");

  const reverseGeocode = useCallback((lat, lng) => {
    if (!geocoderRef.current || !onAddressResolved) return;
    geocoderRef.current.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === "OK" && results?.[0]?.formatted_address) {
        onAddressResolved(results[0].formatted_address);
      }
    });
  }, [onAddressResolved]);

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
      script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}&libraries=places&v=weekly`;
      script.async = true;
      script.defer = true;
      script.onload = () => setMapLoaded(true);
      script.onerror = () => setError("Error cargando Google Maps");
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (!mapLoaded || !mapElementRef.current) return;

    try {
      const centro = { lat: Number(latInicial) || -33.4489, lng: Number(lngInicial) || -70.6693 };

      if (!mapInstanceRef.current) {
        mapInstanceRef.current = new window.google.maps.Map(mapElementRef.current, {
          center: centro,
          zoom: 14,
          mapTypeId: "roadmap",
          disableDefaultUI: false,
        });
      }

      if (!geocoderRef.current) {
        geocoderRef.current = new window.google.maps.Geocoder();
      }

      if (!markerRef.current) {
        markerRef.current = new window.google.maps.Marker({
          position: centro,
          map: mapInstanceRef.current,
          draggable: true,
          animation: window.google.maps.Animation.DROP,
        });

        markerRef.current.addListener("dragend", () => {
          const position = markerRef.current.getPosition();
          const lat = position.lat();
          const lng = position.lng();

          onSelectUbicacion({ lat, lng });
          reverseGeocode(lat, lng);
        });

        mapInstanceRef.current.addListener("click", (e) => {
          const pos = e.latLng;
          markerRef.current.setPosition(pos);
          const lat = pos.lat();
          const lng = pos.lng();
          onSelectUbicacion({ lat, lng });
          reverseGeocode(lat, lng);
        });
      }

      markerRef.current.setPosition(centro);
      mapInstanceRef.current.panTo(centro);
    } catch (err) {
      console.error("Error inicializando Google Maps:", err);
      setError("No fue posible inicializar Google Maps. Verifica APIs habilitadas y la API key.");
    }
  }, [mapLoaded, latInicial, lngInicial, onSelectUbicacion, reverseGeocode]);

  if (error) {
    return <div style={{ color: "#ef4444", fontSize: "12px", padding: "10px", background: "#7f1d1d20", borderRadius: "8px" }}>{error}</div>;
  }

  return (
    <div style={{ marginTop: "10px", marginBottom: "16px" }} className="coord-selector">
      <p style={{ fontSize: "12px", color: "#94A3B8", marginBottom: "8px" }}>
        📍 Arrastra el pin rojo o haz clic en el mapa para establecer la ubicación exacta.
      </p>
      <div 
        className="coord-map-container"
        ref={mapElementRef}
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