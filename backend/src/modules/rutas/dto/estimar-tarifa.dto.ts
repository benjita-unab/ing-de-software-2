export type BultoTarifaInputDto = {
  categoria?: string | null;
};

export type EstimarTarifaDto = {
  distancia_km?: number | string | null;
  bultos_detalle?: BultoTarifaInputDto[] | null;
  is_tarifa_manual?: boolean | null;
  tarifa_base_total?: number | string | null;
  costo_espera_total?: number | string | null;
  costo_tac_peajes_clp?: number | string | null;
  bultos_despachados?: number | string | null;
  cantidad_paradas?: number | string | null;
  rendimiento_km_l?: number | string | null;
  modo_retorno?: boolean | null;
};

export type DesgloseTarifaBultoDto = {
  indice: number;
  categoria: string;
  tarifaClp: number;
};

export type CostosOperativosPreviewDto = {
  combustible: number;
  conductor: number;
  tac: number;
  total: number;
  margen: number;
};

export type TarifaComercialResultDto = {
  tarifaBaseTotal: number;
  iva: number;
  costoServicio: number;
  costoEsperaTotal: number;
  totalPagar: number;
  isTarifaManual: boolean;
  desglose: DesgloseTarifaBultoDto[];
  fuente: 'matriz' | 'manual' | 'sin_bultos';
  costosOperativos?: CostosOperativosPreviewDto;
};
