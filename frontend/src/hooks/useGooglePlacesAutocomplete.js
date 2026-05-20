import { useEffect, useRef, useState } from "react";
import { isGoogleMapsConfigured, loadGoogleMaps } from "../lib/googleMapsLoader";

/**
 * Autocompletado de direcciones con Google Places (Chile).
 * @param {React.RefObject<HTMLInputElement>} inputRef
 * @param {{
 *   onPlaceSelected?: (address: string, place: object) => void,
 *   types?: string[],
 *   enabled?: boolean,
 * }} options
 */
const DEFAULT_ADDRESS_TYPES = ["address"];

export function useGooglePlacesAutocomplete(inputRef, options = {}) {
  const { onPlaceSelected, types = DEFAULT_ADDRESS_TYPES, enabled = true } = options;
  const autocompleteRef = useRef(null);
  const onPlaceSelectedRef = useRef(onPlaceSelected);
  const [error, setError] = useState("");

  onPlaceSelectedRef.current = onPlaceSelected;

  useEffect(() => {
    if (!enabled) {
      autocompleteRef.current = null;
      return undefined;
    }

    if (!isGoogleMapsConfigured()) {
      setError("Configura REACT_APP_GOOGLE_MAPS_API_KEY para autocompletar direcciones.");
      return undefined;
    }

    let cancelled = false;
    let retryTimer = null;

    const bindAutocomplete = () => {
      if (cancelled || autocompleteRef.current || !inputRef.current) {
        return Boolean(autocompleteRef.current);
      }

      if (!window.google?.maps?.places?.Autocomplete) {
        setError(
          "Places no disponible. Habilita «Places API» y «Maps JavaScript API» en Google Cloud."
        );
        return false;
      }

      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        inputRef.current,
        {
          fields: ["formatted_address", "geometry", "name"],
          componentRestrictions: { country: "cl" },
          types,
        }
      );

      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current.getPlace();
        const address =
          place.formatted_address || place.name || inputRef.current?.value || "";
        onPlaceSelectedRef.current?.(address, place);
      });

      setError("");
      return true;
    };

    const attach = async () => {
      try {
        await loadGoogleMaps({ libraries: ["places"] });
        if (cancelled) return;

        if (bindAutocomplete()) return;

        // El input puede montarse después (p. ej. formulario colapsable)
        retryTimer = window.setTimeout(() => {
          if (!cancelled) bindAutocomplete();
        }, 50);
      } catch (err) {
        if (!cancelled) {
          console.warn("Google Places Autocomplete:", err);
          setError(
            err.message?.includes("API key") || err.message?.includes("REACT_APP")
              ? "Configura REACT_APP_GOOGLE_MAPS_API_KEY en frontend/.env y reinicia npm start."
              : err.message || "No se pudo cargar Google Places."
          );
        }
      }
    };

    attach();

    return () => {
      cancelled = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      autocompleteRef.current = null;
    };
  }, [inputRef, types, enabled]);

  return { error };
}
