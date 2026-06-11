import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseConfigService } from '../../config/supabase.config';
import { ConfiguracionPagosService } from '../configuracion-pagos/configuracion-pagos.service';
import type { AuthenticatedUser } from '../../common/strategies/jwt.strategy';
import { CreatePagoDto } from './dto/create-pago.dto';
import { UpdateEstadoPagoDto } from './dto/update-estado-pago.dto';

export type PagoClienteRutaDto = {
  id: string;
  origen: string | null;
  destino: string | null;
  estado: string;
  montoRuta: number;
  fechaFin: string | null;
};

export type PagoClienteItemDto = {
  id: string;
  clienteId: string;
  clienteNombre: string | null;
  montoTotal: number;
  estado: string;
  fechaCreacion: string;
  fechaPago: string | null;
  metodoPago: string | null;
  referenciaTransaccion: string | null;
  rutas: PagoClienteRutaDto[];
};

export type PagosClienteListResponse = {
  data: PagoClienteItemDto[];
  total: number;
  totalAcumulado: number;
  totalPendiente: number;
  totalPagado: number;
};

type RutaRow = {
  id: string;
  cliente_id: string;
  origen: string | null;
  destino: string | null;
  estado: string;
  distancia_km: number | string | null;
  bultos_despachados: number | null;
  fecha_fin: string | null;
  pago_cliente_id: string | null;
  monto_pago_cliente?: number | string | null;
  entregas?: { id: string; validado: boolean | null } | { id: string; validado: boolean | null }[] | null;
};

const ESTADO_RUTA_COMPLETADA = 'ENTREGADO';
const ESTADO_PAGO_PENDIENTE = 'PENDIENTE';
const ESTADO_PAGO_PROCESANDO = 'PROCESANDO';
const ESTADO_PAGO_PAGADO = 'PAGADO';

const PAGO_SELECT_FIELDS = `
  id,
  cliente_id,
  monto_total,
  estado,
  fecha_creacion,
  fecha_pago,
  metodo_pago,
  referencia_transaccion,
  clientes(id, nombre)
`;

@Injectable()
export class PagosClienteService {
  constructor(
    private readonly supabaseConfig: SupabaseConfigService,
    private readonly configuracionPagosService: ConfiguracionPagosService,
  ) {}

  assertClienteAccess(user: AuthenticatedUser, clienteId: string): void {
    if (user.role === 'CLIENTE') {
      const ownId = user.clienteId?.trim();
      if (!ownId || ownId !== clienteId?.trim()) {
        throw new ForbiddenException('No tienes acceso a los pagos de este cliente');
      }
    }
  }

  async listAll(): Promise<PagosClienteListResponse> {
    const supabase = this.supabaseConfig.getClient();

    const { data: pagos, error } = await supabase
      .from('pagos_cliente')
      .select(PAGO_SELECT_FIELDS)
      .order('fecha_creacion', { ascending: false });

    if (error) {
      throw new InternalServerErrorException(
        `No fue posible obtener los pagos: ${error.message}`,
      );
    }

    const items = await Promise.all((pagos || []).map((row) => this.mapPagoRow(row)));
    return this.buildListResponse(items);
  }

  async listByCliente(clienteId: string): Promise<PagosClienteListResponse> {
    if (!clienteId?.trim()) {
      throw new BadRequestException('clienteId es requerido');
    }

    const supabase = this.supabaseConfig.getClient();

    const { data: pagos, error } = await supabase
      .from('pagos_cliente')
      .select(PAGO_SELECT_FIELDS)
      .eq('cliente_id', clienteId.trim())
      .order('fecha_creacion', { ascending: false });

    if (error) {
      throw new InternalServerErrorException(
        `No fue posible obtener los pagos del cliente: ${error.message}`,
      );
    }

    const items = await Promise.all((pagos || []).map((row) => this.mapPagoRow(row)));
    return this.buildListResponse(items);
  }

