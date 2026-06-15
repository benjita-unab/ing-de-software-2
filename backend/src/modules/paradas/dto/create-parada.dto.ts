/**
 * HU-61 — DTO para crear una parada intermedia en una ruta.
 * Todos los campos de la tabla rutas originales permanecen intactos.
 */
export type CreateParadaDto = {
  /** Dirección legible de la parada (obligatorio) */
  direccion: string;
  /** Latitud decimal (opcional, para visualización en mapa) */
  lat?: number | null;
  /** Longitud decimal (opcional, para visualización en mapa) */
  lng?: number | null;
  /**
   * Tipo de parada.
   * Valores permitidos: 'ENTREGA' | 'RECOLECCION' | 'DESCANSO'
   * Default: 'ENTREGA'
   */
  tipo_parada?: string | null;
  /** Orden manual. Si se omite, se calcula como último disponible */
  orden?: number | null;
};
