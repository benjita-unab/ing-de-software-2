/**
 * Visibilidad de funcionalidades incompletas o reservadas para sprints futuros.
 * false = oculto en UI; componentes, servicios, APIs y estados asociados se conservan.
 *
 * Código relacionado conservado (no eliminar en limpieza técnica):
 * - rutasPlantilla → RutasPlantilla.jsx, rutasPlantillaService, menú sidebar
 * - recurrencias → PortalRecurrencias, ModalRecurrencia, recurrenciasService
 * - repetirPedido → RutasActivas origenPedido / enviarFormulario / plantillas
 * - crearPedidoCliente → ClientPortalShell flujo de alta de pedido
 */
export const UI_FEATURES = {  /** Menú Rutas (recorridos reutilizables) + módulo RutasPlantilla (HU-57/58). */
  rutasPlantilla: false,
  /** Pestaña y panel de recurrencias (portal cliente). */
  recurrencias: false,
  /** Botón «Usar pedido anterior» / recurrencia (operador y portal). */
  repetirPedido: false,
  /** Crear pedido desde portal cliente (flujo incompleto). */
  crearPedidoCliente: false,
};

export function isNavSectionVisible(sectionId) {
  if (sectionId === "rutas-plantilla" && !UI_FEATURES.rutasPlantilla) {
    return false;
  }
  return true;
}
