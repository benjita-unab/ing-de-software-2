import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { RutasService, CreateRutaDto } from '../rutas/rutas.service';
import { SupabaseConfigService } from '../../config/supabase.config';
import type {
  PortalEntregaDto,
  PortalGuiaDespachoDto,
  PortalHistorialEstadoDto,
  PortalPedidoDetalleResponseDto,
  PortalPedidoListItemDto,
  PortalPedidoListResponseDto,
  PortalRutaDetalleDto,
  PortalIncidenciaDto,
  PortalMensajeDto,
  PortalBultoDto,
} from './dto/portal-pedido.dto';

@Injectable()
export class PortalService {
  constructor(
    private readonly supabaseConfig: SupabaseConfigService,
    private readonly rutasService: RutasService,
  ) {}

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
        'id, nombre_ruta, estado, estado_pago, origen, destino, eta, fecha_estimada_entrega, distancia_km, bultos_despachados, tarifa_base_total, costo_servicio, costo_espera_total, total_pagar, created_at',
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
        nombre_ruta,
        estado,
        estado_pago,
        origen,
        destino,
        eta,
        fecha_estimada_entrega,
        distancia_km,
        bultos_despachados,
        tarifa_base_total,
        costo_servicio,
        costo_espera_total,
        total_pagar,
        cliente_id,
        created_at,
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
        ),
        incidencias (
          id,
          tipo,
          descripcion,
          estado,
          prioridad,
          created_at
        ),
        mensajes_conductor (
          id,
          mensaje,
          tipo,
          prioridad,
          timestamp_evento,
          created_at
        )
      `,
      )
      .eq('id', rutaId.trim())
      .eq('cliente_id', clienteId)
      .maybeSingle();

    if (error || !row) {
      console.error("Supabase Error GetPedidoById:", error);
      throw new NotFoundException('Pedido no encontrado');
    }

    const { data: bultosData } = await supabase
      .from('bultos')
      .select('id, tamaño, categoria, cuadrados_equivalentes')
      .eq('ruta_id', rutaId.trim());

    const historialRaw = this.normalizeRelation(row.historial_estados);
    const entregasRaw = this.normalizeRelation(row.entregas);
    const guiasRaw = this.normalizeRelation(row.guias_despacho);
    const incidenciasRaw = this.normalizeRelation(row.incidencias);
    const mensajesRaw = this.normalizeRelation(row.mensajes_conductor);
    const bultosRaw = this.normalizeRelation(bultosData);

    historialRaw.sort((a, b) =>
      String(a.created_at || '').localeCompare(String(b.created_at || '')),
    );

    return {
      ruta: this.mapRutaDetalle(row),
      historial_estados: historialRaw.map((h) => this.mapHistorial(h)),
      entregas: entregasRaw.map((e) => this.mapEntrega(e)),
      guias_despacho: guiasRaw.map((g) => this.mapGuia(g)),
      incidencias: incidenciasRaw.map((i) => this.mapIncidencia(i)),
      mensajes: mensajesRaw.map((m) => this.mapMensaje(m)),
      bultos: bultosRaw.map((b) => this.mapBulto(b)),
    };
  }

  /**
   * Evidencias del pedido (HU-27 CA-5). Ownership por JWT; reutiliza RutasService.getEvidencias.
   */
  async getPedidoEvidencias(rutaId: string, clienteId: string) {
    await this.assertPedidoOwned(rutaId, clienteId);

    const evidencias = await this.rutasService.getEvidencias(rutaId.trim());

    const supabase = this.supabaseConfig.getClient();
    const { data: guias, error: guiasError } = await supabase
      .from('guias_despacho')
      .select('numero_guia, url_pdf')
      .eq('ruta_id', rutaId.trim());

    if (!guiasError && guias?.length) {
      const urlsVistas = new Set(
        (evidencias.pdfs || []).map((p) => p.url).filter(Boolean),
      );
      for (const g of guias) {
        const url = String(g.url_pdf || '').trim();
        if (!url || urlsVistas.has(url)) continue;
        urlsVistas.add(url);
        evidencias.pdfs.push({
          nombre: `Guía ${g.numero_guia ?? 'despacho'}`,
          url,
        });
      }
    }

    return evidencias;
  }

  /** 404 si la ruta no existe o no pertenece al cliente del JWT. */
  private async assertPedidoOwned(
    rutaId: string,
    clienteId: string,
  ): Promise<void> {
    this.assertClienteId(clienteId);

    if (!rutaId?.trim()) {
      throw new NotFoundException('Pedido no encontrado');
    }

    const supabase = this.supabaseConfig.getClient();
    const { data, error } = await supabase
      .from('rutas')
      .select('id')
      .eq('id', rutaId.trim())
      .eq('cliente_id', clienteId)
      .maybeSingle();

    if (error || !data) {
      throw new NotFoundException('Pedido no encontrado');
    }
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
      nombre_ruta: (row.nombre_ruta as string) ?? null,
      estado: (row.estado as string) ?? null,
      estado_pago: (row.estado_pago as string) ?? null,
      origen: (row.origen as string) ?? null,
      destino: (row.destino as string) ?? null,
      fecha_estimada_entrega: (row.eta as string) || (row.fecha_estimada_entrega as string) || null,
      created_at: (row.created_at as string) ?? null,
      distancia_km: row.distancia_km != null ? Number(row.distancia_km) : null,
      bultos_despachados:
        row.bultos_despachados != null ? Number(row.bultos_despachados) : null,
      tarifa_base_total: row.tarifa_base_total != null ? Number(row.tarifa_base_total) : null,
      costo_servicio: row.costo_servicio != null ? Number(row.costo_servicio) : null,
      costo_espera_total: row.costo_espera_total != null ? Number(row.costo_espera_total) : null,
      total_pagar: row.total_pagar != null ? Number(row.total_pagar) : null,
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

  async createPedido(clienteId: string, body: Omit<CreateRutaDto, 'cliente_id'>) {
    this.assertClienteId(clienteId);
    return this.rutasService.createRoute({
      ...body,
      cliente_id: clienteId,
      estado: 'PENDIENTE',
    });
  }

  async pagarBase(rutaId: string, clienteId: string) {
    this.assertClienteId(clienteId);
    await this.assertPedidoOwned(rutaId, clienteId);

    const supabase = this.supabaseConfig.getClient();

    // Actualizamos el estado a PAGADO. Si la BD es restrictiva, esto fallará
    // y ajustaremos a un estado válido como ASIGNADO si es necesario.
    const { error } = await supabase
      .from('rutas')
      .update({ estado: 'PAGADO' })
      .eq('id', rutaId.trim())
      .eq('cliente_id', clienteId);

    if (error) {
      // Intentamos con ASIGNADO como fallback si el enum no acepta PAGADO
      const fallbackError = await supabase
        .from('rutas')
        .update({ estado: 'ASIGNADO' })
        .eq('id', rutaId.trim())
        .eq('cliente_id', clienteId);
        
      if (fallbackError.error) {
        throw new BadRequestException(`No se pudo actualizar el estado: ${fallbackError.error.message}`);
      }
      
      await supabase.from('historial_estados').insert([
        { ruta_id: rutaId.trim(), estado: 'PAGADO_CLIENTE' }
      ]);
    } else {
      await supabase.from('historial_estados').insert([
        { ruta_id: rutaId.trim(), estado: 'PAGADO' }
      ]);
    }

    return { ok: true, message: 'Pago base procesado correctamente' };
  }

  async pagarRetraso(rutaId: string, clienteId: string) {
    this.assertClienteId(clienteId);
    await this.assertPedidoOwned(rutaId, clienteId);

    const supabase = this.supabaseConfig.getClient();

    // Simulamos el pago y ponemos el costo de espera en 0 (ya está pagado)
    const { error } = await supabase
      .from('rutas')
      .update({ costo_espera_total: 0 })
      .eq('id', rutaId.trim())
      .eq('cliente_id', clienteId);

    if (error) {
      throw new BadRequestException(`Error al procesar el pago por retraso: ${error.message}`);
    }

    await supabase.from('historial_estados').insert([
      { ruta_id: rutaId.trim(), estado: 'RETRASO_PAGADO' }
    ]);

    return { ok: true, message: 'Pago por retraso procesado correctamente' };
  }

  private mapIncidencia(row: Record<string, unknown>): PortalIncidenciaDto {
    return {
      id: String(row.id),
      tipo_incidencia: (row.tipo as string) ?? null,
      descripcion: (row.descripcion as string) ?? null,
      estado: (row.estado as string) ?? null,
      severidad: (row.prioridad as string) ?? null,
      created_at: (row.created_at as string) ?? null,
    };
  }

  private mapMensaje(row: Record<string, unknown>): PortalMensajeDto {
    return {
      id: String(row.id),
      mensaje: String(row.mensaje ?? ''),
      tipo: (row.tipo as string) ?? null,
      prioridad: (row.prioridad as string) ?? null,
      timestamp_evento: (row.timestamp_evento as string) ?? null,
      created_at: (row.created_at as string) ?? null,
    };
  }

  private mapBulto(row: any): PortalBultoDto {
    return {
      id: row.id,
      alto_cm: null,
      ancho_cm: null,
      largo_cm: null,
      peso_kg: null,
      categoria: (row.categoria as string) || (row.tamaño as string) || null,
    };
  }
}
