/** Formatea RUT chileno con puntos y guión (ej: 76.000.000-K). */
export function formatRut(value) {
  let rut = String(value ?? "").replace(/[^0-9kK]/g, "").toUpperCase();
  if (rut.length > 9) {
    rut = rut.slice(0, 9);
  }
  if (rut.length <= 1) return rut;
  const dv = rut.slice(-1);
  let cuerpo = rut.slice(0, -1);
  cuerpo = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${cuerpo}-${dv}`;
}