  async listPendientes(clienteId: string) {
    if (!clienteId?.trim()) {
      throw new BadRequestException('clienteId es requerido');
    }

    const supabase = this.supabaseConfig.getClient();
    const tarifas = await this.configuracionPagosService.getTarifas();

    const { data: rutas, error } = await supabase
      .from('rutas')
      .select(
        `
        id,
        cliente_id,
        origen,
        destino,
        estado,
        distancia_km,
        bultos_despachados,
        fecha_fin,
        pago_cliente_id,
        entregas(id, validado)
      `,
      )
      .eq('cliente_id', clienteId.trim())
      .eq('estado', ESTADO_RUTA_COMPLETADA)
      .is('pago_cliente_id', null)
      .order('fecha_fin', { ascending: false });

    if (error) {
      throw new InternalServerErrorException(
        `No fue posible obtener rutas pendientes de pago: ${error.message}`,
      );
    }

    const data = (rutas || []).map((ruta) => ({
      id: ruta.id,
      origen: ruta.origen ?? null,
      destino: ruta.destino ?? null,
      estado: ruta.estado,
      fechaFin: ruta.fecha_fin ?? null,
      montoRuta: this.calcularMontoRutaVigente(ruta as RutaRow, tarifas),
    }));

    const montoTotal = this.sumarMontos(data.map((r) => r.montoRuta));

    return { data, total: data.length, montoTotal };
  }

