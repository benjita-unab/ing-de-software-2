import React, { useCallback, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { apiFetch } from "../lib/apiClient";
import ComprobanteModal from "./ComprobanteModal";
import { getPlantillasPorCliente } from "../lib/clientesService";
import {
  getRutaPlantillaById,
  getRutasPlantilla,
  calcularRutaPlantilla,
} from "../lib/rutasPlantillaService";
import {
  crearRuta,
  estimarFechasEstimadas,
  actualizarFechasEstimadas,
  notificarFechaEstimada,
  obtenerAnomaliasRuta,
} from "../lib/rutasService";
import { useGooglePlacesAutocomplete } from "../hooks/useGooglePlacesAutocomplete";
import { getNombreRuta } from "../lib/rutasUtils";
import { obtenerCostosOperativos } from "../lib/costosOperativosService";
import ParadaPlantillaInput from "./ParadaPlantillaInput";
import ConsolidacionRutaPanel from "./ConsolidacionRutaPanel";
import CostosOperativosPanel from "./CostosOperativosPanel";
import ModalRecurrencia from "./ModalRecurrencia";
import CreadorCarga from "./CreadorCarga";
import Badge from "./ui/Badge";
import Spinner from "./ui/Spinner";

const MODO_PLANTILLA = "plantilla";
const MODO_MANUAL = "manual";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || "";
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

function mensajeFilaClass(tipo) {
  if (tipo === "ok") return "lt-alert-banner lt-alert-banner--success";
  if (tipo === "warn") return "lt-alert-banner lt-alert-banner--warning";
  return "lt-alert-banner lt-alert-banner--error";
}

function MensajeFilaRuta({ mensaje }) {
  if (!mensaje?.texto) return null;
  return (
    <div className={mensajeFilaClass(mensaje.tipo)} role="status" style={{ marginTop: 8, marginBottom: 0 }}>
      {mensaje.texto}
    </div>
  );
}

const FECHAS_VACIAS = { inicio: "", fin: "", entrega: "" };

const AYUDA_DISTANCIA_VIAL =
  "La distancia se calcula por carretera usando origen y destino. Puede ajustarse manualmente por criterio operativo.";

const ADVERTENCIA_DISTANCIA_VIAL =
  "No se pudo calcular la distancia vial automáticamente. Ingrese la distancia manualmente o revise origen/destino.";

/** datetime-local → ISO (UTC) para el backend */
function localDatetimeToIso(localVal) {
  if (!localVal || !String(localVal).trim()) return null;
  const d = new Date(localVal);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function parseLocalDatetime(localVal) {
  const value = String(localVal ?? "").trim();
  const matches = /^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2})$/.exec(value);
  if (!matches) return null;
  const [, year, month, day, hours, minutes] = matches;
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hours),
    Number(minutes),
    0,
    0,
  );
}

function formatLocalDatetime(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

function calcularEtaDesdeFechaInicio(fechaInicio, duracionMinutos) {
  if (!fechaInicio || duracionMinutos == null) return "";
  const inicio = parseLocalDatetime(fechaInicio);
  if (!inicio) return "";
  inicio.setMinutes(inicio.getMinutes() + Number(duracionMinutos));
  return formatLocalDatetime(inicio);
}

function formatLocalDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function calcularFechasEstimadasDesdeEta(eta) {
  if (!eta) return { inicio: "", fin: "", entrega: "" };
  const fecha = parseLocalDatetime(eta);
  if (!fecha) return { inicio: "", fin: "", entrega: "" };

  const entrega = formatLocalDate(fecha);
  const inicio = new Date(fecha);
  inicio.setDate(inicio.getDate() - 1);
  const fin = new Date(fecha);
  fin.setDate(fin.getDate() + 1);

  return {
    inicio: formatLocalDate(inicio),
    fin: formatLocalDate(fin),
    entrega,
  };
}

function fmtDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-CL", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(iso);
  }
}

function toInputDate(val) {
  if (!val) return "";
  const s = String(val).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
}

function fechasFromRuta(ruta) {
  return {
    inicio: toInputDate(ruta?.fecha_estimada_inicio),
    fin: toInputDate(ruta?.fecha_estimada_fin),
    entrega: toInputDate(ruta?.fecha_estimada_entrega),
    distanciaKm:
      ruta?.distancia_km != null && ruta.distancia_km !== ""
        ? String(ruta.distancia_km)
        : "",
  };
}

function buildParadasPayload(paradas) {
  return (paradas || [])
    .filter((p) => String(p.direccion ?? "").trim())
    .map((p, idx) => ({
      direccion: String(p.direccion).trim(),
      orden: Number(p.orden) || idx + 1,
      latitud: p.latitud ?? null,
      longitud: p.longitud ?? null,
      es_temporal: p.es_temporal !== false,
    }))
    .sort((a, b) => a.orden - b.orden);
}
function buildEstimarPayload({ origen, destino, distanciaKm, fechaInicioIso }) {
  const payload = {};
  const o = String(origen ?? "").trim();
  const d = String(destino ?? "").trim();
  if (o) payload.origen = o;
  if (d) payload.destino = d;
  const km = String(distanciaKm ?? "").trim();
  if (km !== "") payload.distancia_km = Number(km);
  if (fechaInicioIso) payload.fecha_inicio = fechaInicioIso;
  return payload;
}

function mensajeEstimacionOk(data) {
  const km = data?.distancia_km;
  const ref = data?.fecha_referencia;
  if (data?.distancia_origen === "google_routes" && data?.duracion_minutos != null) {
    return `Distancia vial: ${km} km (~${data.duracion_minutos} min). Fechas calculadas (ref. ${ref}). Revise y guarde.`;
  }
  if (data?.distancia_origen === "manual") {
    return `Fechas recalculadas con distancia manual (${km} km, ref. ${ref}). Revise y guarde.`;
  }
  return `Estimación lista (${km} km, ref. ${ref}). Revise y guarde.`;
}

function estadoBadgeVariant(estado) {
  const e = String(estado || "").toUpperCase();
  if (["ENTREGADO", "COMPLETADO"].includes(e)) return "success";
  if (["CANCELADO", "CANCELADA"].includes(e)) return "danger";
  if (["EN_TRANSITO", "EN_DESTINO", "ASIGNADO", "EN_CARGA", "EN_CAMINO_ORIGEN"].includes(e)) return "accent";
  if (e === "PENDIENTE") return "warning";
  return "muted";
}

function estadoLabel(estado) {
  if (!estado) return "—";
  return String(estado).replace(/_/g, " ");
}

