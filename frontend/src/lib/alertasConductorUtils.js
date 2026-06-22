/**
 * HU-40: utilidades compartidas para alertas operativas (mensajes_conductor).
 * Toda la lógica de urgencia, contadores y alarma vive aquí — no en Mensajes.
 */

export function isUrgentAlerta(item) {
  return item?.prioridad === 'ALTA' && !item?.acknowledged;
}

export function countUrgentAlertas(alertas = []) {
  return alertas.filter(isUrgentAlerta).length;
}

export function hasUnreadAlertas(alertas = []) {
  return alertas.some(isUrgentAlerta);
}

export function playAlertaAlarm() {
  if (typeof window === 'undefined') return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 800;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {
    console.warn('Audio context failed:', e);
  }
}
