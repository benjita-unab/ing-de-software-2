/**
 * DTOs de respuesta del Portal Cliente (HU-27).
 * Vista reducida; no expone datos operativos internos.
 */

export interface PortalPedidoListItemDto {
  id: string;
  estado: string | null;
  origen: string | null;
  destino: string | null;
  fecha_estimada_entrega: string | null;
  distancia_km: number | null;
  bultos_despachados: number | null;
}

export interface PortalPedidoListResponseDto {
  data: PortalPedidoListItemDto[];
  total: number;
}

export interface PortalRutaDetalleDto {
  id: string;
  estado: string | null;
  origen: string | null;
  destino: string | null;
  fecha_estimada_entrega: string | null;
  distancia_km: number | null;
  bultos_despachados: number | null;
}

export interface PortalHistorialEstadoDto {
  id: string;
  estado: string | null;
  created_at: string | null;
}

export interface PortalEntregaDto {
  id: string;
  estado: string | null;
  validado: boolean | null;
  fecha_entrega_real: string | null;
  bultos_recepcionados: number | null;
  comentario_diferencia_bultos: string | null;
  created_at: string | null;
}

export interface PortalGuiaDespachoDto {
  id: string;
  numero_guia: string;
  estado_recepcion: string | null;
  url_pdf: string | null;
  observaciones: string | null;
  created_at: string | null;
}

export interface PortalPedidoDetalleResponseDto {
  ruta: PortalRutaDetalleDto;
  historial_estados: PortalHistorialEstadoDto[];
  entregas: PortalEntregaDto[];
  guias_despacho: PortalGuiaDespachoDto[];
}
