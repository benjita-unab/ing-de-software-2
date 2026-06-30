import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../lib/apiClient';
import { crearRuta, estimarFechasEstimadas } from '../lib/rutasService';
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
  MAXIMO: { label: "MÁXIMO (96)", slots: 96, color: "#DC2626", textDark: false }
};

const OBTENER_TARIFA_POR_TRAMO = (categoria, km) => {
  // Ahora la tarifa es dinámica y por bloques de 50km
  const bloques_50km = Math.ceil(km / 50) || 1;
  const precioBasePorSlot = 1000 + (bloques_50km * 550); // $1000 base + $550 por tramo de 50km (30% mas barato)

  const rules = {
    XS: { slots: 1, desc: 1.00 }, // 0% descuento
    S: { slots: 4, desc: 0.95 }, // 5% descuento
    M: { slots: 12, desc: 0.90 }, // 10% descuento
    L: { slots: 24, desc: 0.85 }, // 15% descuento
    XL: { slots: 48, desc: 0.80 }, // 20% descuento
    MAXIMO: { slots: 96, desc: 0.75 }  // 25% descuento
  };

  const config = rules[categoria] || rules['XS'];
  return Math.round(precioBasePorSlot * config.slots * config.desc);
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
      setMensaje({ tipo: "error", texto: res.error || "No se pudo cargar la ruta." });
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

  const handleNuevoPedido = () => {
    if(window.confirm("¿Estás seguro de que quieres borrar el pedido actual y empezar uno nuevo?")) {
      localStorage.removeItem('creadorCargaDraft');
      setModoCarga('CENTRAL'); setClienteId(""); setNombreRuta(""); setOrigen(""); setOrigenInput("");
      setRutaPlantillaId(""); setObservaciones(""); setRutasReutilizables([]);
      setParadas([]); setBultos([]); setCostoTac("");
      setFechaEntregaStr(""); setFechaEntregaTimestamp(""); setActiveSizeBrush(null);
      setIsTarifaManual(false); setCamionId(""); setActiveParadaId("");
      if(origenRef.current) origenRef.current.value = "";
    }
  };

  const [camionId, setCamionId] = useState("");
  const [rendimientoCamion, setRendimientoCamion] = useState(4.5);

  const [costoTac, setCostoTac] = useState("");
  const [precioDiesel, setPrecioDiesel] = useState(1498);
  const [tarifasConfig, setTarifasConfig] = useState({
    precioPorRuta: 5000,
    precioPorEntrega: 3000,
    precioPorBulto: 500,
    precioPorKm: 150
  });

  const [isTarifaManual, setIsTarifaManual] = useState(false);
  const [tarifaManualTotal, setTarifaManualTotal] = useState("");

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

        const resTarifas = await apiFetch("/api/configuracion-pagos");
        if (resTarifas.ok && resTarifas.data) {
          setTarifasConfig(resTarifas.data);
          if (resTarifas.data.precioCombustibleLitro != null) {
            setPrecioDiesel(Number(resTarifas.data.precioCombustibleLitro));
          }
        }

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
  const isCargaMaximizada = totalSlotsUsed === CAPACIDAD_MAXIMA_SLOTS;
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
      alert("Debes seleccionar y autocompletar el Origen antes de empezar a cargar bultos.");
      return;
    }
    if (!activeSizeBrush) {
      alert("Selecciona primero un tamaño de bulto para agregarlo al camión.");
      return;
    }
    if (!activeParadaId) {
      alert("Selecciona a qué parada de destino va dirigido este bulto.");
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
      alert(`Capacidad excedida. Solo quedan ${CAPACIDAD_MAXIMA_SLOTS - totalSlotsUsed} slots libres.`);
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

  const slotsPintados = [];
  bultos.forEach((b, index) => {
    const bParadaIndex = paradas.findIndex(p => p.id === b.paradaId) + 1;
    for (let i = 0; i < b.slots; i++) {
      slotsPintados.push({ color: SIZES_CONFIG[b.categoria].color, paradaNumber: bParadaIndex, id: b.id });
    }
  });
  const remainingSlots = CAPACIDAD_MAXIMA_SLOTS - totalSlotsUsed;

  // ----------------------------------------------------
  // SIMULADOR DE RENTABILIDAD Y COSTOS OPERATIVOS
  // ----------------------------------------------------

  const costoCombustibleCalculado = distanciaLogisticaKm > 0 && rendimientoCamion > 0
    ? Math.round((distanciaLogisticaKm / rendimientoCamion) * precioDiesel)
    : 0;

  // CONSOLIDACION MATEMATICA DE TARIFAS POR PARADA (INGRESOS CLIENTES)
  let tarifaCalculadaBultos = 0;
  let breakdown = [];

  paradas.forEach((p, idx) => {
    const bultosParada = bultos.filter(b => b.paradaId === p.id);
    const slotsParada = bultosParada.reduce((acc, b) => acc + b.slots, 0);
    if (slotsParada === 0) return;

    let slotsToPrice = slotsParada;
    const countXL = Math.floor(slotsToPrice / 48); slotsToPrice %= 48;
    const countL = Math.floor(slotsToPrice / 24); slotsToPrice %= 24;
    const countM = Math.floor(slotsToPrice / 12); slotsToPrice %= 12;
    const countS = Math.floor(slotsToPrice / 4); slotsToPrice %= 4;
    const countXS = slotsToPrice;

    const fromPrev = p.distanceFromPrev || p.distanceKm || 0;
    const toOrigin = p.distanceToOrigin || fromPrev;

    // Facturación fraccionada justa: Cada destino paga el trayecto exacto que el camión recorrió para llegar a él.
    // El último destino asume el costo logístico de devolver el camión vacío a la central.
    let billedDistanceKm = 0;
    if (modoCarga === 'RETORNO') {
      billedDistanceKm = Math.round(fromPrev);
    } else {
      const isLastParada = idx === paradas.length - 1;
      billedDistanceKm = Math.round(fromPrev + (isLastParada ? toOrigin : 0));
    }
    
    const shortAddr = p.address.split(',')[0];

    if (countXL > 0) { tarifaCalculadaBultos += countXL * OBTENER_TARIFA_POR_TRAMO("XL", billedDistanceKm); breakdown.push({ cat: "XL", qty: countXL, parada: shortAddr, kmFacturado: billedDistanceKm }); }
    if (countL > 0) { tarifaCalculadaBultos += countL * OBTENER_TARIFA_POR_TRAMO("L", billedDistanceKm); breakdown.push({ cat: "L", qty: countL, parada: shortAddr, kmFacturado: billedDistanceKm }); }
    if (countM > 0) { tarifaCalculadaBultos += countM * OBTENER_TARIFA_POR_TRAMO("M", billedDistanceKm); breakdown.push({ cat: "M", qty: countM, parada: shortAddr, kmFacturado: billedDistanceKm }); }
    if (countS > 0) { tarifaCalculadaBultos += countS * OBTENER_TARIFA_POR_TRAMO("S", billedDistanceKm); breakdown.push({ cat: "S", qty: countS, parada: shortAddr, kmFacturado: billedDistanceKm }); }
    if (countXS > 0) { tarifaCalculadaBultos += countXS * OBTENER_TARIFA_POR_TRAMO("XS", billedDistanceKm); breakdown.push({ cat: "XS", qty: countXS, parada: shortAddr, kmFacturado: billedDistanceKm }); }
  });

  const tarifaFinalBase = isTarifaManual ? Number(tarifaManualTotal || 0) : tarifaCalculadaBultos;

  const pagoConductorAutomatico = paradas.length === 0 ? 0 : (
    tarifasConfig.precioPorRuta + 
    (paradas.length * tarifasConfig.precioPorEntrega) + 
    (totalSlotsUsed * tarifasConfig.precioPorBulto) + 
    (distanciaLogisticaKm * tarifasConfig.precioPorKm)
  );

  const costosOperativosTerceros = Number(costoTac || 0) + pagoConductorAutomatico;
  const totalCostosOperativos = (modoCarga === 'RETORNO' ? 0 : costoCombustibleCalculado) + costosOperativosTerceros;

  const margenGanancia = tarifaFinalBase - totalCostosOperativos;

  // Calculo de IVA (19%)
  const ivaCalculado = Math.round(tarifaFinalBase * 0.19);
  const totalAPagarCliente = tarifaFinalBase + ivaCalculado;

  const handleCrearRuta = async (e) => {
    e.preventDefault();
    if (isCapacidadExcedida) return;
    if (!clienteId || !camionId || bultos.length === 0 || paradas.length === 0 || !fechaEntregaTimestamp) {
      setMensaje({ tipo: "error", texto: "Revisa: Cliente, Camión, Fecha y al menos 1 parada/bulto deben ser definidos." });
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
        tarifa_base_total: tarifaFinalBase,
        is_tarifa_manual: isTarifaManual,
        bultos_despachados: totalSlotsUsed,
        bultos_detalle: bultos.map((b) => ({ categoria: b.categoria })),
      };

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
        throw new Error(resultado.error || "Error al crear ruta.");
      }

      setMensaje({ tipo: "ok", texto: "¡Ruta guardada exitosamente! Visita Gestión de Rutas." });

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

  return (
    <div className="liquid-container">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
        <h2 className="liquid-title" style={{fontSize: '28px', fontWeight: 900, margin: 0}}>Creador de Carga</h2>
        {(bultos.length > 0 || paradas.length > 0 || origen) && (
          <button type="button" onClick={handleNuevoPedido} style={{padding: '8px 16px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 5px rgba(220,38,38,0.3)'}}>
            Limpiar / Nuevo Pedido
          </button>
        )}
      </div>
      <p className="liquid-text" style={{ fontSize: '14px', marginBottom: '24px', lineHeight: '1.5', fontWeight: '500' }}>
        Arma tu carga (96 Micro-bloques). Usa <b>Click Izquierdo</b> para pintar en el camión y <b>Click Derecho</b> para borrar paquetes.
      </p>

      {mensaje && (
        <div style={{ padding: '12px', background: mensaje.tipo === "ok" ? '#D1FAE5' : '#FEE2E2', border: `1px solid ${mensaje.tipo === 'ok' ? '#10B981' : '#DC2626'}`, color: mensaje.tipo === 'ok' ? '#065F46' : '#991B1B', borderRadius: '8px', marginBottom: '16px', fontWeight: 'bold' }}>
          {mensaje.texto}
        </div>
      )}

      {(origenErr || destinoErr) && (
        <div style={{ padding: '12px', background: '#FEE2E2', border: '1px solid #DC2626', color: '#991B1B', borderRadius: '8px', marginBottom: '16px', fontWeight: 'bold' }}>
          Google Maps Auth Error: Configura tu REACT_APP_GOOGLE_MAPS_API_KEY
        </div>
      )}

      <form onSubmit={handleCrearRuta} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* PESTAÑAS MODO CARGA */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="button" onClick={() => { setModoCarga('CENTRAL'); setOrigen(""); if(origenRef.current) origenRef.current.value=""; setParadas([]); setBultos([]); setActiveParadaId(""); }} style={{ flex: 1, padding: '16px', borderRadius: '12px', border: 'none', fontWeight: '900', fontSize: '15px', cursor: 'pointer', background: modoCarga === 'CENTRAL' ? '#3B82F6' : 'rgba(128,128,128,0.2)', color: modoCarga === 'CENTRAL' ? '#fff' : 'inherit', transition: 'all 0.2s' }}>
            🚛 Crear Pedido desde Central
          </button>
          <button type="button" onClick={() => { setModoCarga('RETORNO'); setOrigen(""); if(origenRef.current) origenRef.current.value=""; setParadas([]); setBultos([]); setActiveParadaId(""); }} style={{ flex: 1, padding: '16px', borderRadius: '12px', border: 'none', fontWeight: '900', fontSize: '15px', cursor: 'pointer', background: modoCarga === 'RETORNO' ? '#10B981' : 'rgba(128,128,128,0.2)', color: modoCarga === 'RETORNO' ? '#fff' : 'inherit', transition: 'all 0.2s' }}>
            🔙 Crear Pedido de Retorno
          </button>
        </div>

        {/* PASO 1: DIRECCIONES Y CLIENTE */}
        <div className="liquid-step-box" style={{ padding: '24px', borderRadius: '16px' }}>
          <div className="liquid-text" style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', borderBottom: '2px solid rgba(128,128,128,0.1)', paddingBottom: '8px' }}>
            Paso 1: Direcciones, Cliente y Paradas 
            {modoCarga === 'RETORNO' && <span style={{ color: '#10B981', fontSize: '14px', marginLeft:'8px' }}>(Solo Camiones a &lt;100km)</span>}
            {modoCarga === 'CENTRAL' && <span style={{ color: '#3B82F6', fontSize: '14px', marginLeft:'8px' }}>(Salida Base: Quillota 980, Viña del Mar)</span>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label className="liquid-label" style={{ fontSize: '13px', fontWeight: '700' }}>Cliente Principal B2B *</label>
              <select required value={clienteId} onChange={e => setClienteId(e.target.value)} className="liquid-input" style={{ padding: '12px', borderRadius: '8px', outline: 'none' }}>
                <option value="">Selecciona Cliente...</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre || c.contacto_email}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label className="liquid-label" style={{ fontSize: '13px', fontWeight: '700' }}>Nombre de Ruta (Opcional)</label>
              <input 
                type="text" 
                value={nombreRuta}
                onChange={e => setNombreRuta(e.target.value)}
                placeholder="Ej: Pedido Falabella..." 
                className="liquid-input" 
                style={{ padding: '12px', borderRadius: '8px', outline: 'none' }} 
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label className="liquid-label" style={{ fontSize: '13px', fontWeight: '700' }}>Origen (Autocompletado) *</label>
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
                placeholder="Ej: Santiago, Chile" 
                className="liquid-input" 
                style={{ padding: '12px', borderRadius: '8px', outline: 'none', opacity: paradas.length > 0 ? 0.6 : 1 }} 
              />
              {paradas.length > 0 && <span style={{ fontSize: '11px', color: '#FBBF24' }}>Para cambiar el origen, elimina los destinos.</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: 'span 2' }}>
              <label className="liquid-label" style={{ fontSize: '13px', fontWeight: '700' }}>Añadir Parada (Destino) {calculandoRuta && <span style={{ fontSize: '12px', color: '#1D4ED8' }}>(Calculando...)</span>}</label>
              <input ref={nuevaParadaRef} type="text" placeholder="Ej: Coquimbo, Antofagasta..." className="liquid-input" style={{ padding: '12px', borderRadius: '8px', outline: 'none' }} disabled={calculandoRuta || !origen || (modoCarga === 'RETORNO' && paradas.length >= 1)} />
              {!origen && <span style={{ fontSize: '11px', color: '#f87171' }}>Debes establecer el Origen primero</span>}
              {modoCarga === 'RETORNO' && paradas.length >= 1 && <span style={{ fontSize: '11px', color: '#FBBF24' }}>Solo se permite 1 destino en modo Retorno.</span>}
            </div>
          </div>

          {paradas.length > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '12px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '12px' }} className="liquid-label">Ruta Consolidada ({distanciaLogisticaKm} km logísticos):</div>
              
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px', padding: '0 4px' }}>
                <span style={{ fontSize: '16px' }}>📍</span>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 'bold', textTransform: 'uppercase' }}>Desde (Origen)</span>
                  <span className="liquid-text" style={{ fontSize: '13px', fontWeight: '500' }}>{origen}</span>
                </div>
              </div>

              <div style={{ borderLeft: '2px dashed rgba(255,255,255,0.15)', marginLeft: '11px', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {paradas.map((p, idx) => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', fontSize: '13px', alignItems: 'center' }} className="liquid-text">
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 'bold', textTransform: 'uppercase' }}>Hacia (Destino {idx + 1})</span>
                      <span>{p.address}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <span style={{ fontWeight: 'bold', color: '#38BDF8' }}>+{Number(p.distanceFromPrev || p.distanceKm || 0).toFixed(1)} km</span>
                      <button type="button" onClick={() => handleRemoveParada(p.id)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', padding: '0 4px' }}>×</button>
                    </div>
                  </div>
                ))}

                {modoCarga !== 'RETORNO' && paradas.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '6px', fontSize: '13px', alignItems: 'center', border: '1px solid rgba(16, 185, 129, 0.2)' }} className="liquid-text">
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 'bold', textTransform: 'uppercase' }}>Retorno a Base</span>
                      <span style={{ color: '#A7F3D0' }}>{origen}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <span style={{ fontWeight: 'bold', color: '#10B981' }}>+{Number(paradas[paradas.length - 1].distanceToOrigin || 0).toFixed(1)} km</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
            <label className="liquid-label" style={{ fontSize: '13px', fontWeight: '700' }}>Observaciones (Opcional)</label>
            <textarea
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              placeholder="Notas operativas del pedido..."
              className="liquid-input"
              style={{ padding: '12px', borderRadius: '8px', outline: 'none', resize: 'vertical', minHeight: '60px' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '24px' }}>
            <label className="liquid-label" style={{ fontSize: '13px', fontWeight: '700' }}>Entrega Estimada Final (Automática)</label>
            <input type="text" disabled value={fechaEntregaStr || "Esperando paradas..."} className="liquid-input" style={{ padding: '12px', borderRadius: '8px', fontWeight: 'bold', opacity: 0.8 }} />
          </div>

          <div className="liquid-section-divider" style={{ fontSize: '13px', fontWeight: '800', marginTop: '16px', marginBottom: '10px' }}>SELECCIONA TAMAÑO, DESTINO Y PINTA LA CARGA</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {Object.entries(SIZES_CONFIG).map(([k, v]) => {
                const isSelected = activeSizeBrush === k;
                const isYellow = k === 'L';
                return (
                  <button
                    key={k} type="button"
                    onClick={() => setActiveSizeBrush(k)}
                    style={{
                      padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', border: 'none',
                      background: isSelected ? v.color : "rgba(128,128,128,0.2)",
                      color: isSelected && !v.textDark ? "#fff" : (isSelected ? "#000" : "inherit"),
                      textShadow: (isSelected && isYellow) ? "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000" : "none",
                    }}
                    className={!isSelected ? "liquid-text" : ""}
                  >
                    <span style={{ color: (isSelected && isYellow) ? '#fff' : 'inherit' }}>{v.label}</span>
                  </button>
                );
              })}
            </div>
            <div>
              <select value={activeParadaId} onChange={e => setActiveParadaId(e.target.value)} className="liquid-input" style={{ padding: '10px', borderRadius: '8px', width: '100%', outline: 'none', fontSize: '13px' }} disabled={paradas.length === 0}>
                <option value="">Selecciona la parada de destino para el bulto...</option>
                {paradas.map((p, idx) => <option key={p.id} value={p.id}>{idx + 1}. {p.address} (+{Number(p.distanceFromPrev || p.distanceKm || 0).toFixed(1)} km)</option>)}
              </select>
            </div>
          </div>

          {/* Grilla Interactiva */}
          {(!activeSizeBrush || !activeParadaId || !origen) && paradas.length > 0 && (
            <div style={{ color: '#DC2626', fontWeight: 'bold', fontSize: '13px', marginTop: '14px', textAlign: 'center' }}>
              ⚠️ Selecciona un ORIGEN, un TAMAÑO y una PARADA DE DESTINO para poder pintar en el camión.
            </div>
          )}
          <div
            className="liquid-canvas"
            style={{
              display: 'flex', gap: '10px', padding: '10px', borderRadius: '16px',
              cursor: (!activeSizeBrush || !activeParadaId || !origen) ? 'not-allowed' : 'crosshair',
              marginTop: '14px',
              opacity: (!activeSizeBrush || !activeParadaId || !origen) ? 0.5 : 1,
              pointerEvents: (!activeSizeBrush || !activeParadaId || !origen) ? 'none' : 'auto'
            }}
            onClick={handleTruckClick}
            onContextMenu={(e) => handleRightClick(e, null)}
          >
            <div style={{ width: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(180deg, #1D4ED8, #1e3a8a)', border: '2px solid rgba(255,255,255,0.8)', borderRadius: '12px 4px 4px 12px', fontSize: '18px', fontWeight: 'bold', color: '#ffffff', boxShadow: '5px 0 15px rgba(0,0,0,0.2)' }}>LOGI</div>
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(16, 1fr)', gridTemplateRows: 'repeat(6, 1fr)', gap: '2px' }}>
              {Array.from({ length: CAPACIDAD_MAXIMA_SLOTS }).map((_, i) => {
                const p = slotsPintados[i];
                return (
                  <div
                    key={i}
                    className={p ? "" : "liquid-slot-empty"}
                    onContextMenu={(e) => p ? handleRightClick(e, p.id) : null}
                    style={{
                      aspectRatio: '1', borderRadius: '2px', border: '1px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
                      backgroundColor: p ? p.color : "",
                      borderColor: p ? "transparent" : "",
                      boxShadow: p ? `0 0 5px ${p.color}AA` : "none"
                    }}>
                    {p && <div style={{ fontSize: '11px', fontWeight: '900', color: '#000', textAlign: 'center', lineHeight: '1' }}>P{p.paradaNumber}</div>}
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '14px', fontWeight: 'bold', color: remainingSlots === 0 ? '#DC2626' : '#38BDF8', marginTop: '6px' }}>
            {remainingSlots} Micro-bloques Libres (100% = 96)
          </div>

          {isCargaMaximizada && (
            <div style={{ color: '#DC2626', fontWeight: 'bold', fontSize: '14px', marginTop: '10px', textAlign: 'right' }}>
              ¡CARGA MÁXIMA ALCANZADA!
            </div>
          )}
          {modoCarga === 'RETORNO' && totalSlotsUsed > 0 && !isCargaMinimaRetornoValida && (
            <div style={{ color: '#FBBF24', fontWeight: 'bold', fontSize: '14px', marginTop: '10px', textAlign: 'right' }}>
              ⚠️ Mínimo 25% (24 slots) requerido para Retorno. Faltan {24 - totalSlotsUsed} slots.
            </div>
          )}

          {bultos.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
              {bultos.map((b, i) => {
                const bParada = paradas.find(p => p.id === b.paradaId);
                return (
                  <div key={b.id} className="liquid-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <span style={{ fontWeight: 'bold' }}>#{i + 1}</span>
                      <span style={{
                        padding: '4px 8px', borderRadius: '4px', background: SIZES_CONFIG[b.categoria].color,
                        color: SIZES_CONFIG[b.categoria].textDark ? '#000' : '#fff', fontSize: '12px', fontWeight: 'bold',
                        textShadow: b.categoria === 'L' ? "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000" : "none"
                      }}>
                        <span style={{ color: b.categoria === 'L' ? '#fff' : 'inherit' }}>{b.categoria}</span>
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: '500' }}>{b.slots} Slots</span>
                      <span style={{ fontSize: '12px', fontStyle: 'italic' }}>→ {bParada ? bParada.address.split(',')[0] : '???'}</span>
                    </div>
                    <button type="button" onClick={(e) => handleRightClick(e, b.id)} style={{ background: 'none', border: 'none', color: '#DC2626', fontSize: '20px', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* WIDGET ALERTA DE PÉRDIDA FINANCIERA (ELIMINADO) */}

        {/* PASO 2: ASIGNACIÓN DE CAMIÓN */}
        <div className="liquid-step-box" style={{ padding: '24px', borderRadius: '16px', opacity: totalSlotsUsed > 0 ? 1 : 0.5 }}>
          <div className="liquid-text" style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', borderBottom: '2px solid rgba(128,128,128,0.1)', paddingBottom: '8px' }}>Paso 2: Selección de Vehículo Compatible</div>
          {totalSlotsUsed === 0 ? (
            <div style={{ color: '#DC2626', fontSize: '14px', marginBottom: '10px', fontWeight: '600' }}>⚠️ Agrega carga en el Paso 1 para buscar camiones.</div>
          ) : (
            <div style={{ color: '#38BDF8', fontSize: '14px', marginBottom: '10px', fontWeight: '600' }}>✓ Buscando camiones con al menos {totalSlotsUsed} micro-bloques disponibles.</div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label className="liquid-label" style={{ fontSize: '13px', fontWeight: '700' }}>Camiones Disponibles *</label>
            <select required value={camionId} onChange={e => handleSelectCamion(e.target.value)} className="liquid-input" style={{ padding: '12px', borderRadius: '8px', outline: 'none' }} disabled={totalSlotsUsed === 0}>
              <option value="">Selecciona Vehículo...</option>
              {camionesDisponiblesParaEstaCarga.map(c => {
                const maxCap = c.slots || CAPACIDAD_MAXIMA_SLOTS;
                const available = modoCarga === 'RETORNO' ? maxCap : (camionesDisponibilidad[c.id] ?? maxCap);
                return (
                  <option key={c.id} value={c.id}>{c.patente || c.placa} ({c.modelo}) - Espacio Libre: {available} Slots {modoCarga === 'RETORNO' && "(Cerca de origen)"}</option>
                );
              })}
            </select>
            {totalSlotsUsed > 0 && modoCarga === 'RETORNO' && camionesDisponiblesParaEstaCarga.length === 0 && (
              <div style={{ color: '#FBBF24', fontSize: '13px', marginTop: '6px', fontWeight: 'bold' }}>No hay camiones en ruta retornando a menos de 100km de tu Origen. Intenta otra ubicación.</div>
            )}
            {totalSlotsUsed > 0 && modoCarga === 'CENTRAL' && camionesDisponiblesParaEstaCarga.length === 0 && (
              <div style={{ color: '#DC2626', fontSize: '13px', marginTop: '6px', fontWeight: 'bold' }}>No hay camiones en la flota con {totalSlotsUsed} micro-bloques disponibles en este momento.</div>
            )}
          </div>
        </div>

        {/* PASO 3: SIMULADOR DE RENTABILIDAD */}
        <div className="liquid-step-box" style={{ padding: '24px', borderRadius: '16px', opacity: (totalSlotsUsed > 0 && camionId) ? 1 : 0.5 }}>
          <div className="liquid-text" style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', borderBottom: '2px solid rgba(128,128,128,0.1)', paddingBottom: '8px' }}>Paso 3: Simulador de Rentabilidad Interna</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label className="liquid-label" style={{ fontSize: '13px', fontWeight: '700' }}>Costo TAC / Peajes (CLP)</label>
              <input type="number" required disabled={!camionId} value={costoTac} onChange={e => setCostoTac(e.target.value)} className="liquid-input" style={{ padding: '12px', borderRadius: '8px', outline: 'none' }} placeholder="Ej: 5000" />
            </div>
          </div>

          <div style={{ padding: '16px', borderRadius: '12px', border: '1px solid rgba(128,128,128,0.2)' }}>
            <label className="liquid-text" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>
              <input type="checkbox" disabled={!camionId} checked={isTarifaManual} onChange={e => setIsTarifaManual(e.target.checked)} />
              Tarifa Manual Override (Sobrescribir precios cobrados a clientes)
            </label>
            {isTarifaManual && (
              <input type="number" value={tarifaManualTotal} onChange={e => setTarifaManualTotal(e.target.value)} placeholder="Tarifa total recaudada (CLP)" className="liquid-input" style={{ padding: '12px', borderRadius: '8px', marginTop: '10px', width: '100%', outline: 'none' }} />
            )}
          </div>

          {/* BALANCE FINANCIERO */}
          <div className="liquid-resume" style={{ padding: '20px', borderRadius: '16px', marginTop: '16px' }}>
            <div style={{ fontSize: '16px', fontWeight: '900', color: '#38BDF8', borderBottom: '1px solid rgba(56,189,248,0.3)', paddingBottom: '8px', marginBottom: '12px' }}>
              INGRESOS (COBRO A CLIENTES)
            </div>
            {breakdown.map((bk, i) => (
              <div key={i} className="liquid-text" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px', fontWeight: '500' }}>
                <span>Carga {bk.parada} ({bk.kmFacturado}km facturados): {bk.qty}x {bk.cat}</span>
                <span>+${(bk.qty * OBTENER_TARIFA_POR_TRAMO(bk.cat, bk.kmFacturado)).toLocaleString()}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', marginBottom: '8px', fontWeight: '700', color: '#6EE7B7' }}>
              <span>Subtotal Neto</span>
              <span>${tarifaFinalBase.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', marginBottom: '8px', fontWeight: '700', color: '#93C5FD' }}>
              <span>IVA (19%)</span>
              <span>+${ivaCalculado.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', marginBottom: '20px', fontWeight: '900', color: '#10B981', paddingTop: '8px', borderTop: '1px solid rgba(16,185,129,0.3)' }}>
              <span>Total Recaudado (Total a Pagar por Cliente)</span>
              <span>${totalAPagarCliente.toLocaleString()}</span>
            </div>

            <div style={{ fontSize: '16px', fontWeight: '900', color: '#FCA5A5', borderBottom: '1px solid rgba(248,113,113,0.3)', paddingBottom: '8px', marginBottom: '12px' }}>
              COSTOS OPERATIVOS (INTERNOS)
            </div>
            <div className="liquid-text" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px', fontWeight: '500' }}>
              <span>Costo Combustible Físico ({distanciaLogisticaKm}km {modoCarga === 'RETORNO' ? 'Solo Ida (Referencia)' : 'Viaje Redondo'} / {rendimientoCamion}km/L)</span>
              <span>{modoCarga === 'RETORNO' ? '$0 (-$' + costoCombustibleCalculado.toLocaleString() + ' Financiado por Ida)' : '-$' + costoCombustibleCalculado.toLocaleString()}</span>
            </div>
            <div className="liquid-text" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px', fontWeight: '500' }}>
              <span>Pago Conductor</span>
              <span>-${pagoConductorAutomatico.toLocaleString()}</span>
            </div>
            <div className="liquid-text" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px', fontWeight: '500' }}>
              <span>Costo TAC / Peajes</span>
              <span>-${Number(costoTac || 0).toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', marginBottom: '20px', fontWeight: '900', color: '#EF4444', paddingTop: '8px' }}>
              <span>Gasto Total Estimado</span>
              <span>-${totalCostosOperativos.toLocaleString()}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', color: margenGanancia < 0 ? '#EF4444' : '#10B981', fontSize: '22px', fontWeight: '900', marginTop: '12px', borderTop: '2px dashed rgba(255,255,255,0.2)', paddingTop: '16px' }}>
              <span>MARGEN DE GANANCIA (PROFIT)</span>
              <span>{margenGanancia < 0 ? '-' : '+'}${Math.abs(margenGanancia).toLocaleString()} CLP</span>
            </div>
          </div>

          {/* BOTONES DE DECISION */}
          <div style={{ display: 'flex', gap: '16px', marginTop: '20px' }}>
            <button type="submit" disabled={saving || bultos.length === 0 || !camionId || !isCargaMinimaRetornoValida} style={{ flex: 1, padding: '16px', borderRadius: '12px', background: 'linear-gradient(90deg, #10B981, #059669)', color: '#fff', fontSize: '18px', fontWeight: '900', border: 'none', cursor: 'pointer', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)', transition: 'all 0.2s', textTransform: 'uppercase', opacity: (!isCargaMinimaRetornoValida || bultos.length === 0 || !camionId) ? 0.5 : 1 }}>
              {saving ? "Procesando..." : "Aprobar Ruta para Salida"}
            </button>
          </div>
        </div>

      </form>
    </div>
  );
}

