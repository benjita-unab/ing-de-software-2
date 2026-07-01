/**
 * Permisos de UI según rol del JWT (vía useAuth → operator.role).
 * Debe mantenerse alineado con @Roles del backend.
 */

/** @param {string} [role] */
export function normalizeRole(role) {
  const r = String(role || "").toUpperCase();
  if (r === "ADMIN" || r === "OPERADOR" || r === "CONDUCTOR" || r === "CLIENTE") {
    return r;
  }
  if (r === "MOBILE" || r === "OPERATOR") return "OPERADOR";
  return "OPERADOR";
}

/** @param {string} [role] */
export function isAdmin(role) {
  return normalizeRole(role) === "ADMIN";
}

/** @param {string} [role] */
export function puedeCrearCliente(role) {
  return isAdmin(role);
}

/** @param {string} [role] */
export function puedeVerDashboardFinanciero(role) {
  return isAdmin(role);
}

/** @param {string} [role] */
export function puedeVerDashboardRentabilidad(role) {
  return isAdmin(role);
}

/** @param {string} [role] */
export function puedeAdministrarPlantillas(role) {
  return isAdmin(role);
}

/** Editar tarifas globales (GET/PUT configuracion-pagos). */
export function puedeConfigurarPagos(role) {
  return isAdmin(role);
}
