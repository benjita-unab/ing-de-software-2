import React, { useEffect, useState, useRef } from "react";
import { apiFetch } from "../lib/apiClient";

const MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

const base = {
  container: {
    minHeight: "100%",
    background: "transparent",
    color: "#fff",
    padding: "10px",
    fontFamily: "'Inter', 'Poppins', sans-serif",
    overflow: "auto",
  },
  card: {
    background: "rgba(8,8,12,0.72)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "16px",
    padding: "18px",
    marginBottom: "14px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
    backdropFilter: "blur(8px)",
  },
  title: {
    fontSize: "16px",
    fontWeight: 800,
    color: "#fff",
    marginBottom: "16px",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "14px",
  },
  th: {
    textAlign: "left",
    padding: "12px",
    borderBottom: "1px solid rgba(255,255,255,0.12)",
    color: "rgba(255,255,255,0.75)",
    fontSize: "14px",
    fontWeight: 600,
    background: "rgba(255,255,255,0.03)",
  },
  td: {
    padding: "14px 12px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    fontSize: "15px",
    color: "#e2e8f0",
  },
  badge: {
    display: "inline-block",
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "11px",
    fontWeight: 600,
    background: "rgba(58,12,163,0.45)",
    color: "#ffffff",
    border: "1px solid rgba(76,201,240,0.45)",
  },
  mapContainer: {
    width: "100%",
    height: "350px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(8,8,12,0.7)",
    marginTop: "20px",
    position: "relative",
    overflow: "hidden",
  },
};

const ESTADOS_FINALIZADOS = new Set([
  "ENTREGADO",
  "ENTREGADA",
  "CANCELADO",
  "CANCELADA",
]);

export default function RutasActivas() {
  const [rutas, setRutas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (!MAPS_API_KEY) return;
    if (window.google?.maps) {
      setMapLoaded(true);
      return;
    }
    const scriptId = "google-maps-script";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}&v=weekly`;
      script.async = true;
      script.defer = true;
      script.onload = () => setMapLoaded(true);
      document.head.appendChild(script);
    }
  }, []);

  const cargarRutasEnCurso = async () => {
    setLoading(true);

    const res = await apiFetch("/api/rutas");

    if (!res.ok) {
      console.error("Error cargando rutas activas:", res.error);
      setRutas([]);
      setLoading(false);
      return;
    }

    const payload = res.data;
    const lista = Array.isArray(payload) ? payload : payload?.data ?? [];

    const activas = lista.filter((ruta) => {
      const estado = String(ruta?.estado || "").toUpperCase();
      const tieneConductor =
        ruta?.conductor_id != null || ruta?.conductores != null;
      return tieneConductor && !ESTADOS_FINALIZADOS.has(estado);
    });

    setRutas(activas);
    setLoading(false);
  };

  useEffect(() => {
    cargarRutasEnCurso();
  }, []);

  // Marcadores en el mapa. El backend `GET /api/rutas` no expone lat/lng del
  // cliente; sólo se renderizan marcadores cuando algún endpoint futuro los
  // incluya o si el objeto ya viene enriquecido. Si no hay coordenadas, se
  // mantiene el mapa centrado en Santiago como fallback visual.
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;

    if (!googleMapRef.current) {
      googleMapRef.current = new window.google.maps.Map(mapRef.current, {
        center: { lat: -33.4489, lng: -70.6693 },
        zoom: 11,
        mapTypeId: "roadmap",
        styles: [
          { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
          { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
          { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
        ],
        disableDefaultUI: false,
      });
    }

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    if (rutas.length === 0) return;

    const bounds = new window.google.maps.LatLngBounds();
    let hasValidCoords = false;

    rutas.forEach((ruta) => {
      const lat = ruta.clientes?.latitud;
      const lng = ruta.clientes?.longitud;

      if (lat && lng) {
        hasValidCoords = true;
        const pos = { lat: Number(lat), lng: Number(lng) };
        const marker = new window.google.maps.Marker({
          position: pos,
          map: googleMapRef.current,
          title: `🚜 Destino: ${ruta.clientes?.nombre || "Cliente"} (${ruta.estado})`,
          icon: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
        });

        const info = new window.google.maps.InfoWindow({
          content: `<div style="color:#000;padding:5px;"><b>${ruta.clientes?.nombre || "Desconocido"}</b><br/>🚚 Camión: ${ruta.camiones?.patente || "S/A"}<br/>⏳ Estado: ${ruta.estado || "En Ruta"}</div>`,
        });

        marker.addListener("click", () => {
          info.open(googleMapRef.current, marker);
        });

        markersRef.current.push(marker);
        bounds.extend(pos);
      }
    });

    if (hasValidCoords) {
      googleMapRef.current.fitBounds(bounds);
    }
  }, [mapLoaded, rutas]);

  return (
    <div style={base.container} className="premium-scroll operator-section">
      <div style={base.card} className="operator-glass-card">
        <div style={base.title}>📍 Rutas Activas (En Curso)</div>

        {loading ? (
          <p style={{ color: "#94A3B8", fontSize: "14px" }}>Cargando rutas en curso...</p>
        ) : rutas.length === 0 ? (
          <p style={{ color: "#94A3B8", fontSize: "14px" }}>No hay rutas en curso en este momento.</p>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table style={base.table}>
                <thead>
                  <tr>
                    <th style={base.th}>ID</th>
                    <th style={base.th}>Cliente / Destino</th>
                    <th style={base.th}>Vehículo / Conductor</th>
                    <th style={base.th}>Inicio</th>
                    <th style={base.th}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {rutas.map((ruta) => (
                    <tr key={ruta.id}>
                      <td style={base.td}>
                        <span style={{ color: "#94A3B8" }}>#{String(ruta.id).substring(0, 8)}</span>
                      </td>
                      <td style={base.td}>
                        <div style={{ fontWeight: 500 }}>{ruta.clientes?.nombre || "Sin Asignar"}</div>
                        <div style={{ fontSize: "13px", color: "#94A3B8", marginTop: "4px" }}>🛑 {ruta.destino}</div>
                      </td>
                      <td style={base.td}>
                        <div style={{ fontWeight: 500 }}>🚚 {ruta.camiones?.patente || "-"}</div>
                        <div style={{ fontSize: "13px", color: "#94A3B8", marginTop: "4px" }}>
                          👤 {ruta.conductores?.usuarios?.nombre || ruta.conductores?.rut || "N/A"}
                        </div>
                      </td>
                      <td style={base.td}>
                        {(() => {
                          const fecha = ruta.fecha_inicio || ruta.created_at;
                          return fecha
                            ? new Date(fecha).toLocaleString("es-CL", {
                                hour: "2-digit",
                                minute: "2-digit",
                                day: "2-digit",
                                month: "short",
                              })
                            : "N/A";
                        })()}
                      </td>
                      <td style={base.td}>
                        <span style={{ ...base.badge, background: ruta.estado === "PENDIENTE" ? "#F59E0B" : "#2563EB", color: "#fff" }}>
                          {ruta.estado === "PENDIENTE" ? "⏳" : "🚛"} {ruta.estado || "EN CURSO"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={base.mapContainer} ref={mapRef}>
              {!mapLoaded && (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#60A5FA" }}>
                  Verificando Google Maps...
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
