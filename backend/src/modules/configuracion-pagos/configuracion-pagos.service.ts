import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseConfigService } from '../../config/supabase.config';
import {
  getPagoTarifasFromEnv,
  PagoTarifas,
} from '../conductores/pago-conductores.config';

const SINGLETON_KEY = 'default';

const DEFAULT_COMBUSTIBLE_LITRO = 1200;
const DEFAULT_ESPERA_MINUTO = 500;

export type ConfiguracionOperativa = {
  precioCombustibleLitro: number;
  precioEsperaMinuto: number;
};

export type ConfiguracionPagosRecord = PagoTarifas &
  ConfiguracionOperativa & {
    updatedAt: string | null;
    updatedBy: string | null;
    source: 'database' | 'env_fallback';
  };

export type UpdateConfiguracionPagosDto = PagoTarifas & ConfiguracionOperativa;

type ConfiguracionPagosRow = {
  precio_por_ruta: number | string;
  precio_por_entrega: number | string;
  precio_por_bulto: number | string;
  precio_por_km: number | string;
  precio_combustible_litro?: number | string | null;
  precio_espera_minuto?: number | string | null;
  updated_at: string | null;
  updated_by: string | null;
};

@Injectable()
export class ConfiguracionPagosService {
  constructor(
    private readonly supabaseConfig: SupabaseConfigService,
    private readonly config: ConfigService,
  ) {}

  async getTarifas(): Promise<PagoTarifas> {
    const record = await this.getConfiguracion();
    return {
      precioPorRuta: record.precioPorRuta,
      precioPorEntrega: record.precioPorEntrega,
      precioPorBulto: record.precioPorBulto,
      precioPorKm: record.precioPorKm,
    };
  }

  /** HU-50: precios globales de combustible y espera. */
  async getConfiguracionOperativa(): Promise<ConfiguracionOperativa> {
    const record = await this.getConfiguracion();
    return {
      precioCombustibleLitro: record.precioCombustibleLitro,
      precioEsperaMinuto: record.precioEsperaMinuto,
    };
  }

  async getConfiguracion(): Promise<ConfiguracionPagosRecord> {
    const envFallback = this.getEnvFallback();

    try {
      const supabase = this.supabaseConfig.getClient();
      const { data, error } = await supabase
        .from('configuracion_pagos')
        .select(
          'precio_por_ruta, precio_por_entrega, precio_por_bulto, precio_por_km, precio_combustible_litro, precio_espera_minuto, updated_at, updated_by',
        )
        .eq('singleton_key', SINGLETON_KEY)
        .maybeSingle();

      if (error || !data) {
        return {
          ...envFallback,
          updatedAt: null,
          updatedBy: null,
          source: 'env_fallback',
        };
      }

      return this.mapRow(data as ConfiguracionPagosRow, envFallback);
    } catch {
      return {
        ...envFallback,
        updatedAt: null,
        updatedBy: null,
        source: 'env_fallback',
      };
    }
  }

  async updateConfiguracion(
    dto: UpdateConfiguracionPagosDto,
    userId: string,
  ): Promise<ConfiguracionPagosRecord> {
    this.validateDto(dto);

    const supabase = this.supabaseConfig.getClient();
    const payload = {
      singleton_key: SINGLETON_KEY,
      precio_por_ruta: dto.precioPorRuta,
      precio_por_entrega: dto.precioPorEntrega,
      precio_por_bulto: dto.precioPorBulto,
      precio_por_km: dto.precioPorKm,
      precio_combustible_litro: dto.precioCombustibleLitro,
      precio_espera_minuto: dto.precioEsperaMinuto,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    };

    const { data, error } = await supabase
      .from('configuracion_pagos')
      .upsert(payload, { onConflict: 'singleton_key' })
      .select(
        'precio_por_ruta, precio_por_entrega, precio_por_bulto, precio_por_km, precio_combustible_litro, precio_espera_minuto, updated_at, updated_by',
      )
      .single();

    if (error || !data) {
      throw new BadRequestException(
        `No se pudo guardar la configuración de pagos: ${error?.message ?? 'error desconocido'}`,
      );
    }

    return this.mapRow(data as ConfiguracionPagosRow, this.getEnvFallback(), 'database');
  }

  private getEnvFallback(): PagoTarifas & ConfiguracionOperativa {
    const tarifas = getPagoTarifasFromEnv(this.config);
    return {
      ...tarifas,
      precioCombustibleLitro: this.parseTarifa(
        this.config.get<string>('PRECIO_COMBUSTIBLE_LITRO'),
        DEFAULT_COMBUSTIBLE_LITRO,
      ),
      precioEsperaMinuto: this.parseTarifa(
        this.config.get<string>('PRECIO_ESPERA_MINUTO'),
        DEFAULT_ESPERA_MINUTO,
      ),
    };
  }

  private mapRow(
    row: ConfiguracionPagosRow,
    envFallback: PagoTarifas & ConfiguracionOperativa,
    source: 'database' | 'env_fallback' = 'database',
  ): ConfiguracionPagosRecord {
    return {
      precioPorRuta: this.parseTarifa(row.precio_por_ruta, envFallback.precioPorRuta),
      precioPorEntrega: this.parseTarifa(
        row.precio_por_entrega,
        envFallback.precioPorEntrega,
      ),
      precioPorBulto: this.parseTarifa(row.precio_por_bulto, envFallback.precioPorBulto),
      precioPorKm: this.parseTarifa(row.precio_por_km, envFallback.precioPorKm),
      precioCombustibleLitro: this.parseTarifa(
        row.precio_combustible_litro,
        envFallback.precioCombustibleLitro,
      ),
      precioEsperaMinuto: this.parseTarifa(
        row.precio_espera_minuto,
        envFallback.precioEsperaMinuto,
      ),
      updatedAt: row.updated_at ?? null,
      updatedBy: row.updated_by ?? null,
      source,
    };
  }

  private parseTarifa(raw: number | string | null | undefined, fallback: number): number {
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return fallback;
    return n;
  }

  private validateDto(dto: UpdateConfiguracionPagosDto): void {
    const fields: (keyof UpdateConfiguracionPagosDto)[] = [
      'precioPorRuta',
      'precioPorEntrega',
      'precioPorBulto',
      'precioPorKm',
      'precioCombustibleLitro',
      'precioEsperaMinuto',
    ];

    for (const field of fields) {
      const value = dto[field];
      if (value == null || !Number.isFinite(Number(value)) || Number(value) < 0) {
        throw new BadRequestException(
          `${field} debe ser un número mayor o igual a 0`,
        );
      }
    }
  }
}
