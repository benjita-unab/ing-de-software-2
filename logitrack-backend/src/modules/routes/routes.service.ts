/**
 * routes.service.ts
 *
 * Consulta una ruta con sus entregas y el cliente asociado.
 * El cliente es nullable — si no existe no se lanza error.
 */

import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { HttpError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';

const LOG = 'Routes';

export interface RouteData {
  id: string;
  // Agrega aquí los campos que existan en tu tabla `rutas`
  [key: string]: unknown;
  entregas: EntregaData[];
}

export interface EntregaData {
  id: string;
  validado: boolean;
  firma_url: string | null;
  cliente: ClienteData | null;
}

export interface ClienteData {
  id: string;
  nombre: string;
  contacto_email: string | null;
}

export async function getRouteById(id: string): Promise<RouteData> {
  logger.info(LOG, `Consultando ruta id=${id}`);

  const { data: ruta, error: rutaError } = await supabaseAdmin
    .from('rutas')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (rutaError) {
    logger.error(LOG, 'Error al consultar ruta', rutaError.message);
    throw new HttpError(502, 'Error al consultar ruta', rutaError.message);
  }

  if (!ruta) {
    logger.warn(LOG, `Ruta no encontrada: id=${id}`);
    throw new HttpError(404, `Ruta no encontrada: ${id}`);
  }

  // ── Consultar entregas con cliente ─────────────────────────────────────────
  const { data: entregas, error: entregasError } = await supabaseAdmin
    .from('entregas')
    .select(`
      id,
      validado,
      firma_url,
      clientes (
        id,
        nombre,
        contacto_email
      )
    `)
    .eq('ruta_id', id);

  if (entregasError) {
    logger.error(LOG, 'Error al consultar entregas de ruta', entregasError.message);
    throw new HttpError(502, 'Error al consultar entregas', entregasError.message);
  }

  const entregasMapped: EntregaData[] = (entregas ?? []).map((e: any) => ({
    id: e.id,
    validado: e.validado ?? false,
    firma_url: e.firma_url ?? null,
    cliente: e.clientes
      ? {
          id: e.clientes.id,
          nombre: e.clientes.nombre,
          contacto_email: e.clientes.contacto_email ?? null,
        }
      : null,
  }));

  logger.info(LOG, `✓ Ruta encontrada. id=${id}, entregas=${entregasMapped.length}`);

  return {
    ...ruta,
    entregas: entregasMapped,
  };
}