  /**
   * Creación programática de pagos — NO invocar desde el módulo de pagos HTTP.
   * El pago debe originarse al crear el pedido/ruta o al iniciar checkout Transbank
   * en el portal cliente. RutasModule / Portal integrarán este método en el futuro.
   */
  async crearPago(dto: CreatePagoDto): Promise<PagoClienteItemDto> {
    const clienteId = dto.clienteId?.trim();
    if (!clienteId) {
      throw new BadRequestException('clienteId es requerido');
    }

    const rutaIds = [...new Set((dto.rutaIds || []).map((id) => id.trim()).filter(Boolean))];
    if (rutaIds.length === 0) {
      throw new BadRequestException(
        'No se puede crear un pago sin rutas. Selecciona al menos una ruta completada.',
      );
    }

    const supabase = this.supabaseConfig.getClient();
    const tarifas = await this.configuracionPagosService.getTarifas();

    const { data: cliente, error: clienteError } = await supabase
      .from('clientes')
      .select('id, nombre')
      .eq('id', clienteId)
      .maybeSingle();

    if (clienteError || !cliente) {
      throw new NotFoundException('Cliente no encontrado');
    }

    const { data: rutas, error: rutasError } = await supabase
      .from('rutas')
      .select(
        `
        id,
        cliente_id,
        origen,
        destino,
        estado,
        distancia_km,
        bultos_despachados,
        fecha_fin,
        pago_cliente_id,
        entregas(id, validado)
      `,
      )
      .in('id', rutaIds);

    if (rutasError) {
      throw new InternalServerErrorException(
        `Error al validar rutas: ${rutasError.message}`,
      );
    }

    if (!rutas || rutas.length !== rutaIds.length) {
      const encontrados = new Set((rutas || []).map((r) => r.id));
      const faltantes = rutaIds.filter((id) => !encontrados.has(id));
      throw new BadRequestException(
        `Una o más rutas no existen: ${faltantes.join(', ')}`,
      );
    }

    const clientesDistintos = new Set(rutas.map((r) => r.cliente_id));
    if (clientesDistintos.size > 1) {
      throw new BadRequestException(
        'No se puede crear un pago con rutas de distintos clientes. Todas las rutas deben pertenecer al mismo cliente.',
      );
    }

    const rutasOtroCliente = rutas.filter((r) => r.cliente_id !== clienteId);
    if (rutasOtroCliente.length > 0) {
      throw new BadRequestException(
        `Las rutas no pertenecen al cliente indicado: ${rutasOtroCliente.map((r) => r.id).join(', ')}`,
      );
    }

    const rutasNoEntregadas = rutas.filter((r) => r.estado !== ESTADO_RUTA_COMPLETADA);
    if (rutasNoEntregadas.length > 0) {
      throw new BadRequestException(
        `Solo se pueden incluir rutas en estado ENTREGADO. Rutas inválidas: ${rutasNoEntregadas.map((r) => `${r.id} (${r.estado})`).join(', ')}`,
      );
    }

    const rutasYaPagadas = rutas.filter((r) => r.pago_cliente_id);
    if (rutasYaPagadas.length > 0) {
      throw new BadRequestException(
        `Una o más rutas ya están asociadas a un pago: ${rutasYaPagadas.map((r) => r.id).join(', ')}`,
      );
    }

    const montosPorRuta = new Map<string, number>();
    for (const ruta of rutas) {
      montosPorRuta.set(
        ruta.id,
        this.calcularMontoRutaVigente(ruta as RutaRow, tarifas),
      );
    }

    const montoTotal = this.sumarMontos([...montosPorRuta.values()]);

    const { data: pago, error: pagoError } = await supabase
      .from('pagos_cliente')
      .insert({
        cliente_id: clienteId,
        monto_total: montoTotal,
        estado: ESTADO_PAGO_PENDIENTE,
        metodo_pago: dto.metodoPago?.trim() || null,
        referencia_transaccion: dto.referenciaTransaccion?.trim() || null,
      })
      .select(
        `
        id,
        cliente_id,
        monto_total,
        estado,
        fecha_creacion,
        fecha_pago,
        metodo_pago,
        referencia_transaccion
      `,
      )
      .single();

    if (pagoError || !pago) {
      throw new InternalServerErrorException(
        `No fue posible crear el pago: ${pagoError?.message}`,
      );
    }

    for (const ruta of rutas) {
      const montoRuta = montosPorRuta.get(ruta.id)!;
      const { error: linkError } = await supabase
        .from('rutas')
        .update({
          pago_cliente_id: pago.id,
          monto_pago_cliente: montoRuta,
        })
        .eq('id', ruta.id);

      if (linkError) {
        await supabase.from('pagos_cliente').delete().eq('id', pago.id);
        await supabase
          .from('rutas')
          .update({ pago_cliente_id: null, monto_pago_cliente: null })
          .eq('pago_cliente_id', pago.id);
        throw new InternalServerErrorException(
          `No fue posible asociar la ruta ${ruta.id} al pago: ${linkError.message}`,
        );
      }
    }

    return {
      id: pago.id,
      clienteId: pago.cliente_id,
      clienteNombre: cliente.nombre ?? null,
      montoTotal: this.redondearMonto(Number(pago.monto_total)),
      estado: this.normalizarEstadoPago(pago.estado),
      fechaCreacion: pago.fecha_creacion,
      fechaPago: pago.fecha_pago ?? null,
      metodoPago: pago.metodo_pago ?? null,
      referenciaTransaccion: pago.referencia_transaccion ?? null,
      rutas: rutas.map((ruta) => ({
        id: ruta.id,
        origen: ruta.origen ?? null,
        destino: ruta.destino ?? null,
        estado: ruta.estado,
        montoRuta: montosPorRuta.get(ruta.id)!,
        fechaFin: ruta.fecha_fin ?? null,
      })),
    };
  }

