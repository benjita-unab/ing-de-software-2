export type FrecuenciaRecurrencia = 'diaria' | 'semanal' | 'mensual';

export interface RecurrenciaScheduleParams {
  frecuencia: FrecuenciaRecurrencia;
  intervalo: number;
  dia_semana?: number | null;
  dia_mes?: number | null;
  hora_ejecucion: string;
  fecha_inicio: string;
  fecha_fin?: string | null;
}

function parseHora(hora: string): { h: number; m: number; s: number } {
  const parts = String(hora || '08:00:00').split(':');
  return {
    h: Number(parts[0]) || 8,
    m: Number(parts[1]) || 0,
    s: Number(parts[2]) || 0,
  };
}

export function applyHoraEjecucion(base: Date, hora_ejecucion: string): Date {
  const { h, m, s } = parseHora(hora_ejecucion);
  const d = new Date(base);
  d.setUTCHours(h, m, s, 0);
  return d;
}

/** ISO weekday: 1 = lunes … 7 = domingo */
export function isoWeekdayUtc(d: Date): number {
  const day = d.getUTCDay();
  return day === 0 ? 7 : day;
}

function parseDateOnly(value: string): Date {
  const trimmed = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T12:00:00.000Z`);
  }
  return new Date(trimmed);
}

function daysInMonthUtc(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function alignWeekly(date: Date, dia_semana: number, hora_ejecucion: string): Date {
  const d = new Date(date);
  let guard = 0;
  while (isoWeekdayUtc(d) !== dia_semana && guard < 7) {
    d.setUTCDate(d.getUTCDate() + 1);
    guard += 1;
  }
  return applyHoraEjecucion(d, hora_ejecucion);
}

function alignMonthly(date: Date, dia_mes: number, hora_ejecucion: string): Date {
  const d = new Date(date);
  const maxDay = daysInMonthUtc(d.getUTCFullYear(), d.getUTCMonth());
  d.setUTCDate(Math.min(dia_mes, maxDay));
  return applyHoraEjecucion(d, hora_ejecucion);
}

export function computeInitialProximaEjecucion(
  params: RecurrenciaScheduleParams,
  now: Date = new Date(),
): Date {
  let candidate = applyHoraEjecucion(
    parseDateOnly(params.fecha_inicio),
    params.hora_ejecucion,
  );

  if (params.frecuencia === 'semanal' && params.dia_semana) {
    candidate = alignWeekly(candidate, params.dia_semana, params.hora_ejecucion);
  }

  if (params.frecuencia === 'mensual' && params.dia_mes) {
    candidate = alignMonthly(candidate, params.dia_mes, params.hora_ejecucion);
  }

  while (candidate < now) {
    candidate = advanceProximaEjecucion(candidate, params);
  }

  return candidate;
}

export function advanceProximaEjecucion(
  from: Date,
  params: RecurrenciaScheduleParams,
): Date {
  const intervalo = Math.max(1, params.intervalo || 1);
  const next = new Date(from);

  if (params.frecuencia === 'diaria') {
    next.setUTCDate(next.getUTCDate() + intervalo);
    return applyHoraEjecucion(next, params.hora_ejecucion);
  }

  if (params.frecuencia === 'semanal') {
    next.setUTCDate(next.getUTCDate() + 7 * intervalo);
    if (params.dia_semana) {
      return alignWeekly(next, params.dia_semana, params.hora_ejecucion);
    }
    return applyHoraEjecucion(next, params.hora_ejecucion);
  }

  if (params.frecuencia === 'mensual') {
    next.setUTCMonth(next.getUTCMonth() + intervalo);
    if (params.dia_mes) {
      return alignMonthly(next, params.dia_mes, params.hora_ejecucion);
    }
    return applyHoraEjecucion(next, params.hora_ejecucion);
  }

  next.setUTCDate(next.getUTCDate() + intervalo);
  return applyHoraEjecucion(next, params.hora_ejecucion);
}

export function computeProximasFechas(
  params: RecurrenciaScheduleParams & { proxima_ejecucion: string },
  count = 5,
): string[] {
  const fechas: string[] = [];
  let cursor = new Date(params.proxima_ejecucion);
  const fin = params.fecha_fin ? parseDateOnly(params.fecha_fin) : null;

  for (let i = 0; i < count; i += 1) {
    if (fin) {
      const cursorDate = new Date(
        Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate()),
      );
      const finDate = new Date(
        Date.UTC(fin.getUTCFullYear(), fin.getUTCMonth(), fin.getUTCDate()),
      );
      if (cursorDate > finDate) break;
    }
    fechas.push(cursor.toISOString());
    cursor = advanceProximaEjecucion(cursor, params);
  }

  return fechas;
}
