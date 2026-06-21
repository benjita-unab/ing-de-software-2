/**
 * Utilidades compartidas para Rutas.
 */

/**
 * Devuelve el nombre de la ruta, o un fallback seguro si es histórica (null).
 * @param {Object} ruta - Objeto ruta obtenido desde el backend.
 * @returns {string} El nombre de la ruta o fallback.
 */
export const getNombreRuta = (ruta) => {
  if (!ruta) return 'Ruta Desconocida';
  if (ruta.nombre_ruta) {
    return ruta.nombre_ruta;
  }
  // Fallback dinámico para rutas antiguas o creadas antes de la actualización
  const idShort = ruta.id ? ruta.id.slice(0, 6) : 'N/A';
  if (ruta.destino) {
    return `Ruta a ${ruta.destino}`;
  }
  return `Ruta Genérica (${idShort})`;
};