  async actualizarEstado(
    pagoId: string,
    dto: UpdateEstadoPagoDto,
    user: AuthenticatedUser,
  ): Promise<PagoClienteItemDto> {
    if (!pagoId?.trim()) {
      throw new NotFoundException('Pago no encontrado');
    }

    const estadoNormalizado = this.normalizarEstadoPago(dto.estado);
    const estadosValidos = [
      ESTADO_PAGO_PENDIENTE,
      ESTADO_PAGO_PROCESANDO,
      ESTADO_PAGO_PAGADO,
    ];
    if (!estadosValidos.includes(estadoNormalizado)) {
      throw new BadRequestException(
        'El estado debe ser PENDIENTE, PROCESANDO o PAGADO',
      );
    }

    const supabase = this.supabaseConfig.getClient();

    const { data: existing, error: findError } = await supabase
      .from('pagos_cliente')
      .select(PAGO_SELECT_FIELDS)
      .eq('id', pagoId.trim())
      .maybeSingle();

    if (findError) {
      throw new InternalServerErrorException(
        `Error al buscar el pago: ${findError.message}`,
      );
    }
    if (!existing) {
      throw new NotFoundException('Pago no encontrado');
    }

    this.assertClienteAccess(user, existing.cliente_id);

    const updateRow: Record<string, unknown> = {
      estado: estadoNormalizado,
    };

    if (dto.metodoPago !== undefined) {
      updateRow.metodo_pago = dto.metodoPago?.trim() || null;
    }

    if (dto.referenciaTransaccion !== undefined) {
      updateRow.referencia_transaccion = dto.referenciaTransaccion?.trim() || null;
    }

    if (estadoNormalizado === ESTADO_PAGO_PAGADO) {
      updateRow.fecha_pago = new Date().toISOString();
    } else if (estadoNormalizado === ESTADO_PAGO_PENDIENTE) {
      updateRow.fecha_pago = null;
    }

    const { data: updated, error: updateError } = await supabase
      .from('pagos_cliente')
      .update(updateRow)
      .eq('id', pagoId.trim())
      .select(PAGO_SELECT_FIELDS)
      .single();

    if (updateError || !updated) {
      throw new InternalServerErrorException(
        `No fue posible actualizar el pago: ${updateError?.message}`,
      );
    }

    return this.mapPagoRow(updated);
  }

  private async mapPagoRow(row: Record<string, unknown>): Promise<PagoClienteItemDto> {
    const clienteRaw = row.clientes as
      | { id: string; nombre: string | null }
      | { id: string; nombre: string | null }[]
      | null
      | undefined;
    const cliente = Array.isArray(clienteRaw) ? clienteRaw[0] : clienteRaw;

    const montoTotal = this.redondearMonto(Number(row.monto_total ?? 0));
    const rutas = await this.fetchRutasByPago(String(row.id), montoTotal);

    return {
      id: String(row.id),
      clienteId: String(row.cliente_id),
      clienteNombre: cliente?.nombre ?? null,
      montoTotal,
      estado: this.normalizarEstadoPago(String(row.estado ?? ESTADO_PAGO_PENDIENTE)),
      fechaCreacion: String(row.fecha_creacion),
      fechaPago: row.fecha_pago ? String(row.fecha_pago) : null,
      metodoPago: row.metodo_pago ? String(row.metodo_pago) : null,
      referenciaTransaccion: row.referencia_transaccion
        ? String(row.referencia_transaccion)
        : null,
      rutas,
    };
  }

  private async fetchRutasByPago(
    pagoId: string,
    montoTotalPago: number,
  ): Promise<PagoClienteRutaDto[]> {
    const supabase = this.supabaseConfig.getClient();

    const { data: rutas, error } = await supabase
      .from('rutas')
      .select(
        `
        id,
        origen,
        destino,
        estado,
        fecha_fin,
        monto_pago_cliente
      `,
      )
      .eq('pago_cliente_id', pagoId)
      .order('fecha_fin', { ascending: false });

    if (error) {
      console.warn(`No fue posible cargar rutas del pago ${pagoId}: ${error.message}`);
      return [];
    }

    if (!rutas || rutas.length === 0) {
      return [];
    }

    return this.resolverMontosRutasPersistidos(rutas, montoTotalPago);
  }

