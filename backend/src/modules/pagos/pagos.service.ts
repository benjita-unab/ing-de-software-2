import { Injectable, InternalServerErrorException, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseConfigService } from '../../config/supabase.config';
import { WebpayPlus, Options, IntegrationApiKeys, Environment, IntegrationCommerceCodes } from 'transbank-sdk';

@Injectable()
export class PagosService {
  private readonly logger = new Logger(PagosService.name);

  private tx: any;

  constructor(
    private readonly supabaseConfig: SupabaseConfigService,
    private readonly configService: ConfigService,
  ) {
    this.tx = new WebpayPlus.Transaction(new Options(IntegrationCommerceCodes.WEBPAY_PLUS, IntegrationApiKeys.WEBPAY, Environment.Integration));
  }

  async crearCobro(rutaId: string, monto: number, tipo: 'base' | 'atraso' = 'base') {
    const supabase = this.supabaseConfig.getClient();

    // 1. Validar que la ruta existe
    const { data: ruta, error: rutaError } = await supabase
      .from('rutas')
      .select('id, nombre_ruta, estado_pago, estado')
      .eq('id', rutaId)
      .single();

    if (rutaError || !ruta) {
      throw new NotFoundException(`Ruta ${rutaId} no encontrada`);
    }

    if (ruta.estado_pago === 'pagado' && ruta.estado !== 'PAGO_ATRASO_PENDIENTE') {
      throw new BadRequestException('La ruta ya se encuentra pagada y no tiene atrasos pendientes.');
    }

    // 2. Preparar payload para Transbank Webpay Plus
    const backendUrl = this.configService.get<string>('BACKEND_URL') || process.env.BACKEND_URL || 'http://localhost:3000';
    const returnUrl = `${backendUrl}/api/pagos/transbank-return`;

    const prefix = tipo === 'atraso' ? 'LOGI-A' : 'LOGI-B';
    const buyOrder = `${prefix}-${rutaId.substring(0, 8)}-${Date.now()}`.substring(0, 26); // Webpay limit 26 chars
    const sessionId = rutaId.substring(0, 61); // Webpay limit 61 chars

    try {
      const response = await this.tx.create(
        buyOrder,
        sessionId,
        monto,
        returnUrl
      );

      return {
        paymentUrl: `${response.url}?token_ws=${response.token}`,
        paymentId: response.token,
      };
    } catch (error: any) {
      this.logger.error('Error al crear cobro en Transbank', error.message);
      throw new InternalServerErrorException('Error al comunicarse con Transbank para crear el cobro');
    }
  }

  async confirmarTransaccion(tokenWs: string) {
    try {
      const response = await this.tx.commit(tokenWs);

      if (response.status !== 'AUTHORIZED') {
        this.logger.log(`El pago no fue autorizado. Estado actual: ${response.status}`);
        return { success: false, message: 'Pago no autorizado o anulado', status: response.status, rutaId: response.session_id };
      }

      const rutaId = response.session_id; // Guardamos el rutaId en el sessionId
      if (!rutaId) {
        throw new BadRequestException('El pago de Transbank no incluye el sessionId (rutaId)');
      }

      const supabase = this.supabaseConfig.getClient();

      const isAtraso = response.buy_order && response.buy_order.startsWith('LOGI-A-');

      // Transaccion manual simulada: Actualizar Ruta e Insertar Comprobante
      // Verificar si la ruta tiene un conductor asignado (auto-resuelto en la creacion)
      const { data: ruta } = await supabase
        .from('rutas')
        .select('conductor_id, estado')
        .eq('id', rutaId)
        .single();

      if (isAtraso) {
        // Pago de deuda de atraso
        const { error: updateError } = await supabase
          .from('rutas')
          .update({ estado: 'COMPLETADO' })
          .eq('id', rutaId);

        if (updateError) throw new InternalServerErrorException('Error al actualizar estado de atraso');

        // Insertar comprobante de atraso
        await supabase.from('comprobantes_pago').insert({
          ruta_id: rutaId,
          monto: response.amount,
          metodo_pago: 'transbank_atraso',
          transaction_id: response.buy_order,
          metadata: response,
        });

      } else {
        // Pago base normal
        let newState = ruta?.conductor_id ? 'ASIGNADO' : 'PENDIENTE';
        if (ruta?.estado === 'PAGO_ATRASO_PENDIENTE') {
          newState = 'COMPLETADO';
        }

        // 1. Actualizar estado_pago y estado en rutas
        const { error: updateError } = await supabase
          .from('rutas')
          .update({ estado_pago: 'pagado', estado: newState })
          .eq('id', rutaId);

        if (updateError) {
          throw new InternalServerErrorException('Error al actualizar estado_pago de la ruta');
        }

        // 2. Guardar comprobante
        const { error: insertError } = await supabase
          .from('comprobantes_pago')
          .insert({
            ruta_id: rutaId,
            monto: response.amount,
            metodo_pago: 'transbank',
            transaction_id: response.buy_order,
            metadata: response,
          });

        if (insertError) {
          this.logger.error('Error insertando comprobante_pago', insertError);
          throw new InternalServerErrorException('Pago recibido pero fallo el registro del comprobante');
        }
      }

      return { success: true, message: 'Pago procesado exitosamente', rutaId };
    } catch (error: any) {
      this.logger.error('Error al procesar commit de Transbank', error.message);
      // Podría ser un token ya procesado o inválido
      throw new InternalServerErrorException('Error al procesar el retorno de Transbank');
    }
  }

  async obtenerComprobante(rutaId: string) {
    const supabase = this.supabaseConfig.getClient();
    const { data, error } = await supabase
      .from('comprobantes_pago')
      .select(`
        *,
        rutas (
          nombre_ruta,
          origen,
          destino
        )
      `)
      .eq('ruta_id', rutaId)
      .order('fecha_pago', { ascending: true });

    if (error) {
      this.logger.error('Error supabase en obtenerComprobante:', error);
      throw new InternalServerErrorException('Error al obtener comprobantes: ' + error.message);
    }
    if (!data || data.length === 0) {
      throw new NotFoundException('Comprobantes no encontrados para esta ruta');
    }

    return data;
  }
}
