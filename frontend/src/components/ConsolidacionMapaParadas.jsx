import React, { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { geocodeAddresses } from "../lib/mapGeocoding";
import {
  buildConsolidacionMapView,
  fetchMaestraPolyline,
} from "../lib/consolidacionMapRoute";
import { isGoogleMapsConfigured, loadGoogleMaps } from "../lib/googleMapsLoader";

const REGION_CENTER = { lat: -33.12, lng: -71.35 };
const REGION_ZOOM = 8;

const TIPO_COLOR = {
  origen: "#34d399",
  destino: "#60a5fa",
  parada: "#f59e0b",
};

const ROUTE_MAESTRA = {
  strokeColor: "#7c6cf6",
  strokeOpacity: 0.9,
  strokeWeight: 4,
};

function buildDotIcon(color, size = 8) {
  return {
    path: window.google?.maps?.SymbolPath?.CIRCLE,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: 2,
    scale: size,
  };
}

function triggerMapResize(map) {
  if (!map || !window.google?.maps?.event) return;
  window.google.maps.event.trigger(map, "resize");
}

function extendBounds(bounds, coords) {
  if (!coords || !bounds) return;
  bounds.extend(coords);
}

/**
 * Mapa de contexto de consolidación: polilínea única de la ruta maestra + marcadores del grupo.
 */
export default function ConsolidacionMapaParadas({
  paradas = [],
  rutaMaestraId = null,
}) {
  const stageRef = useRef(null);
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const markersRef = useRef([]);
  const polylineRef = useRef(null);
  const [apiState, setApiState] = useState("loading");
  const [mapView, setMapView] = useState({ markers: [], maestraRouteStops: [] });
  const [maestraPath, setMaestraPath] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function resolverParadas() {
      if (!paradas.length) {
        setMapView({ markers: [], maestraRouteStops: [] });
        return;
      }

      const sinCoords = paradas.filter(
        (p) =>
          (p.latitud == null || p.longitud == null) &&
          String(p.direccion ?? "").trim(),
      );
      const direcciones = [
        ...new Set(sinCoords.map((p) => String(p.direccion).trim()).filter(Boolean)),
      ];
      const geocodeMap = direcciones.length
        ? await geocodeAddresses(direcciones)
        : {};

      if (!cancelled) {
        setMapView(
          buildConsolidacionMapView(paradas, geocodeMap, rutaMaestraId),
        );
      }
    }

    resolverParadas();
    return () => {
      cancelled = true;
    };
  }, [paradas, rutaMaestraId]);

  useEffect(() => {
    if (!isGoogleMapsConfigured()) {
      setApiState("error");
      return;
    }

    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (!cancelled) setApiState("ready");
      })
      .catch(() => {
        if (!cancelled) setApiState("error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (apiState !== "ready" || mapView.maestraRouteStops.length < 2) {
      setMaestraPath(null);
      return;
    }

    let cancelled = false;

    fetchMaestraPolyline(mapView.maestraRouteStops).then((path) => {
      if (!cancelled) setMaestraPath(path);
    });

    return () => {
      cancelled = true;
    };
  }, [apiState, mapView.maestraRouteStops]);

  useEffect(() => {
    if (apiState !== "ready" || !mapRef.current) return;

    if (!googleMapRef.current) {
      googleMapRef.current = new window.google.maps.Map(mapRef.current, {
        center: REGION_CENTER,
        zoom: REGION_ZOOM,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
      requestAnimationFrame(() => triggerMapResize(googleMapRef.current));
    }

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    const maestraBounds = new window.google.maps.LatLngBounds();
    let hasMaestraPoint = false;

    mapView.maestraRouteStops.forEach((punto) => {
      if (!punto.coords) return;
      hasMaestraPoint = true;
      extendBounds(maestraBounds, punto.coords);
    });

    if (maestraPath?.length) {
      maestraPath.forEach((pt) => {
        hasMaestraPoint = true;
        extendBounds(maestraBounds, pt);
      });

      polylineRef.current = new window.google.maps.Polyline({
        path: maestraPath,
        geodesic: true,
        map: googleMapRef.current,
        zIndex: 22,
        ...ROUTE_MAESTRA,
      });
    }

    mapView.markers.forEach((punto, idx) => {
      if (!punto.coords) return;
      const color = TIPO_COLOR[punto.tipo] || "#94a3b8";
      const marker = new window.google.maps.Marker({
        position: punto.coords,
        map: googleMapRef.current,
        icon: buildDotIcon(color, punto.tipo === "parada" ? 6 : 7),
        title: `${punto.tipo}: ${punto.direccion}`,
        zIndex: 50 + idx,
      });
      markersRef.current.push(marker);
    });

    if (hasMaestraPoint) {
      googleMapRef.current.fitBounds(maestraBounds, 48);
    } else if (mapView.markers.some((m) => m.coords)) {
      const fallbackBounds = new window.google.maps.LatLngBounds();
      mapView.markers.forEach((m) => extendBounds(fallbackBounds, m.coords));
      googleMapRef.current.fitBounds(fallbackBounds, 48);
    } else {
      googleMapRef.current.setCenter(REGION_CENTER);
      googleMapRef.current.setZoom(REGION_ZOOM);
    }

    requestAnimationFrame(() => triggerMapResize(googleMapRef.current));
  }, [apiState, mapView, maestraPath]);

  useEffect(() => {
    if (!stageRef.current || apiState !== "ready") return;

    const observer = new ResizeObserver(() => {
      triggerMapResize(googleMapRef.current);
    });
    observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, [apiState]);

  useEffect(() => {
    return () => {
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
      googleMapRef.current = null;
    };
  }, []);

  if (!paradas.length) {
    return (
      <div className="lt-empty" style={{ padding: 16, minHeight: 80 }}>
        Sin paradas para mostrar
      </div>
    );
  }

  if (apiState === "error") {
    return (
      <div className="lt-alert-banner lt-alert-banner--warning" role="alert">
        <MapPin size={16} style={{ marginRight: 6, verticalAlign: "middle" }} />
        Mapa no disponible. Revise REACT_APP_GOOGLE_MAPS_API_KEY.
      </div>
    );
  }

  return (
    <div className="lt-consolidacion-mapa-wrap">
      <p className="lt-list-item__sub" style={{ marginBottom: 8 }}>
        Contexto visual de la ruta maestra y paradas de pedidos consolidados.
      </p>
      <div
        ref={stageRef}
        className="lt-map-stage lt-map-stage--compact"
        aria-label="Mapa de consolidación — ruta maestra"
      >
        <div ref={mapRef} className="lt-map-canvas" />
        {apiState === "loading" && (
          <div className="lt-map-loading" style={{ minHeight: 0 }}>
            Cargando mapa…
          </div>
        )}
      </div>
      <div
        className="lt-consolidacion-mapa-leyenda"
        style={{ display: "flex", gap: 12, marginTop: 8, fontSize: "0.75rem", flexWrap: "wrap" }}
      >
        {Object.entries(TIPO_COLOR).map(([tipo, color]) => (
          <span key={tipo} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                backgroundColor: color,
                display: "inline-block",
              }}
            />
            {tipo}
          </span>
        ))}
        {maestraPath?.length > 0 && (
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span
              style={{
                width: 14,
                height: 4,
                borderRadius: 2,
                backgroundColor: ROUTE_MAESTRA.strokeColor,
                display: "inline-block",
              }}
            />
            Ruta maestra
          </span>
        )}
      </div>
    </div>
  );
}
