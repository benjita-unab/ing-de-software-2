// src/components/MapView.jsx
import React, { useEffect, useRef, useState } from "react";

const MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

const DEFAULT_CENTER = { lat: -33.4489, lng: -70.6693 };
const DEFAULT_ZOOM   = 11;

export default function MapView({ alerts, focusedAlert }) {
  const mapRef       = useRef(null);
  const googleMapRef = useRef(null);
  const markersRef   = useRef({});
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError]   = useState(false);

  useEffect(() => {
    if (!MAPS_API_KEY) { setMapError(true); return; }
    if (window.google?.maps) { setMapLoaded(true); return; }

    const scriptId = "google-maps-script";
    if (!document.getElementById(scriptId)) {
      const script    = document.createElement("script");
      script.id       = scriptId;
      script.src      = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}&libraries=marker`;
      script.async    = true;
      script.defer    = true;
      script.onload   = () => setMapLoaded(true);
      script.onerror  = () => setMapError(true);
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (!mapLoaded || !mapRef.current || googleMapRef.current) return;
    googleMapRef.current = new window.google.maps.Map(mapRef.current, {
      center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM,
      mapTypeId: "roadmap", styles: DARK_MAP_STYLE,
      disableDefaultUI: false, zoomControl: true,
      mapTypeControl: false, streetViewControl: false, fullscreenControl: true,
    });
  }, [mapLoaded]);

  useEffect(() => {
    if (!googleMapRef.current || !mapLoaded) return;
    const activeIds = new Set();

    alerts.forEach((alert) => {
      if (!alert.lat || !alert.lng) return;
      activeIds.add(String(alert.id));
      const position   = { lat: alert.lat, lng: alert.lng };
      const isCritical = ["CRITICA", "ALTA"].includes(alert.priority);

      if (markersRef.current[alert.id]) {
        markersRef.current[alert.id].setPosition(position);
      } else {
        const marker = new window.google.maps.Marker({
          position, map: googleMapRef.current,
          title: `${alert.driver_name} — ${alert.vehicle_plate}`,
          icon: {
            path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: isCritical ? 8 : 6,
            fillColor: isCritical ? "#ff1744" : "#1565c0",
            fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2,
          },
          animation: isCritical ? window.google.maps.Animation.BOUNCE : null,
        });

        const infoWindow = new window.google.maps.InfoWindow({
          content: buildInfoWindowContent(alert),
        });
        marker.addListener("click", () => {
          infoWindow.open(googleMapRef.current, marker);
        });
        markersRef.current[alert.id] = marker;
      }
    });

    Object.keys(markersRef.current).forEach((id) => {
      if (!activeIds.has(id)) {
        markersRef.current[id].setMap(null);
        delete markersRef.current[id];
      }
    });
  }, [alerts, mapLoaded]);

  useEffect(() => {
    if (!focusedAlert || !googleMapRef.current || !mapLoaded) return;
    if (!focusedAlert.lat || !focusedAlert.lng) return;

    googleMapRef.current.panTo({ lat: focusedAlert.lat, lng: focusedAlert.lng });
    googleMapRef.current.setZoom(15);

    const marker = markersRef.current[focusedAlert.id];
    if (marker) {
      marker.setAnimation(window.google.maps.Animation.BOUNCE);
      setTimeout(() => marker.setAnimation(null), 3000);
    }
  }, [focusedAlert, mapLoaded]);

  if (mapError) {
    return (
      <div style={errorContainerStyle}>
        <div style={{ fontSize: "32px", marginBottom: "12px" }}>🗺️</div>
        <p style={{ color: "#ff6b6b", fontWeight: 700, margin: "0 0 8px" }}>
          Google Maps no está configurado
        </p>
        <p style={{ color: "#888", fontSize: "12px", margin: 0, maxWidth: "260px", textAlign: "center" }}>
          Agrega <code style={{ color: "#ffd54f" }}>REACT_APP_GOOGLE_MAPS_API_KEY</code> en tu .env y recarga.
        </p>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
      {mapLoaded && <MapLegend alerts={alerts} />}
      {focusedAlert && (
        <div style={focusBannerStyle}>
          🎯 Enfocando: <strong>{focusedAlert.driver_name}</strong> — {focusedAlert.vehicle_plate}
        </div>
      )}
    </div>
  );
}

function MapLegend({ alerts }) {
  const critical = alerts.filter((a) => ["CRITICA", "ALTA"].includes(a.priority) && a.status !== "RESUELTA").length;
  const active   = alerts.filter((a) => a.status !== "RESUELTA").length;
  return (
    <div style={{
      position: "absolute", top: "12px", left: "12px",
      background: "#0a0e1acc", backdropFilter: "blur(12px)",
      border: "1px solid #1e2a3a", borderRadius: "10px",
      padding: "10px 14px", fontSize: "12px", color: "#ccc", pointerEvents: "none",
    }}>
      <div style={{ fontWeight: 700, color: "#fff", marginBottom: "6px", fontFamily: "'Syne', sans-serif" }}>
        📡 Camiones en mapa
      </div>
      <div style={{ display: "flex", gap: "14px" }}>
        <LegendItem color="#ff1744" label={`${critical} críticas`} />
        <LegendItem color="#1565c0" label={`${active - critical} normales`} />
      </div>
    </div>
  );
}

function LegendItem({ color, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
      <div style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
      <span>{label}</span>
    </div>
  );
}

function buildInfoWindowContent(alert) {
  return `
    <div style="font-family:sans-serif;padding:4px;min-width:180px;">
      <strong style="color:#c62828">${alert.alert_type === "BOTON_PANICO" ? "🚨 PÁNICO" : "⚠️ DESVÍO"}</strong>
      <hr style="border-color:#eee;margin:6px 0"/>
      <div><b>Conductor:</b> ${alert.driver_name ?? "—"}</div>
      <div><b>Patente:</b> ${alert.vehicle_plate ?? "—"}</div>
      <div><b>Estado:</b> ${alert.status}</div>
    </div>
  `;
}

const errorContainerStyle = {
  width: "100%", height: "100%", display: "flex", flexDirection: "column",
  alignItems: "center", justifyContent: "center", background: "#0a0e1a", color: "#fff",
};

const focusBannerStyle = {
  position: "absolute", bottom: "16px", left: "50%", transform: "translateX(-50%)",
  background: "#1a0800ee", border: "1px solid #ff6d00", borderRadius: "20px",
  padding: "7px 18px", color: "#ffb347", fontSize: "12px",
  backdropFilter: "blur(8px)", whiteSpace: "nowrap",
};

const DARK_MAP_STYLE = [
  { elementType: "geometry",            stylers: [{ color: "#1d2c4d" }] },
  { elementType: "labels.text.fill",    stylers: [{ color: "#8ec3b9" }] },
  { elementType: "labels.text.stroke",  stylers: [{ color: "#1a3646" }] },
  { featureType: "road", elementType: "geometry",          stylers: [{ color: "#304a7d" }] },
  { featureType: "road", elementType: "labels.text.fill",  stylers: [{ color: "#98a5be" }] },
  { featureType: "water", elementType: "geometry",         stylers: [{ color: "#0e1626" }] },
  { featureType: "poi",     stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "administrative", elementType: "labels.text.fill", stylers: [{ color: "#444" }] },
];
