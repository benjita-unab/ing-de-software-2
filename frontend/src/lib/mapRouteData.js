import { isUrgentAlerta } from './alertasConductorUtils';

const TERMINAL_STATES = new Set([
  "ENTREGADO",
  "CANCELADO",
  "COMPLETADO",
  "entregado",
  "cancelada",
]);

const TRANSIT_STATES = new Set([
  "EN_TRANSITO",
  "EN_DESTINO",
  "EN_CARGA",
  "EN_CAMINO_ORIGEN",
  "ASIGNADO",
]);

export function isActiveRoute(ruta) {
  const estado = String(ruta?.estado || "").toUpperCase();
  return !TERMINAL_STATES.has(estado) && !TERMINAL_STATES.has(ruta?.estado);
}

export function isTransitRoute(ruta) {
  const estado = String(ruta?.estado || "").toUpperCase();
  return TRANSIT_STATES.has(estado);
}

export function routeProgress(estado) {
  const e = String(estado || "").toUpperCase();
  if (e === "ENTREGADO") return 100;
  if (e === "EN_DESTINO") return 85;
  if (e === "EN_TRANSITO") return 60;
  if (e === "EN_CARGA" || e === "EN_CAMINO_ORIGEN") return 30;
  if (e === "ASIGNADO") return 15;
  return 8;
}

function latestGpsForRoute(rutaId, eventosConductor) {
  const withGps = eventosConductor
    .filter(
      (m) =>
        m.ruta_id === rutaId &&
        m.latitud != null &&
        m.longitud != null &&
        Number.isFinite(Number(m.latitud)) &&
        Number.isFinite(Number(m.longitud)),
    )
    .sort((a, b) => new Date(b.timestamp_evento) - new Date(a.timestamp_evento));
  const latest = withGps[0];
  if (!latest) return null;
  return { lat: Number(latest.latitud), lng: Number(latest.longitud) };
}

function gpsFromAlert(patente, alerts) {
  if (!patente) return null;
  const match = alerts.find(
    (a) =>
      a.vehicle_plate === patente &&
      a.lat != null &&
      a.lng != null &&
      a.status !== "RESUELTA",
  );
  if (!match) return null;
  return { lat: Number(match.lat), lng: Number(match.lng) };
}

function hasConductorUrgentForRoute(rutaId, eventosConductor = []) {
  return eventosConductor.some(
    (evento) => evento.ruta_id === rutaId && isUrgentAlerta(evento),
  );
}

/**
 * Construye entidades de mapa a partir de rutas reales + geocodificación + GPS real.
 * @param {object[]} alerts - Incidencias legacy (tabla incidencias).
 * @param {object[]} eventosConductor - Eventos mensajes_conductor (GPS + urgencias HU-40).
 */
export function buildMapRoutes(rutas, geocodeMap, alerts = [], eventosConductor = []) {
  return rutas.filter(isActiveRoute).map((ruta) => {
    const origenCoords = geocodeMap[ruta.origen?.trim()] ?? null;
    const destinoCoords = geocodeMap[ruta.destino?.trim()] ?? null;
    const patente = ruta.camiones?.patente ?? null;

    const vehicleGps =
      gpsFromAlert(patente, alerts) ?? latestGpsForRoute(ruta.id, eventosConductor);

    const hasPolyline = Boolean(origenCoords && destinoCoords);
    let markerCoords = null;
    let markerType = "route";

    if (vehicleGps) {
      markerCoords = vehicleGps;
      markerType = "vehicle";
    } else if (hasPolyline) {
      markerCoords = origenCoords;
      markerType = "origin";
    } else if (origenCoords) {
      markerCoords = origenCoords;
      markerType = "origin";
    } else if (destinoCoords) {
      markerCoords = destinoCoords;
      markerType = "destination";
    }

    const hasAlert =
      alerts.some((a) => a.vehicle_plate === patente && a.status !== "RESUELTA") ||
      hasConductorUrgentForRoute(ruta.id, eventosConductor);

    return {
      id: ruta.id,
      origen: ruta.origen,
      destino: ruta.destino,
      estado: ruta.estado,
      eta: ruta.eta,
      progress: routeProgress(ruta.estado),
      cliente: ruta.clientes?.nombre ?? null,
      patente,
      conductor: ruta.conductores?.rut ?? null,
      origenCoords,
      destinoCoords,
      paradas: Array.isArray(ruta.paradas) ? ruta.paradas : [],
      vehicleGps,
      markerCoords,
      markerType,
      hasPolyline,
      hasAlert,
      inTransit: isTransitRoute(ruta),
    };
  });
}

export function buildVehicleMarkers(_camiones, mapRoutes) {
  const markers = [];
  const seen = new Set();

  mapRoutes.forEach((route) => {
    if (!route.vehicleGps || !route.patente) return;
    if (seen.has(route.patente)) return;
    seen.add(route.patente);
    markers.push({
      id: `vehicle-${route.patente}`,
      patente: route.patente,
      position: route.vehicleGps,
      routeId: route.id,
      hasAlert: route.hasAlert,
      estado: route.estado,
    });
  });

  return markers;
}

export function countMapStats(
  mapRoutes,
  camiones,
  alerts,
  vehicleMarkers = [],
  eventosConductor = [],
) {
  const gpsVehicles = vehicleMarkers.length;
  const routesOnMap = mapRoutes.filter((r) => r.markerCoords || r.hasPolyline).length;
  const inTransit = mapRoutes.filter((r) => r.inTransit).length;
  const openIncidencias = alerts.filter((a) => a.status !== "RESUELTA").length;
  const openConductorUrgent = eventosConductor.filter(isUrgentAlerta).length;
  const openAlerts = openIncidencias + openConductorUrgent;
  const activeVehicles = camiones.filter((c) =>
    String(c.estado || "").includes("RUTA"),
  ).length;

  return {
    activeRoutes: mapRoutes.length,
    vehiclesOnMap: gpsVehicles || routesOnMap || activeVehicles,
    inTransit,
    openAlerts,
  };
}
