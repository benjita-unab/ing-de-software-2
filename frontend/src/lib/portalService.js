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

export async function getPortalPedidoEvidencias(pedidoId) {
  return apiFetch(
    `/api/portal/pedidos/${encodeURIComponent(pedidoId)}/evidencias`,
  );
}

export async function createPortalPedido(data) {
  return apiFetch("/api/portal/pedidos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}
