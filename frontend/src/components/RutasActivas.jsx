import React, { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "../lib/apiClient";
import {
  crearRuta,
  estimarFechasEstimadas,
  actualizarFechasEstimadas,
  notificarFechaEstimada,
} from "../lib/rutasService";
import { useGooglePlacesAutocomplete } from "../hooks/useGooglePlacesAutocomplete";

const base = {
  container: {
    minHeight: "100%",
    background: "transparent",
    color: "#fff",
    padding: "10px",
    fontFamily: "'Inter', 'Poppins', sans-serif",
    overflow: "auto",
  },
  card: {
    background: "rgba(8,8,12,0.72)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "16px",
    padding: "18px",
    marginBottom: "14px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
    backdropFilter: "blur(8px)",
  },
  title: {
    fontSize: "18px",
    fontWeight: 800,
    color: "#fff",
    marginBottom: "8px",
    letterSpacing: "0.06em",
  },
  subtitle: {
    fontSize: "13px",
    color: "rgba(226,232,240,0.75)",
    marginBottom: "16px",
    lineHeight: 1.5,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "12px",
  },
  th: {
    textAlign: "left",
    padding: "10px 8px",
    borderBottom: "1px solid rgba(255,255,255,0.12)",
    color: "rgba(255,255,255,0.75)",
    fontSize: "12px",
    fontWeight: 600,
    background: "rgba(255,255,255,0.03)",
  },
  td: {
    padding: "12px 8px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    fontSize: "14px",
    color: "#e2e8f0",
    verticalAlign: "top",
  },
  badge: {
    display: "inline-block",
    padding: "4px 8px",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: 600,
    background: "rgba(58,12,163,0.45)",
    color: "#ffffff",
    border: "1px solid rgba(76,201,240,0.35)",
  },
  btnPrimary: {
    background: "linear-gradient(135deg, #2563eb, #7c3aed)",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "10px 18px",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: "14px",
  },
  btnWaze: {
    background: "#33ccff",
    color: "#0f172a",
    border: "none",
    borderRadius: "8px",
    padding: "8px 12px",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: "12px",
  },
  btnSecondary: {
    background: "rgba(255,255,255,0.08)",
    color: "#e2e8f0",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: "8px",
    padding: "6px 10px",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "11px",
    marginTop: "6px",
    display: "block",
    width: "100%",
  },
  btnNotify: {
    background: "linear-gradient(135deg, #059669, #10b981)",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "6px 10px",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: "11px",
    marginTop: "6px",
    display: "block",
    width: "100%",
  },
  dateField: {
    marginBottom: "8px",
  },
  dateFieldLabel: {
    display: "block",
    fontSize: "11px",
    fontWeight: 600,
    color: "rgba(226,232,240,0.85)",
    marginBottom: "4px",
  },
  dateInput: {
    width: "100%",
    padding: "6px 8px",
    borderRadius: "6px",
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(15,23,42,0.65)",
    color: "#f8fafc",
    fontSize: "12px",
    boxSizing: "border-box",
  },
  label: {
    display: "block",
    fontSize: "12px",
    fontWeight: 600,
    color: "rgba(226,232,240,0.9)",
    marginBottom: "6px",
    marginTop: "10px",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(15,23,42,0.65)",
    color: "#f8fafc",
    fontSize: "14px",
    boxSizing: "border-box",
  },
  select: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(15,23,42,0.95)",
    color: "#f8fafc",
    fontSize: "14px",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: "12px 16px",
    marginTop: "8px",
  },
  alertOk: {
    padding: "10px 14px",
    borderRadius: "10px",
    background: "rgba(34,197,94,0.15)",
    border: "1px solid rgba(34,197,94,0.45)",
    color: "#86efac",
    fontSize: "13px",
    marginBottom: "12px",
  },
  alertErr: {
    padding: "10px 14px",
    borderRadius: "10px",
    background: "rgba(239,68,68,0.12)",
    border: "1px solid rgba(248,113,113,0.45)",
    color: "#fecaca",
    fontSize: "13px",
    marginBottom: "12px",
  },
  alertOkRow: {
    padding: "8px 10px",
    borderRadius: "8px",
    background: "rgba(34,197,94,0.15)",
    border: "1px solid rgba(34,197,94,0.45)",
    color: "#86efac",
    fontSize: "11px",
    marginTop: "8px",
    lineHeight: 1.4,
  },
  alertErrRow: {
    padding: "8px 10px",
    borderRadius: "8px",
    background: "rgba(239,68,68,0.12)",
    border: "1px solid rgba(248,113,113,0.45)",
    color: "#fecaca",
    fontSize: "11px",
    marginTop: "8px",
    lineHeight: 1.4,
  },
  alertWarnRow: {
    padding: "8px 10px",
    borderRadius: "8px",
    background: "rgba(234,179,8,0.12)",
    border: "1px solid rgba(250,204,21,0.45)",
    color: "#fde68a",
    fontSize: "11px",
    marginTop: "8px",
    lineHeight: 1.4,
  },
  alertWarn: {
    padding: "10px 14px",
    borderRadius: "10px",
    background: "rgba(234,179,8,0.12)",
    border: "1px solid rgba(250,204,21,0.45)",
    color: "#fde68a",
    fontSize: "13px",
    marginBottom: "12px",
  },
};

