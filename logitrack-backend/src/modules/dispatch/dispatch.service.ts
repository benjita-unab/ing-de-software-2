/**
 * dispatch.service.ts
 *
 * Lógica de cierre de despacho:
 *  1. Busca la ruta con sus entregas y cliente.
 *  2. Si no hay cliente asociado: NO lanza error, retorna warning controlado.
 *  3. Si hay cliente: marca entregas como validado=true y guarda firma_url.
 *
 * El cierre siempre se registra (closed: true) aunque no haya cliente.
 */

import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { HttpError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';

const LOG = 'Dispatch';

export interface DispatchCloseResult {
  closed: boolean;
  ruta_id: string;
  entregasActualizadas: number;
  warning?: string;
}

export async function closeDispatch(
  rutaId: string,
  firmaUrl: string
): Promise<DispatchCloseResult> {
  logger.info(LOG, `Iniciando cierre de despacho. ruta_id=${rutaId}`);

  // ── 1. Obtener entregas de la ruta con cliente ─────────────────────────────
  const { data: entregas, error: entregasError } = await supabaseAdmin
    .from('entregas')
    .select(`
      id,
      cliente_id,
      validado,
      clientes (
        id,
        nombre
      )
    `)
    .eq('ruta_id', rutaId);

  if (entregasError) {
    logger.error(LOG, 'Error al consultar entregas', entregasError.message);
    throw new HttpError(502, 'Error al consultar entregas de la ruta', entregasError.message);
  }

  // ── 2. Validar si existe la ruta / hay entregas ────────────────────────────
  if (!entregas || entregas.length === 0) {
    logger.warn(LOG, `No se encontraron entregas para ruta_id=${rutaId}`);
    // Retornar warning controlado, NO error fatal (consistent con spec)
    return {
      closed: true,
      ruta_id: rutaId,
      entregasActualizadas: 0,
      warning: 'No se encontraron entregas para esta ruta',
    };
  }

  // ── 3. Verificar si alguna entrega tiene cliente ───────────────────────────
  const tieneCliente = entregas.some(
    (e) => e.cliente_id !== null && e.cliente_id !== undefined
  );

  if (!tieneCliente) {
    logger.warn(LOG, `Ruta ${rutaId} no tiene cliente asociado. Cerrando con warning.`);
    // Igualmente marcar como validado, pero retornar warning
    await marcarEntregasValidadas(rutaId, firmaUrl);
    return {
      closed: true,
      ruta_id: rutaId,
      entregasActualizadas: entregas.length,
      warning: 'Ruta sin cliente asociado',
    };
  }

  // ── 4. Marcar entregas como validadas ─────────────────────────────────────
  const actualizadas = await marcarEntregasValidadas(rutaId, firmaUrl);
  logger.info(LOG, `✓ Despacho cerrado. ruta_id=${rutaId}, entregas actualizadas=${actualizadas}`);

  return {
    closed: true,
    ruta_id: rutaId,
    entregasActualizadas: actualizadas,
  };
}

async function marcarEntregasValidadas(rutaId: string, firmaUrl: string): Promise<number> {
  logger.debug('Dispatch', `Marcando validado=true, firma_url para ruta_id=${rutaId}`);

  const { data, error } = await supabaseAdmin
    .from('entregas')
    .update({ validado: true, firma_url: firmaUrl })
    .eq('ruta_id', rutaId)
    .select('id');

  if (error) {
    logger.error('Dispatch', 'Error al actualizar entregas', error.message);
    throw new HttpError(502, 'Error al marcar entregas como validadas', error.message);
  }

  return data?.length ?? 0;
}
