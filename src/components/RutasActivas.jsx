import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabaseClient";

const MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

const base = {
  container: {
    minHeight: "100vh",
    background: "#0a0e1a",
    color: "#fff",
    padding: "20px",
    fontFamily: "'Syne', 'DM Mono', sans-serif",
  },
  card: {
    background: "#111827",
    border: "1px solid #1e2a3a",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "20px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
  },
  title: {
    fontSize: "18px",
    fontWeight: 600,
    color: "#60A5FA",
    marginBottom: "16px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "14px",
  },
  th: {
    textAlign: "left",
    padding: "10px",
    borderBottom: "1px solid #1e2a3a",
    color: "#94A3B8",
    fontSize: "13px",
    fontWeight: 600,
    background: "#0F172A",
  },
  td: {
    padding: "12px 10px",
    borderBottom: "1px solid #1e2a3a",
    fontSize: "13px",
    color: "#e2e8f0"
  },
  badge: {
    display: "inline-block",
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "11px",
    fontWeight: 600,
    background: "#2563EB",
    color: "#DBEAFE",
  },
  mapContainer: {
    width: "100%",
    height: "350px",
    borderRadius: "8px",
    border: "1px solid #1e2a3a",
    background: "#0F172A",
    marginTop: "20px",
    position: "relative",
    overflow: "hidden"
  }
};

export default function RutasActivas() {
  const [rutas, setRutas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const markersRef = useRef([]);

  // Cargar Google Maps
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
      script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}&libraries=marker&v=beta`;
      script.async = true;
      script.defer = true;
      script.onload = () => setMapLoaded(true);
      document.head.appendChild(script);
    }
  }, []);

  // Cargar Rutas
  useEffect(() => {
    async function cargarRutasEnCurso() {
      setLoading(true);
      // Rutas asignadas (conductor_id is not null) y que no estén entregadas
      const { data, error } = await supabase
        .from("rutas")
        .select(`
          id, origen, destino, estado, created_at,
          clientes(nombre), 
          conductores(usuario_id, rut, usuarios(nombre)),
          camiones(patente)
        `)
        .not("conductor_id", "is", null) 
        .neq("estado", "ENTREGADO")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error cargando rutas activas:", error);
      }

      if (!error && data) {
        setRutas(data);
      }
      setLoading(false);
    }
    cargarRutasEnCurso();
  }, []);

  // Inicializar o actualizar marcadores en el mapa
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || rutas.length === 0) return;

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

    // Limpiar marcadores viejos
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

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
          icon: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
        });
        
        const info = new window.google.maps.InfoWindow({
          content: `<div style="color:#000;padding:5px;"><b>${ruta.clientes?.nombre || "Desconocido"}</b><br/>🚚 Camión: ${ruta.camiones?.patente || "S/A"}<br/>⏳ Estado: ${ruta.estado || "En Ruta"}</div>`
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
    <div style={base.container}>
      <div style={base.card}>
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
                        <span style={{color: "#94A3B8"}}>#{String(ruta.id).substring(0, 8)}</span>
                      </td>
                      <td style={base.td}>
                        <div style={{fontWeight: 500}}>{ruta.clientes?.nombre || "Sin Asignar"}</div>
                        <div style={{fontSize: "11px", color: "#94A3B8", marginTop: "4px"}}>🛑 {ruta.destino}</div>
                      </td>
                      <td style={base.td}>
                        <div style={{fontWeight: 500}}>🚚 {ruta.camiones?.patente || "-"}</div>
                        <div style={{fontSize: "11px", color: "#94A3B8", marginTop: "4px"}}>
                          👤 {ruta.conductores?.usuarios?.nombre || ruta.conductores?.rut || "N/A"}
                        </div>
                      </td>
                      <td style={base.td}>
                        {ruta.created_at ? new Date(ruta.created_at).toLocaleString('es-CL', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : "N/A"}
                      </td>
                      <td style={base.td}>
                        <span style={{...base.badge, background: ruta.estado === "PENDIENTE" ? "#F59E0B" : "#2563EB", color: "#fff"}}>
                          {ruta.estado === "PENDIENTE" ? "⏳" : "🚛"} {ruta.estado || "EN CURSO"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mapa de Destinos */}
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