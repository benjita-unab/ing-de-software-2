import { bffFetch } from './bffService';

export interface PortalPedidoListItem {
  id: string;
  estado: string | null;
  origen: string | null;
  destino: string | null;
  fecha_estimada_entrega: string | null;
  distancia_km: number | null;
  bultos_despachados: number | null;
}

export interface PortalPedidoListResponse {
  data: PortalPedidoListItem[];
  total: number;
}

export interface PortalRutaDetalle {
  id: string;
  estado: string | null;
  origen: string | null;
  destino: string | null;
  fecha_estimada_entrega: string | null;
  distancia_km: number | null;
  bultos_despachados: number | null;
}

export interface PortalHistorialEstado {
  id: string;
  estado: string | null;
  created_at: string | null;
}

export interface PortalEntrega {
  id: string;
  estado: string | null;
  validado: boolean | null;
  fecha_entrega_real: string | null;
  bultos_recepcionados: number | null;
  comentario_diferencia_bultos: string | null;
  created_at: string | null;
}

export interface PortalGuiaDespacho {
  id: string;
  numero_guia: string;
  estado_recepcion: string | null;
  url_pdf: string | null;
  observaciones: string | null;
  created_at: string | null;
}

export interface PortalIncidencia {
  id: string;
  tipo_incidencia: string | null;
  descripcion: string | null;
  estado: string | null;
  severidad: string | null;
  created_at: string | null;
}

export interface PortalMensaje {
  id: string;
  mensaje: string;
  tipo: string | null;
  prioridad: string | null;
  timestamp_evento: string | null;
  created_at: string | null;
}

export interface PortalPedidoDetalleResponse {
  ruta: PortalRutaDetalle;
  historial_estados: PortalHistorialEstado[];
  entregas: PortalEntrega[];
  guias_despacho: PortalGuiaDespacho[];
  incidencias: PortalIncidencia[];
  mensajes: PortalMensaje[];
}

export async function getPortalPedidos(): Promise<PortalPedidoListResponse> {
  const res = await bffFetch('/api/portal/pedidos');
  if (!res.ok) {
    throw new Error('Error al obtener los pedidos');
  }
  return res.json();
}

export async function getPortalPedidoById(
  pedidoId: string,
): Promise<PortalPedidoDetalleResponse> {
  const res = await bffFetch(`/api/portal/pedidos/${encodeURIComponent(pedidoId)}`);
  if (!res.ok) {
    throw new Error('Error al obtener detalle del pedido');
  }
  return res.json();
}
