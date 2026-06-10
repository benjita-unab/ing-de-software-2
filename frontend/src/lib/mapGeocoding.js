import { loadGoogleMaps } from "./googleMapsLoader";

const cache = new Map();

function cacheKey(address) {
  return String(address ?? "").trim().toLowerCase();
}

/**
 * Geocodifica una dirección real vía Google Geocoder (datos de API, no simulados).
 * @param {string} address
 * @returns {Promise<{ lat: number, lng: number } | null>}
 */
export async function geocodeAddress(address) {
  const key = cacheKey(address);
  if (!key) return null;
  if (cache.has(key)) return cache.get(key);

  await loadGoogleMaps({ libraries: ["geocoding"] });

  const result = await new Promise((resolve) => {
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address: key, region: "CL" }, (results, status) => {
      if (status === "OK" && results?.[0]?.geometry?.location) {
        const loc = results[0].geometry.location;
        resolve({ lat: loc.lat(), lng: loc.lng() });
      } else {
        resolve(null);
      }
    });
  });

  cache.set(key, result);
  return result;
}

/**
 * Geocodifica un lote de direcciones únicas.
 * @param {string[]} addresses
 */
export async function geocodeAddresses(addresses) {
  const unique = [...new Set(addresses.map((a) => String(a ?? "").trim()).filter(Boolean))];
  const entries = await Promise.all(
    unique.map(async (addr) => [addr, await geocodeAddress(addr)]),
  );
  return Object.fromEntries(entries);
}
