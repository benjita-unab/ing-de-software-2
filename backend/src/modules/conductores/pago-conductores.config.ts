import { ConfigService } from '@nestjs/config';

/** Tarifas configurables vía variables de entorno (HU-37). */
export type PagoTarifas = {
  precioPorRuta: number;
  precioPorEntrega: number;
  precioPorBulto: number;
  precioPorKm: number;
};

const DEFAULTS: PagoTarifas = {
  precioPorRuta: 10_000,
  precioPorEntrega: 3_000,
  precioPorBulto: 500,
  precioPorKm: 150,
};

export const DEFAULT_PAGO_TARIFAS: PagoTarifas = { ...DEFAULTS };

function parsePositiveNumber(raw: string | undefined, fallback: number): number {
  if (raw == null || String(raw).trim() === '') return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

export function getPagoTarifasFromEnv(config: ConfigService): PagoTarifas {
  return {
    precioPorRuta: parsePositiveNumber(
      config.get<string>('PAGO_PRECIO_POR_RUTA'),
      DEFAULTS.precioPorRuta,
    ),
    precioPorEntrega: parsePositiveNumber(
      config.get<string>('PAGO_PRECIO_POR_ENTREGA'),
      DEFAULTS.precioPorEntrega,
    ),
    precioPorBulto: parsePositiveNumber(
      config.get<string>('PAGO_PRECIO_POR_BULTO'),
      DEFAULTS.precioPorBulto,
    ),
    precioPorKm: parsePositiveNumber(
      config.get<string>('PAGO_PRECIO_POR_KM'),
      DEFAULTS.precioPorKm,
    ),
  };
}
