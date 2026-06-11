/**
 * HU-40: hook de alertas operativas desde mensajes_conductor.
 *
 * Responsabilidades:
 * - Exponer eventos del conductor como `alertas` (urgencias + estados).
 * - Contadores y badge de sidebar (`urgentCount`, `hasUnreadAlertas`).
 * - Alarma sonora ante nuevas emergencias ALTA sin confirmar.
 *
 * Polling: delega en useMensajesConductor (única instancia en OperatorDashboard).
 *
 * Convive con useAlerts (incidencias legacy):
 * - useAlerts → tabla incidencias, dashboard KPIs/ticker/mapa legacy.
 * - useAlertasConductor → mensajes_conductor, pestaña Alertas, badge sidebar, alarma.
 * Ambos hooks son necesarios hasta unificar incidencias con mensajes_conductor.
 */
import { useEffect, useRef } from 'react';
import { useMensajesConductor } from './useMensajesConductor';
import {
  countUrgentAlertas,
  hasUnreadAlertas,
  isUrgentAlerta,
  playAlertaAlarm,
} from '../lib/alertasConductorUtils';

export {
  sortMensajes,
  sortMensajes as sortAlertas,
  groupMensajesByRuta,
  groupMensajesByRuta as groupAlertasByRuta,
} from './useMensajesConductor';

export {
  countUrgentAlertas,
  hasUnreadAlertas,
  isUrgentAlerta,
  playAlertaAlarm,
} from '../lib/alertasConductorUtils';

export function useAlertasConductor(options = {}) {
  const { playAlarm = true } = options;
  const playedUrgentIdsRef = useRef(new Set());

  const {
    mensajes: alertas,
    rutas,
    rutasMap,
    loading,
    error,
    acknowledgeMensaje: acknowledgeAlerta,
  } = useMensajesConductor();

  useEffect(() => {
    if (!playAlarm) return;
    const newUrgent = alertas.filter(
      (item) => isUrgentAlerta(item) && !playedUrgentIdsRef.current.has(item.id),
    );
    if (newUrgent.length > 0) {
      playAlertaAlarm();
      newUrgent.forEach((item) => playedUrgentIdsRef.current.add(item.id));
    }
  }, [alertas, playAlarm]);

  return {
    alertas,
    rutas,
    rutasMap,
    loading,
    error,
    acknowledgeAlerta,
    urgentCount: countUrgentAlertas(alertas),
    hasUnreadAlertas: hasUnreadAlertas(alertas),
  };
}
