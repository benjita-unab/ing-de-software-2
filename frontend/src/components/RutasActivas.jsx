/* eslint-disable no-unused-vars */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from '@supabase/supabase-js';
import { apiFetch } from "../lib/apiClient";
import { getPlantillasPorCliente } from "../lib/clientesService";
import { getRutaPlantillaById } from "../lib/rutasPlantillaService";
import {
  crearRuta,
  estimarFechasEstimadas,
  actualizarFechasEstimadas,
  notificarFechaEstimada,
  obtenerAnomaliasRuta,
} from "../lib/rutasService";
import { useGooglePlacesAutocomplete } from "../hooks/useGooglePlacesAutocomplete";
import { getNombreRuta } from "../lib/rutasUtils";
import Badge from "./ui/Badge";
import Spinner from "./ui/Spinner";

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
  const [verBultosRutaId, setVerBultosRutaId] = useState(null);
  
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [rutaDetalle, setRutaDetalle] = useState(null);
  const [plantillasCliente, setPlantillasCliente] = useState([]);
  const [plantillaSeleccionadaId, setPlantillaSeleccionadaId] = useState("");
  const [cargandoPlantillas, setCargandoPlantillas] = useState(false);

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

  const handleDelete = async (id) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar esta ruta? Esta acción no se puede deshacer.")) {
      try {
        await supabase.from('historial_estados').delete().eq('ruta_id', id);
        await supabase.from('bultos').delete().eq('ruta_id', id);
        await supabase.from('cargas').delete().eq('ruta_id', id);
        
        const { error } = await supabase.from('rutas').delete().eq('id', id);
        if (error) {
          alert("Error al eliminar ruta: " + error.message);
        } else {
          setRutas(prev => prev.filter(r => r.id !== id));
        }
      } catch (err) {
        alert("Error al procesar eliminación: " + err.message);
      }
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

  const aplicarPlantilla = async (plantillaId) => {
    setPlantillaSeleccionadaId(plantillaId);
    if (!plantillaId) {
      setForm((prev) => ({ ...prev, plantillaId: "" }));
      return;
    }

    const res = await getRutaPlantillaById(plantillaId);
    if (res.error || !res.data) {
      setMensaje({ tipo: "error", texto: res.error || "No se pudo cargar la plantilla." });
      return;
    }

    const plantilla = res.data;
    setForm((prev) => ({
      ...prev,
      plantillaId,
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
      texto: `Plantilla "${plantilla.nombre}" aplicada al formulario.`,
    });
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

    const resultado = await crearRuta(payload);
    setSaving(false);

    if (!resultado.success) {
      setMensaje({
        tipo: "error",
        texto: resultado.error || "No se pudo crear la ruta. Revise los datos o intente nuevamente.",
      });
      return;
    }

    setMensaje({ tipo: "ok", texto: "Ruta creada correctamente." });
    setForm({
      nombreRuta: "",
      clienteId: "",
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
    });
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
      <div className="lt-card lt-module-card">
        <h3 className="lt-module-card__title" style={{ textAlign: 'center', padding: '10px', margin: '0' }}>Rutas registradas</h3>
        {loading ? (
          <Spinner message="Cargando rutas…" />
        ) : rutas.length === 0 ? (
          <div className="lt-empty">No hay rutas para mostrar. Las rutas creadas aparecerán aquí.</div>
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
                  <th>Conductor / Camión</th>
                  <th>ETA</th>
                  <th>Fechas estimadas</th>
                  <th>Acciones</th>
                  <th>Anomalías</th>
                </tr>
              </thead>
              <tbody>
                {rutas.map((ruta) => (
                  <tr key={ruta.id}>
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
                            const totalCobradoBruto = Math.round(Number(ruta.costo_servicio) > 0 
                              ? Number(ruta.costo_servicio) 
                              : Number(ruta.total_pagar || ruta.tarifa_base_total || 0));
                            
                            // Extraer el Neto para la ganancia real de la empresa (sin IVA)
                            const totalCobradoNeto = Math.round(Number(ruta.tarifa_base_total || 0) > 0 
                              ? Number(ruta.tarifa_base_total) 
                              : (totalCobradoBruto / 1.19));

                            let pagoConductor = Number(ruta.pago_conductor_base_clp || 0);
                            if (pagoConductor === 0) {
                              const totalSlots = ruta.bultos?.reduce((acc, b) => acc + (Number(b.cuadrados_equivalentes) || 0), 0) || 1;
                              const distKm = Number(ruta.distancia_km || 0);
                              pagoConductor = 5000 + 3000 + (totalSlots * 500) + (distKm * 2 * 150); // HU-37 approx fallback
                            }

                            const gastos = Math.round(Number(ruta.costo_combustible_calculado || 0) + Number(ruta.costo_tac_peajes_clp || 0) + pagoConductor);
                            const ganancia = Math.round(totalCobradoNeto - gastos);
                            return (
                              <>
                                <div>Cobrado (Cliente): <strong>{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(totalCobradoBruto)}</strong></div>
                                <div>Gastos Op.: <span style={{ color: "#ef4444" }}>{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(gastos)}</span></div>
                                <div style={{ borderTop: "1px dashed rgba(255,255,255,0.15)", marginTop: 4, paddingTop: 4 }}>
                                  Ganancia Neta (s/IVA): <strong style={{color: "#10b981"}}>{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(ganancia)}</strong>
                                </div>
                                <button type="button" onClick={() => { setRutaDetalle({ ...ruta, totalCobradoBruto, totalCobradoNeto, gastos, ganancia, pagoConductor }); setShowDetalleModal(true); }} className="lt-btn lt-btn--secondary" style={{ padding: '4px 8px', fontSize: '11px', marginTop: '8px', width: '100%' }}>Ver Detalle</button>
                              </>
                            );
                          })()}
                        </div>
                      ) : (
                        <span className="lt-list-item__sub" style={{ opacity: 0.6 }}>No calculado</span>
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
                      <button
                        type="button"
                        className="lt-btn lt-btn--success lt-btn--full"
                        disabled={notifyingId === ruta.id}
                        onClick={() => enviarNotificacionRuta(ruta.id)}
                        style={{ marginBottom: 8 }}
                      >
                        {notifyingId === ruta.id
                          ? "Enviando…"
                          : "Notificar fecha estimada"}
                      </button>
                      <MensajeFilaRuta mensaje={mensajesRuta[ruta.id]?.notificar} />
                      <button
                        type="button"
                        className="lt-btn lt-btn--full"
                        style={{ backgroundColor: 'transparent', border: '1px solid #ef4444', color: '#ef4444' }}
                        onClick={() => handleDelete(ruta.id)}
                      >
                        🗑️ Eliminar Ruta
                      </button>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      {/* Modal Detalle Financiero */}
      {showDetalleModal && rutaDetalle && (
        <div className="lt-modal-overlay">
          <div className="lt-modal" style={{ maxWidth: '450px' }}>
            <div className="lt-modal__header">
              <h3>Simulador de Rentabilidad Interna</h3>
              <button type="button" className="lt-modal__close" onClick={() => setShowDetalleModal(false)}>×</button>
            </div>
            <div className="lt-modal__content" style={{ fontSize: '13px', background: '#111827', color: '#fff', padding: '16px', borderRadius: '8px' }}>
              <div style={{ fontWeight: 'bold', color: '#9CA3AF', marginBottom: '8px' }}>INGRESOS (COBRO A CLIENTES)</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>Subtotal Neto</span>
                <strong>{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(rutaDetalle.totalCobradoNeto)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>IVA (19%)</span>
                <span style={{ color: '#38BDF8' }}>+{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(rutaDetalle.totalCobradoBruto - rutaDetalle.totalCobradoNeto)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '4px' }}>
                <strong>Total Recaudado (Total a Pagar)</strong>
                <strong>{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(rutaDetalle.totalCobradoBruto)}</strong>
              </div>

              <div style={{ fontWeight: 'bold', color: '#9CA3AF', marginBottom: '8px' }}>COSTOS OPERATIVOS (INTERNOS)</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>Costo Combustible Físico</span>
                <span style={{ color: '#F87171' }}>-{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(rutaDetalle.costo_combustible_calculado || 0))}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>Pago Conductor</span>
                <span style={{ color: '#F87171' }}>-{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(rutaDetalle.pagoConductor)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>Costo TAC / Peajes</span>
                <span style={{ color: '#F87171' }}>-{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(rutaDetalle.costo_tac_peajes_clp || 0))}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '4px' }}>
                <strong>Gasto Total Estimado</strong>
                <strong style={{ color: '#F87171' }}>-{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(rutaDetalle.gastos)}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <strong style={{ color: '#9CA3AF' }}>MARGEN DE GANANCIA (PROFIT)</strong>
                <strong style={{ color: '#10B981', fontSize: '15px' }}>+{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(rutaDetalle.ganancia)} CLP</strong>
              </div>
            </div>
            <div className="lt-modal__footer" style={{ marginTop: '16px' }}>
              <button type="button" className="lt-btn lt-btn--secondary" onClick={() => setShowDetalleModal(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}

