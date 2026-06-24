import React, { useCallback, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { apiFetch } from "../lib/apiClient";
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
import ParadaPlantillaInput from "./ParadaPlantillaInput";
import ConsolidacionRutaPanel from "./ConsolidacionRutaPanel";
import CostosOperativosPanel from "./CostosOperativosPanel";
import ModalRecurrencia from "./ModalRecurrencia";
import Badge from "./ui/Badge";
import Spinner from "./ui/Spinner";

const MODO_PLANTILLA = "plantilla";
const MODO_MANUAL = "manual";

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
  const [showForm, setShowForm] = useState(false);
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
    distanciaKm: "",
    fechasEstimadas: { ...FECHAS_VACIAS },
    advertenciaEstimacion: "",
    bultosDespachos: "",
    observaciones: "",
  });

  const origenInputRef = useRef(null);
  const destinoInputRef = useRef(null);

  const { error: mapsOrigenError } = useGooglePlacesAutocomplete(origenInputRef, {
    enabled: showForm,
    onPlaceSelected: (address) =>
      setForm((prev) => ({ ...prev, origen: address })),
  });
  const { error: mapsDestinoError } = useGooglePlacesAutocomplete(destinoInputRef, {
    enabled: showForm,
    onPlaceSelected: (address) =>
      setForm((prev) => ({ ...prev, destino: address })),
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
      setForm((prev) => ({ ...prev, plantillaId: "" }));
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
      distanciaKm:
        plantilla.distanciaEstimada != null
          ? String(plantilla.distanciaEstimada)
          : prev.distanciaKm,
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
  };

  const actualizarParada = (index, campo, valor) => {
    setParadas((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [campo]: valor } : p)),
    );
  };

  const actualizarParadaDesdePlaces = (index, datos) => {
    setParadas((prev) =>
      prev.map((p, i) => (i === index ? { ...p, ...datos, es_temporal: true } : p)),
    );
  };

  const eliminarParada = (index) => {
    setParadas((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((p, i) => ({ ...p, orden: i + 1 })),
    );
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
      advertenciaEstimacion: "",
    }));
    setErroresFormulario({});
  };

  const actualizarCampo = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    setErroresFormulario((prev) => {
      if (!prev[campo]) return prev;
      const next = { ...prev };
      delete next[campo];
      return next;
    });
  };

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
    setForm((prev) => ({ ...prev, advertenciaEstimacion: "" }));
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

    setForm((prev) => ({
      ...prev,
      advertenciaEstimacion: "",
      distanciaKm:
        data.distancia_km != null ? String(data.distancia_km) : prev.distanciaKm,
      fechasEstimadas: {
        inicio: data.fecha_estimada_inicio || "",
        fin: data.fecha_estimada_fin || "",
        entrega: data.fecha_estimada_entrega || "",
      },
    }));
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
      ["eta", form.eta],
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
    setShowForm(false);
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

        <div className="lt-form-actions" style={{ marginTop: 0 }}>
          <button
            type="button"
            className="lt-btn lt-btn--primary"
            onClick={() => {
              setShowForm((v) => {
                const next = !v;
                if (next) setErroresFormulario({});
                return next;
              });
              setMensaje(null);
            }}
          >
            {showForm ? "Ocultar formulario" : "Crear nueva ruta"}
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={enviarFormulario}
            noValidate
            className="lt-card rutas-nueva-form"
            style={{ marginTop: 16, marginBottom: 16, overflow: "visible" }}
          >
            <div className="lt-module-card__title" style={{ marginBottom: 12 }}>
              Nuevo pedido / ruta
            </div>

            <div className="lt-field-group" style={{ gridColumn: "1 / -1", marginBottom: 16 }}>
              <span className="lt-label">Modo de creación</span>
              <div className="lt-form-actions" style={{ marginTop: 8, gap: 8 }}>
                <button
                  type="button"
                  className={`lt-btn ${modoCreacion === MODO_PLANTILLA ? "lt-btn--primary" : "lt-btn--secondary"}`}
                  onClick={() => cambiarModoCreacion(MODO_PLANTILLA)}
                >
                  Usar ruta existente
                </button>
                <button
                  type="button"
                  className={`lt-btn ${modoCreacion === MODO_MANUAL ? "lt-btn--primary" : "lt-btn--secondary"}`}
                  onClick={() => cambiarModoCreacion(MODO_MANUAL)}
                >
                  Crear ruta manual
                </button>
              </div>
            </div>

            <div className="lt-form-grid">
              <div className="lt-field-group" style={{ gridColumn: "1 / -1" }}>
                <label className="lt-label" htmlFor="ruta-nombre">Nombre de la ruta (Opcional)</label>
                <input
                  id="ruta-nombre"
                  className="lt-input"
                  value={form.nombreRuta}
                  onChange={(e) => actualizarCampo("nombreRuta", e.target.value)}
                  placeholder="Ej: Ruta Norte #2 (se autogenerará si se deja vacío)"
                />
              </div>
              <div className="lt-field-group">
                <label className="lt-label" htmlFor="ruta-cliente">Cliente *</label>
                <select
                  id="ruta-cliente"
                  className="lt-select"
                  required
                  value={form.clienteId}
                  onChange={(e) => actualizarCampo("clienteId", e.target.value)}
                  disabled={listsLoading}
                >
                  <option value="">Seleccionar…</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre || c.id}
                    </option>
                  ))}
                </select>
                {renderErrorFormulario("clienteId")}
              </div>

              {modoCreacion === MODO_PLANTILLA && (
                <div className="lt-field-group" style={{ gridColumn: "1 / -1" }}>
                  <label className="lt-label" htmlFor="ruta-plantilla">
                    Ruta reutilizable *
                  </label>
                  {cargandoRutasReutilizables ? (
                    <p className="lt-card__subtitle">Cargando rutas disponibles…</p>
                  ) : rutasReutilizables.length === 0 ? (
                    <p className="lt-card__subtitle">
                      No hay rutas reutilizables activas
                      {form.clienteId ? " para este cliente" : ""}. Cree una en Rutas plantilla o use el modo manual.
                    </p>
                  ) : (
                    <select
                      id="ruta-plantilla"
                      className="lt-select"
                      value={plantillaSeleccionadaId}
                      onChange={(e) => aplicarPlantilla(e.target.value)}
                    >
                      <option value="">Seleccionar ruta…</option>
                      {rutasReutilizables.map((ruta) => (
                        <option key={ruta.id} value={ruta.id}>
                          {ruta.nombre} — {ruta.origen} → {ruta.destino}
                        </option>
                      ))}
                    </select>
                  )}
                  {renderErrorFormulario("plantillaId")}
                </div>
              )}

              {modoCreacion === MODO_MANUAL && form.clienteId && plantillasCliente.length > 0 && (
                <div className="lt-field-group" style={{ gridColumn: "1 / -1" }}>
                  <label className="lt-label" htmlFor="ruta-plantilla-cliente">
                    Precargar desde plantilla del cliente (opcional)
                  </label>
                  {cargandoPlantillas ? (
                    <p className="lt-card__subtitle">Buscando plantillas adjudicadas…</p>
                  ) : (
                    <select
                      id="ruta-plantilla-cliente"
                      className="lt-select"
                      value={plantillaSeleccionadaId}
                      onChange={(e) => aplicarPlantilla(e.target.value)}
                    >
                      <option value="">Seleccionar plantilla para precargar datos…</option>
                      {plantillasCliente.map((plantilla) => (
                        <option key={plantilla.id} value={plantilla.id}>
                          {plantilla.nombre} — {plantilla.origen} → {plantilla.destino}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div className="lt-field-group">
                <label className="lt-label" htmlFor="ruta-conductor">Conductor *</label>
                <select
                  id="ruta-conductor"
                  className="lt-select"
                  required
                  value={form.conductorId}
                  onChange={(e) => actualizarCampo("conductorId", e.target.value)}
                  disabled={listsLoading}
                >
                  <option value="">Seleccionar conductor…</option>
                  {conductores.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.rut || c.id}
                    </option>
                  ))}
                </select>
                {renderErrorFormulario("conductorId")}
              </div>
              <div className="lt-field-group">
                <label className="lt-label" htmlFor="ruta-camion">Camión *</label>
                <select
                  id="ruta-camion"
                  className="lt-select"
                  required
                  value={form.camionId}
                  onChange={(e) => actualizarCampo("camionId", e.target.value)}
                  disabled={listsLoading}
                >
                  <option value="">Seleccionar camión…</option>
                  {camiones.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.patente || c.id} {c.estado ? `(${c.estado})` : ""}
                    </option>
                  ))}
                </select>
                {renderErrorFormulario("camionId")}
              </div>
              <div className="lt-field-group" style={{ gridColumn: "1 / -1" }}>
                <label className="lt-label" htmlFor="ruta-origen">Origen *</label>
                {mapsError && (
                  <div className="lt-alert-banner lt-alert-banner--error" role="alert" style={{ marginBottom: 8 }}>
                    {mapsError}
                  </div>
                )}
                <input
                  id="ruta-origen"
                  ref={origenInputRef}
                  className="lt-input"
                  required
                  autoComplete="off"
                  readOnly={modoCreacion === MODO_PLANTILLA && !!form.plantillaId}
                  value={form.origen}
                  onChange={(e) => actualizarCampo("origen", e.target.value)}
                  placeholder="Escribe y selecciona una dirección sugerida…"
                />
                {renderErrorFormulario("origen")}
              </div>
              <div className="lt-field-group" style={{ gridColumn: "1 / -1" }}>
                <label className="lt-label" htmlFor="ruta-destino">Destino *</label>
                <input
                  id="ruta-destino"
                  ref={destinoInputRef}
                  className="lt-input"
                  required
                  autoComplete="off"
                  readOnly={modoCreacion === MODO_PLANTILLA && !!form.plantillaId}
                  value={form.destino}
                  onChange={(e) => actualizarCampo("destino", e.target.value)}
                  placeholder="Escribe y selecciona una dirección sugerida…"
                />
                {renderErrorFormulario("destino")}
              </div>

              <div className="lt-field-group" style={{ gridColumn: "1 / -1" }}>
                <div className="lt-form-actions" style={{ justifyContent: "space-between", marginTop: 0 }}>
                  <span className="lt-label" style={{ marginBottom: 0 }}>
                    Paradas temporales del pedido
                  </span>
                  <button type="button" className="lt-btn lt-btn--secondary lt-btn--sm" onClick={agregarParada}>
                    <Plus size={14} style={{ marginRight: 4 }} />
                    Agregar parada
                  </button>
                </div>
                <p className="lt-module-card__subtitle" style={{ marginTop: 4 }}>
                  Las paradas solo afectan a este pedido; la ruta reutilizable original no se modifica.
                </p>
                {paradas.length === 0 ? (
                  <p className="lt-card__subtitle">Sin paradas intermedias.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                    {paradas.map((parada, index) => (
                      <ParadaPlantillaInput
                        key={`parada-${index}-${parada.orden}`}
                        index={index}
                        parada={parada}
                        onChange={actualizarParada}
                        onPlaceSelected={actualizarParadaDesdePlaces}
                        onRemove={eliminarParada}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="lt-field-group" style={{ gridColumn: "1 / -1" }}>
                <label className="lt-label" htmlFor="ruta-observaciones">Observaciones</label>
                <textarea
                  id="ruta-observaciones"
                  className="lt-input"
                  rows={2}
                  value={form.observaciones}
                  onChange={(e) => actualizarCampo("observaciones", e.target.value)}
                  placeholder="Notas operativas del pedido (opcional)"
                />
              </div>

              {modoCreacion === MODO_MANUAL && (
                <div className="lt-field-group" style={{ gridColumn: "1 / -1" }}>
                  <label className="lt-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={guardarComoPlantilla}
                      onChange={(e) => setGuardarComoPlantilla(e.target.checked)}
                    />
                    Guardar como nueva ruta reutilizable para futuros pedidos
                  </label>
                  {guardarComoPlantilla && (
                    <input
                      className="lt-input"
                      style={{ marginTop: 8 }}
                      value={nombrePlantilla}
                      onChange={(e) => setNombrePlantilla(e.target.value)}
                      placeholder="Nombre de la nueva ruta (opcional si completó nombre de ruta)"
                    />
                  )}
                  {renderErrorFormulario("nombrePlantilla")}
                </div>
              )}

              <div className="lt-field-group" style={{ gridColumn: "1 / -1" }}>
                <label className="lt-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={programarRecurrencia}
                    onChange={(e) => setProgramarRecurrencia(e.target.checked)}
                  />
                  Repetir pedido (programar recurrencia tras crear)
                </label>
              </div>

              <div className="lt-field-group">
                <label className="lt-label" htmlFor="ruta-fecha-inicio">Fecha inicio *</label>
                <input
                  id="ruta-fecha-inicio"
                  className="lt-input"
                  type="datetime-local"
                  value={form.fechaInicio}
                  onChange={(e) => actualizarCampo("fechaInicio", e.target.value)}
                />
                {renderErrorFormulario("fechaInicio")}
              </div>
              <div className="lt-field-group">
                <label className="lt-label" htmlFor="ruta-eta">ETA *</label>
                <input
                  id="ruta-eta"
                  className="lt-input"
                  type="datetime-local"
                  value={form.eta}
                  onChange={(e) => actualizarCampo("eta", e.target.value)}
                />
                {renderErrorFormulario("eta")}
              </div>
              <div className="lt-field-group">
                <label className="lt-label" htmlFor="ruta-bultos">Cantidad de bultos *</label>
                <input
                  id="ruta-bultos"
                  className="lt-input"
                  type="number"
                  min="1"
                  required
                  value={form.bultosDespachos}
                  onChange={(e) => actualizarCampo("bultosDespachos", e.target.value)}
                  placeholder="Ej: 25"
                />
                {renderErrorFormulario("bultosDespachos")}
              </div>
              <div className="lt-field-group" style={{ gridColumn: "1 / -1" }}>
                <label className="lt-label" htmlFor="ruta-distancia">Distancia *</label>
                <p className="lt-module-card__subtitle" style={{ marginTop: 0, marginBottom: 8 }}>
                  {AYUDA_DISTANCIA_VIAL}
                </p>
                <input
                  id="ruta-distancia"
                  className="lt-input"
                  type="text"
                  inputMode="decimal"
                  value={form.distanciaKm}
                  onChange={(e) => actualizarCampo("distanciaKm", e.target.value)}
                  placeholder="Vacío = calcular por carretera con origen y destino"
                />
                {renderErrorFormulario("distanciaKm")}
              </div>
              <div className="lt-field-group" style={{ gridColumn: "1 / -1" }}>
                <div className="lt-form-actions" style={{ marginTop: 0, flexWrap: "wrap" }}>
                  <span className="lt-module-card__title" style={{ marginBottom: 0, fontSize: 13 }}>
                    Fechas estimadas de entrega
                  </span>
                  <button
                    type="button"
                    className="lt-btn lt-btn--secondary"
                    disabled={calculandoEstimacion || saving}
                    onClick={calcularDistanciaYFechasForm}
                  >
                    {calculandoEstimacion
                      ? "Calculando…"
                      : "Calcular distancia y fechas"}
                  </button>
                </div>
                {form.advertenciaEstimacion && (
                  <div className="lt-alert-banner lt-alert-banner--warning" role="alert" style={{ marginTop: 10 }}>
                    {form.advertenciaEstimacion}
                  </div>
                )}
                <div className="lt-form-grid lt-form-grid--3" style={{ marginTop: 10 }}>
                  <div className="lt-field-group">
                    <label className="lt-label" htmlFor="ruta-fecha-est-inicio">Inicio rango estimado *</label>
                    <input
                      id="ruta-fecha-est-inicio"
                      type="date"
                      className="lt-input"
                      value={form.fechasEstimadas.inicio}
                      onChange={(e) => actualizarFechaForm("inicio", e.target.value)}
                    />
                    {renderErrorFormulario("fechaInicioEstimado")}
                  </div>
                  <div className="lt-field-group">
                    <label className="lt-label" htmlFor="ruta-fecha-est-fin">Fin rango estimado *</label>
                    <input
                      id="ruta-fecha-est-fin"
                      type="date"
                      className="lt-input"
                      value={form.fechasEstimadas.fin}
                      onChange={(e) => actualizarFechaForm("fin", e.target.value)}
                    />
                    {renderErrorFormulario("finRangoEstimado")}
                  </div>
                  <div className="lt-field-group">
                    <label className="lt-label" htmlFor="ruta-fecha-est-entrega">Día estimado de entrega *</label>
                    <input
                      id="ruta-fecha-est-entrega"
                      type="date"
                      className="lt-input"
                      value={form.fechasEstimadas.entrega}
                      onChange={(e) => actualizarFechaForm("entrega", e.target.value)}
                    />
                    {renderErrorFormulario("diaEstimadoEntrega")}
                  </div>
                </div>
              </div>
            </div>
            <div className="lt-form-actions">
              <button type="submit" className="lt-btn lt-btn--primary" disabled={saving || listsLoading}>
                {saving ? "Guardando…" : "Crear pedido"}
              </button>
            </div>
          </form>
        )}
      </div>

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
                  <th>Conductor / Camión</th>
                  <th>ETA</th>
                  <th>Fechas estimadas</th>
                  <th>Anomalías</th>
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
                      <div>{ruta.conductores?.rut || "—"}</div>
                      <div className="lt-list-item__sub" style={{ marginTop: 4 }}>
                        {ruta.camiones?.patente || "—"}
                      </div>
                    </td>
                    <td>{fmtDate(ruta.eta)}</td>
                    <td>
                      <div className="lt-field-group">
                        <label className="lt-label" htmlFor={`distancia-${ruta.id}`}>
                          Distancia vial calculada (km)
                        </label>
                        <input
                          id={`distancia-${ruta.id}`}
                          type="number"
                          min="0"
                          step="0.1"
                          className="lt-input"
                          value={(fechasEdit[ruta.id] || fechasFromRuta(ruta)).distanciaKm}
                          onChange={(e) =>
                            actualizarFechaRuta(ruta.id, "distanciaKm", e.target.value)
                          }
                          placeholder="Vacío = Google Routes"
                        />
                      </div>
                      <button
                        type="button"
                        className="lt-btn lt-btn--secondary lt-btn--full"
                        style={{ marginBottom: 8 }}
                        disabled={calculandoEstimacionRutaId === ruta.id}
                        onClick={() => calcularDistanciaYFechasRuta(ruta)}
                      >
                        {calculandoEstimacionRutaId === ruta.id
                          ? "Calculando…"
                          : "Calcular distancia y fechas"}
                      </button>
                      <MensajeFilaRuta mensaje={mensajesRuta[ruta.id]?.estimacion} />
                      <div className="lt-field-group">
                        <label className="lt-label" htmlFor={`fecha-inicio-${ruta.id}`}>
                          Inicio rango estimado
                        </label>
                        <input
                          id={`fecha-inicio-${ruta.id}`}
                          type="date"
                          className="lt-input"
                          value={(fechasEdit[ruta.id] || fechasFromRuta(ruta)).inicio}
                          onChange={(e) =>
                            actualizarFechaRuta(ruta.id, "inicio", e.target.value)
                          }
                        />
                      </div>
                      <div className="lt-field-group">
                        <label className="lt-label" htmlFor={`fecha-fin-${ruta.id}`}>
                          Fin rango estimado
                        </label>
                        <input
                          id={`fecha-fin-${ruta.id}`}
                          type="date"
                          className="lt-input"
                          value={(fechasEdit[ruta.id] || fechasFromRuta(ruta)).fin}
                          onChange={(e) =>
                            actualizarFechaRuta(ruta.id, "fin", e.target.value)
                          }
                        />
                      </div>
                      <div className="lt-field-group">
                        <label className="lt-label" htmlFor={`fecha-entrega-${ruta.id}`}>
                          Día estimado de entrega
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
                        className="lt-btn lt-btn--secondary lt-btn--full"
                        disabled={savingFechasId === ruta.id}
                        onClick={() => guardarFechasRuta(ruta.id)}
                      >
                        {savingFechasId === ruta.id ? "Guardando…" : "Guardar fechas"}
                      </button>
                      <MensajeFilaRuta mensaje={mensajesRuta[ruta.id]?.fechas} />
                      {ruta.notificacion_fecha_estimada_enviada_at && (
                        <p className="lt-list-item__sub" style={{ marginTop: 4 }}>
                          Notificado: {fmtDate(ruta.notificacion_fecha_estimada_enviada_at)}
                        </p>
                      )}
                    </td>
                    <td>
                      {Array.isArray(anomaliasPorRuta[ruta.id]) && anomaliasPorRuta[ruta.id].length > 0 ? (
                        <div className="lt-card" style={{ padding: 10 }}>
                          <div className="lt-list-item__title" style={{ marginBottom: 8 }}>
                            {anomaliasPorRuta[ruta.id].length} anomalía(s) reportada(s)
                          </div>
                          {anomaliasPorRuta[ruta.id].map((anomalia) => (
                            <div
                              key={anomalia.id}
                              className={`lt-alert-card ${anomalia.es_prioritario ? "lt-alert-card--critical" : "lt-alert-card--normal"}`}
                              style={{ marginBottom: 8 }}
                            >
                              <div className="lt-list-item__row">
                                <span className="lt-list-item__title">
                                  {anomalia.titulo || "Sin título"}
                                </span>
                                {anomalia.es_prioritario && (
                                  <Badge variant="danger">PRIORITARIO</Badge>
                                )}
                              </div>
                              <p className="lt-alert-card__desc" style={{ marginBottom: anomalia.foto_url ? 8 : 0 }}>
                                {anomalia.descripcion || "Sin descripción"}
                              </p>
                              {anomalia.foto_url && (
                                <a
                                  href={anomalia.foto_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="lt-btn lt-btn--ghost"
                                >
                                  Ver foto relacionada
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="lt-empty" style={{ padding: 12, minHeight: 0 }}>
                          No hay anomalías reportadas
                        </div>
                      )}
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
                    </td>
                  </tr>
                  {consolidacionAbiertaId === ruta.id && (
                    <tr key={`${ruta.id}-consolidacion`}>
                      <td colSpan={12} className="lt-consolidacion-row">
                        <ConsolidacionRutaPanel
                          rutaId={ruta.id}
                          onConsolidado={cargarRutas}
                        />
                      </td>
                    </tr>
                  )}
                  {costosAbiertoId === ruta.id && (
                    <tr key={`${ruta.id}-costos`}>
                      <td colSpan={12} className="lt-consolidacion-row">
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
    </div>
  );
}
