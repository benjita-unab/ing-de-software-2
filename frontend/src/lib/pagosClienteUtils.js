export const ESTADO_PENDIENTE = "PENDIENTE";
export const ESTADO_PROCESANDO = "PROCESANDO";
export const ESTADO_PAGADO = "PAGADO";

export const MONTO_PENDIENTE_CALCULO = "Pendiente de cálculo";

export function normalizarEstadoPago(estado) {
  const upper = String(estado || "").trim().toUpperCase();
  if (upper === ESTADO_PAGADO) return ESTADO_PAGADO;
  if (upper === ESTADO_PROCESANDO) return ESTADO_PROCESANDO;
  return ESTADO_PENDIENTE;
}

export function estadoBadgeVariant(estado) {
  const e = normalizarEstadoPago(estado);
  if (e === ESTADO_PAGADO) return "success";
  if (e === ESTADO_PROCESANDO) return "info";
  return "warning";
}

export function formatMoney(value) {
  const n = Number(value);
  const safe = Number.isFinite(n) ? n : 0;
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(safe);
}

/** Muestra monto o etiqueta cuando HU-51 aún no calculó el cobro. */
export function formatMontoPago(pago) {
  if (!pago?.montoCalculado) {
    return MONTO_PENDIENTE_CALCULO;
  }
  return formatMoney(pago.montoTotal);
}

export function etiquetaMetodo(metodo) {
  const m = String(metodo || "").trim();
  return m || "—";
}

export function etiquetaPedido(pedidoId) {
  const id = String(pedidoId || "").trim();
  return id ? id.slice(0, 8) + "…" : "—";
}
