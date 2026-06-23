/**
 * HU-59: utilidades visuales del mapa de consolidación.
 * Una sola polilínea (ruta maestra). Marcadores de contexto del grupo consolidado.
 */

const MAX_WAYPOINTS = 23;

function resolveStop(p, geocodeMap = {}) {
  const direccion = String(p.direccion ?? "").trim();
  let coords = null;

  if (p.latitud != null && p.longitud != null) {
    const lat = Number(p.latitud);
    const lng = Number(p.longitud);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      coords = { lat, lng };
    }
  } else if (direccion && geocodeMap[direccion]) {
    coords = geocodeMap[direccion];
  }

  if (!direccion && !coords) return null;

  return {
    direccion,
    coords,
    tipo: p.tipo,
    pedido_id: p.pedido_id,
    orden: p.orden ?? 0,
  };
}

/**
 * Agrupa paradas por pedido: origen → paradas HU-58 → destino.
 */
export function groupParadasByPedido(paradas, geocodeMap = {}) {
  const pedidoOrder = [];
  const byPedido = new Map();

  for (const p of paradas || []) {
    const pid = p.pedido_id;
    if (!pid) continue;
    if (!byPedido.has(pid)) {
      pedidoOrder.push(pid);
      byPedido.set(pid, []);
    }
    byPedido.get(pid).push(p);
  }

  return pedidoOrder.map((pedidoId) => {
    const points = byPedido.get(pedidoId) || [];
    const origen = points.find((pt) => pt.tipo === "origen");
    const destino = points.find((pt) => pt.tipo === "destino");
    const intermedias = points
      .filter((pt) => pt.tipo === "parada")
      .sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0));

    const orderedPoints = [origen, ...intermedias, destino].filter(Boolean);
    const stops = orderedPoints
      .map((pt) => resolveStop(pt, geocodeMap))
      .filter(Boolean);

    return {
      pedido_id: pedidoId,
      routeStops: stops,
      markerStops: stops,
    };
  });
}

/**
 * Modelo visual de consolidación:
 * - Polilínea: solo ruta maestra (origen → paradas HU-58 maestra → destino).
 * - Marcadores: origen/destino maestra + paradas HU-58 de pedidos consolidados
 *   (+ paradas HU-58 de la maestra).
 */
export function buildConsolidacionMapView(paradas, geocodeMap, rutaMaestraId) {
  const groups = groupParadasByPedido(paradas, geocodeMap);
  const maestraId = String(rutaMaestraId ?? "");
  const maestraGroup = groups.find((g) => String(g.pedido_id) === maestraId);

  const markers = [];

  if (maestraGroup) {
    maestraGroup.markerStops
      .filter((s) => s.tipo === "origen" || s.tipo === "destino" || s.tipo === "parada")
      .forEach((s) => markers.push(s));
  }

  groups
    .filter((g) => String(g.pedido_id) !== maestraId)
    .forEach((child) => {
      child.markerStops
        .filter((s) => s.tipo === "parada")
        .forEach((s) => markers.push(s));
    });

  return {
    maestraRouteStops: maestraGroup?.routeStops ?? [],
    markers,
    maestraGroup,
  };
}

function stopToLocation(stop) {
  if (stop.coords) return stop.coords;
  return stop.direccion;
}

function isValidLocation(loc) {
  if (!loc) return false;
  if (typeof loc === "string") return loc.trim().length > 0;
  return Number.isFinite(loc.lat) && Number.isFinite(loc.lng);
}

export function extractPathFromDirectionsResult(result) {
  const route = result?.routes?.[0];
  if (!route) return [];

  const path = [];
  (route.legs || []).forEach((leg) => {
    (leg.steps || []).forEach((step) => {
      (step.path || []).forEach((pt) => path.push(pt));
    });
  });

  if (path.length > 0) return path;

  return route.overview_path || [];
}

/** Polilínea vial de la ruta maestra (origen → waypoints HU-58 → destino). */
export function fetchDrivingPolyline(routeStops) {
  return new Promise((resolve) => {
    if (!window.google?.maps?.DirectionsService) {
      resolve(null);
      return;
    }

    const validStops = (routeStops || []).filter((s) =>
      isValidLocation(stopToLocation(s)),
    );
    if (validStops.length < 2) {
      resolve(null);
      return;
    }

    const origin = stopToLocation(validStops[0]);
    const destination = stopToLocation(validStops[validStops.length - 1]);
    const intermediate = validStops.slice(1, -1);

    const waypoints = intermediate.slice(0, MAX_WAYPOINTS).map((stop) => ({
      location: stopToLocation(stop),
      stopover: true,
    }));

    const request = {
      origin,
      destination,
      travelMode: window.google.maps.TravelMode.DRIVING,
      region: "CL",
      optimizeWaypoints: false,
    };

    if (waypoints.length > 0) {
      request.waypoints = waypoints;
    }

    const service = new window.google.maps.DirectionsService();

    service.route(request, (result, status) => {
      if (status !== window.google.maps.DirectionsStatus.OK) {
        resolve(null);
        return;
      }
      resolve(extractPathFromDirectionsResult(result));
    });
  });
}

/** Solo la polilínea de la ruta maestra. */
export async function fetchMaestraPolyline(maestraRouteStops) {
  const path = await fetchDrivingPolyline(maestraRouteStops);
  return path && path.length > 0 ? path : null;
}
