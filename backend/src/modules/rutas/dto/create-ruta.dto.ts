export type BultoInputDto = {
  alto_cm?: number;
  ancho_cm?: number;
  largo_cm?: number;
  peso_kg?: number;
  categoria?: string;
};

/** Parada intermedia de un pedido/ruta operativa (HU-58). */
export type ParadaRutaDto = {
  direccion: string;
  orden: number;
  latitud?: number | null;
  longitud?: number | null;
  /** true = parada agregada solo para este pedido; false = copiada de plantilla. */
  es_temporal?: boolean;
};

/** Cuerpo esperado por POST /api/rutas (validación en createRoute). */
export type CreateRutaDto = {
  cliente_id: string;
  conductor_id?: string | null;
  camion_id?: string | null;
  nombre_ruta?: string | null;
  origen: string;
  destino: string;
  estado?: string | null;
  fecha_inicio?: string | null;
  eta?: string | null;
  distancia_km?: number | string | null;
  fecha_estimada_inicio?: string | null;
  fecha_estimada_fin?: string | null;
  fecha_estimada_entrega?: string | null;
  bultos_despachados?: number | string | null;
  bultos_detalle?: BultoInputDto[];
  costo_tac_peajes_clp?: number | string | null;
  pago_conductor_base_clp?: number | string | null;
  is_tarifa_manual?: boolean | null;
  tarifa_base_total?: number | string | null;
  /** HU-58: plantilla de ruta reutilizable seleccionada. */
  ruta_plantilla_id?: string | null;
  /** HU-58: paradas del pedido (copia de plantilla + temporales). */
  paradas?: ParadaRutaDto[];
  /** HU-58: notas operativas del pedido. */
  observaciones?: string | null;
  /** HU-58 modo manual: guardar origen/destino como nueva plantilla reutilizable. */
  guardar_como_plantilla?: boolean;
  nombre_plantilla?: string | null;
  /** HU-47: pedido generado por job de recurrencia. */
  generado_automaticamente?: boolean;
  recurrencia_id?: string | null;
};