function MensajeFilaRuta({ mensaje }) {
  if (!mensaje?.texto) return null;
  const style =
    mensaje.tipo === "ok"
      ? base.alertOkRow
      : mensaje.tipo === "warn"
        ? base.alertWarnRow
        : base.alertErrRow;
  return <div style={style}>{mensaje.texto}</div>;
}

const FECHAS_VACIAS = { inicio: "", fin: "", entrega: "" };

const AYUDA_DISTANCIA_VIAL =
  "La distancia se calcula por carretera usando origen y destino. Puede ajustarse manualmente por criterio operativo.";

const ADVERTENCIA_DISTANCIA_VIAL =
  "No se pudo calcular la distancia vial automáticamente. Ingrese la distancia manualmente o revise origen/destino.";

function openWazeNavigation(destinoTexto) {
  const q = String(destinoTexto || "").trim();
  if (!q) return;
  const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(q)}&navigate=yes&utm_source=logitrack`;
  window.open(wazeUrl, "_blank", "noopener,noreferrer");
}

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
  const [mensajesRuta, setMensajesRuta] = useState({});
  const [fechasEdit, setFechasEdit] = useState({});
  const [savingFechasId, setSavingFechasId] = useState(null);
  const [notifyingId, setNotifyingId] = useState(null);
  const [calculandoEstimacion, setCalculandoEstimacion] = useState(false);
  const [calculandoEstimacionRutaId, setCalculandoEstimacionRutaId] = useState(null);

  const [form, setForm] = useState({
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

  const cargarRutas = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch("/api/rutas");
    if (!res.ok) {
      setRutas([]);
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

  const actualizarCampo = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  };

  const actualizarFechaForm = (campo, valor) => {
    setForm((prev) => ({
      ...prev,
      fechasEstimadas: { ...prev.fechasEstimadas, [campo]: valor },
    }));
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
    setSaving(true);

    const bultosDespachosValue = Number(form.bultosDespachos);
    if (
      !form.bultosDespachos.trim() ||
      Number.isNaN(bultosDespachosValue) ||
      !Number.isInteger(bultosDespachosValue) ||
      bultosDespachosValue < 1
    ) {
      setSaving(false);
      window.alert(
        "El campo Cantidad de Bultos a Despachar es obligatorio y debe ser un número entero mayor o igual a 1.",
      );
      return;
    }

    const payload = {
      cliente_id: form.clienteId.trim(),
      origen: form.origen.trim(),
      destino: form.destino.trim(),
      bultos_despachados: bultosDespachosValue,
    };

    if (form.conductorId.trim()) payload.conductor_id = form.conductorId.trim();
    if (form.camionId.trim()) payload.camion_id = form.camionId.trim();

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
    if (String(form.distanciaKm ?? "").trim() !== "") {
      payload.distancia_km = Number(form.distanciaKm);
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
    <div style={base.container} className="premium-scroll operator-section">
      <div style={base.card} className="operator-glass-card">
        <div style={base.title}>Gestión de rutas</div>
        <p style={base.subtitle}>
          Creá y consultá rutas operativas. El seguimiento y las evidencias siguen siendo responsabilidad de LogiTrack (app móvil y trazabilidad).
        </p>

        {mensaje?.tipo === "ok" && (
          <div style={base.alertOk}>{mensaje.texto}</div>
        )}
        {mensaje?.tipo === "error" && (
          <div style={base.alertErr}>{mensaje.texto}</div>
        )}

        <div style={{ marginBottom: "16px" }}>
          <button
            type="button"
            style={base.btnPrimary}
            onClick={() => {
              setShowForm((v) => !v);
              setMensaje(null);
            }}
          >
            {showForm ? "Ocultar formulario" : "Crear nueva ruta"}
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={enviarFormulario}
            className="rutas-nueva-form operator-glass-card"
            style={{ ...base.card, padding: "16px", marginBottom: "16px", overflow: "visible" }}
          >
            <div style={{ fontWeight: 700, marginBottom: "8px", color: "#e2e8f0" }}>Nueva ruta</div>
            <div style={base.formGrid}>
              <div>
                <label style={base.label}>Cliente *</label>
                <select
                  style={base.select}
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
              </div>
              <div>
                <label style={base.label}>Conductor (opcional)</label>
                <select
                  style={base.select}
                  value={form.conductorId}
                  onChange={(e) => actualizarCampo("conductorId", e.target.value)}
                  disabled={listsLoading}
                >
                  <option value="">—</option>
                  {conductores.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.rut || c.id}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={base.label}>Camión (opcional)</label>
                <select
                  style={base.select}
                  value={form.camionId}
                  onChange={(e) => actualizarCampo("camionId", e.target.value)}
                  disabled={listsLoading}
                >
                  <option value="">—</option>
                  {camiones.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.patente || c.id} {c.estado ? `(${c.estado})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={base.label}>Origen *</label>
                {mapsError && (
                  <div style={{ color: "#fca5a5", fontSize: "11px", marginBottom: "6px" }}>
                    {mapsError}
                  </div>
                )}
                <input
                  ref={origenInputRef}
                  style={base.input}
                  required
                  autoComplete="off"
                  value={form.origen}
                  onChange={(e) => actualizarCampo("origen", e.target.value)}
                  placeholder="Escribe y selecciona una dirección sugerida…"
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={base.label}>Destino *</label>
                <input
                  ref={destinoInputRef}
                  style={base.input}
                  required
                  autoComplete="off"
                  value={form.destino}
                  onChange={(e) => actualizarCampo("destino", e.target.value)}
                  placeholder="Escribe y selecciona una dirección sugerida…"
                />
              </div>
              <div>
                <label style={base.label}>Fecha inicio (opcional)</label>
                <input
                  style={base.input}
                  type="datetime-local"
                  value={form.fechaInicio}
                  onChange={(e) => actualizarCampo("fechaInicio", e.target.value)}
                />
              </div>
              <div>
                <label style={base.label}>ETA (opcional)</label>
                <input
                  style={base.input}
                  type="datetime-local"
                  value={form.eta}
                  onChange={(e) => actualizarCampo("eta", e.target.value)}
                />
              </div>
              <div>
                <label style={base.label}>Cantidad de Bultos a Despachar *</label>
                <input
                  style={base.input}
                  type="number"
                  min="1"
                  required
                  value={form.bultosDespachos}
                  onChange={(e) => actualizarCampo("bultosDespachos", e.target.value)}
                  placeholder="Ej: 25"
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={base.label}>Distancia vial calculada (km)</label>
                <p style={{ ...base.subtitle, marginTop: 0, marginBottom: "8px", fontSize: "12px" }}>
                  {AYUDA_DISTANCIA_VIAL}
                </p>
                <input
                  style={base.input}
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.distanciaKm}
                  onChange={(e) => actualizarCampo("distanciaKm", e.target.value)}
                  placeholder="Vacío = calcular por carretera con origen y destino"
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "10px",
                    alignItems: "center",
                    marginTop: "8px",
                  }}
                >
                  <span style={{ fontWeight: 700, color: "#e2e8f0", fontSize: "13px" }}>
                    Fechas estimadas de entrega
                  </span>
                  <button
                    type="button"
                    style={base.btnSecondary}
                    disabled={calculandoEstimacion || saving}
                    onClick={calcularDistanciaYFechasForm}
                  >
                    {calculandoEstimacion
                      ? "Calculando…"
                      : "Calcular distancia y fechas"}
                  </button>
                </div>
                {form.advertenciaEstimacion && (
                  <div style={{ ...base.alertWarn, marginTop: "10px" }}>
                    {form.advertenciaEstimacion}
                  </div>
                )}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                    gap: "10px",
                    marginTop: "10px",
                  }}
                >
                  <div style={base.dateField}>
                    <label style={base.dateFieldLabel}>Inicio rango estimado</label>
                    <input
                      type="date"
                      style={base.dateInput}
                      value={form.fechasEstimadas.inicio}
                      onChange={(e) => actualizarFechaForm("inicio", e.target.value)}
                    />
                  </div>
                  <div style={base.dateField}>
                    <label style={base.dateFieldLabel}>Fin rango estimado</label>
                    <input
                      type="date"
                      style={base.dateInput}
                      value={form.fechasEstimadas.fin}
                      onChange={(e) => actualizarFechaForm("fin", e.target.value)}
                    />
                  </div>
                  <div style={base.dateField}>
                    <label style={base.dateFieldLabel}>Día estimado de entrega</label>
                    <input
                      type="date"
                      style={base.dateInput}
                      value={form.fechasEstimadas.entrega}
                      onChange={(e) => actualizarFechaForm("entrega", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div style={{ marginTop: "18px", display: "flex", gap: "12px", alignItems: "center" }}>
              <button type="submit" style={base.btnPrimary} disabled={saving || listsLoading}>
                {saving ? "Guardando…" : "Guardar ruta"}
              </button>
            </div>
          </form>
        )}
      </div>

      <div style={base.card} className="operator-glass-card">
        <div style={{ ...base.title, fontSize: "15px" }}>Navegación con Waze</div>
        <p style={{ ...base.subtitle, marginBottom: 0 }}>
          Waze se utiliza solo como apoyo para navegación. El seguimiento, evidencias y cierre de despacho se mantienen dentro de LogiTrack.
        </p>
      </div>

      <div style={base.card} className="operator-glass-card">
        <div style={{ ...base.title, fontSize: "16px" }}>Rutas registradas</div>
        {loading ? (
          <p style={{ color: "#94a3b8", fontSize: "14px" }}>Cargando rutas…</p>
        ) : rutas.length === 0 ? (
          <p style={{ color: "#94a3b8", fontSize: "14px" }}>No hay rutas para mostrar. Cree una con el botón superior.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={base.table}>
              <thead>
                <tr>
                  <th style={base.th}>Origen</th>
                  <th style={base.th}>Destino</th>
                  <th style={base.th}>Cliente</th>
                  <th style={base.th}>Estado</th>
                  <th style={base.th}>Conductor / Camión</th>
                  <th style={base.th}>ETA</th>
                  <th style={base.th}>Fechas estimadas</th>
                  <th style={base.th}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rutas.map((ruta) => (
                  <tr key={ruta.id}>
                    <td style={base.td}>{ruta.origen || "—"}</td>
                    <td style={base.td}>{ruta.destino || "—"}</td>
                    <td style={base.td}>{ruta.clientes?.nombre || "—"}</td>
                    <td style={base.td}>
                      <span style={base.badge}>{ruta.estado || "—"}</span>
                    </td>
                    <td style={base.td}>
                      <div>{ruta.conductores?.rut || "—"}</div>
                      <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
                        {ruta.camiones?.patente || "—"}
                      </div>
                    </td>
                    <td style={base.td}>{fmtDate(ruta.eta)}</td>
                    <td style={base.td}>
                      <div style={base.dateField}>
                        <label style={base.dateFieldLabel} htmlFor={`distancia-${ruta.id}`}>
                          Distancia vial calculada (km)
                        </label>
                        <input
                          id={`distancia-${ruta.id}`}
                          type="number"
                          min="0"
                          step="0.1"
                          style={base.dateInput}
                          value={(fechasEdit[ruta.id] || fechasFromRuta(ruta)).distanciaKm}
                          onChange={(e) =>
                            actualizarFechaRuta(ruta.id, "distanciaKm", e.target.value)
                          }
                          placeholder="Vacío = Google Routes"
                        />
                      </div>
                      <button
                        type="button"
                        style={{ ...base.btnSecondary, marginTop: 0, marginBottom: "8px" }}
                        disabled={calculandoEstimacionRutaId === ruta.id}
                        onClick={() => calcularDistanciaYFechasRuta(ruta)}
                      >
                        {calculandoEstimacionRutaId === ruta.id
                          ? "Calculando…"
                          : "Calcular distancia y fechas"}
                      </button>
                      <MensajeFilaRuta mensaje={mensajesRuta[ruta.id]?.estimacion} />
                      <div style={base.dateField}>
                        <label style={base.dateFieldLabel} htmlFor={`fecha-inicio-${ruta.id}`}>
                          Inicio rango estimado
                        </label>
                        <input
                          id={`fecha-inicio-${ruta.id}`}
                          type="date"
                          style={base.dateInput}
                          value={(fechasEdit[ruta.id] || fechasFromRuta(ruta)).inicio}
                          onChange={(e) =>
                            actualizarFechaRuta(ruta.id, "inicio", e.target.value)
                          }
                        />
                      </div>
                      <div style={base.dateField}>
                        <label style={base.dateFieldLabel} htmlFor={`fecha-fin-${ruta.id}`}>
                          Fin rango estimado
                        </label>
                        <input
                          id={`fecha-fin-${ruta.id}`}
                          type="date"
                          style={base.dateInput}
                          value={(fechasEdit[ruta.id] || fechasFromRuta(ruta)).fin}
                          onChange={(e) =>
                            actualizarFechaRuta(ruta.id, "fin", e.target.value)
                          }
                        />
                      </div>
                      <div style={base.dateField}>
                        <label style={base.dateFieldLabel} htmlFor={`fecha-entrega-${ruta.id}`}>
                          Día estimado de entrega
                        </label>
                        <input
                          id={`fecha-entrega-${ruta.id}`}
                          type="date"
                          style={base.dateInput}
                          value={(fechasEdit[ruta.id] || fechasFromRuta(ruta)).entrega}
                          onChange={(e) =>
                            actualizarFechaRuta(ruta.id, "entrega", e.target.value)
                          }
                        />
                      </div>
                      <button
                        type="button"
                        style={base.btnSecondary}
                        disabled={savingFechasId === ruta.id}
                        onClick={() => guardarFechasRuta(ruta.id)}
                      >
                        {savingFechasId === ruta.id ? "Guardando…" : "Guardar fechas"}
                      </button>
                      <MensajeFilaRuta mensaje={mensajesRuta[ruta.id]?.fechas} />
                      {ruta.notificacion_fecha_estimada_enviada_at && (
                        <div
                          style={{
                            fontSize: "10px",
                            color: "#86efac",
                            marginTop: "4px",
                          }}
                        >
                          Notificado:{" "}
                          {fmtDate(ruta.notificacion_fecha_estimada_enviada_at)}
                        </div>
                      )}
                    </td>
                    <td style={base.td}>
                      <button
                        type="button"
                        style={base.btnNotify}
                        disabled={notifyingId === ruta.id}
                        onClick={() => enviarNotificacionRuta(ruta.id)}
                      >
                        {notifyingId === ruta.id
                          ? "Enviando…"
                          : "Notificar fecha estimada"}
                      </button>
                      <button
                        type="button"
                        style={base.btnWaze}
                        onClick={() => openWazeNavigation(ruta.destino)}
                        disabled={!String(ruta.destino || "").trim()}
                      >
                        Abrir en Waze
                      </button>
                      <MensajeFilaRuta mensaje={mensajesRuta[ruta.id]?.notificar} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
