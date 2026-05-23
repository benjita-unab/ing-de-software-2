/**
 * HU-24: distancia vial vía Google Routes API (computeRoutes).
 * Usa GOOGLE_MAPS_API_KEY solo en el servidor.
 */

const ROUTES_COMPUTE_URL =
  'https://routes.googleapis.com/directions/v2:computeRoutes';

export type GoogleRoutesDistanceOk = {
  ok: true;
  distancia_km: number;
  duracion_minutos: number | null;
  distance_meters: number;
};

export type GoogleRoutesDistanceFail = {
  ok: false;
  error: string;
};

export type GoogleRoutesDistanceResult =
  | GoogleRoutesDistanceOk
  | GoogleRoutesDistanceFail;

function parseDurationMinutes(duration: unknown): number | null {
  if (duration == null) return null;
  if (typeof duration === 'string') {
    const m = /^(\d+)s$/.exec(duration.trim());
    if (m) return Math.round(Number(m[1]) / 60);
  }
  if (typeof duration === 'object' && duration !== null && 'seconds' in duration) {
    const sec = Number((duration as { seconds?: string | number }).seconds);
    if (Number.isFinite(sec)) return Math.round(sec / 60);
  }
  return null;
}

function extractRoutesErrorMessage(body: unknown, status: number): string {
  if (body && typeof body === 'object') {
    const err = body as {
      error?: { message?: string };
      message?: string;
    };
    const msg = err.error?.message || err.message;
    if (msg) return msg;
  }
  return `Google Routes API respondió con estado ${status}`;
}

export async function calcularDistanciaVialGoogle(
  origen: string,
  destino: string,
  apiKey: string,
): Promise<GoogleRoutesDistanceResult> {
  const originAddress = String(origen ?? '').trim();
  const destinationAddress = String(destino ?? '').trim();

  if (!originAddress || !destinationAddress) {
    return {
      ok: false,
      error: 'Origen y destino son obligatorios para calcular la distancia vial.',
    };
  }

  if (!apiKey?.trim()) {
    return {
      ok: false,
      error: 'GOOGLE_MAPS_API_KEY no está configurada en el servidor.',
    };
  }

  let response: Response;
  try {
    response = await fetch(ROUTES_COMPUTE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey.trim(),
        'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration',
      },
      body: JSON.stringify({
        origin: { address: originAddress },
        destination: { address: destinationAddress },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_UNAWARE',
        languageCode: 'es-CL',
        units: 'METRIC',
      }),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: `No se pudo contactar Google Routes API: ${msg}`,
    };
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    return {
      ok: false,
      error: extractRoutesErrorMessage(body, response.status),
    };
  }

  const routes = (body as { routes?: Array<Record<string, unknown>> })?.routes;
  const route = routes?.[0];
  const distanceMeters = Number(route?.distanceMeters);

  if (!route || !Number.isFinite(distanceMeters) || distanceMeters <= 0) {
    return {
      ok: false,
      error:
        'Google Routes no devolvió una distancia vial válida para origen y destino indicados.',
    };
  }

  const distancia_km = Math.round((distanceMeters / 1000) * 100) / 100;

  return {
    ok: true,
    distancia_km,
    duracion_minutos: parseDurationMinutes(route.duration),
    distance_meters: distanceMeters,
  };
}
