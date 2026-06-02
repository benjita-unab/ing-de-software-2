import { apiFetch } from "./apiClient";

/**
 * API Portal Cliente (HU-27) — solo rol CLIENTE.
 */
export async function getPortalPedidos() {
  return apiFetch("/api/portal/pedidos");
}

export async function getPortalPedidoById(pedidoId) {
  return apiFetch(`/api/portal/pedidos/${encodeURIComponent(pedidoId)}`);
}
