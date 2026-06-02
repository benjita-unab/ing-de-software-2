import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseConfigService } from '../../config/supabase.config';
import type {
  PortalEntregaDto,
  PortalGuiaDespachoDto,
  PortalHistorialEstadoDto,
  PortalPedidoDetalleResponseDto,
  PortalPedidoListItemDto,
  PortalPedidoListResponseDto,
  PortalRutaDetalleDto,
} from './dto/portal-pedido.dto';

@Injectable()
export class PortalService {
  constructor(private readonly supabaseConfig: SupabaseConfigService) {}

  /**
   * Lista pedidos (rutas) del cliente autenticado.
   * El clienteId proviene exclusivamente del JWT, nunca de query params.
   */
  async listPedidos(clienteId: string): Promise<PortalPedidoListResponseDto> {
    this.assertClienteId(clienteId);

    const supabase = this.supabaseConfig.getClient();

    const { data: rutas, error } = await supabase
      .from('rutas')
      .select(
        'id, estado, origen, destino, fecha_estimada_entrega, distancia_km, bultos_despachados',
      )
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new InternalServerErrorException(
        `No fue posible obtener los pedidos: ${error.message}`,
      );
    }

    const data: PortalPedidoListItemDto[] = (rutas || []).map((row) =>
      this.mapPedidoListItem(row),
    );

    return { data, total: data.length };
  }

  /**
   * Detalle de un pedido con timeline, entrega y guías.
   * 404 si la ruta no existe o no pertenece al cliente (sin filtrar por ID ajeno).
   */
  async getPedidoById(
    rutaId: string,
    clienteId: string,
  ): Promise<PortalPedidoDetalleResponseDto> {
    this.assertClienteId(clienteId);

    if (!rutaId?.trim()) {
      throw new NotFoundException('Pedido no encontrado');
    }

    const supabase = this.supabaseConfig.getClient();

    const { data: row, error } = await supabase
      .from('rutas')
      .select(
        `
        id,
        estado,
        origen,
        destino,
        fecha_estimada_entrega,
        distancia_km,
        bultos_despachados,
        cliente_id,
        historial_estados (
          id,
          estado,
          created_at
        ),
        entregas (
          id,
          estado,
          validado,
          fecha_entrega_real,
          bultos_recepcionados,
          comentario_diferencia_bultos,
          created_at
        ),
        guias_despacho (
          id,
          numero_guia,
          estado_recepcion,
          url_pdf,
          observaciones,
          created_at
        )
      `,
      )
      .eq('id', rutaId.trim())
      .eq('cliente_id', clienteId)
      .maybeSingle();

    if (error || !row) {
      throw new NotFoundException('Pedido no encontrado');
    }

    const historialRaw = this.normalizeRelation(row.historial_estados);
    const entregasRaw = this.normalizeRelation(row.entregas);
    const guiasRaw = this.normalizeRelation(row.guias_despacho);

    historialRaw.sort((a, b) =>
      String(a.created_at || '').localeCompare(String(b.created_at || '')),
    );

    return {
      ruta: this.mapRutaDetalle(row),
      historial_estados: historialRaw.map((h) => this.mapHistorial(h)),
      entregas: entregasRaw.map((e) => this.mapEntrega(e)),
      guias_despacho: guiasRaw.map((g) => this.mapGuia(g)),
    };
  }

  private assertClienteId(clienteId: string | undefined): void {
    if (!clienteId?.trim()) {
      throw new ForbiddenException(
        'Sesión de portal sin cliente vinculado. Vuelve a iniciar sesión.',
      );
    }
  }

  private normalizeRelation<T>(value: T | T[] | null | undefined): T[] {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }

  private mapPedidoListItem(row: Record<string, unknown>): PortalPedidoListItemDto {
    return {
      id: String(row.id),
      estado: (row.estado as string) ?? null,
      origen: (row.origen as string) ?? null,
      destino: (row.destino as string) ?? null,
      fecha_estimada_entrega: (row.fecha_estimada_entrega as string) ?? null,
      distancia_km: row.distancia_km != null ? Number(row.distancia_km) : null,
      bultos_despachados:
        row.bultos_despachados != null ? Number(row.bultos_despachados) : null,
    };
  }

  private mapRutaDetalle(row: Record<string, unknown>): PortalRutaDetalleDto {
    return this.mapPedidoListItem(row);
  }

  private mapHistorial(row: Record<string, unknown>): PortalHistorialEstadoDto {
    return {
      id: String(row.id),
      estado: (row.estado as string) ?? null,
      created_at: (row.created_at as string) ?? null,
    };
  }

  private mapEntrega(row: Record<string, unknown>): PortalEntregaDto {
    return {
      id: String(row.id),
      estado: (row.estado as string) ?? null,
      validado: row.validado != null ? Boolean(row.validado) : null,
      fecha_entrega_real: (row.fecha_entrega_real as string) ?? null,
      bultos_recepcionados:
        row.bultos_recepcionados != null
          ? Number(row.bultos_recepcionados)
          : null,
      comentario_diferencia_bultos:
        (row.comentario_diferencia_bultos as string) ?? null,
      created_at: (row.created_at as string) ?? null,
    };
  }

  private mapGuia(row: Record<string, unknown>): PortalGuiaDespachoDto {
    return {
      id: String(row.id),
      numero_guia: String(row.numero_guia ?? ''),
      estado_recepcion: (row.estado_recepcion as string) ?? null,
      url_pdf: (row.url_pdf as string) ?? null,
      observaciones: (row.observaciones as string) ?? null,
      created_at: (row.created_at as string) ?? null,
    };
  }
}
