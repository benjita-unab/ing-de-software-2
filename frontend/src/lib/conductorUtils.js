export function normalizeConductorId(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function normalizeRutCompare(value) {
  return String(value ?? "").replace(/[^0-9kK]/g, "").toUpperCase();
}

export function extractNestedConductor(ruta) {
  const nested = ruta?.conductores ?? ruta?.conductor;
  if (Array.isArray(nested)) return nested[0] ?? null;
  return nested ?? null;
}

export function parseRutasPayload(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.rutas)) return data.rutas;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

export function extractConductorIdFromRuta(ruta) {
  const nested = extractNestedConductor(ruta);
  return (
    ruta?.conductor_id
    ?? ruta?.conductorId
    ?? nested?.id
    ?? null
  );
}

export function extractConductorRutFromRuta(ruta) {
  const nested = extractNestedConductor(ruta);
  return nested?.rut ?? ruta?.conductor_rut ?? null;
}

/**
 * Determina si una ruta está asignada al conductor por UUID (conductor_id / conductores.id)
 * o, en fallback, por RUT en la relación anidada.
 */
export function rutaAsignadaAConductor(ruta, conductor) {
  if (!ruta || !conductor) return false;

  const targetId = normalizeConductorId(conductor.id);
  const targetRut = normalizeRutCompare(conductor.rut);

  const directId = normalizeConductorId(extractConductorIdFromRuta(ruta));
  if (targetId && directId && targetId === directId) return true;

  const nestedRut = normalizeRutCompare(extractConductorRutFromRuta(ruta));
  if (targetRut && nestedRut && targetRut === nestedRut) return true;

  return false;
}

export function mergeConductorData(resumen, detalle) {
  return { ...(resumen || {}), ...(detalle || {}) };
}

export function resolveLicenciaNumero(conductor, resumen) {
  return (
    conductor?.licencia_numero
    || resumen?.licencia_numero
    || null
  );
}

export function parseLicensesPayload(detalle) {
  if (!detalle) return [];
  if (Array.isArray(detalle.licenses)) return detalle.licenses;
  if (Array.isArray(detalle.conductor?.licenses)) return detalle.conductor.licenses;
  return [];
}

export function resolveLicenciaDocumentoUrl(licenses) {
  if (!Array.isArray(licenses) || licenses.length === 0) return null;
  const sorted = [...licenses].sort((a, b) => {
    const da = new Date(a.uploaded_at || 0).getTime();
    const db = new Date(b.uploaded_at || 0).getTime();
    return db - da;
  });
  const record = sorted.find((item) => item.file_url || item.fileUrl);
  return record?.file_url || record?.fileUrl || null;
}

export function formatRutaCodigo(ruta) {
  if (!ruta?.id) return "—";
  const id = String(ruta.id);
  return id.length > 8 ? id.slice(0, 8) : id;
}

export const NOMBRE_NO_DISPONIBLE_API = "Sin nombre";

export const NOMBRE_API_AYUDA = "Nombre no disponible en el listado.";

export function conductorTieneNombre(conductor) {
  if (!conductor) return false;
  const nombre = conductor.nombre || conductor.usuarios?.nombre;
  return Boolean(nombre && String(nombre).trim());
}

/** Nombre real del conductor o null si la API no lo entrega. */
export function resolveNombreConductor(conductor) {
  if (!conductorTieneNombre(conductor)) return null;
  return String(conductor.nombre || conductor.usuarios?.nombre).trim();
}

/** Texto para mostrar en UI (tabla y detalle). */
export function displayNombreConductor(conductor) {
  return resolveNombreConductor(conductor) || NOMBRE_NO_DISPONIBLE_API;
}

function normalizeSearchText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function vencimientoTimestamp(conductor) {
  const raw = conductor?.licencia_vencimiento || conductor?.licenseStatus?.expiryDate;
  if (!raw) return null;
  const ts = new Date(raw).getTime();
  return Number.isNaN(ts) ? null : ts;
}

export function conductorCoincideBusqueda(conductor, search) {
  const term = normalizeSearchText(search);
  if (!term) return true;

  const rut = normalizeSearchText(conductor?.rut);
  const telefono = normalizeSearchText(conductor?.telefono);
  const licencia = normalizeSearchText(conductor?.licencia_numero);
  const nombre = normalizeSearchText(resolveNombreConductor(conductor));

  if (rut.includes(term) || telefono.includes(term) || licencia.includes(term)) {
    return true;
  }

  if (nombre) {
    if (nombre.includes(term)) return true;
    const partes = nombre.split(/\s+/).filter(Boolean);
    if (partes.some((parte) => parte.includes(term))) return true;
  }

  return false;
}

export function rutaCoincideBusqueda(ruta, search) {
  const term = normalizeSearchText(search);
  if (!term) return true;

  const codigo = normalizeSearchText(ruta?.id);
  const codigoCorto = normalizeSearchText(formatRutaCodigo(ruta));
  const origen = normalizeSearchText(ruta?.origen);
  const destino = normalizeSearchText(ruta?.destino);
  const estado = normalizeSearchText(
    ruta?.estado ? String(ruta.estado).replace(/_/g, " ") : "",
  );

  return [codigo, codigoCorto, origen, destino, estado].some(
    (campo) => campo && campo.includes(term),
  );
}

export const ORDEN_CHOFERES = {
  NOMBRE_ASC: "nombre-asc",
  NOMBRE_DESC: "nombre-desc",
  VENCIMIENTO_PROXIMO: "vencimiento-proximo",
  VENCIMIENTO_LEJANO: "vencimiento-lejano",
};

export function ordenarConductores(conductores, orden) {
  const lista = [...(conductores || [])];

  lista.sort((a, b) => {
    if (orden === ORDEN_CHOFERES.NOMBRE_ASC || orden === ORDEN_CHOFERES.NOMBRE_DESC) {
      const na = resolveNombreConductor(a) || "";
      const nb = resolveNombreConductor(b) || "";
      const aSinNombre = !conductorTieneNombre(a);
      const bSinNombre = !conductorTieneNombre(b);
      if (aSinNombre && !bSinNombre) return 1;
      if (!aSinNombre && bSinNombre) return -1;
      const cmp = na.localeCompare(nb, "es", { sensitivity: "base" });
      return orden === ORDEN_CHOFERES.NOMBRE_DESC ? -cmp : cmp;
    }

    const ta = vencimientoTimestamp(a);
    const tb = vencimientoTimestamp(b);
    if (ta == null && tb == null) return 0;
    if (ta == null) return 1;
    if (tb == null) return -1;

    if (orden === ORDEN_CHOFERES.VENCIMIENTO_LEJANO) {
      return tb - ta;
    }
    return ta - tb;
  });

  return lista;
}

export function filtrarYOrdenarConductores(conductores, search, orden) {
  return ordenarConductores(
    (conductores || []).filter((c) => conductorCoincideBusqueda(c, search)),
    orden,
  );
}
