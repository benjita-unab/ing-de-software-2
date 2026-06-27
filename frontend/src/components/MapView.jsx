import React, { useEffect, useRef, useState, useCallback } from "react";
import { MapPin, Radio, Loader2 } from "lucide-react";
import { isGoogleMapsConfigured, loadGoogleMaps } from "../lib/googleMapsLoader";
import EmptyState from "./ui/EmptyState";

/** Centro regional: Santiago · Valparaíso · Viña del Mar */
const REGION_CENTER = { lat: -33.12, lng: -71.35 };
const REGION_ZOOM = 8;
const MAX_ROUTE_ZOOM = 14;

export default function MapView({
  alerts = [],
  mapRoutes = [],
  vehicleMarkers = [],
  selectedRouteId = null,
  focusedRoute = null,
  isDark = false,
  onRouteSelect,
  overlay,
}) {
  const wrapperRef = useRef(null);
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const alertMarkersRef = useRef({});
  const routeMarkersRef = useRef({});
  const vehicleMarkersRef = useRef({});
  const focusedVehicleMarkerRef = useRef(null);
  const polylinesRef = useRef({});
  const endpointMarkersRef = useRef({});
  const rutaCentradaRef = useRef(null);
  const [panelesVisibles, setPanelesVisibles] = useState(true);
  const [apiState, setApiState] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const triggerResize = useCallback(() => {
    if (!googleMapRef.current || !window.google?.maps?.event) return;
    window.google.maps.event.trigger(googleMapRef.current, "resize");
  }, []);

  useEffect(() => {
    if (!isGoogleMapsConfigured()) {
      setApiState("error");
      setErrorMessage("REACT_APP_GOOGLE_MAPS_API_KEY no está configurada en el archivo .env del frontend.");
      return;
    }

    let cancelled = false;
    setApiState("loading");

    loadGoogleMaps()
      .then(() => {
        if (!cancelled) setApiState("ready");
      })
      .catch((err) => {
        if (!cancelled) {
          setApiState("error");
          setErrorMessage(err?.message || "No se pudo cargar Google Maps.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (apiState !== "ready" || !mapRef.current) return;

    if (!googleMapRef.current) {
      googleMapRef.current = new window.google.maps.Map(mapRef.current, {
        center: REGION_CENTER,
        zoom: REGION_ZOOM,
        mapTypeId: "roadmap",
        styles: isDark ? DARK_MAP_STYLE : LIGHT_MAP_STYLE,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });

      requestAnimationFrame(() => triggerResize());
    }
  }, [apiState, isDark, triggerResize]);

  useEffect(() => {
    if (!googleMapRef.current || apiState !== "ready") return;
    googleMapRef.current.setOptions({
      styles: isDark ? DARK_MAP_STYLE : LIGHT_MAP_STYLE,
    });
    triggerResize();
  }, [isDark, apiState, triggerResize]);

  useEffect(() => {
    if (!wrapperRef.current || apiState !== "ready") return;
    const observer = new ResizeObserver(() => triggerResize());
    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, [apiState, triggerResize]);

  /* ── Alert markers ── */
  useEffect(() => {
    if (!googleMapRef.current || apiState !== "ready") return;
    const activeIds = new Set();

    alerts.forEach((alert) => {
      if (!alert.lat || !alert.lng) return;
      const key = `alert-${alert.id}`;
      activeIds.add(key);
      const position = { lat: Number(alert.lat), lng: Number(alert.lng) };
      const isCritical = ["CRITICA", "ALTA"].includes(alert.priority);

      if (alertMarkersRef.current[key]) {
        alertMarkersRef.current[key].setPosition(position);
        alertMarkersRef.current[key].setIcon(buildAlertIcon(isCritical));
      } else {
        const marker = new window.google.maps.Marker({
          position,
          map: googleMapRef.current,
          title: `${alert.driver_name} — ${alert.vehicle_plate}`,
          icon: buildAlertIcon(isCritical),
          zIndex: isCritical ? 300 : 200,
          animation: isCritical ? window.google.maps.Animation.BOUNCE : null,
        });
        const infoWindow = new window.google.maps.InfoWindow({
          content: buildAlertInfoContent(alert),
        });
        marker.addListener("click", () => infoWindow.open(googleMapRef.current, marker));
        alertMarkersRef.current[key] = marker;
      }
    });

    Object.keys(alertMarkersRef.current).forEach((key) => {
      if (!activeIds.has(key)) {
        alertMarkersRef.current[key].setMap(null);
        delete alertMarkersRef.current[key];
      }
    });
  }, [alerts, apiState]);

  /* ── Route polylines + endpoint markers ── */
  useEffect(() => {
    if (!googleMapRef.current || apiState !== "ready") return;
    const activePolyIds = new Set();
    const activeEndpointIds = new Set();

    mapRoutes.forEach((route) => {
      const isSelected = route.id === selectedRouteId;
      const strokeColor = route.hasAlert ? "#ef4444" : isSelected ? "#5b4fd4" : "#7c6cf6";

      if (route.hasPolyline) {
        activePolyIds.add(route.id);
        const path = [route.origenCoords, route.destinoCoords];

        if (polylinesRef.current[route.id]) {
          polylinesRef.current[route.id].setPath(path);
          polylinesRef.current[route.id].setOptions({
            strokeColor,
            strokeWeight: isSelected ? 5 : 3,
            zIndex: isSelected ? 50 : 10,
          });
        } else {
          polylinesRef.current[route.id] = new window.google.maps.Polyline({
            path,
            geodesic: true,
            strokeColor,
            strokeOpacity: 0.9,
            strokeWeight: isSelected ? 5 : 3,
            map: googleMapRef.current,
            zIndex: isSelected ? 50 : 10,
          });
          polylinesRef.current[route.id].addListener("click", () => {
            onRouteSelect?.(route.id);
          });
        }

        ["origen", "destino"].forEach((kind) => {
          const coords = kind === "origen" ? route.origenCoords : route.destinoCoords;
          if (!coords) return;
          const eid = `${route.id}-${kind}`;
          activeEndpointIds.add(eid);
          const color = kind === "origen" ? "#34d399" : "#60a5fa";

          if (endpointMarkersRef.current[eid]) {
            endpointMarkersRef.current[eid].setPosition(coords);
          } else {
            endpointMarkersRef.current[eid] = new window.google.maps.Marker({
              position: coords,
              map: googleMapRef.current,
              icon: buildDotIcon(color, kind === "origen" ? 7 : 6),
              title: kind === "origen" ? route.origen : route.destino,
              zIndex: 80,
            });
            endpointMarkersRef.current[eid].addListener("click", () => {
              onRouteSelect?.(route.id);
            });
          }
        });

        (route.paradas || []).forEach((parada, idx) => {
          const lat = parada.latitud != null ? Number(parada.latitud) : null;
          const lng = parada.longitud != null ? Number(parada.longitud) : null;
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
          const eid = `${route.id}-parada-${idx}`;
          activeEndpointIds.add(eid);
          const coords = { lat, lng };

          if (endpointMarkersRef.current[eid]) {
            endpointMarkersRef.current[eid].setPosition(coords);
          } else {
            endpointMarkersRef.current[eid] = new window.google.maps.Marker({
              position: coords,
              map: googleMapRef.current,
              icon: buildDotIcon("#f59e0b", 5),
              title: parada.direccion || `Parada ${idx + 1}`,
              zIndex: 75,
            });
            endpointMarkersRef.current[eid].addListener("click", () => {
              onRouteSelect?.(route.id);
            });
          }
        });
      }

      if (route.markerCoords && !route.vehicleGps) {
        activeEndpointIds.add(`route-${route.id}`);
        const mid = `route-${route.id}`;
        if (routeMarkersRef.current[mid]) {
          routeMarkersRef.current[mid].setPosition(route.markerCoords);
          routeMarkersRef.current[mid].setIcon(buildRouteIcon(route.hasAlert, isSelected));
        } else {
          const marker = new window.google.maps.Marker({
            position: route.markerCoords,
            map: googleMapRef.current,
            icon: buildRouteIcon(route.hasAlert, isSelected),
            title: `${route.patente || "Ruta"} — ${route.origen}`,
            zIndex: isSelected ? 120 : 90,
          });
          marker.addListener("click", () => onRouteSelect?.(route.id));
          routeMarkersRef.current[mid] = marker;
        }
      } else if (routeMarkersRef.current[`route-${route.id}`]) {
        routeMarkersRef.current[`route-${route.id}`].setMap(null);
        delete routeMarkersRef.current[`route-${route.id}`];
      }
    });

    Object.keys(polylinesRef.current).forEach((id) => {
      if (!activePolyIds.has(id)) {
        polylinesRef.current[id].setMap(null);
        delete polylinesRef.current[id];
      }
    });

    Object.keys(endpointMarkersRef.current).forEach((id) => {
      if (!activeEndpointIds.has(id)) {
        endpointMarkersRef.current[id].setMap(null);
        delete endpointMarkersRef.current[id];
      }
    });

    Object.keys(routeMarkersRef.current).forEach((id) => {
      if (!activeEndpointIds.has(id)) {
        routeMarkersRef.current[id].setMap(null);
        delete routeMarkersRef.current[id];
      }
    });
  }, [mapRoutes, selectedRouteId, apiState, onRouteSelect]);

  /* ── Vehicle markers ── */
  useEffect(() => {
    if (!googleMapRef.current || apiState !== "ready") return;
    const activeIds = new Set();

    vehicleMarkers.forEach((v) => {
      if (!v.position) return;
      activeIds.add(v.id);
      const isSelected = v.routeId === selectedRouteId;

      if (vehicleMarkersRef.current[v.id]) {
        vehicleMarkersRef.current[v.id].setPosition(v.position);
        vehicleMarkersRef.current[v.id].setIcon(buildVehicleIcon(v.hasAlert, isSelected));
        vehicleMarkersRef.current[v.id].setZIndex(isSelected ? 150 : 100);
      } else {
        const marker = new window.google.maps.Marker({
          position: v.position,
          map: googleMapRef.current,
          icon: buildVehicleIcon(v.hasAlert, isSelected),
          title: v.patente,
          zIndex: isSelected ? 150 : 100,
        });
        marker.addListener("click", () => onRouteSelect?.(v.routeId));
        vehicleMarkersRef.current[v.id] = marker;
      }
    });

    Object.keys(vehicleMarkersRef.current).forEach((id) => {
      if (!activeIds.has(id)) {
        vehicleMarkersRef.current[id].setMap(null);
        delete vehicleMarkersRef.current[id];
      }
    });
  }, [vehicleMarkers, selectedRouteId, apiState, onRouteSelect]);

  /* ── Focused route live marker (from backend tracking) ── */
  useEffect(() => {
    if (!googleMapRef.current || apiState !== "ready") return;
    const fr = focusedRoute;
    if (fr && fr.vehicleGps) {
      const pos = { lat: Number(fr.vehicleGps.lat), lng: Number(fr.vehicleGps.lng) };
      if (focusedVehicleMarkerRef.current) {
        focusedVehicleMarkerRef.current.setPosition(pos);
        focusedVehicleMarkerRef.current.setIcon(buildVehicleIcon(fr.hasAlert, true));
        focusedVehicleMarkerRef.current.setZIndex(200);
      } else {
        focusedVehicleMarkerRef.current = new window.google.maps.Marker({
          position: pos,
          map: googleMapRef.current,
          icon: buildVehicleIcon(fr.hasAlert, true),
          title: fr.patente || "Vehículo",
          zIndex: 200,
        });
      }
    } else if (focusedVehicleMarkerRef.current) {
      focusedVehicleMarkerRef.current.setMap(null);
      focusedVehicleMarkerRef.current = null;
    }
  }, [focusedRoute, apiState]);

  /* ── Historial (tracking) polyline for focused route ── */
  useEffect(() => {
    if (!googleMapRef.current || apiState !== "ready") return;
    const fr = focusedRoute;
    const activeIds = new Set();
    if (fr && fr.tracking && Array.isArray(fr.tracking.historial) && fr.tracking.historial.length >= 2) {
      // Build ordered path by timestamp_evento (ascending)
      const pts = fr.tracking.historial
        .map((p) => ({
          lat: Number(p.latitud ?? p.lat ?? p.latitude),
          lng: Number(p.longitud ?? p.lng ?? p.longitude),
          ts: p.timestamp_evento ? Date.parse(String(p.timestamp_evento)) : null,
        }))
        .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));

      pts.sort((a, b) => (a.ts || 0) - (b.ts || 0));

      const path = pts.map((p) => ({ lat: p.lat, lng: p.lng }));
      const id = `tracking-${fr.id}`;
      activeIds.add(id);

      const dashSymbol = {
        path: "M 0,-1 0,1",
        strokeOpacity: 1,
        scale: 4,
      };

      if (polylinesRef.current[id]) {
        polylinesRef.current[id].setPath(path);
      } else {
        polylinesRef.current[id] = new window.google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: "#00a3ff",
          strokeOpacity: 0.9,
          strokeWeight: 3,
          map: googleMapRef.current,
          zIndex: 180,
          icons: [
            {
              icon: dashSymbol,
              offset: "0",
              repeat: "10px",
            },
          ],
        });
      }
    }

    // remove stale tracking polylines
    Object.keys(polylinesRef.current).forEach((key) => {
      if (key.startsWith("tracking-") && !activeIds.has(key)) {
        polylinesRef.current[key].setMap(null);
        delete polylinesRef.current[key];
      }
    });
  }, [focusedRoute, apiState]);

  /* ── Vista regional cuando no hay ruta seleccionada ── */
  useEffect(() => {
    if (!googleMapRef.current || apiState !== "ready") return;
    if (!selectedRouteId) {
      rutaCentradaRef.current = null;
      googleMapRef.current.setCenter(REGION_CENTER);
      googleMapRef.current.setZoom(REGION_ZOOM);
    }
  }, [selectedRouteId, apiState]);

  /* ── Encuadrar ruta seleccionada (origen, destino, GPS) ── */
  useEffect(() => {
    if (!focusedRoute || !googleMapRef.current || apiState !== "ready") return;
    if (rutaCentradaRef.current === focusedRoute.id) return;

    const bounds = new window.google.maps.LatLngBounds();
    let hasPoint = false;

    if (focusedRoute.origenCoords) {
      bounds.extend(focusedRoute.origenCoords);
      hasPoint = true;
    }
    if (focusedRoute.destinoCoords) {
      bounds.extend(focusedRoute.destinoCoords);
      hasPoint = true;
    }
    if (focusedRoute.vehicleGps) {
      bounds.extend(focusedRoute.vehicleGps);
      hasPoint = true;
    } else if (focusedRoute.markerCoords) {
      bounds.extend(focusedRoute.markerCoords);
      hasPoint = true;
    }

    if (!hasPoint) return;

    const map = googleMapRef.current;

    if (focusedRoute.hasPolyline || hasMultipleBoundsPoints(bounds)) {
      map.fitBounds(bounds, 72);
      window.google.maps.event.addListenerOnce(map, "idle", () => {
        if (map.getZoom() > MAX_ROUTE_ZOOM) {
          map.setZoom(MAX_ROUTE_ZOOM);
        }
      });
    } else {
      map.panTo(bounds.getCenter());
      map.setZoom(Math.min(12, MAX_ROUTE_ZOOM));
    }

    rutaCentradaRef.current = focusedRoute.id;
  }, [focusedRoute, apiState]);

  if (apiState === "error") {
    return (
      <div className="lt-map-stage lt-map-stage--hero" ref={wrapperRef}>
        <EmptyState icon={MapPin} title="Mapa no disponible" description={errorMessage}>
          <p className="lt-empty-state__hint">
            Verifica <code>REACT_APP_GOOGLE_MAPS_API_KEY</code> y que Maps JavaScript API esté habilitada en Google Cloud.
          </p>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="lt-map-stage lt-map-stage--hero" ref={wrapperRef}>
      <div ref={mapRef} className="lt-map-canvas" />
      {apiState === "loading" && (
        <div className="lt-map-loading">
          <Loader2 size={28} className="lt-map-loading__spin" />
          <span>Cargando mapa...</span>
        </div>
      )}
      {apiState === "ready" && (
        <button
          type="button"
          onClick={() => setPanelesVisibles((prev) => !prev)}
          style={{
            position: "absolute",
            top: 12,
            right: 60,
            zIndex: 420,
            background: "rgba(255,255,255,0.92)",
            border: "1px solid rgba(15,23,42,0.08)",
            borderRadius: 999,
            padding: "6px 10px",
            fontSize: 12,
            color: "#111827",
            boxShadow: "0 10px 24px rgba(15,23,42,0.12)",
            cursor: "pointer",
          }}
        >
          {panelesVisibles ? "Ocultar paneles" : "Mostrar paneles"}
        </button>
      )}
      {apiState === "ready" && panelesVisibles && <MapLegend />}
      {apiState === "ready" && panelesVisibles && overlay}
    </div>
  );
}

function hasMultipleBoundsPoints(bounds) {
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();
  return Math.abs(ne.lat() - sw.lat()) > 0.0001 || Math.abs(ne.lng() - sw.lng()) > 0.0001;
}

function buildDotIcon(color, scale) {
  return {
    path: window.google.maps.SymbolPath.CIRCLE,
    scale,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: "#fff",
    strokeWeight: 2,
  };
}

function buildRouteIcon(hasAlert, selected) {
  return {
    path: window.google.maps.SymbolPath.CIRCLE,
    scale: selected ? 10 : 8,
    fillColor: hasAlert ? "#ef4444" : "#7c6cf6",
    fillOpacity: 1,
    strokeColor: "#fff",
    strokeWeight: selected ? 3 : 2,
  };
}

function buildVehicleIcon(hasAlert, selected) {
  return {
    path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
    scale: selected ? 9 : 7,
    fillColor: hasAlert ? "#ef4444" : "#7c6cf6",
    fillOpacity: 1,
    strokeColor: "#fff",
    strokeWeight: 2,
    rotation: 0,
  };
}

function buildAlertIcon(isCritical) {
  return {
    path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
    scale: isCritical ? 9 : 7,
    fillColor: isCritical ? "#ef4444" : "#f59e0b",
    fillOpacity: 1,
    strokeColor: "#fff",
    strokeWeight: 2,
  };
}

function MapLegend() {
  return (
    <div className="lt-map-legend">
      <div className="lt-map-legend__title">
        <Radio size={14} />
        Leyenda
      </div>
      <div className="lt-map-legend__items">
        <LegendItem color="#7c6cf6" label="Vehículo / ruta" />
        <LegendItem color="#34d399" label="Origen" />
        <LegendItem color="#60a5fa" label="Destino" />
        <LegendItem color="#ef4444" label="Alerta" />
      </div>
    </div>
  );
}

function LegendItem({ color, label }) {
  return (
    <div className="lt-map-legend__item">
      <span className="lt-map-legend__dot" style={{ background: color }} />
      <span>{label}</span>
    </div>
  );
}

function buildAlertInfoContent(alert) {
  const typeLabel =
    alert.alert_type === "BOTON_PANICO" ? "PÁNICO" : alert.alert_type || "ALERTA";
  const typeColor = alert.alert_type === "BOTON_PANICO" ? "#ef4444" : "#7c6cf6";
  return `
    <div style="font-family:Inter,sans-serif;padding:8px;min-width:200px;">
      <strong style="color:${typeColor};font-size:12px;">${typeLabel}</strong>
      <hr style="border-color:#eee;margin:8px 0"/>
      <div style="font-size:12px;margin-bottom:4px;"><b>Conductor:</b> ${alert.driver_name ?? "—"}</div>
      <div style="font-size:12px;margin-bottom:4px;"><b>Patente:</b> ${alert.vehicle_plate ?? "—"}</div>
      <div style="font-size:12px;"><b>Estado:</b> ${alert.status}</div>
    </div>
  `;
}

const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#1d2c4d" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8ec3b9" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a3646" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#304a7d" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#98a5be" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e1626" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
];

const LIGHT_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#e8e4dc" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#523735" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f1e6" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#fdfcf8" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#f8c967" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#b36000" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#a2daf2" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
];
