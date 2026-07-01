import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../lib/apiClient';
import { crearRuta, estimarFechasEstimadas, estimarTarifaComercial } from '../lib/rutasService';
import { getRutaPlantillaById, getRutasPlantilla } from '../lib/rutasPlantillaService';
import { useGooglePlacesAutocomplete } from '../hooks/useGooglePlacesAutocomplete';
import '../LiquidGlass.css';

const CAPACIDAD_MAXIMA_SLOTS = 96;

const ESTADOS_RUTA_ACTIVA = new Set([
  'PENDIENTE',
  'ASIGNADO',
  'EN_TRANSITO',
  'EN_CAMINO_ORIGEN',
  'EN_CARGA',
  'EN_DESTINO',
]);

function parseListPayload(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

async function fetchRutasActivasDesdeApi() {
  const res = await apiFetch('/api/rutas?limit=500');
  if (!res.ok) return [];
  return parseListPayload(res.data).filter((r) => {
    if (!r.camion_id) return false;
    return ESTADOS_RUTA_ACTIVA.has(String(r.estado || '').toUpperCase());
  });
}

const SIZES_CONFIG = {
  XS: { label: "XS (1 Slot)", slots: 1, color: "#9CA3AF", textDark: true },
  S: { label: "S (4 Slots)", slots: 4, color: "#10B981", textDark: true },
  M: { label: "M (12 Slots)", slots: 12, color: "#3B82F6", textDark: true },
  L: { label: "L (24 Slots)", slots: 24, color: "#FBBF24", textDark: true },
  XL: { label: "XL (48 Slots)", slots: 48, color: "#8B5CF6", textDark: true },
  MAXIMO: { label: "Máximo (96)", slots: 96, color: "#DC2626", textDark: false }
};

const CALCULAR_DIAS_ENTREGA = (km) => {
  if (km <= 50) return { texto: "1 día hábil", maxDias: 1 };
  if (km <= 150) return { texto: "1 a 2 días hábiles", maxDias: 2 };
  if (km <= 300) return { texto: "2 a 3 días hábiles", maxDias: 3 };
  if (km <= 500) return { texto: "3 a 4 días hábiles", maxDias: 4 };
  if (km <= 1000) return { texto: "4 a 5 días hábiles", maxDias: 5 };
  return { texto: "1 semana (Entrega Especial)", maxDias: 7 };
};

export default function CreadorCarga() {
  const [clientes, setClientes] = useState([]);
  const [conductores, setConductores] = useState([]);
  const [camiones, setCamiones] = useState([]);
  const [camionesDisponibilidad, setCamionesDisponibilidad] = useState({});

  // Recuperar estado desde localStorage o usar valores por defecto
  const loadDraft = () => {
    try {
      const draft = localStorage.getItem('creadorCargaDraft');
      if (draft) return JSON.parse(draft);
    } catch (e) {
      console.error(e);
    }
    return null;
  };
  const draft = loadDraft();

  // Formularios
  const [modoCarga, setModoCarga] = useState(draft?.modoCarga || 'CENTRAL'); // 'CENTRAL' | 'RETORNO'
  const [camionesRetornoCercanos, setCamionesRetornoCercanos] = useState([]);

  const [clienteId, setClienteId] = useState(draft?.clienteId || "");
  const [rutaPlantillaId, setRutaPlantillaId] = useState(draft?.rutaPlantillaId || "");
  const [rutasReutilizables, setRutasReutilizables] = useState([]);
  const [observaciones, setObservaciones] = useState(draft?.observaciones || "");
  const [cargandoRutasReutilizables, setCargandoRutasReutilizables] = useState(false);
  const [nombreRuta, setNombreRuta] = useState(draft?.nombreRuta || "");
  const [origen, setOrigen] = useState(draft?.origen || "");
  const [origenInput, setOrigenInput] = useState(draft?.origenInput || "");

  const [paradas, setParadas] = useState(draft?.paradas || []); // { id, address, distanceKm }

  const [fechaEntregaStr, setFechaEntregaStr] = useState("");
  const [fechaEntregaTimestamp, setFechaEntregaTimestamp] = useState("");

  const origenRef = useRef(null);
  const nuevaParadaRef = useRef(null);

  const { error: origenErr } = useGooglePlacesAutocomplete(origenRef, {
    onPlaceSelected: (address) => { setOrigen(address); setOrigenInput(address); }
  });

  const handleAddParada = async (address) => {
    if (!origen) {
      alert("Debes ingresar el origen primero");
      if (nuevaParadaRef.current) nuevaParadaRef.current.value = "";
      return;
    }
    setCalculandoRuta(true);
    setMensaje(null);
    const prevAddress = paradas.length > 0 ? paradas[paradas.length - 1].address : origen;
    const resIda = await estimarFechasEstimadas({ origen: prevAddress, destino: address });
    const resVuelta = await estimarFechasEstimadas({ origen: address, destino: origen });

    if (resIda.success && resIda.data?.distancia_km != null) {
      const fromPrev = resIda.data.distancia_km;
      const toOrigin = resVuelta.success ? (resVuelta.data?.distancia_km || fromPrev) : fromPrev;
      const cumulative = (paradas.length > 0 ? paradas[paradas.length - 1].distanceKm : 0) + fromPrev;

      const newParada = {
        id: Math.random().toString(),
        address: address,
        distanceFromPrev: fromPrev,
        distanceToOrigin: toOrigin,
        distanceKm: cumulative
      };
      setParadas(prev => [...prev, newParada]);
      if (nuevaParadaRef.current) nuevaParadaRef.current.value = "";
    } else {
      setMensaje({ tipo: "error", texto: "Error al calcular distancia hacia: " + address });
    }
    setCalculandoRuta(false);
  };

  const { error: destinoErr } = useGooglePlacesAutocomplete(nuevaParadaRef, {
    onPlaceSelected: (address) => { handleAddParada(address); }
  });

  const handleRemoveParada = (id) => {
    setParadas(paradas.filter(p => p.id !== id));
    // Remove bultos associated with this parada
    setBultos(bultos.filter(b => b.paradaId !== id));
    if (activeParadaId === id) {
      setActiveParadaId("");
    }
  };

  const [bultos, setBultos] = useState(draft?.bultos || []);
  const [activeSizeBrush, setActiveSizeBrush] = useState(null);
  const [activeParadaId, setActiveParadaId] = useState("");

  // Guardar en localStorage cuando cambian los datos críticos


  useEffect(() => {
    let cancelled = false;
    async function cargarRutasReutilizables() {
      if (modoCarga !== 'CENTRAL') {
        setRutasReutilizables([]);
        return;
      }
      setCargandoRutasReutilizables(true);
      const params = { activa: "true" };
      if (clienteId) params.clienteId = clienteId;
      const res = await getRutasPlantilla(params);
      if (cancelled) return;
      const lista = res.data?.data ?? res.data ?? [];
      setRutasReutilizables(Array.isArray(lista) ? lista : []);
      setCargandoRutasReutilizables(false);
    }
    cargarRutasReutilizables();
    return () => { cancelled = true; };
  }, [modoCarga, clienteId]);

  const aplicarPlantilla = async (plantillaId) => {
    setRutaPlantillaId(plantillaId);
    if (!plantillaId) {
      setOrigen(""); setOrigenInput(""); setParadas([]); setBultos([]);
      if (origenRef.current) origenRef.current.value = "";
      return;
    }
    const res = await getRutaPlantillaById(plantillaId);
    if (res.error || !res.data) {
      setMensaje({ tipo: "error", texto: res.error || "No se pudo cargar la configuración." });
      return;
    }
    const plantilla = res.data;
    setOrigen(plantilla.origen);
    setOrigenInput(plantilla.origen);
    if (origenRef.current) origenRef.current.value = plantilla.origen;
    
    const nuevasParadas = [];
    let cumulative = 0;
    const pList = plantilla.paradas || [];
    for (let i = 0; i < pList.length; i++) {
      const p = pList[i];
      const fromPrev = Number(p.distancia_tramo_km || 0);
      cumulative += fromPrev;
      nuevasParadas.push({
        id: Math.random().toString(),
        address: p.direccion || "",
        distanceFromPrev: fromPrev,
        distanceToOrigin: 0,
        distanceKm: cumulative
      });
    }
    setParadas(nuevasParadas);
    setBultos([]);
  };

  useEffect(() => {
    localStorage.setItem('creadorCargaDraft', JSON.stringify({
      modoCarga, clienteId, nombreRuta, origen, origenInput, paradas, bultos, rutaPlantillaId, observaciones
    }));
  }, [modoCarga, clienteId, nombreRuta, origen, origenInput, paradas, bultos, rutaPlantillaId, observaciones]);

  const [camionId, setCamionId] = useState("");
  const [rendimientoCamion, setRendimientoCamion] = useState(4.5);

  const [costoTac, setCostoTac] = useState("");

  const [isTarifaManual, setIsTarifaManual] = useState(false);
  const [tarifaManualTotal, setTarifaManualTotal] = useState("");
  const [cotizacion, setCotizacion] = useState(null);
  const [cotizacionLoading, setCotizacionLoading] = useState(false);
  const [cotizacionError, setCotizacionError] = useState("");

  const [saving, setSaving] = useState(false);
  const [calculandoRuta, setCalculandoRuta] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [distanciaLogisticaKm, setDistanciaLogisticaKm] = useState(0);

  useEffect(() => {
    const fetchCercanos = async () => {
      if (modoCarga !== 'RETORNO' || !origen || !window.google) {
        setCamionesRetornoCercanos([]);
        return;
      }

      try {
        const rutasActivas = (await fetchRutasActivasDesdeApi()).filter((r) => r.destino);

        if (rutasActivas.length === 0) return;

        const validCamionIds = new Set();
        const origenBase = origen.split(',')[0].toLowerCase().trim();

        // 1. Fallback inmediato por coincidencia de nombre de ciudad
        rutasActivas.forEach(r => {
          const destinoBase = r.destino.split(',')[0].toLowerCase().trim();
          if (origenBase.includes(destinoBase) || destinoBase.includes(origenBase)) {
            validCamionIds.add(r.camion_id);
          }
        });

        // 2. Llamada a Google Maps para buscar otros camiones en un radio de 100km
        const destinos = [...new Set(rutasActivas.map(r => r.destino))];
        const service = new window.google.maps.DistanceMatrixService();
        service.getDistanceMatrix({
          origins: [origen],
          destinations: destinos,
          travelMode: 'DRIVING'
        }, (response, status) => {
          if (status === 'OK' && response.rows[0].elements) {
            response.rows[0].elements.forEach((el, idx) => {
              if (el.status === 'OK' && el.distance.value <= 100000) { // Radio 100km
                rutasActivas.forEach(r => {
                  if (r.destino === destinos[idx]) validCamionIds.add(r.camion_id);
                });
              }
            });
          }
          setCamionesRetornoCercanos(Array.from(validCamionIds));
        });
      } catch (err) {
        console.error("Error distance matrix:", err);
      }
    };
    fetchCercanos();
  }, [origen, modoCarga]);

  useEffect(() => {
    const calcLogistica = () => {
      if (!origen || paradas.length === 0) {
        setDistanciaLogisticaKm(0);
        return;
      }

      const distMaxParadas = paradas[paradas.length - 1].distanceKm || 0;
      const distVuelta = paradas[paradas.length - 1].distanceToOrigin || distMaxParadas;

      if (modoCarga === 'RETORNO') {
        // En retorno solo gastamos la distancia acumulada, sin viaje de vuelta.
        setDistanciaLogisticaKm(Math.round(distMaxParadas));
        return;
      }

      // Viaje secuencial: Ida (acumulada) + Vuelta (desde el último destino)
      setDistanciaLogisticaKm(Math.round(distMaxParadas + distVuelta));
    };
    calcLogistica();
  }, [origen, paradas, modoCarga]);

  useEffect(() => {
    const initData = async () => {
      try {
        const resCli = await apiFetch("/api/clientes");
        if (resCli.ok) setClientes(Array.isArray(resCli.data) ? resCli.data : resCli.data?.data || []);

        const resCond = await apiFetch("/api/conductores");
        if (resCond.ok) {
          setConductores(parseListPayload(resCond.data));
        }

        const resCam = await apiFetch("/api/camiones");
        let trucks = [];
        if (resCam.ok) {
          trucks = parseListPayload(resCam.data);
          setCamiones(trucks);
        }

        const availability = {};
        if (trucks.length > 0) {
          trucks.forEach((t) => {
            const maxCap = t.slots || CAPACIDAD_MAXIMA_SLOTS;
            const used = Number(t.slots_utilizados) || 0;
            availability[t.id] = Math.max(0, maxCap - used);
          });
        }
        setCamionesDisponibilidad(availability);
      } catch (err) {
        console.error("Error init:", err);
      }
    };
    initData();
  }, []);

  // Update dates based on the furthest parada
  useEffect(() => {
    if (paradas.length > 0) {
      const maxKm = paradas[paradas.length - 1].distanceKm;
      const entregaCalc = CALCULAR_DIAS_ENTREGA(maxKm);
      setFechaEntregaStr(entregaCalc.texto);
      const date = new Date();
      date.setDate(date.getDate() + entregaCalc.maxDias);
      setFechaEntregaTimestamp(date.toISOString());
    } else {
      setFechaEntregaStr("");
      setFechaEntregaTimestamp("");
    }
  }, [paradas]);

  const totalSlotsUsed = bultos.reduce((acc, b) => acc + b.slots, 0);
  const isCapacidadExcedida = totalSlotsUsed > CAPACIDAD_MAXIMA_SLOTS;
  const isCargaMinimaRetornoValida = modoCarga !== 'RETORNO' || totalSlotsUsed >= 24;

  const camionesDisponiblesParaEstaCarga = camiones.filter(c => {
    if (modoCarga === 'RETORNO' && !camionesRetornoCercanos.includes(c.id)) {
      return false; // Solo camiones a menos de 100km
    }
    const maxCap = c.slots || CAPACIDAD_MAXIMA_SLOTS;
    // Si es retorno, el camión desocupó en su destino, por lo que tiene el 100% de espacio disponible para el viaje de vuelta
    const available = modoCarga === 'RETORNO' ? maxCap : (camionesDisponibilidad[c.id] ?? maxCap);
    return available >= totalSlotsUsed;
  });

  const handleSelectCamion = (id) => {
    setCamionId(id);
    const truck = camiones.find(c => c.id === id);
    setRendimientoCamion(truck?.rendimiento_km_l ? Number(truck.rendimiento_km_l) : 4.5);
  };

  const handleTruckClick = (e) => {
    if (!origen) {
      alert("Debes seleccionar y autocompletar el Origen antes de empezar a cargar slots.");
      return;
    }
    if (!activeSizeBrush) {
      alert("Selecciona primero un tamaño de slot para agregarlo al camión.");
      return;
    }
    if (!activeParadaId) {
      alert("Selecciona a qué parada de destino va dirigido este slot.");
      return;
    }
    const paradaValida = paradas.find(p => p.id === activeParadaId);
    if (!paradaValida) {
      alert("La parada seleccionada ya no existe. Por favor selecciona una parada válida.");
      setActiveParadaId("");
      return;
    }
    const neededSlots = SIZES_CONFIG[activeSizeBrush].slots;
    if (totalSlotsUsed + neededSlots > CAPACIDAD_MAXIMA_SLOTS) {
      alert(`Capacidad excedida. Solo quedan ${CAPACIDAD_MAXIMA_SLOTS - totalSlotsUsed} Slots disponibles.`);
      return;
    }

    setBultos([...bultos, {
      id: Math.random().toString(),
      categoria: activeSizeBrush,
      slots: neededSlots,
      paradaId: activeParadaId
    }]);
  };

  const handleRightClick = (e, bultoId) => {
    e.preventDefault();
    e.stopPropagation();
    if (bultoId) {
      setBultos(prev => prev.filter(b => b.id !== bultoId));
    } else if (bultos.length > 0) {
      setBultos(prev => prev.slice(0, -1));
    }
  };

  const remainingSlots = CAPACIDAD_MAXIMA_SLOTS - totalSlotsUsed;
  const occupancyPct = Math.round((totalSlotsUsed / CAPACIDAD_MAXIMA_SLOTS) * 100);
  const modoCargaLabel = modoCarga === 'RETORNO' ? 'Retorno' : 'Desde central';
  const canvasInteractive = !!(activeSizeBrush && activeParadaId && origen);

  const slotsPintados = [];
  bultos.forEach((b) => {
    const bParadaIndex = paradas.findIndex(p => p.id === b.paradaId) + 1;
    for (let i = 0; i < b.slots; i++) {
      slotsPintados.push({ color: SIZES_CONFIG[b.categoria].color, paradaNumber: bParadaIndex, id: b.id });
    }
  });

  useEffect(() => {
    if (bultos.length === 0 || paradas.length === 0) {
      setCotizacion(null);
      setCotizacionError("");
      return undefined;
    }

    const timer = setTimeout(async () => {
      setCotizacionLoading(true);
      setCotizacionError("");
      const res = await estimarTarifaComercial({
        distancia_km: distanciaLogisticaKm,
        bultos_detalle: bultos.map((b) => ({ categoria: b.categoria })),
        is_tarifa_manual: isTarifaManual,
        tarifa_base_total: isTarifaManual ? Number(tarifaManualTotal || 0) : undefined,
        costo_tac_peajes_clp: Number(costoTac || 0),
        bultos_despachados: totalSlotsUsed,
        cantidad_paradas: paradas.length,
        rendimiento_km_l: rendimientoCamion,
        modo_retorno: modoCarga === 'RETORNO',
      });
      setCotizacionLoading(false);
      if (res.success) {
        setCotizacion(res.data);
      } else {
        setCotizacion(null);
        setCotizacionError(res.error || "No se pudo calcular la tarifa");
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [
    bultos,
    paradas.length,
    distanciaLogisticaKm,
    isTarifaManual,
    tarifaManualTotal,
    costoTac,
    totalSlotsUsed,
    rendimientoCamion,
    modoCarga,
  ]);

  const tarifaFinalBase = cotizacion?.tarifaBaseTotal ?? 0;
  const ivaCalculado = cotizacion?.iva ?? 0;
  const totalAPagarCliente = cotizacion?.totalPagar ?? 0;
  const pagoConductorAutomatico = cotizacion?.costosOperativos?.conductor ?? 0;

  const handleCrearRuta = async (e) => {
    e.preventDefault();
    if (isCapacidadExcedida) return;
    if (!clienteId || !camionId || bultos.length === 0 || paradas.length === 0 || !fechaEntregaTimestamp) {
      setMensaje({ tipo: "error", texto: "Complete cliente, camión, fecha y al menos un destino con slot." });
      return;
    }
    if (!cotizacion && !isTarifaManual) {
      setMensaje({ tipo: "error", texto: cotizacionError || "Espere el cálculo de tarifa del servidor." });
      return;
    }

    setSaving(true);
    setMensaje(null);

    const destinoFinal = paradas.map((p, i) => `${i + 1}. ${p.address.split(',')[0]}`).join(' ➔ ');

    try {
      const conductor = conductores.find((c) => c.camion_id === camionId);
      const entregaDate = fechaEntregaTimestamp
        ? new Date(fechaEntregaTimestamp).toISOString().slice(0, 10)
        : null;

      const payload = {
        cliente_id: clienteId,
        origen,
        destino: destinoFinal,
        camion_id: camionId,
        distancia_km: distanciaLogisticaKm,
        costo_tac_peajes_clp: Number(costoTac || 0),
        pago_conductor_base_clp: pagoConductorAutomatico,
        is_tarifa_manual: isTarifaManual,
        bultos_despachados: totalSlotsUsed,
        bultos_detalle: bultos.map((b) => ({ categoria: b.categoria })),
      };

      if (isTarifaManual && tarifaFinalBase > 0) {
        payload.tarifa_base_total = tarifaFinalBase;
      }

      if (rutaPlantillaId) payload.ruta_plantilla_id = rutaPlantillaId;
      if (observaciones?.trim()) payload.observaciones = observaciones.trim();
      if (nombreRuta?.trim()) payload.nombre_ruta = nombreRuta.trim();
      if (conductor?.id) payload.conductor_id = conductor.id;
      if (entregaDate) {
        payload.fecha_estimada_inicio = entregaDate;
        payload.fecha_estimada_fin = entregaDate;
        payload.fecha_estimada_entrega = entregaDate;
      }
      if (paradas.length > 0) {
        payload.paradas = paradas.map((p, i) => ({
          direccion: p.address,
          orden: i + 1,
          es_temporal: true,
        }));
      }

      const resultado = await crearRuta(payload);
      if (!resultado.success) {
        throw new Error(resultado.error || "Error al crear el pedido.");
      }

      setMensaje({ tipo: "ok", texto: "Pedido creado." });

      localStorage.removeItem('creadorCargaDraft');
      setOrigen(""); setOrigenInput(""); setParadas([]); setCostoTac("");
      setRutaPlantillaId(""); setObservaciones(""); setRutasReutilizables([]);
      setFechaEntregaStr(""); setFechaEntregaTimestamp(""); setBultos([]); setActiveSizeBrush(null); setIsTarifaManual(false);
      setCamionId(""); setActiveParadaId("");
      if (origenRef.current) origenRef.current.value = "";
    } catch (err) {
      setMensaje({ tipo: "error", texto: err.message });
    } finally {
      setSaving(false);
    }
  };

  const camionSeleccionado = camiones.find((c) => c.id === camionId);
  const maxCapCamion = camionSeleccionado?.slots || CAPACIDAD_MAXIMA_SLOTS;
  const slotsDisponiblesCamion = camionId
    ? (modoCarga === 'RETORNO' ? maxCapCamion : (camionesDisponibilidad[camionId] ?? maxCapCamion))
    : null;

  const puedeConfirmar = !saving
    && bultos.length > 0
    && camionId
    && isCargaMinimaRetornoValida
    && !cotizacionLoading
    && (cotizacion || isTarifaManual);

  const validaciones = [
    { ok: !!clienteId, label: 'Cliente' },
    { ok: !!origen && paradas.length > 0, label: 'Destinos' },
    {
      ok: totalSlotsUsed > 0 && !isCapacidadExcedida && isCargaMinimaRetornoValida,
      error: modoCarga === 'RETORNO' && totalSlotsUsed > 0 && !isCargaMinimaRetornoValida,
      label: 'Slots',
    },
    { ok: !!camionId, label: 'Camión' },
    {
      ok: !!(cotizacion || isTarifaManual),
      pending: cotizacionLoading && bultos.length > 0 && paradas.length > 0,
      label: 'Tarifa',
    },
  ];

  return (
    <div className="liquid-container">
      {mensaje && (
        <div
          className={`liquid-msg-compact ${mensaje.tipo === 'ok' ? 'liquid-msg-compact--ok' : 'liquid-msg-compact--error'}`}
          role={mensaje.tipo === 'ok' ? 'status' : 'alert'}
        >
          {mensaje.texto}
        </div>
      )}

      {(origenErr || destinoErr) && (
        <div className="liquid-msg-compact liquid-msg-compact--error" role="alert">
          Configure REACT_APP_GOOGLE_MAPS_API_KEY para autocompletar direcciones.
        </div>
      )}

      <form onSubmit={handleCrearRuta} className="liquid-form-stack">

        {/* 1. Información del pedido */}
        <section className="liquid-block" aria-labelledby="pedido-info-title">
          <h3 className="liquid-block__title" id="pedido-info-title">Información del pedido</h3>

          <div className="liquid-mode-tabs" style={{ marginBottom: 'var(--lt-space-4)' }}>
            <button
              type="button"
              className={`lt-btn lt-btn--filter ${modoCarga === 'CENTRAL' ? 'lt-btn--filter-active' : ''}`}
              onClick={() => { setModoCarga('CENTRAL'); setOrigen(""); if(origenRef.current) origenRef.current.value=""; setParadas([]); setBultos([]); setActiveParadaId(""); }}
            >
              Desde central
            </button>
            <button
              type="button"
              className={`lt-btn lt-btn--filter ${modoCarga === 'RETORNO' ? 'lt-btn--filter-active' : ''}`}
              onClick={() => { setModoCarga('RETORNO'); setOrigen(""); if(origenRef.current) origenRef.current.value=""; setParadas([]); setBultos([]); setActiveParadaId(""); }}
            >
              Retorno
            </button>
          </div>

          <div className="liquid-block__grid-2">
            <div className="liquid-field">
              <label className="liquid-label">Cliente *</label>
              <select required value={clienteId} onChange={e => setClienteId(e.target.value)} className="liquid-input">
                <option value="">Seleccionar</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre || c.contacto_email}</option>)}
              </select>
            </div>
            <div className="liquid-field">
              <label className="liquid-label">Entrega estimada</label>
              <input type="text" disabled value={fechaEntregaStr || "—"} className="liquid-input" />
            </div>
            <div className="liquid-field">
              <label className="liquid-label">Referencia (opcional)</label>
              <input
                type="text"
                value={nombreRuta}
                onChange={e => setNombreRuta(e.target.value)}
                placeholder="Ej. Pedido semanal norte"
                className="liquid-input"
              />
            </div>
          </div>

          <div className="liquid-field" style={{ marginTop: 'var(--lt-space-4)' }}>
            <label className="liquid-label">Observaciones</label>
            <textarea
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              placeholder="Notas operativas"
              className="liquid-input"
              style={{ resize: 'vertical', minHeight: '56px' }}
            />
          </div>

          {modoCarga === 'CENTRAL' && (
            <p className="liquid-block__footer-hint">Salida desde base Quillota 980, Viña del Mar.</p>
          )}
          {modoCarga === 'RETORNO' && (
            <p className="liquid-block__footer-hint">Solo camiones a menos de 100 km del origen.</p>
          )}
        </section>

        {/* 2. Destinos */}
        <section className="liquid-block" aria-labelledby="pedido-destinos-title">
          <h3 className="liquid-block__title" id="pedido-destinos-title">Destinos</h3>

          <div className="liquid-block__grid-2">
            <div className="liquid-field">
              <label className="liquid-label">Origen *</label>
              <input
                ref={origenRef}
                required
                type="text"
                defaultValue={origenInput || origen}
                onChange={e => {
                  setOrigenInput(e.target.value);
                  if (!e.target.value) setOrigen("");
                }}
                disabled={paradas.length > 0}
                placeholder="Ciudad o dirección"
                className="liquid-input"
              />
              {paradas.length > 0 && (
                <span className="liquid-block__footer-hint">Elimine destinos para cambiar el origen.</span>
              )}
            </div>
            <div className="liquid-field">
              <label className="liquid-label">
                Añadir parada
                {calculandoRuta && <span className="liquid-step-title__hint"> · calculando</span>}
              </label>
              <input
                ref={nuevaParadaRef}
                type="text"
                placeholder="Destino intermedio o final"
                className="liquid-input"
                disabled={calculandoRuta || !origen || (modoCarga === 'RETORNO' && paradas.length >= 1)}
              />
              {!origen && <span className="liquid-block__footer-hint">Defina el origen primero.</span>}
              {modoCarga === 'RETORNO' && paradas.length >= 1 && (
                <span className="liquid-block__footer-hint">Un solo destino en modo retorno.</span>
              )}
            </div>
          </div>

          {paradas.length > 0 && (
            <div className="liquid-route-panel" style={{ marginTop: 'var(--lt-space-4)', marginBottom: 0 }}>
              <div className="liquid-route-panel__label">{distanciaLogisticaKm} km totales</div>

              <div className="liquid-route-stop" style={{ marginBottom: '8px' }}>
                <div>
                  <div className="liquid-route-stop__meta">Origen</div>
                  <span className="liquid-text">{origen}</span>
                </div>
              </div>

              <div style={{ borderLeft: '2px dashed var(--lt-border)', marginLeft: '8px', paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {paradas.map((p, idx) => (
                  <div key={p.id} className="liquid-route-stop">
                    <div>
                      <div className="liquid-route-stop__meta">Destino {idx + 1}</div>
                      <span>{p.address}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <span className="liquid-route-stop__km">+{Number(p.distanceFromPrev || p.distanceKm || 0).toFixed(1)} km</span>
                      <button type="button" onClick={() => handleRemoveParada(p.id)} className="lt-btn lt-btn--ghost" style={{ padding: '2px 8px', color: 'var(--lt-danger)' }} aria-label="Eliminar parada">×</button>
                    </div>
                  </div>
                ))}

                {modoCarga !== 'RETORNO' && (
                  <div className="liquid-route-stop liquid-route-stop--return">
                    <div>
                      <div className="liquid-route-stop__meta">Retorno a base</div>
                      <span>{origen}</span>
                    </div>
                    <span className="liquid-route-stop__km">+{Number(paradas[paradas.length - 1].distanceToOrigin || 0).toFixed(1)} km</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* 3. Configuración de carga */}
        <section className="liquid-block" aria-labelledby="pedido-carga-title">
          <h3 className="liquid-block__title" id="pedido-carga-title">Configuración de carga</h3>

          <div className="liquid-size-toolbar">
            {Object.entries(SIZES_CONFIG).map(([k, v]) => {
              const isSelected = activeSizeBrush === k;
              const isYellow = k === 'L';
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setActiveSizeBrush(k)}
                  className={`liquid-size-btn ${isSelected ? 'liquid-size-btn--active' : ''}`}
                  style={isSelected ? {
                    background: v.color,
                    color: isSelected && !v.textDark ? '#fff' : (isYellow ? '#fff' : '#000'),
                  } : undefined}
                >
                  {v.label}
                </button>
              );
            })}
          </div>

          <div className="liquid-field" style={{ marginBottom: 'var(--lt-space-3)' }}>
            <label className="liquid-label">Parada de destino del slot</label>
            <select value={activeParadaId} onChange={e => setActiveParadaId(e.target.value)} className="liquid-input" disabled={paradas.length === 0}>
              <option value="">Seleccionar parada</option>
              {paradas.map((p, idx) => (
                <option key={p.id} value={p.id}>{idx + 1}. {p.address}</option>
              ))}
            </select>
          </div>

          {paradas.length > 0 && (!activeSizeBrush || !activeParadaId || !origen) && (
            <p className="liquid-block__footer-hint" style={{ marginBottom: 'var(--lt-space-3)' }}>
              Seleccione tamaño y parada para asignar en la grilla.
            </p>
          )}

          <div className="liquid-truck-panel">
            <div className="liquid-truck-stats" aria-label="Ocupación del vehículo">
              <div className="liquid-truck-stats__item">
                <span className="liquid-truck-stats__label">Capacidad</span>
                <span className="liquid-truck-stats__value">{CAPACIDAD_MAXIMA_SLOTS}</span>
              </div>
              <div className="liquid-truck-stats__item">
                <span className="liquid-truck-stats__label">Ocupados</span>
                <span className="liquid-truck-stats__value">{totalSlotsUsed}</span>
              </div>
              <div className="liquid-truck-stats__item">
                <span className="liquid-truck-stats__label">Disponibles</span>
                <span className="liquid-truck-stats__value">{remainingSlots}</span>
              </div>
              <div className="liquid-truck-stats__item">
                <span className="liquid-truck-stats__label">Ocupación</span>
                <span className="liquid-truck-stats__value">{occupancyPct}%</span>
              </div>
              <div className="liquid-truck-stats__item">
                <span className="liquid-truck-stats__label">Modo</span>
                <span className="liquid-truck-stats__value">{modoCargaLabel}</span>
              </div>
            </div>

            <div className="liquid-truck-occupancy" aria-hidden="true">
              <div className="liquid-truck-occupancy__track">
                <div
                  className={`liquid-truck-occupancy__fill ${occupancyPct >= 90 ? 'liquid-truck-occupancy__fill--high' : occupancyPct >= 75 ? 'liquid-truck-occupancy__fill--mid' : ''}`}
                  style={{ width: `${occupancyPct}%` }}
                />
              </div>
            </div>

            <div
              className={`liquid-truck-canvas ${canvasInteractive ? 'liquid-truck-canvas--active' : 'liquid-truck-canvas--disabled'}`}
              onClick={handleTruckClick}
              onContextMenu={(e) => handleRightClick(e, null)}
              role="group"
              aria-label="Plano de carga del vehículo, 96 slots"
            >
              <div className="liquid-truck-cab" aria-hidden="true">
                <span className="liquid-truck-cab__label">Cabina</span>
              </div>

              <div className="liquid-truck-body">
                <div className="liquid-truck-body__header">
                  <span className="liquid-truck-body__title">Plano de carga</span>
                  <span className="liquid-truck-body__meta">16 × 6 · 96 slots</span>
                </div>
                <div className="liquid-slots-grid">
                  {Array.from({ length: CAPACIDAD_MAXIMA_SLOTS }).map((_, i) => {
                    const p = slotsPintados[i];
                    return (
                      <div
                        key={i}
                        className={`liquid-slot-cell ${p ? 'liquid-slot-cell--filled' : 'liquid-slot-empty'}`}
                        onContextMenu={(e) => p ? handleRightClick(e, p.id) : null}
                        style={p ? { backgroundColor: p.color, borderColor: 'transparent' } : undefined}
                        title={p ? `Parada ${p.paradaNumber}` : `Slot ${i + 1}`}
                      >
                        {p && (
                          <span className="liquid-slot-cell__tag">P{p.paradaNumber}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="liquid-truck-tail" aria-hidden="true">
                <span className="liquid-truck-tail__label">Trasera</span>
              </div>
            </div>

            <p className="liquid-truck-hint">
              Clic izquierdo: asignar · Clic derecho: quitar
            </p>
          </div>

          {bultos.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'var(--lt-space-4)' }}>
              {bultos.map((b, i) => {
                const bParada = paradas.find(p => p.id === b.paradaId);
                return (
                  <div key={b.id} className="liquid-row">
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: '600', fontSize: '12px' }}>#{i + 1}</span>
                      <span style={{
                        padding: '2px 8px', borderRadius: '4px', background: SIZES_CONFIG[b.categoria].color,
                        color: SIZES_CONFIG[b.categoria].textDark ? '#000' : '#fff', fontSize: '11px', fontWeight: '600',
                      }}>
                        {b.categoria}
                      </span>
                      <span style={{ fontSize: '12px' }}>{b.slots} slots</span>
                      <span className="liquid-text" style={{ fontSize: '12px' }}>{bParada ? bParada.address.split(',')[0] : '—'}</span>
                    </div>
                    <button type="button" onClick={(e) => handleRightClick(e, b.id)} className="lt-btn lt-btn--ghost" style={{ padding: '2px 8px', color: 'var(--lt-danger)' }} aria-label="Quitar">×</button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 4. Configuración logística */}
        <section className="liquid-block" aria-labelledby="pedido-logistica-title">
          <h3 className="liquid-block__title" id="pedido-logistica-title">Configuración logística</h3>

          <div className="liquid-field">
            <label className="liquid-label">Camión *</label>
            <select
              required
              value={camionId}
              onChange={e => handleSelectCamion(e.target.value)}
              className="liquid-input"
              disabled={totalSlotsUsed === 0}
            >
              <option value="">{totalSlotsUsed === 0 ? 'Asigne slots primero' : 'Seleccionar vehículo'}</option>
              {camionesDisponiblesParaEstaCarga.map(c => {
                const maxCap = c.slots || CAPACIDAD_MAXIMA_SLOTS;
                const available = modoCarga === 'RETORNO' ? maxCap : (camionesDisponibilidad[c.id] ?? maxCap);
                return (
                  <option key={c.id} value={c.id}>
                    {c.patente || c.placa} — {available} slots libres
                    {modoCarga === 'RETORNO' ? ' (cerca)' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {camionId && (
            <div className="liquid-logistics-meta">
              <div className="liquid-logistics-meta__item">
                <span className="liquid-logistics-meta__label">Capacidad</span>
                <span className="liquid-logistics-meta__value">{maxCapCamion} slots</span>
              </div>
              <div className="liquid-logistics-meta__item">
                <span className="liquid-logistics-meta__label">Disponibles</span>
                <span className="liquid-logistics-meta__value">{slotsDisponiblesCamion} slots</span>
              </div>
              <div className="liquid-logistics-meta__item">
                <span className="liquid-logistics-meta__label">Asignados</span>
                <span className="liquid-logistics-meta__value">{totalSlotsUsed} slots</span>
              </div>
            </div>
          )}

          {totalSlotsUsed > 0 && modoCarga === 'RETORNO' && camionesDisponiblesParaEstaCarga.length === 0 && (
            <p className="liquid-block__footer-hint" style={{ color: 'var(--lt-warning-text)' }}>
              Sin camiones retornando a menos de 100 km del origen.
            </p>
          )}
          {totalSlotsUsed > 0 && modoCarga === 'CENTRAL' && camionesDisponiblesParaEstaCarga.length === 0 && (
            <p className="liquid-block__footer-hint" style={{ color: 'var(--lt-danger-text)' }}>
              Sin camiones con {totalSlotsUsed} slots disponibles.
            </p>
          )}

          <div className="liquid-block__grid-2" style={{ marginTop: 'var(--lt-space-4)' }}>
            <div className="liquid-field">
              <label className="liquid-label">TAC / peajes (CLP)</label>
              <input type="number" required disabled={!camionId} value={costoTac} onChange={e => setCostoTac(e.target.value)} className="liquid-input" placeholder="0" />
            </div>
            <div className="liquid-field">
              <label className="liquid-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" disabled={!camionId} checked={isTarifaManual} onChange={e => setIsTarifaManual(e.target.checked)} />
                Tarifa manual
              </label>
              {isTarifaManual && (
                <input type="number" value={tarifaManualTotal} onChange={e => setTarifaManualTotal(e.target.value)} placeholder="Monto neto (CLP)" className="liquid-input" />
              )}
            </div>
          </div>
        </section>

        {/* 5. Resumen */}
        <section className="liquid-block liquid-block--summary" aria-labelledby="pedido-resumen-title">
          <h3 className="liquid-block__title" id="pedido-resumen-title">Resumen</h3>

          <ul className="liquid-validation-list" aria-label="Estado de validación">
            {validaciones.map((v) => {
              const stateClass = v.ok
                ? 'liquid-validation-list__item--ok'
                : v.error
                  ? 'liquid-validation-list__item--error'
                  : v.pending
                    ? 'liquid-validation-list__item--pending'
                    : 'liquid-validation-list__item--pending';
              return (
                <li key={v.label} className={`liquid-validation-list__item ${stateClass}`}>
                  <span className="liquid-validation-dot" aria-hidden />
                  {v.label}
                  {v.pending && !v.ok && '…'}
                </li>
              );
            })}
          </ul>

          {cotizacionError && (
            <p className="liquid-block__footer-hint" style={{ color: 'var(--lt-danger-text)', marginBottom: 'var(--lt-space-3)' }}>
              {cotizacionError}
            </p>
          )}

          <div className="liquid-summary-table">
            <div className="liquid-summary-row">
              <span className="liquid-summary-row__label">Slots utilizados</span>
              <span className="liquid-summary-row__value">{totalSlotsUsed} / {CAPACIDAD_MAXIMA_SLOTS}</span>
            </div>
            <div className="liquid-summary-row">
              <span className="liquid-summary-row__label">Distancia</span>
              <span className="liquid-summary-row__value">{distanciaLogisticaKm > 0 ? `${distanciaLogisticaKm} km` : '—'}</span>
            </div>
            <div className="liquid-summary-row">
              <span className="liquid-summary-row__label">Tarifa neta</span>
              <span className="liquid-summary-row__value">
                {cotizacionLoading ? 'Calculando…' : tarifaFinalBase > 0 ? `$${tarifaFinalBase.toLocaleString()}` : '—'}
              </span>
            </div>
            <div className="liquid-summary-row">
              <span className="liquid-summary-row__label">IVA (19%)</span>
              <span className="liquid-summary-row__value">
                {cotizacionLoading ? '—' : ivaCalculado > 0 ? `$${ivaCalculado.toLocaleString()}` : '—'}
              </span>
            </div>
            <div className="liquid-summary-row liquid-summary-row--total">
              <span className="liquid-summary-row__label">Total</span>
              <span className="liquid-summary-row__value">
                {cotizacionLoading ? '—' : totalAPagarCliente > 0 ? `$${totalAPagarCliente.toLocaleString()}` : '—'}
              </span>
            </div>
          </div>
        </section>

        <div className="liquid-form-footer">
          <button
            type="submit"
            className="lt-btn lt-btn--primary lt-btn--full lt-btn--lg"
            disabled={!puedeConfirmar}
          >
            {saving ? 'Procesando…' : 'Confirmar pedido'}
          </button>
        </div>

      </form>
    </div>
  );
}

