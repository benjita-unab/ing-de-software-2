/**
 * DTOs de respuesta del Portal Cliente (HU-27).
 * Vista reducida; no expone datos operativos internos.
 */

export interface PortalPedidoListItemDto {
  id: string;
  nombre_ruta?: string | null;
  estado: string | null;
  estado_pago?: string | null;
  origen: string | null;
  destino: string | null;
  fecha_estimada_entrega: string | null;
  distancia_km: number | null;
  bultos_despachados: number | null;
  created_at?: string | null;
  tarifa_base_total?: number | null;
  costo_servicio?: number | null;
  costo_espera_total?: number | null;
  total_pagar?: number | null;
}

export interface PortalPedidoListResponseDto {
  data: PortalPedidoListItemDto[];
  total: number;
}

export interface PortalRutaDetalleDto {
  id: string;
  nombre_ruta?: string | null;
  estado: string | null;
  estado_pago?: string | null;
  origen: string | null;
  destino: string | null;
  fecha_estimada_entrega: string | null;
  distancia_km: number | null;
  bultos_despachados: number | null;
  created_at?: string | null;
  tarifa_base_total?: number | null;
  costo_servicio?: number | null;
  costo_espera_total?: number | null;
  total_pagar?: number | null;
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

export interface PortalIncidenciaDto {
  id: string;
  tipo_incidencia: string | null;
  descripcion: string | null;
  estado: string | null;
  severidad: string | null;
  created_at: string | null;
}

export interface PortalMensajeDto {
  id: string;
  mensaje: string;
  tipo: string | null;
  prioridad: string | null;
  timestamp_evento: string | null;
  created_at: string | null;
}

export interface PortalBultoDto {
  id: string;
  alto_cm: number | null;
  ancho_cm: number | null;
  largo_cm: number | null;
  peso_kg: number | null;
  categoria: string | null;
}

export interface PortalPedidoDetalleResponseDto {
  ruta: PortalRutaDetalleDto;
  historial_estados: PortalHistorialEstadoDto[];
  entregas: PortalEntregaDto[];
  guias_despacho: PortalGuiaDespachoDto[];
  incidencias: PortalIncidenciaDto[];
  mensajes: PortalMensajeDto[];
  bultos: PortalBultoDto[];
}