export default function RutasActivas() {
  const [rutas, setRutas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState([]);
  const [conductores, setConductores] = useState([]);
  const [camiones, setCamiones] = useState([]);
  const [listsLoading, setListsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("crear");
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [erroresFormulario, setErroresFormulario] = useState({});
  const [mensajesRuta, setMensajesRuta] = useState({});
  const [fechasEdit, setFechasEdit] = useState({});
  const [anomaliasPorRuta, setAnomaliasPorRuta] = useState({});
  const [savingFechasId, setSavingFechasId] = useState(null);
  const [notifyingId, setNotifyingId] = useState(null);
  const [calculandoEstimacion, setCalculandoEstimacion] = useState(false);
  const [calculandoEstimacionRutaId, setCalculandoEstimacionRutaId] = useState(null);
  const [showRentabilidadModal, setShowRentabilidadModal] = useState(false);
  const [rutaRentabilidad, setRutaRentabilidad] = useState(null);
  const [comprobanteRutaId, setComprobanteRutaId] = useState(null);
  const [plantillasCliente, setPlantillasCliente] = useState([]);
  const [plantillaSeleccionadaId, setPlantillaSeleccionadaId] = useState("");
  const [cargandoPlantillas, setCargandoPlantillas] = useState(false);
  const [modoCreacion, setModoCreacion] = useState(MODO_PLANTILLA);
  const [rutasReutilizables, setRutasReutilizables] = useState([]);
  const [cargandoRutasReutilizables, setCargandoRutasReutilizables] = useState(false);
  const [paradas, setParadas] = useState([]);
  const [guardarComoPlantilla, setGuardarComoPlantilla] = useState(false);
  const [nombrePlantilla, setNombrePlantilla] = useState("");
  const [consolidacionAbiertaId, setConsolidacionAbiertaId] = useState(null);
  const [costosAbiertoId, setCostosAbiertoId] = useState(null);
  const [programarRecurrencia, setProgramarRecurrencia] = useState(false);
  const [recurrenciaModalOpen, setRecurrenciaModalOpen] = useState(false);
  const [rutaRecurrenciaCtx, setRutaRecurrenciaCtx] = useState(null);
  const [rutaDetalleSeleccionada, setRutaDetalleSeleccionada] = useState(null);
  const [costosDetalle, setCostosDetalle] = useState(null);
  const [loadingCostosDetalle, setLoadingCostosDetalle] = useState(false);

  const [form, setForm] = useState({
    nombreRuta: "",
    clienteId: "",
    plantillaId: "",
    conductorId: "",
    camionId: "",
    origen: "",
    destino: "",
    fechaInicio: "",
    eta: "",
    duracionMinutos: null,
    distanciaKm: "",
    fechasEstimadas: { ...FECHAS_VACIAS },
    advertenciaEstimacion: "",
    bultosDespachos: "",
    observaciones: "",
  });

  const origenInputRef = useRef(null);
  const destinoInputRef = useRef(null);

  const { error: mapsOrigenError } = useGooglePlacesAutocomplete(origenInputRef, {
    enabled: false,
    onPlaceSelected: (address) => actualizarCampo("origen", address),
  });
  const { error: mapsDestinoError } = useGooglePlacesAutocomplete(destinoInputRef, {
    enabled: false,
    onPlaceSelected: (address) => actualizarCampo("destino", address),
  });
  const mapsError = mapsOrigenError || mapsDestinoError;

  const renderErrorFormulario = (campo) => {
    if (!erroresFormulario[campo]) return null;
    return (
      <div className="lt-alert-banner lt-alert-banner--error" role="alert" style={{ marginTop: 8, marginBottom: 0 }}>
        {erroresFormulario[campo]}
      </div>
    );
  };

  const cargarRutas = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch("/api/rutas");
    if (!res.ok) {
      setRutas([]);
      setAnomaliasPorRuta({});
      setMensaje({ tipo: "error", texto: res.error || "No se pudieron cargar las rutas." });
      setLoading(false);
      return;
    }
    const payload = res.data;
    const lista = Array.isArray(payload) ? payload : payload?.data ?? [];
    setRutas(lista);
    const fechasMap = {};
    lista.forEach((r) => {
      fechasMap[r.id] = fechasFromRuta(r);
    });
    setFechasEdit(fechasMap);
    setLoading(false);

    if (lista.length > 0) {
      const anomaliasMap = {};
      await Promise.all(
        lista.map(async (ruta) => {
          const result = await obtenerAnomaliasRuta(ruta.id);
          anomaliasMap[ruta.id] = result.data || [];
        }),
      );
      setAnomaliasPorRuta(anomaliasMap);
    } else {
      setAnomaliasPorRuta({});
    }
  }, []);

  const cargarListas = useCallback(async () => {
    setListsLoading(true);
    const [cRes, coRes, caRes] = await Promise.all([
      apiFetch("/api/clientes"),
      apiFetch("/api/conductores"),
      apiFetch("/api/camiones/disponibles"),
    ]);

    if (cRes.ok) {
      const p = cRes.data;
      setClientes(Array.isArray(p) ? p : p?.data ?? []);
    } else setClientes([]);

    if (coRes.ok) {
      const p = coRes.data;
      setConductores(Array.isArray(p) ? p : p?.data ?? []);
    } else setConductores([]);

    if (caRes.ok) {
      const p = caRes.data;
      setCamiones(Array.isArray(p) ? p : p?.data ?? []);
    } else {
      const fallback = await apiFetch("/api/camiones");
      if (fallback.ok) {
        const p = fallback.data;
        setCamiones(Array.isArray(p) ? p : p?.data ?? []);
      } else setCamiones([]);
    }

    setListsLoading(false);
  }, []);

  useEffect(() => {
    cargarRutas();
    cargarListas();
  }, [cargarRutas, cargarListas]);

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        "¿Estás seguro de que deseas eliminar esta ruta? Esta acción no se puede deshacer.",
      )
    ) {
      return;
    }
    try {
      await supabase.from("historial_estados").delete().eq("ruta_id", id);
      await supabase.from("bultos").delete().eq("ruta_id", id);
      await supabase.from("cargas").delete().eq("ruta_id", id);
      const { error } = await supabase.from("rutas").delete().eq("id", id);
      if (error) {
        alert(`Error al eliminar ruta: ${error.message}`);
      } else {
        setRutas((prev) => prev.filter((r) => r.id !== id));
      }
    } catch (err) {
      alert(`Error al procesar eliminación: ${err.message}`);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function cargarPlantillas() {
      if (!form.clienteId) {
        setPlantillasCliente([]);
        setPlantillaSeleccionadaId("");
        setForm((prev) => ({ ...prev, plantillaId: "" }));
        return;
      }

      setCargandoPlantillas(true);
      const res = await getPlantillasPorCliente(form.clienteId);
      if (cancelled) return;

      setPlantillasCliente(res.data || []);
      setPlantillaSeleccionadaId("");
      setForm((prev) => ({ ...prev, plantillaId: "" }));
      setCargandoPlantillas(false);
    }

    cargarPlantillas();
    return () => {
      cancelled = true;
    };
  }, [form.clienteId]);

  useEffect(() => {
    let cancelled = false;

    async function cargarRutasReutilizables() {
      if (modoCreacion !== MODO_PLANTILLA) {
        setRutasReutilizables([]);
        return;
      }

      setCargandoRutasReutilizables(true);
      const params = { activa: "true" };
      if (form.clienteId) params.clienteId = form.clienteId;
      const res = await getRutasPlantilla(params);
      if (cancelled) return;

      const lista = res.data?.data ?? res.data ?? [];
      setRutasReutilizables(Array.isArray(lista) ? lista : []);
      setCargandoRutasReutilizables(false);
    }

    cargarRutasReutilizables();
    return () => {
      cancelled = true;
    };
  }, [modoCreacion, form.clienteId]);

  const aplicarPlantilla = async (plantillaId) => {
    setPlantillaSeleccionadaId(plantillaId);
    if (!plantillaId) {
      setForm((prev) => ({ ...prev, plantillaId: "", eta: "", duracionMinutos: null }));
      setParadas([]);
      return;
    }

    const res = await getRutaPlantillaById(plantillaId);
    if (res.error || !res.data) {
      setMensaje({ tipo: "error", texto: res.error || "No se pudo cargar la ruta." });
      return;
    }

    const plantilla = res.data;
    const paradasPlantilla = (plantilla.paradas || []).map((p) => ({
      direccion: p.direccion || "",
      orden: p.orden,
      latitud: p.latitud ?? null,
      longitud: p.longitud ?? null,
      es_temporal: false,
    }));
    setParadas(paradasPlantilla);
    setForm((prev) => ({
      ...prev,
      plantillaId: modoCreacion === MODO_PLANTILLA ? plantillaId : "",
      nombreRuta: plantilla.nombre || prev.nombreRuta,
      origen: plantilla.origen || prev.origen,
      destino: plantilla.destino || prev.destino,
      distanciaKm: "",
      duracionMinutos: null,
      eta: "",
      fechasEstimadas: { ...FECHAS_VACIAS },
      advertenciaEstimacion: "",
    }));
    setMensaje({
      tipo: "ok",
      texto: `Ruta "${plantilla.nombre}" cargada. Origen y destino autocompletados.`,
    });
  };

  const agregarParada = () => {
    setParadas((prev) => [
      ...prev,
      {
        direccion: "",
        orden: prev.length + 1,
        latitud: null,
        longitud: null,
        es_temporal: true,
      },
    ]);
    setForm((prev) => ({
      ...prev,
      eta: "",
      duracionMinutos: null,
    }));
  };

  const actualizarParada = (index, campo, valor) => {
    setParadas((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [campo]: valor } : p)),
    );
    setForm((prev) => ({
      ...prev,
      eta: "",
      duracionMinutos: null,
    }));
  };

  const actualizarParadaDesdePlaces = (index, datos) => {
    setParadas((prev) =>
      prev.map((p, i) => (i === index ? { ...p, ...datos, es_temporal: true } : p)),
    );
    setForm((prev) => ({
      ...prev,
      eta: "",
      duracionMinutos: null,
    }));
  };

  const eliminarParada = (index) => {
    setParadas((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((p, i) => ({ ...p, orden: i + 1 })),
    );
    setForm((prev) => ({
      ...prev,
      eta: "",
      duracionMinutos: null,
    }));
  };

  const cambiarModoCreacion = (modo) => {
    setModoCreacion(modo);
    setPlantillaSeleccionadaId("");
    setParadas([]);
    setGuardarComoPlantilla(false);
    setNombrePlantilla("");
    setForm((prev) => ({
      ...prev,
      plantillaId: "",
      origen: modo === MODO_MANUAL ? prev.origen : "",
      destino: modo === MODO_MANUAL ? prev.destino : "",
      eta: "",
      duracionMinutos: null,
      advertenciaEstimacion: "",
    }));
    setErroresFormulario({});
  };

  const actualizarCampo = (campo, valor) => {
    const update = { [campo]: valor };
    if (["origen", "destino", "distanciaKm"].includes(campo)) {
      update.eta = "";
      update.duracionMinutos = null;
    }
    if (["origen", "destino"].includes(campo)) {
      update.distanciaKm = "";
      update.fechasEstimadas = { ...FECHAS_VACIAS };
    }
    setForm((prev) => ({ ...prev, ...update }));
    setErroresFormulario((prev) => {
      if (!prev[campo]) return prev;
      const next = { ...prev };
      delete next[campo];
      return next;
    });
  };

  useEffect(() => {
    const tieneFechaInicio = String(form.fechaInicio || "").trim() !== "";
    const duracionValida = Number(form.duracionMinutos) > 0;

    if (!tieneFechaInicio || !duracionValida) {
      if (form.eta || form.fechasEstimadas.inicio || form.fechasEstimadas.fin || form.fechasEstimadas.entrega) {
        setForm((prev) => ({
          ...prev,
          eta: "",
          fechasEstimadas: { ...FECHAS_VACIAS },
        }));
      }
      return;
    }

    const nuevaEta = calcularEtaDesdeFechaInicio(
      form.fechaInicio,
      form.duracionMinutos,
    );
    if (nuevaEta !== form.eta) {
      setForm((prev) => ({ ...prev, eta: nuevaEta }));
    }
  }, [form.fechaInicio, form.duracionMinutos]);

  useEffect(() => {
    const nuevasFechas = calcularFechasEstimadasDesdeEta(form.eta);
    setForm((prev) => {
      if (
        prev.fechasEstimadas.inicio === nuevasFechas.inicio &&
        prev.fechasEstimadas.fin === nuevasFechas.fin &&
        prev.fechasEstimadas.entrega === nuevasFechas.entrega
      ) {
        return prev;
      }
      return {
        ...prev,
        fechasEstimadas: nuevasFechas,
      };
    });
  }, [form.eta]);

  const actualizarFechaForm = (campo, valor) => {
    setForm((prev) => ({
      ...prev,
      fechasEstimadas: { ...prev.fechasEstimadas, [campo]: valor },
    }));
    const errorKey =
      campo === "inicio"
        ? "fechaInicioEstimado"
        : campo === "fin"
          ? "finRangoEstimado"
          : "diaEstimadoEntrega";
    setErroresFormulario((prev) => {
      if (!prev[errorKey]) return prev;
      const next = { ...prev };
      delete next[errorKey];
      return next;
    });
  };

  const calcularDistanciaYFechasForm = async () => {
    setForm((prev) => ({
      ...prev,
      advertenciaEstimacion: "",
      distanciaKm: "",
      eta: "",
      duracionMinutos: null,
      fechasEstimadas: { ...FECHAS_VACIAS },
    }));
    const tieneKm = String(form.distanciaKm ?? "").trim() !== "";
    const paradasValidas = buildParadasPayload(paradas);
    if (!tieneKm && (!form.origen.trim() || !form.destino.trim())) {
      setForm((prev) => ({
        ...prev,
        advertenciaEstimacion:
          "Indique origen y destino para calcular la distancia vial, o ingrese la distancia manualmente.",
      }));
      return;
    }

    setCalculandoEstimacion(true);
    const fi = localDatetimeToIso(form.fechaInicio);

    if (paradasValidas.length > 0 && form.origen.trim() && form.destino.trim()) {
      const resCalc = await calcularRutaPlantilla({
        origen: form.origen.trim(),
        destino: form.destino.trim(),
        paradas: paradasValidas.map((p) => ({
          direccion: p.direccion,
          orden: p.orden,
        })),
      });
      setCalculandoEstimacion(false);

      if (resCalc.error || resCalc.data?.distanciaEstimada == null) {
        setForm((prev) => ({
          ...prev,
          advertenciaEstimacion: resCalc.error || ADVERTENCIA_DISTANCIA_VIAL,
        }));
        return;
      }

      const distancia = resCalc.data.distanciaEstimada;
      const duracion = resCalc.data.tiempoEstimado ?? null;
      const resFechas = await estimarFechasEstimadas(
        buildEstimarPayload({
          origen: form.origen,
          destino: form.destino,
          distanciaKm: distancia,
          fechaInicioIso: fi,
        }),
      );

      if (!resFechas.success || !resFechas.data?.ok) {
        setForm((prev) => ({
          ...prev,
          distanciaKm: String(distancia),
          duracionMinutos: duracion,
          eta:
            duracion != null && prev.fechaInicio
              ? calcularEtaDesdeFechaInicio(prev.fechaInicio, duracion)
              : "",
          advertenciaEstimacion:
            resFechas.error || resFechas.data?.advertencia || ADVERTENCIA_DISTANCIA_VIAL,
        }));
        return;
      }

      const data = resFechas.data;
      setForm((prev) => ({
        ...prev,
        advertenciaEstimacion: "",
        distanciaKm: String(distancia),
        duracionMinutos: duracion,
        eta: duracion != null ? calcularEtaDesdeFechaInicio(form.fechaInicio, duracion) : prev.eta,
        fechasEstimadas: {
          inicio: data.fecha_estimada_inicio || "",
          fin: data.fecha_estimada_fin || "",
          entrega: data.fecha_estimada_entrega || "",
        },
      }));
      return;
    }

    const res = await estimarFechasEstimadas(
      buildEstimarPayload({
        origen: form.origen,
        destino: form.destino,
        distanciaKm: tieneKm ? form.distanciaKm : "",
        fechaInicioIso: fi,
      }),
    );
    setCalculandoEstimacion(false);

    if (!res.success) {
      setForm((prev) => ({
        ...prev,
        advertenciaEstimacion: res.error || ADVERTENCIA_DISTANCIA_VIAL,
      }));
      return;
    }

    const data = res.data;
    if (!data?.ok) {
      setForm((prev) => ({
        ...prev,
        advertenciaEstimacion: data?.advertencia || ADVERTENCIA_DISTANCIA_VIAL,
      }));
      return;
    }

    setForm((prev) => {
      const duracion = data.duracion_minutos ?? null;
      return {
        ...prev,
        advertenciaEstimacion: "",
        distanciaKm:
          data.distancia_km != null ? String(data.distancia_km) : prev.distanciaKm,
        duracionMinutos: duracion,
        eta:
          duracion != null && prev.fechaInicio
            ? calcularEtaDesdeFechaInicio(prev.fechaInicio, duracion)
            : prev.eta,
        fechasEstimadas: {
          inicio: data.fecha_estimada_inicio || "",
          fin: data.fecha_estimada_fin || "",
          entrega: data.fecha_estimada_entrega || "",
        },
      };
    });
  };

  const calcularDistanciaYFechasRuta = async (ruta) => {
    const rutaId = ruta.id;
    limpiarMensajeRuta(rutaId, "estimacion");
    const edit = fechasEdit[rutaId] || fechasFromRuta(ruta);
    const tieneKm = String(edit.distanciaKm ?? "").trim() !== "";
    if (
      !tieneKm &&
      (!String(ruta.origen || "").trim() || !String(ruta.destino || "").trim())
    ) {
      setMensajeRuta(rutaId, "estimacion", {
        tipo: "warn",
        texto:
          "La ruta no tiene origen/destino para calcular distancia vial. Ingrese distancia manualmente.",
      });
      return;
    }

    setCalculandoEstimacionRutaId(rutaId);
    const res = await estimarFechasEstimadas(
      buildEstimarPayload({
        origen: ruta.origen,
        destino: ruta.destino,
        distanciaKm: tieneKm ? edit.distanciaKm : "",
        fechaInicioIso: ruta.fecha_inicio || null,
      }),
    );
    setCalculandoEstimacionRutaId(null);

    if (!res.success) {
      setMensajeRuta(rutaId, "estimacion", {
        tipo: "warn",
        texto: res.error || ADVERTENCIA_DISTANCIA_VIAL,
      });
      return;
    }

    const data = res.data;
    if (!data?.ok) {
      setMensajeRuta(rutaId, "estimacion", {
        tipo: "warn",
        texto: data?.advertencia || ADVERTENCIA_DISTANCIA_VIAL,
      });
      return;
    }

    setFechasEdit((prev) => ({
      ...prev,
      [rutaId]: {
        inicio: data.fecha_estimada_inicio || "",
        fin: data.fecha_estimada_fin || "",
        entrega: data.fecha_estimada_entrega || "",
        distanciaKm:
          data.distancia_km != null ? String(data.distancia_km) : edit.distanciaKm,
      },
    }));
    setMensajeRuta(rutaId, "estimacion", {
      tipo: "ok",
      texto: mensajeEstimacionOk(data),
    });
  };

  const enviarFormulario = async (e) => {
    e.preventDefault();
    setMensaje(null);
    setErroresFormulario({});

    const nuevosErrores = {};

    if (modoCreacion === MODO_PLANTILLA && !form.plantillaId) {
      nuevosErrores.plantillaId = "Debe seleccionar una ruta existente";
    }

    const requeridos = [
      ["clienteId", form.clienteId],
      ["conductorId", form.conductorId],
      ["camionId", form.camionId],
      ["origen", form.origen],
      ["destino", form.destino],
      ["fechaInicio", form.fechaInicio],
      ["bultosDespachos", form.bultosDespachos],
      ["distanciaKm", form.distanciaKm],
      ["fechaInicioEstimado", form.fechasEstimadas.inicio],
      ["finRangoEstimado", form.fechasEstimadas.fin],
      ["diaEstimadoEntrega", form.fechasEstimadas.entrega],
    ];

    requeridos.forEach(([campo, valor]) => {
      if (!String(valor ?? "").trim()) {
        nuevosErrores[campo] = "Este campo es obligatorio";
      }
    });

    const bultosDespachosValue = Number(form.bultosDespachos);
    if (
      String(form.bultosDespachos ?? "").trim() &&
      (Number.isNaN(bultosDespachosValue) || !Number.isInteger(bultosDespachosValue) || bultosDespachosValue < 1)
    ) {
      nuevosErrores.bultosDespachos = "Cantidad de bultos inválida";
    }

    const distanciaOriginal = String(form.distanciaKm ?? "").trim();
    const distanciaLimpia = distanciaOriginal.replace(/,/g, ".");
    const distanciaNumero = distanciaLimpia === "" ? NaN : Number.parseFloat(distanciaLimpia);
    const distanciaNormalizada = Number.isNaN(distanciaNumero)
      ? NaN
      : Number(distanciaNumero.toFixed(2));

    if (Number.isNaN(distanciaNormalizada)) {
      nuevosErrores.distanciaKm = "Distancia inválida";
    }

    if (guardarComoPlantilla && modoCreacion === MODO_MANUAL && !nombrePlantilla.trim() && !form.nombreRuta.trim()) {
      nuevosErrores.nombrePlantilla = "Indique un nombre para la nueva ruta reutilizable";
    }

    if (Object.keys(nuevosErrores).length > 0) {
      setErroresFormulario(nuevosErrores);
      setSaving(false);
      return;
    }

    setSaving(true);

    const payload = {
      cliente_id: form.clienteId.trim(),
      origen: form.origen.trim(),
      destino: form.destino.trim(),
      bultos_despachados: bultosDespachosValue,
      conductor_id: form.conductorId.trim(),
      camion_id: form.camionId.trim(),
      distancia_km: distanciaNormalizada,
    };
    if (form.nombreRuta?.trim()) {
      payload.nombre_ruta = form.nombreRuta.trim();
    }

    const fi = localDatetimeToIso(form.fechaInicio);
    const eta = localDatetimeToIso(form.eta);
    if (fi) payload.fecha_inicio = fi;
    if (eta) payload.eta = eta;

    const { inicio, fin, entrega } = form.fechasEstimadas;
    if (inicio?.trim() && fin?.trim() && entrega?.trim()) {
      payload.fecha_estimada_inicio = inicio.trim();
      payload.fecha_estimada_fin = fin.trim();
      payload.fecha_estimada_entrega = entrega.trim();
    }

    const paradasPayload = buildParadasPayload(paradas);
    if (paradasPayload.length > 0) {
      payload.paradas = paradasPayload;
    }
    if (modoCreacion === MODO_PLANTILLA && form.plantillaId?.trim()) {
      payload.ruta_plantilla_id = form.plantillaId.trim();
    }
    if (form.observaciones?.trim()) {
      payload.observaciones = form.observaciones.trim();
    }
    if (modoCreacion === MODO_MANUAL && guardarComoPlantilla) {
      payload.guardar_como_plantilla = true;
      payload.nombre_plantilla =
        nombrePlantilla.trim() || form.nombreRuta.trim() || undefined;
    }

    const resultado = await crearRuta(payload);
    setSaving(false);

    if (!resultado.success) {
      setMensaje({
        tipo: "error",
        texto: resultado.error || "No se pudo crear la ruta. Revise los datos o intente nuevamente.",
      });
      return;
    }

    const pagoInfo = resultado.data?.pago;
    const textoOk = pagoInfo
      ? `Pedido creado correctamente (ID: ${resultado.data?.id?.slice(0, 8) || "—"}…). Pago pendiente generado.`
      : "Pedido creado correctamente.";
    setMensaje({ tipo: "ok", texto: textoOk });

    const nuevaRutaId = resultado.data?.id;
    const clienteIdCreado = form.clienteId.trim();
    const plantillaIdCreada =
      modoCreacion === MODO_PLANTILLA ? form.plantillaId?.trim() : "";

    if (programarRecurrencia && nuevaRutaId && clienteIdCreado) {
      setRutaRecurrenciaCtx({
        clienteId: clienteIdCreado,
        rutaOrigenId: nuevaRutaId,
        rutaPlantillaId: plantillaIdCreada || undefined,
      });
      setRecurrenciaModalOpen(true);
    }

    setProgramarRecurrencia(false);
    setForm({
      nombreRuta: "",
      clienteId: "",
      plantillaId: "",
      conductorId: "",
      camionId: "",
      origen: "",
      destino: "",
      fechaInicio: "",
      eta: "",
      duracionMinutos: null,
      distanciaKm: "",
      fechasEstimadas: { ...FECHAS_VACIAS },
      advertenciaEstimacion: "",
      bultosDespachos: "",
      observaciones: "",
    });
    setParadas([]);
    setPlantillaSeleccionadaId("");
    setGuardarComoPlantilla(false);
    setNombrePlantilla("");
    setErroresFormulario({});
    setActiveTab("lista");
    await cargarRutas();
  };

  const actualizarFechaRuta = (rutaId, campo, valor) => {
    setFechasEdit((prev) => ({
      ...prev,
      [rutaId]: { ...(prev[rutaId] || fechasFromRuta({})), [campo]: valor },
    }));
  };

  const setMensajeRuta = (rutaId, scope, payload) => {
    setMensajesRuta((prev) => ({
      ...prev,
      [rutaId]: { ...(prev[rutaId] || {}), [scope]: payload },
    }));
  };

  const limpiarMensajeRuta = (rutaId, scope) => {
    setMensajesRuta((prev) => {
      const actual = { ...(prev[rutaId] || {}) };
      delete actual[scope];
      if (Object.keys(actual).length === 0) {
        const next = { ...prev };
        delete next[rutaId];
        return next;
      }
      return { ...prev, [rutaId]: actual };
    });
  };

  const guardarFechasRuta = async (rutaId) => {
    const f = fechasEdit[rutaId] || {};
    limpiarMensajeRuta(rutaId, "fechas");
    limpiarMensajeRuta(rutaId, "notificar");
    setSavingFechasId(rutaId);
    const body = {
      fecha_estimada_inicio: f.inicio,
      fecha_estimada_fin: f.fin,
      fecha_estimada_entrega: f.entrega,
    };
    if (String(f.distanciaKm ?? "").trim() !== "") {
      body.distancia_km = f.distanciaKm;
    }
    const res = await actualizarFechasEstimadas(rutaId, body);
    setSavingFechasId(null);
    if (!res.success) {
      setMensajeRuta(rutaId, "fechas", {
        tipo: "error",
        texto: res.error || "No se pudieron guardar las fechas estimadas.",
      });
      return;
    }
    setMensajeRuta(rutaId, "fechas", {
      tipo: "ok",
      texto: "Fechas estimadas guardadas.",
    });
    await cargarRutas();
  };

  const enviarNotificacionRuta = async (rutaId) => {
    limpiarMensajeRuta(rutaId, "notificar");
    limpiarMensajeRuta(rutaId, "fechas");
    setNotifyingId(rutaId);
    const res = await notificarFechaEstimada(rutaId);
    setNotifyingId(null);
    if (!res.success) {
      setMensajeRuta(rutaId, "notificar", {
        tipo: "error",
        texto: res.error || "No se pudo enviar la notificación.",
      });
      return;
    }
    const refResend = res.data?.resendId
      ? ` (ref. Resend: ${res.data.resendId})`
      : "";
    setMensajeRuta(rutaId, "notificar", {
      tipo: "ok",
      texto:
        (res.data?.message ||
          "Notificación de fecha estimada enviada correctamente.") + refResend,
    });
    await cargarRutas();
  };

  useEffect(() => {
    let cancelled = false;

    async function cargarCostosDetalle() {
      const rutaId = rutaDetalleSeleccionada?.id;
      if (!rutaId) {
        setCostosDetalle(null);
        setLoadingCostosDetalle(false);
        return;
      }

      setLoadingCostosDetalle(true);
      const res = await obtenerCostosOperativos(rutaId);

      if (cancelled) return;

      if (res.error) {
        setCostosDetalle(null);
      } else {
        setCostosDetalle(res.data || null);
      }
      setLoadingCostosDetalle(false);
    }

    cargarCostosDetalle();

    return () => {
      cancelled = true;
    };
  }, [rutaDetalleSeleccionada?.id]);

  const formatCurrencyClp = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return "—";
    return n.toLocaleString("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    });
  };

  const getCosto = (obj, keys) => {
    if (!obj || typeof obj !== "object") return undefined;
    const foundKey = keys.find((key) => obj[key] != null && String(obj[key]).trim() !== "");
    return foundKey ? obj[foundKey] : undefined;
  };

  const buildCostosDetalle = (ruta) => {
    if (!ruta) return [];

    const sources = [
      ruta,
      ruta.costos,
      ruta.costo,
      ruta.costos_operativos,
      ruta.costosOperativos,
      ruta.finanzas,
      ruta.resumen_costos,
    ].filter((source) => source && typeof source === "object");

    const find = (keys) => {
      for (const source of sources) {
        const val = getCosto(source, keys);
        if (val != null && String(val).trim() !== "") return val;
      }
      return undefined;
    };

    const items = [
      { label: "Total", value: find(["costo_total", "total", "total_costos", "monto_total"]) },
      { label: "Combustible", value: find(["costo_combustible", "combustible", "monto_combustible"]) },
      { label: "Peajes", value: find(["costo_peajes", "peajes", "monto_peajes"]) },
      { label: "Espera", value: find(["costo_espera", "espera", "monto_espera"]) },
      { label: "Viáticos", value: find(["viaticos", "costo_viaticos", "monto_viaticos"]) },
      { label: "Mantenimiento", value: find(["mantenimiento", "costo_mantenimiento", "monto_mantenimiento"]) },
      { label: "Otros", value: find(["otros", "costo_otros", "monto_otros"]) },
    ];

    return items.filter((item) => item.value != null && String(item.value).trim() !== "");
  };

  const buildEventosDetalle = (ruta) => {
    if (!ruta) return [];

    if (Array.isArray(ruta.anomalias)) return ruta.anomalias;
    if (Array.isArray(ruta.eventos)) return ruta.eventos;
    if (Array.isArray(ruta.timeline)) return ruta.timeline;
    return [];
  };

  const labelStyle = {
    fontSize: 12,
    color: "var(--lt-text-muted, #6b7280)",
    marginBottom: 4,
  };

  const valueStyle = {
    fontWeight: 600,
    color: "var(--lt-text-primary, #111827)",
    lineHeight: 1.35,
  };

  return (
    <div className="lt-module-inner">
      <div className="lt-card lt-module-card">
        <h3 className="lt-module-card__title">Gestión de rutas</h3>
        <p className="lt-module-card__subtitle">
          Creá y consultá rutas operativas. El seguimiento y las evidencias siguen siendo responsabilidad de LogiTrack (app móvil y trazabilidad).
        </p>

        {mensaje?.tipo === "ok" && (
          <div className="lt-alert-banner lt-alert-banner--success" role="status">
            {mensaje.texto}
          </div>
        )}
        {mensaje?.tipo === "error" && (
          <div className="lt-alert-banner lt-alert-banner--error" role="alert">
            {mensaje.texto}
          </div>
        )}

                <div className="lt-tabs" style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '2px solid rgba(128,128,128,0.2)' }}>
          <button
            type="button"
            className={`lt-tab ${activeTab === 'crear' ? 'active' : ''}`}
            style={{ padding: '12px 24px', background: 'transparent', border: 'none', borderBottom: activeTab === 'crear' ? '2px solid #3B82F6' : '2px solid transparent', color: activeTab === 'crear' ? '#3B82F6' : 'inherit', fontWeight: activeTab === 'crear' ? 'bold' : 'normal', cursor: 'pointer', fontSize: '16px', transition: 'all 0.2s' }}
            onClick={() => setActiveTab('crear')}
          >
            Crear Nueva Ruta
          </button>
          <button
            type="button"
            className={`lt-tab ${activeTab === 'lista' ? 'active' : ''}`}
            style={{ padding: '12px 24px', background: 'transparent', border: 'none', borderBottom: activeTab === 'lista' ? '2px solid #3B82F6' : '2px solid transparent', color: activeTab === 'lista' ? '#3B82F6' : 'inherit', fontWeight: activeTab === 'lista' ? 'bold' : 'normal', cursor: 'pointer', fontSize: '16px', transition: 'all 0.2s' }}
            onClick={() => setActiveTab('lista')}
          >
            Rutas Registradas
          </button>
        </div>

      </div>

      {activeTab === 'crear' && (
         <div className="lt-card lt-module-card" style={{ padding: 0, background: 'transparent', border: 'none', boxShadow: 'none' }}>
            <CreadorCarga />
         </div>
      )}

      {activeTab === 'lista' && (
<div className="lt-card lt-module-card">
        <h3 className="lt-module-card__title">Rutas registradas</h3>
        {loading ? (
          <Spinner message="Cargando rutas…" />
        ) : rutas.length === 0 ? (
          <div className="lt-empty">No hay rutas para mostrar. Cree una con el botón superior.</div>
        ) : (
          <div className="lt-table-wrap">
            <table className="lt-table">
              <thead>
                <tr>
                  <th>Nombre Ruta</th>
                  <th>Origen</th>
                  <th>Destino</th>
                  <th>Cliente</th>
                  <th>Estado</th>
                  <th>Pago (CLP)</th>
                  <th>Estado de Pago</th>
                  <th>Conductor / Camión</th>
                  <th>ETA</th>
                  <th>Fechas estimadas</th>
                  <th>Consolidación</th>
                  <th>Costos</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rutas.map((ruta) => (
                  <React.Fragment key={ruta.id}>
                  <tr>
                    <td>
                      <strong>{getNombreRuta(ruta)}</strong>
                    </td>
                    <td>{ruta.origen || "—"}</td>
                    <td>{ruta.destino || "—"}</td>
                    <td>{ruta.clientes?.nombre || "—"}</td>
                    <td>
                      <Badge variant={estadoBadgeVariant(ruta.estado)}>
                        {estadoLabel(ruta.estado)}
                      </Badge>
                    </td>
                    <td>
                      {ruta.total_pagar != null || ruta.tarifa_base_total != null ? (
                        <div style={{ fontSize: "12px", lineHeight: "1.4" }}>
                          {(() => {
                            const totalCobradoBruto = Math.round(
                              Number(ruta.costo_servicio) > 0
                                ? Number(ruta.costo_servicio)
                                : Number(ruta.total_pagar || ruta.tarifa_base_total || 0),
                            );
                            const totalCobradoNeto = Math.round(
                              Number(ruta.tarifa_base_total || 0) > 0
                                ? Number(ruta.tarifa_base_total)
                                : totalCobradoBruto / 1.19,
                            );
                            let pagoConductor = Number(ruta.pago_conductor_base_clp || 0);
                            if (pagoConductor === 0) {
                              const totalSlots =
                                ruta.bultos?.reduce(
                                  (acc, b) => acc + (Number(b.cuadrados_equivalentes) || 0),
                                  0,
                                ) || 1;
                              const distKm = Number(ruta.distancia_km || 0);
                              pagoConductor =
                                5000 + 3000 + totalSlots * 500 + distKm * 2 * 150;
                            }
                            const gastos = Math.round(
                              Number(ruta.costo_combustible_calculado || 0) +
                                Number(ruta.costo_tac_peajes_clp || 0) +
                                pagoConductor,
                            );
                            const ganancia = Math.round(totalCobradoNeto - gastos);
                            return (
                              <>
                                <div>
                                  Cobrado:{" "}
                                  <strong>
                                    {new Intl.NumberFormat("es-CL", {
                                      style: "currency",
                                      currency: "CLP",
                                      maximumFractionDigits: 0,
                                    }).format(totalCobradoBruto)}
                                  </strong>
                                </div>
                                <div>
                                  Ganancia neta:{" "}
                                  <strong style={{ color: "#10b981" }}>
                                    {new Intl.NumberFormat("es-CL", {
                                      style: "currency",
                                      currency: "CLP",
                                      maximumFractionDigits: 0,
                                    }).format(ganancia)}
                                  </strong>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRutaRentabilidad({
                                      ...ruta,
                                      totalCobradoBruto,
                                      totalCobradoNeto,
                                      gastos,
                                      ganancia,
                                      pagoConductor,
                                    });
                                    setShowRentabilidadModal(true);
                                  }}
                                  className="lt-btn lt-btn--secondary"
                                  style={{
                                    padding: "4px 8px",
                                    fontSize: "11px",
                                    marginTop: "8px",
                                    width: "100%",
                                  }}
                                >
                                  Ver detalle
                                </button>
                              </>
                            );
                          })()}
                        </div>
                      ) : (
                        <span className="lt-list-item__sub" style={{ opacity: 0.6 }}>
                          No calculado
                        </span>
                      )}
                    </td>
                    <td>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: "bold",
                          textTransform: "uppercase",
                          backgroundColor:
                            ruta.estado_pago === "pagado"
                              ? "#10b981"
                              : ruta.estado_pago === "procesando"
                                ? "#f59e0b"
                                : ruta.estado_pago === "fallido"
                                  ? "#ef4444"
                                  : "#64748b",
                          color: "#fff",
                        }}
                      >
                        {ruta.estado_pago || "PENDIENTE"}
                      </span>
                      {ruta.estado_pago === "pagado" && (
                        <button
                          type="button"
                          onClick={() => setComprobanteRutaId(ruta.id)}
                          className="lt-btn lt-btn--secondary"
                          style={{
                            padding: "4px 8px",
                            fontSize: "11px",
                            marginTop: "8px",
                            width: "100%",
                            borderColor: "#3B82F6",
                            color: "#3B82F6",
                          }}
                        >
                          Ver comprobante
                        </button>
                      )}
                    </td>
                    <td>
                      <div>{ruta.conductores?.rut || "—"}</div>
                      <div className="lt-list-item__sub" style={{ marginTop: 4 }}>
                        {ruta.camiones?.patente || "—"}
                      </div>
                    </td>
                    <td>{fmtDate(ruta.eta)}</td>
                    <td>
                      <button
                        type="button"
                        className="lt-btn lt-btn--secondary lt-btn--sm lt-btn--full"
                        style={{ marginBottom: 8 }}
                        disabled={calculandoEstimacionRutaId === ruta.id}
                        onClick={() => calcularDistanciaYFechasRuta(ruta)}
                      >
                        {calculandoEstimacionRutaId === ruta.id
                          ? "Calculando…"
                          : "Calcular fechas"}
                      </button>
                      <MensajeFilaRuta mensaje={mensajesRuta[ruta.id]?.estimacion} />
                      <div className="lt-field-group">
                        <label className="lt-label" htmlFor={`fecha-entrega-${ruta.id}`}>
                          Día estimado
                        </label>
                        <input
                          id={`fecha-entrega-${ruta.id}`}
                          type="date"
                          className="lt-input"
                          value={(fechasEdit[ruta.id] || fechasFromRuta(ruta)).entrega}
                          onChange={(e) =>
                            actualizarFechaRuta(ruta.id, "entrega", e.target.value)
                          }
                        />
                      </div>
                      <button
                        type="button"
                        className="lt-btn lt-btn--secondary lt-btn--sm lt-btn--full"
                        disabled={savingFechasId === ruta.id}
                        onClick={() => guardarFechasRuta(ruta.id)}
                      >
                        {savingFechasId === ruta.id ? "Guardando…" : "Guardar fechas"}
                      </button>
                      <MensajeFilaRuta mensaje={mensajesRuta[ruta.id]?.fechas} />
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`lt-btn lt-btn--sm ${consolidacionAbiertaId === ruta.id ? "lt-btn--primary" : "lt-btn--secondary"}`}
                        onClick={() =>
                          setConsolidacionAbiertaId((prev) =>
                            prev === ruta.id ? null : ruta.id,
                          )
                        }
                        disabled={!ruta.camion_id}
                        title={
                          ruta.camion_id
                            ? "Gestionar consolidación de pedidos"
                            : "Asigne un camión para consolidar pedidos"
                        }
                      >
                        {consolidacionAbiertaId === ruta.id ? "Cerrar" : "Consolidar"}
                      </button>
                      {!ruta.camion_id && (
                        <p className="lt-list-item__sub" style={{ marginTop: 4 }}>
                          Requiere camión
                        </p>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`lt-btn lt-btn--sm ${costosAbiertoId === ruta.id ? "lt-btn--primary" : "lt-btn--secondary"}`}
                        onClick={() =>
                          setCostosAbiertoId((prev) =>
                            prev === ruta.id ? null : ruta.id,
                          )
                        }
                        title="Ver resumen financiero y costos operativos"
                      >
                        {costosAbiertoId === ruta.id ? "Cerrar" : "Ver costos"}
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="lt-btn lt-btn--primary lt-btn--full"
                        style={{ marginBottom: 8 }}
                        onClick={() =>
                          setRutaDetalleSeleccionada({
                            ...ruta,
                            anomalias:
                              Array.isArray(ruta?.anomalias) && ruta.anomalias.length > 0
                                ? ruta.anomalias
                                : Array.isArray(anomaliasPorRuta[ruta.id])
                                  ? anomaliasPorRuta[ruta.id]
                                  : [],
                          })
                        }
                      >
                        Ver detalles
                      </button>
                      <button
                        type="button"
                        className="lt-btn lt-btn--secondary lt-btn--full"
                        style={{ marginBottom: 8 }}
                        onClick={() => {
                          setRutaRecurrenciaCtx({
                            clienteId: ruta.cliente_id,
                            rutaOrigenId: ruta.id,
                            rutaPlantillaId: ruta.ruta_plantilla_id || undefined,
                          });
                          setRecurrenciaModalOpen(true);
                        }}
                      >
                        Repetir pedido
                      </button>
                      <button
                        type="button"
                        className="lt-btn lt-btn--success lt-btn--full"
                        disabled={notifyingId === ruta.id}
                        onClick={() => enviarNotificacionRuta(ruta.id)}
                      >
                        {notifyingId === ruta.id
                          ? "Enviando…"
                          : "Notificar fecha estimada"}
                      </button>
                      <MensajeFilaRuta mensaje={mensajesRuta[ruta.id]?.notificar} />
                      <button
                        type="button"
                        className="lt-btn lt-btn--full"
                        style={{
                          marginTop: 8,
                          backgroundColor: "transparent",
                          border: "1px solid #ef4444",
                          color: "#ef4444",
                        }}
                        onClick={() => handleDelete(ruta.id)}
                      >
                        Eliminar ruta
                      </button>
                    </td>
                  </tr>
                  {consolidacionAbiertaId === ruta.id && (
                    <tr key={`${ruta.id}-consolidacion`}>
                      <td colSpan={13} className="lt-consolidacion-row">
                        <ConsolidacionRutaPanel
                          rutaId={ruta.id}
                          onConsolidado={cargarRutas}
                        />
                      </td>
                    </tr>
                  )}
                  {costosAbiertoId === ruta.id && (
                    <tr key={`${ruta.id}-costos`}>
                      <td colSpan={13} className="lt-consolidacion-row">
                        <CostosOperativosPanel
                          rutaId={ruta.id}
                          rutaEstado={ruta.estado}
                        />
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      <ModalRecurrencia
        open={recurrenciaModalOpen}
        onClose={() => {
          setRecurrenciaModalOpen(false);
          setRutaRecurrenciaCtx(null);
        }}
        onSuccess={() => {
          setMensaje({
            tipo: "ok",
            texto: "Recurrencia configurada correctamente.",
          });
        }}
        clienteId={rutaRecurrenciaCtx?.clienteId}
        rutaOrigenId={rutaRecurrenciaCtx?.rutaOrigenId}
        rutaPlantillaId={rutaRecurrenciaCtx?.rutaPlantillaId}
        titulo="Repetir pedido"
      />

      {rutaDetalleSeleccionada && (
        <div
          className="lt-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ruta-detalle-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setRutaDetalleSeleccionada(null);
          }}
        >
          <div
            className="lt-modal-dialog lt-modal-dialog--lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="lt-modal-header">
              <div>
                <div className="lt-modal-header__title" id="ruta-detalle-title">
                  Detalle de ruta
                </div>
                <div className="lt-modal-header__sub">
                  {getNombreRuta(rutaDetalleSeleccionada)}
                </div>
              </div>
              <button
                type="button"
                className="lt-modal-close"
                aria-label="Cerrar"
                onClick={() => setRutaDetalleSeleccionada(null)}
              >
                Ô£ò
              </button>
            </div>

            <div className="lt-modal-body">
              <div className="lt-form-grid" style={{ gap: 14, gridTemplateColumns: "1fr" }}>
                <div className="lt-card" style={{ padding: 16 }}>
                  <div className="lt-list-item__title" style={{ marginBottom: 8, color: "var(--lt-success)" }}>
                    Información del Viaje
                  </div>
                  <div style={labelStyle}>Cliente</div>
                  <div style={valueStyle}>{rutaDetalleSeleccionada.clientes?.nombre || "—"}</div>
                  <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 12 }}>
                    <div style={{ minWidth: 140, flex: "1 1 180px" }}>
                      <div style={labelStyle}>Origen</div>
                      <div style={valueStyle}>{rutaDetalleSeleccionada.origen || "—"}</div>
                    </div>
                    <div style={{ minWidth: 140, flex: "1 1 180px" }}>
                      <div style={labelStyle}>Destino</div>
                      <div style={valueStyle}>{rutaDetalleSeleccionada.destino || "—"}</div>
                    </div>
                    <div style={{ minWidth: 120, flex: "1 1 150px" }}>
                      <div style={labelStyle}>Distancia</div>
                      <div style={valueStyle}>
                        {rutaDetalleSeleccionada.distancia_km != null &&
                        String(rutaDetalleSeleccionada.distancia_km).trim() !== ""
                          ? `${rutaDetalleSeleccionada.distancia_km} km`
                          : "—"}
                      </div>
                    </div>
                    <div style={{ minWidth: 120, flex: "1 1 140px" }}>
                      <div style={labelStyle}>Cantidad de bultos</div>
                      <div style={valueStyle}>
                        {rutaDetalleSeleccionada.bultos ??
                          rutaDetalleSeleccionada.bultos_despachados ??
                          "—"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lt-card" style={{ padding: 16 }}>
                  <div className="lt-list-item__title" style={{ marginBottom: 8, color: "var(--lt-success)" }}>
                    Logística
                  </div>
                  <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                    <div style={{ minWidth: 160, flex: "1 1 200px" }}>
                      <div style={labelStyle}>Conductor</div>
                      <div style={valueStyle}>{rutaDetalleSeleccionada.conductores?.rut || "—"}</div>
                    </div>
                    <div style={{ minWidth: 160, flex: "1 1 200px" }}>
                      <div style={labelStyle}>Camión</div>
                      <div style={valueStyle}>{rutaDetalleSeleccionada.camiones?.patente || "—"}</div>
                    </div>
                    <div style={{ minWidth: 160, flex: "1 1 200px" }}>
                      <div style={labelStyle}>Estado actual</div>
                      <div>
                        <Badge variant={estadoBadgeVariant(rutaDetalleSeleccionada.estado)}>
                          {estadoLabel(rutaDetalleSeleccionada.estado)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lt-card" style={{ padding: 16 }}>
                  <div className="lt-list-item__title" style={{ marginBottom: 8, color: "var(--lt-success)" }}>
                    Tiempos
                  </div>
                  <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 10 }}>
                    <div style={{ minWidth: 180, flex: "1 1 220px" }}>
                      <div style={labelStyle}>Fecha de inicio</div>
                      <div style={valueStyle}>{fmtDate(rutaDetalleSeleccionada.fecha_inicio)}</div>
                    </div>
                    <div style={{ minWidth: 180, flex: "1 1 220px" }}>
                      <div style={labelStyle}>ETA</div>
                      <div style={valueStyle}>{fmtDate(rutaDetalleSeleccionada.eta)}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                    <div style={{ minWidth: 160, flex: "1 1 200px" }}>
                      <div style={labelStyle}>Inicio rango</div>
                      <div style={valueStyle}>{toInputDate(rutaDetalleSeleccionada.fecha_estimada_inicio) || "—"}</div>
                    </div>
                    <div style={{ minWidth: 160, flex: "1 1 200px" }}>
                      <div style={labelStyle}>Fin rango</div>
                      <div style={valueStyle}>{toInputDate(rutaDetalleSeleccionada.fecha_estimada_fin) || "—"}</div>
                    </div>
                    <div style={{ minWidth: 160, flex: "1 1 200px" }}>
                      <div style={labelStyle}>Día estimado</div>
                      <div style={valueStyle}>{toInputDate(rutaDetalleSeleccionada.fecha_estimada_entrega) || "—"}</div>
                    </div>
                  </div>
                </div>

                <div className="lt-card" style={{ padding: 16 }}>
                  <div className="lt-list-item__title" style={{ marginBottom: 8, color: "var(--lt-success)" }}>
                    Costos operativos
                  </div>
                  {loadingCostosDetalle ? (
                    <p className="lt-list-item__sub" style={{ color: "#6b7280", margin: 0 }}>
                      Calculando costos operativos...
                    </p>
                  ) : costosDetalle && (
                    costosDetalle.total != null ||
                    costosDetalle.total_pedido != null ||
                    costosDetalle.costoTotal != null ||
                    costosDetalle.combustible != null ||
                    costosDetalle.costoCombustible != null ||
                    costosDetalle.conductor != null ||
                    costosDetalle.costoConductor != null ||
                    costosDetalle.espera != null ||
                    costosDetalle.costoEspera != null ||
                    costosDetalle.tiempoEsperaMinutos != null ||
                    costosDetalle.peajes != null ||
                    costosDetalle.costoPeajes != null ||
                    costosDetalle.precioCombustibleLitro != null
                  ) ? (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 12,
                        paddingBottom: 4,
                      }}
                    >
                      <div className="lt-card" style={{ padding: 14, minWidth: 180, flex: "0 0 180px" }}>
                        <div className="lt-card__subtitle" style={{ marginBottom: 6 }}>
                          Combustible
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--lt-success)" }}>
                          {formatCurrencyClp(costosDetalle.combustible ?? costosDetalle.costoCombustible)}
                        </div>
                        <div className="lt-card__subtitle" style={{ marginTop: 4 }}>
                          {`${formatCurrencyClp(costosDetalle.precioCombustibleLitro ?? 1200)}/L`}
                        </div>
                      </div>

                      <div className="lt-card" style={{ padding: 14, minWidth: 180, flex: "0 0 180px" }}>
                        <div className="lt-card__subtitle" style={{ marginBottom: 6 }}>
                          Conductor (HU-37)
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--lt-success)" }}>
                          {formatCurrencyClp(costosDetalle.conductor ?? costosDetalle.costoConductor)}
                        </div>
                      </div>

                      <div className="lt-card" style={{ padding: 14, minWidth: 180, flex: "0 0 180px" }}>
                        <div className="lt-card__subtitle" style={{ marginBottom: 6 }}>
                          Espera
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--lt-success)" }}>
                          {formatCurrencyClp(costosDetalle.espera ?? costosDetalle.costoEspera)}
                        </div>
                        <div className="lt-card__subtitle" style={{ marginTop: 4 }}>
                          {`${costosDetalle.tiempoEsperaMinutos ?? 0} min`}
                        </div>
                      </div>

                      <div className="lt-card" style={{ padding: 14, minWidth: 180, flex: "0 0 180px" }}>
                        <div className="lt-card__subtitle" style={{ marginBottom: 6 }}>
                          Peajes
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--lt-success)" }}>
                          {formatCurrencyClp(costosDetalle.peajes ?? costosDetalle.costoPeajes)}
                        </div>
                      </div>

                      <div className="lt-card" style={{ padding: 14, minWidth: 180, flex: "0 0 180px" }}>
                        <div className="lt-card__subtitle" style={{ marginBottom: 6 }}>
                          Total pedido
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--lt-success)" }}>
                          {formatCurrencyClp(
                            costosDetalle.total ??
                              costosDetalle.total_pedido ??
                              costosDetalle.costoTotal,
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="lt-list-item__sub" style={{ color: "#6b7280", margin: 0 }}>
                      Sin costos operativos registrados
                    </p>
                  )}
                </div>

                <div className="lt-card" style={{ padding: 16 }}>
                  <div className="lt-list-item__title" style={{ marginBottom: 8, color: "var(--lt-success)" }}>
                    Información de pago
                  </div>
                  <p className="lt-list-item__sub" style={{ color: "#6b7280", margin: 0 }}>
                    Datos pendientes de integración
                  </p>
                </div>

                <div className="lt-card" style={{ padding: 16 }}>
                  <div className="lt-list-item__title" style={{ marginBottom: 8, color: "var(--lt-success)" }}>
                    Timeline de eventos
                  </div>
                  {buildEventosDetalle(rutaDetalleSeleccionada).length > 0 ? (
                    <div style={{ display: "grid", gap: 10 }}>
                      {buildEventosDetalle(rutaDetalleSeleccionada).map((evento, idx) => {
                        const esPrioritario =
                          Boolean(evento?.es_prioritario) ||
                          Boolean(evento?.prioritario) ||
                          String(evento?.prioridad || "").toLowerCase() === "alta";
                        const titulo =
                          evento?.titulo || evento?.title || evento?.tipo || evento?.nombre || "Evento";
                        const descripcion =
                          evento?.descripcion || evento?.detalle || evento?.mensaje || "Sin descripción";
                        const fecha =
                          evento?.created_at ||
                          evento?.fecha ||
                          evento?.timestamp_evento ||
                          evento?.timestamp ||
                          evento?.fecha_creacion;

                        return (
                          <div
                            key={evento?.id || `${titulo}-${idx}`}
                            className={`lt-alert-card ${esPrioritario ? "lt-alert-card--critical" : "lt-alert-card--normal"}`}
                            style={{ margin: 0, padding: 10 }}
                          >
                            <div className="lt-list-item__row" style={{ marginBottom: 4 }}>
                              <span style={{ ...valueStyle, fontSize: 14 }}>{titulo}</span>
                              {esPrioritario && <Badge variant="danger">PRIORITARIO</Badge>}
                            </div>
                            <div style={labelStyle}>{fmtDate(fecha)}</div>
                            <p className="lt-list-item__sub" style={{ margin: 0, color: "#4b5563" }}>
                              {descripcion}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="lt-list-item__sub" style={{ color: "#6b7280", margin: 0 }}>
                      Sin eventos reportados
                    </p>
                  )}
                </div>
              </div>

              <div className="lt-form-actions" style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="lt-btn lt-btn--secondary"
                  onClick={() => setRutaDetalleSeleccionada(null)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {comprobanteRutaId ? (
        <ComprobanteModal
          rutaId={comprobanteRutaId}
          onClose={() => setComprobanteRutaId(null)}
        />
      ) : null}
      {showRentabilidadModal && rutaRentabilidad ? (
        <div className="lt-modal-overlay">
          <div className="lt-modal" style={{ maxWidth: 450 }}>
            <div className="lt-modal__header">
              <h3>Simulador de rentabilidad interna</h3>
              <button
                type="button"
                className="lt-modal__close"
                onClick={() => setShowRentabilidadModal(false)}
              >
                ×
              </button>
            </div>
            <div className="lt-modal__content">
              <p>
                Total recaudado:{" "}
                {new Intl.NumberFormat("es-CL", {
                  style: "currency",
                  currency: "CLP",
                  maximumFractionDigits: 0,
                }).format(rutaRentabilidad.totalCobradoBruto)}
              </p>
              <p>
                Gastos operativos:{" "}
                {new Intl.NumberFormat("es-CL", {
                  style: "currency",
                  currency: "CLP",
                  maximumFractionDigits: 0,
                }).format(rutaRentabilidad.gastos)}
              </p>
              <p>
                Ganancia neta:{" "}
                <strong style={{ color: "#10b981" }}>
                  {new Intl.NumberFormat("es-CL", {
                    style: "currency",
                    currency: "CLP",
                    maximumFractionDigits: 0,
                  }).format(rutaRentabilidad.ganancia)}
                </strong>
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
