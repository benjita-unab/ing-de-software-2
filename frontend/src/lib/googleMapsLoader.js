/**
 * Carga única del script de Google Maps con librerías en la URL (modo clásico).
 * Compatible con Map (dashboard) y Autocomplete (places) en clientes/rutas.
 */

const MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
const SCRIPT_ID = "google-maps-script";

/** Todas las librerías que usa el frontend en un solo request */
const BUNDLED_LIBRARIES = ["places", "geocoding", "marker"];

let loadPromise = null;

export function isGoogleMapsConfigured() {
  return Boolean(MAPS_API_KEY?.trim());
}

function scriptUrl(libraries) {
  const libs = [...new Set(libraries)].join(",");
  return `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}&libraries=${libs}&v=weekly&language=es&region=CL`;
}

function isMapsReady() {
  return Boolean(window.google?.maps?.Map);
}

function isPlacesReady() {
  return Boolean(window.google?.maps?.places?.Autocomplete);
}

function isReady(requirePlaces) {
  if (!isMapsReady()) return false;
  if (requirePlaces && !isPlacesReady()) return false;
  return true;
}

function waitForScript(scriptEl, requirePlaces) {
  return new Promise((resolve, reject) => {
    if (isReady(requirePlaces)) {
      resolve();
      return;
    }

    const timeout = setTimeout(() => {
      if (isReady(requirePlaces)) resolve();
      else if (isMapsReady()) resolve();
      else reject(new Error("Timeout esperando Google Maps."));
    }, 15000);

    const onLoad = () => {
      clearTimeout(timeout);
      if (isReady(requirePlaces)) {
        resolve();
      } else if (isMapsReady()) {
        resolve();
      } else {
        reject(new Error("El script cargó pero Google Maps no está disponible."));
      }
    };

    scriptEl.addEventListener("load", onLoad, { once: true });
    scriptEl.addEventListener(
      "error",
      () => {
        clearTimeout(timeout);
        reject(new Error("No se pudo descargar el script de Google Maps."));
      },
      { once: true },
    );
  });
}

function injectScript(libraries) {
  const existing = document.getElementById(SCRIPT_ID);
  if (existing) {
    existing.remove();
    delete window.google;
    loadPromise = null;
  }

  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.src = scriptUrl(libraries);
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
  return script;
}

function loadScript(requirePlaces = false) {
  if (!isGoogleMapsConfigured()) {
    return Promise.reject(new Error("REACT_APP_GOOGLE_MAPS_API_KEY no configurada"));
  }

  if (isReady(requirePlaces)) {
    return Promise.resolve();
  }

  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    let script = document.getElementById(SCRIPT_ID);

    if (!script || !isMapsReady()) {
      script = injectScript(BUNDLED_LIBRARIES);
    }

    await waitForScript(script, requirePlaces);
  })().catch((err) => {
    loadPromise = null;
    throw err;
  });

  return loadPromise;
}

/**
 * @param {{ libraries?: ('places'|'maps'|'marker'|'geocoding')[] }} options
 */
export async function loadGoogleMaps(options = {}) {
  const requested = options.libraries ?? ["places"];
  const needsPlaces = requested.includes("places");

  await loadScript(needsPlaces);

  if (!isMapsReady()) {
    throw new Error(
      "Maps JavaScript API no disponible. Habilita «Maps JavaScript API» en Google Cloud.",
    );
  }

  if (needsPlaces && !isPlacesReady()) {
    throw new Error(
      "Places API no disponible. Habilita «Places API» en Google Cloud.",
    );
  }

  return {
    maps: window.google.maps,
    places: window.google.maps.places,
  };
}
