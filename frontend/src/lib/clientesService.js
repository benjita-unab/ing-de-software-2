import { apiFetch } from "./apiClient";

export async function createCliente(payload) {
  const res = await apiFetch("/api/clientes", {
    method: "POST",
    json: payload,
  });
  if (!res.ok) {
    throw new Error(res.error || "Error al crear cliente");
  }
  return res.data;
}

export async function updateCliente(id, payload) {
  const res = await apiFetch(`/api/clientes/${id}`, {
    method: "PUT",
    json: payload,
  });
  if (!res.ok) {
    throw new Error(res.error || "Error al actualizar cliente");
  }
  return res.data;
}

export async function getClientes(query = "") {
  const url = query ? `/api/clientes?q=${encodeURIComponent(query)}` : "/api/clientes";
  const res = await apiFetch(url);
  if (!res.ok) {
    throw new Error(res.error || "Error al obtener clientes");
  }
  return res.data || res; // Si la API devuelve un array directo
}

export async function getHistorialDespachos(id) {
  const res = await apiFetch(`/api/clientes/${id}/despachos`);
  if (!res.ok) {
    throw new Error(res.error || "Error al obtener historial de despachos");
  }
  return res.data || res;
}
