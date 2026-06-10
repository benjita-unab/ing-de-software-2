import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseConfigService } from '../../config/supabase.config';

@Injectable()
export class PagosService {
  constructor(private supabase: SupabaseConfigService) {}

  async getPagosByCliente(clienteId: string) {
    const client = this.supabase.getClient();
    const { data: pagos, error } = await client
      .from('pagos')
      .select(`
        id, cliente_id, monto_total, estado, fecha_creacion, fecha_pago, metodo_pago,
        rutas (id, estado, origen, destino, costo_servicio, fecha_inicio)
      `)
      .eq('cliente_id', clienteId)
      .order('fecha_creacion', { ascending: false });

    if (error) {
      throw new InternalServerErrorException(error.message);
    }
    return pagos;
  }

  async getRutasPendientesDeCobro(clienteId: string) {
    const client = this.supabase.getClient();
    const { data: rutas, error } = await client
      .from('rutas')
      .select('id, origen, destino, estado, fecha_inicio, costo_servicio')
      .eq('cliente_id', clienteId)
      .is('pago_id', null)
      .in('estado', ['entregado', 'completado']);

    if (error) {
      throw new InternalServerErrorException(error.message);
    }
    return rutas;
  }

  async generarPago(data: { cliente_id: string; rutas_ids: string[]; monto_total: number }) {
    const client = this.supabase.getClient();
    
    // 1. Create pago
    const { data: pago, error: errPago } = await client
      .from('pagos')
      .insert({
        cliente_id: data.cliente_id,
        monto_total: data.monto_total,
        estado: 'PENDIENTE'
      })
      .select()
      .single();

    if (errPago) throw new InternalServerErrorException(errPago.message);

    // 2. Associate rutas to pago
    if (data.rutas_ids && data.rutas_ids.length > 0) {
      const { error: errUpdate } = await client
        .from('rutas')
        .update({ pago_id: pago.id })
        .in('id', data.rutas_ids);

      if (errUpdate) {
        throw new InternalServerErrorException(errUpdate.message);
      }
    }

    return { message: 'Pago generado exitosamente', pago };
  }

  async marcarPagoComo(pagoId: string, estado: string) {
    const client = this.supabase.getClient();
    const isPagado = estado === 'PAGADO';
    
    const updateData: any = { estado };
    if (isPagado) {
      updateData.fecha_pago = new Date().toISOString();
    }

    const { data, error } = await client
      .from('pagos')
      .update(updateData)
      .eq('id', pagoId)
      .select()
      .single();

    if (error) throw new InternalServerErrorException(error.message);
    return data;
  }
}
