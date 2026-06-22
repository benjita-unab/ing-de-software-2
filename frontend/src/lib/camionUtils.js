export const FILTRO_ESTADO_TODOS = "TODOS";

export const ORDEN_CAMIONES = {
  PATENTE_ASC: "patente-asc",
  PATENTE_DESC: "patente-desc",
  REVISION_PROXIMA: "revision-proxima",
  REVISION_LEJANA: "revision-lejana",
};

function normalizeSearchText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function revisionTimestamp(camion) {
  const raw = camion?.proxima_mantencion ?? camion?.proximaMantencion;
  if (!raw) return null;
  const ts = new Date(raw).getTime();
  return Number.isNaN(ts) ? null : ts;
}

/**
 * Días hasta la próxima revisión técnica (negativo si ya venció).
 * @param {string|Date|null|undefined} fecha
 * @returns {number|null}
 */
export function calcularDiasRestantesRevision(fecha) {
  if (!fecha) return null;
  const revision = new Date(fecha);
  if (Number.isNaN(revision.getTime())) return null;

  const hoy = new Date();
  revision.setHours(0, 0, 0, 0);
  hoy.setHours(0, 0, 0, 0);

  return Math.ceil((revision.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Estado de la revisión técnica según días restantes.
 * Vigente (>30), Por vencer (<=30), Vencida (<0).
 * @param {string|Date|null|undefined} fecha
 * @returns {{ status: string, texto: string, variant: string, dias: number|null }}
 */
export function obtenerEstadoRevision(fecha) {
  const dias = calcularDiasRestantesRevision(fecha);

  if (dias == null) {
    return {
      status: "SIN_FECHA",
      texto: "Sin fecha",
      variant: "muted",
      dias: null,
    };
  }

  if (dias < 0) {
    return {
      status: "VENCIDA",
      texto: `Vencida (${Math.abs(dias)}d)`,
      variant: "danger",
      dias,
    };
  }

  if (dias <= 30) {
    return {
      status: "POR_VENCER",
      texto: `Por vencer (${dias}d)`,
      variant: "warning",
      dias,
    };
  }

  return {
    status: "VIGENTE",
    texto: `Vigente (${dias}d)`,
    variant: "success",
    dias,
  };
}

export function formatFechaCamion(fecha) {
  if (!fecha) return "—";
  const parsed = new Date(fecha);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("es-CL");
}

export function formatDiasRestantesText(dias) {
  if (dias == null) return "—";
  const abs = Math.abs(dias);
  const suffix = abs === 1 ? "día" : "días";
  if (dias < 0) return `${dias} ${suffix}`;
  return `${dias} ${suffix}`;
}

export function puedeGestionarCamiones(role) {
  const r = String(role || "").toUpperCase();
  return r === "OPERADOR" || r === "ADMIN";
}

export function toDateInputValue(fecha) {
  if (!fecha) return "";
  const parsed = new Date(fecha);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

export function formatCapacidadKg(capacidad) {
  if (capacidad == null || capacidad === "") return "—";
  const num = Number(capacidad);
  if (Number.isNaN(num)) return "—";
  return num.toLocaleString("es-CL");
}

export function resolveProximaMantencion(camion) {
  return camion?.proxima_mantencion ?? camion?.proximaMantencion ?? null;
}

export function resolveUltimaMantencion(camion) {
  return camion?.ultima_mantencion ?? camion?.ultimaMantencion ?? null;
}

export function formatEstadoCamion(estado) {
  if (!estado) return "—";
  return String(estado).replace(/_/g, " ");
}

export function estadoCamionBadge(estado) {
  const value = String(estado || "DISPONIBLE").toUpperCase();

  if (value === "EN_RUTA") {
    return { texto: "En ruta", variant: "info" };
  }
  if (value === "MANTENCION") {
    return { texto: "Mantención", variant: "warning" };
  }
  return { texto: "Disponible", variant: "success" };
}

export function camionCoincideBusqueda(camion, search) {
  const term = normalizeSearchText(search);
  if (!term) return true;

  const patente = normalizeSearchText(camion?.patente);
  return patente.includes(term);
}

export function camionCoincideFiltroEstado(camion, filtroEstado) {
  if (!filtroEstado || filtroEstado === FILTRO_ESTADO_TODOS) return true;
  const estado = String(camion?.estado || "DISPONIBLE").toUpperCase();
  return estado === String(filtroEstado).toUpperCase();
}

export function ordenarCamiones(camiones, orden) {
  const lista = [...(camiones || [])];

  lista.sort((a, b) => {
    if (orden === ORDEN_CAMIONES.PATENTE_ASC || orden === ORDEN_CAMIONES.PATENTE_DESC) {
      const pa = String(a?.patente || "");
      const pb = String(b?.patente || "");
      const cmp = pa.localeCompare(pb, "es", { sensitivity: "base" });
      return orden === ORDEN_CAMIONES.PATENTE_DESC ? -cmp : cmp;
    }

    const ta = revisionTimestamp(a);
    const tb = revisionTimestamp(b);
    if (ta == null && tb == null) return 0;
    if (ta == null) return 1;
    if (tb == null) return -1;

    if (orden === ORDEN_CAMIONES.REVISION_LEJANA) {
      return tb - ta;
    }
    return ta - tb;
  });

  return lista;
}

export function filtrarYOrdenarCamiones(camiones, search, filtroEstado, orden) {
  return ordenarCamiones(
    (camiones || []).filter(
      (camion) =>
        camionCoincideBusqueda(camion, search)
        && camionCoincideFiltroEstado(camion, filtroEstado),
    ),
    orden,
  );
}
