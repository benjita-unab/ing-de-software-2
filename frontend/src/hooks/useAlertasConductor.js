/**
 * HU-40 Fase 1: alertas operativas desde mensajes_conductor.
 * Reutiliza la lógica de useMensajesConductor sin duplicar fetch/polling.
 */
import { useMensajesConductor } from './useMensajesConductor';

export {
  sortMensajes,
  sortMensajes as sortAlertas,
  groupMensajesByRuta,
  groupMensajesByRuta as groupAlertasByRuta,
} from './useMensajesConductor';

export function countUrgentAlertas(alertas = []) {
  return alertas.filter(
    (item) => item.prioridad === 'ALTA' && !item.acknowledged,
  ).length;
}

export function hasUnreadAlertas(alertas = []) {
  return alertas.some(
    (item) => item.prioridad === 'ALTA' && !item.acknowledged,
  );
}

export function useAlertasConductor() {
  const {
    mensajes: alertas,
    rutas,
    rutasMap,
    loading,
    error,
    acknowledgeMensaje: acknowledgeAlerta,
  } = useMensajesConductor();

  return {
    alertas,
    rutas,
    rutasMap,
    loading,
    error,
    acknowledgeAlerta,
    urgentCount: countUrgentAlertas(alertas),
    hasUnreadEmergencies: hasUnreadAlertas(alertas),
  };
}