  private resolverMontosRutasPersistidos(
    rutas: Array<{
      id: string;
      origen: string | null;
      destino: string | null;
      estado: string;
      fecha_fin: string | null;
      monto_pago_cliente?: number | string | null;
    }>,
    montoTotalPago: number,
  ): PagoClienteRutaDto[] {
    const montos = new Map<string, number>();
    const sinMonto: typeof rutas = [];

    for (const ruta of rutas) {
      const persistido = ruta.monto_pago_cliente;
      if (persistido != null && persistido !== '') {
        montos.set(ruta.id, this.redondearMonto(Number(persistido)));
      } else {
        sinMonto.push(ruta);
      }
    }

    if (sinMonto.length > 0) {
      const yaAsignado = this.sumarMontos([...montos.values()]);
      const restante = this.redondearMonto(montoTotalPago - yaAsignado);
      const partes = sinMonto.length;
      const base = this.redondearMonto(restante / partes);

      sinMonto.forEach((ruta, index) => {
        if (index === partes - 1) {
          const usado = this.sumarMontos([...montos.values()]);
          montos.set(ruta.id, this.redondearMonto(montoTotalPago - usado));
        } else {
          montos.set(ruta.id, base);
        }
      });
    }

    return rutas.map((ruta) => ({
      id: ruta.id,
      origen: ruta.origen ?? null,
      destino: ruta.destino ?? null,
      estado: ruta.estado,
      montoRuta: montos.get(ruta.id) ?? 0,
      fechaFin: ruta.fecha_fin ?? null,
    }));
  }

  private calcularMontoRutaVigente(
    ruta: RutaRow,
    tarifas: Awaited<ReturnType<ConfiguracionPagosService['getTarifas']>>,
  ): number {
    const entregas = this.normalizarEntregas(ruta.entregas);
    const entregasValidas = entregas.filter((e) => e.validado !== false).length;
    const totalEntregas = entregasValidas > 0 ? entregasValidas : 1;

    const bultos = Number(ruta.bultos_despachados ?? 0);
    const km = Number(ruta.distancia_km ?? 0);

    const monto =
      tarifas.precioPorRuta +
      totalEntregas * tarifas.precioPorEntrega +
      bultos * tarifas.precioPorBulto +
      km * tarifas.precioPorKm;

    return this.redondearMonto(monto);
  }

  private redondearMonto(valor: number): number {
    if (!Number.isFinite(valor)) {
      return 0;
    }
    return Number(valor.toFixed(2));
  }

  private sumarMontos(valores: number[]): number {
    return this.redondearMonto(
      valores.reduce((sum, v) => sum + this.redondearMonto(v), 0),
    );
  }

  private normalizarEstadoPago(estado: string): string {
    const upper = String(estado || '').trim().toUpperCase();
    if (upper === ESTADO_PAGO_PAGADO) {
      return ESTADO_PAGO_PAGADO;
    }
    if (upper === ESTADO_PAGO_PROCESANDO) {
      return ESTADO_PAGO_PROCESANDO;
    }
    return ESTADO_PAGO_PENDIENTE;
  }

  private normalizarEntregas(
    entregas: RutaRow['entregas'],
  ): { id: string; validado: boolean | null }[] {
    if (!entregas) return [];
    return Array.isArray(entregas) ? entregas : [entregas];
  }

  private buildListResponse(items: PagoClienteItemDto[]): PagosClienteListResponse {
    const totalPendiente = this.sumarMontos(
      items
        .filter(
          (p) =>
            p.estado === ESTADO_PAGO_PENDIENTE ||
            p.estado === ESTADO_PAGO_PROCESANDO,
        )
        .map((p) => p.montoTotal),
    );
    const totalPagado = this.sumarMontos(
      items.filter((p) => p.estado === ESTADO_PAGO_PAGADO).map((p) => p.montoTotal),
    );

    return {
      data: items,
      total: items.length,
      totalAcumulado: this.sumarMontos([totalPendiente, totalPagado]),
      totalPendiente,
      totalPagado,
    };
  }
}
