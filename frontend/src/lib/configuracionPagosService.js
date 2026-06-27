import { apiFetch } from "./apiClient";

/**
 * Indica si el usuario puede gestionar tarifas de pago (HU-37).
 * @param {string} [role]
 */
export function puedeConfigurarPagos(role) {
  const r = String(role || "").toUpperCase();
  return r === "OPERADOR" || r === "ADMIN";
}

/**
 * @returns {Promise<{data: object|null, error?: string}>}
 */
export async function obtenerConfiguracionPagos() {
  const res = await apiFetch("/api/configuracion-pagos");

  if (!res.ok) {
    return {
      data: null,
      error: res.error || "Error al obtener configuración de pagos",
    };
  }

  return { data: res.data?.data ?? res.data };
}

/**
 * @param {{ precioPorRuta: number, precioPorEntrega: number, precioPorBulto: number, precioPorKm: number, precioCombustibleLitro: number, precioEsperaMinuto: number }} payload
 * @returns {Promise<{data: object|null, error?: string}>}
 */
export async function actualizarConfiguracionPagos(payload) {
  const res = await apiFetch("/api/configuracion-pagos", {
    method: "PUT",
    json: payload,
  });

  if (!res.ok) {
    return {
      data: null,
      error: res.error || "Error al guardar configuración de pagos",
    };
  }

  return { data: res.data?.data ?? res.data };
}
