import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { apiFetch } from '../lib/apiClient';
import { estimarFechasEstimadas } from '../lib/rutasService';
import { useGooglePlacesAutocomplete } from '../hooks/useGooglePlacesAutocomplete';
import '../LiquidGlass.css';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || "";
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

const CAPACIDAD_MAXIMA_SLOTS = 96;

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
  const [camiones, setCamiones] = useState([]);
  const [camionesDisponibilidad, setCamionesDisponibilidad] = useState({});
  const [loadingInitial, setLoadingInitial] = useState(false);

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
    const res = await estimarFechasEstimadas({ origen, destino: address });
    if (res.success && res.data?.distancia_km != null) {
      const newParada = {
        id: Math.random().toString(),
        address: address,
        distanceKm: res.data.distancia_km
      };
      setParadas(prev => {
        const next = [...prev, newParada];
        return next.sort((a, b) => a.distanceKm - b.distanceKm);
      });
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
    localStorage.setItem('creadorCargaDraft', JSON.stringify({
      modoCarga, clienteId, origen, origenInput, paradas, bultos
    }));
  }, [modoCarga, clienteId, origen, origenInput, paradas, bultos]);

  const handleNuevoPedido = () => {
    if(window.confirm("¿Estás seguro de que quieres borrar el pedido actual y empezar uno nuevo?")) {
      localStorage.removeItem('creadorCargaDraft');
      setModoCarga('CENTRAL'); setClienteId(""); setOrigen(""); setOrigenInput("");
      setParadas([]); setBultos([]); setCostoTac(""); setPagoConductor("");
      setFechaEntregaStr(""); setFechaEntregaTimestamp(""); setActiveSizeBrush(null);
      setIsTarifaManual(false); setCamionId(""); setActiveParadaId("");
      if(origenRef.current) origenRef.current.value = "";
    }
  };

  const [camionId, setCamionId] = useState("");
  const [rendimientoCamion, setRendimientoCamion] = useState(4.5);

  const [costoTac, setCostoTac] = useState("");
  const [pagoConductor, setPagoConductor] = useState("");
  const [precioDiesel, setPrecioDiesel] = useState(1498);

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
        const { data: rutasActivas } = await supabase
          .from('rutas')
          .select('camion_id, destino')
          .in('estado', ['PENDIENTE', 'ASIGNADO', 'EN_TRANSITO', 'EN_CAMINO_ORIGEN', 'EN_CARGA', 'EN_DESTINO'])
          .not('camion_id', 'is', null)
          .not('destino', 'is', null);

        if (!rutasActivas || rutasActivas.length === 0) return;

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
    const calcLogistica = async () => {
      if (!origen || paradas.length === 0) {
        setDistanciaLogisticaKm(0);
        return;
      }

      const distMaxParadas = paradas[paradas.length - 1].distanceKm || 0;

      if (modoCarga === 'RETORNO') {
        // En retorno solo gastamos la distancia directa desde origen a destino, sin viajes redondos.
        setDistanciaLogisticaKm(Math.round(distMaxParadas));
        return;
      }

      const CENTRAL = "Quillota 980, Viña del Mar, Chile";
      const r1 = await estimarFechasEstimadas({ origen: CENTRAL, destino: origen });
      const d1 = r1.success ? r1.data?.distancia_km || 100 : 100;

      const destinoFinal = paradas[paradas.length - 1].address;

      const r2 = await estimarFechasEstimadas({ origen: destinoFinal, destino: CENTRAL });
      const d2 = r2.success ? r2.data?.distancia_km || distMaxParadas : distMaxParadas;

      setDistanciaLogisticaKm(Math.round(d1 + distMaxParadas + d2));
    };
    calcLogistica();
  }, [origen, paradas, modoCarga]);

  useEffect(() => {
    const initData = async () => {
      setLoadingInitial(true);
      try {
        const resCli = await apiFetch("/api/clientes");
        if (resCli.ok) setClientes(Array.isArray(resCli.data) ? resCli.data : resCli.data?.data || []);

        const resCam = await apiFetch("/api/camiones");
        let trucks = [];
        if (resCam.ok) {
          trucks = Array.isArray(resCam.data) ? resCam.data : resCam.data?.data || [];
          setCamiones(trucks);
        }

        const { data: config } = await supabase
          .from("sistema_config")
          .select("precio_diesel_por_litro")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (config && config.precio_diesel_por_litro) {
          setPrecioDiesel(Number(config.precio_diesel_por_litro));
        }

        const { data: rutasActivas } = await supabase
          .from('rutas')
          .select('camion_id, bultos(cuadrados_equivalentes)')
          .in('estado', ['PENDIENTE', 'ASIGNADO', 'EN_TRANSITO', 'EN_CAMINO_ORIGEN', 'EN_CARGA', 'EN_DESTINO'])
          .not('camion_id', 'is', null);

        const usedSlotsMap = {};
        if (rutasActivas) {
          rutasActivas.forEach(ruta => {
            if (!ruta.camion_id) return;
            const slotsRuta = ruta.bultos?.reduce((sum, b) => sum + (Number(b.cuadrados_equivalentes) || 0), 0) || 0;
            usedSlotsMap[ruta.camion_id] = (usedSlotsMap[ruta.camion_id] || 0) + slotsRuta;
          });
        }

        const availability = {};
        if (trucks.length > 0) {
          trucks.forEach(t => {
            const maxCap = t.slots || CAPACIDAD_MAXIMA_SLOTS;
            const used = usedSlotsMap[t.id] || 0;
            availability[t.id] = Math.max(0, maxCap - used);
          });
        }
        setCamionesDisponibilidad(availability);
      } catch (err) {
        console.error("Error init:", err);
      } finally {
        setLoadingInitial(false);
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
  const distKmMax = paradas.length > 0 ? paradas[paradas.length - 1].distanceKm : 0;

  const costoCombustibleCalculado = distanciaLogisticaKm > 0 && rendimientoCamion > 0
    ? Math.round((distanciaLogisticaKm / rendimientoCamion) * precioDiesel)
    : 0;

  // CONSOLIDACION MATEMATICA DE TARIFAS POR PARADA (INGRESOS CLIENTES)
  let tarifaCalculadaBultos = 0;
  let breakdown = [];

  paradas.forEach(p => {
    const bultosParada = bultos.filter(b => b.paradaId === p.id);
    const slotsParada = bultosParada.reduce((acc, b) => acc + b.slots, 0);
    if (slotsParada === 0) return;

    let slotsToPrice = slotsParada;
    const countXL = Math.floor(slotsToPrice / 48); slotsToPrice %= 48;
    const countL = Math.floor(slotsToPrice / 24); slotsToPrice %= 24;
    const countM = Math.floor(slotsToPrice / 12); slotsToPrice %= 12;
    const countS = Math.floor(slotsToPrice / 4); slotsToPrice %= 4;
    const countXS = slotsToPrice;

    const billedDistanceKm = modoCarga === 'RETORNO' ? p.distanceKm : (p.distanceKm * 2); // Retorno cobra Ida, Central cobra Ida y Vuelta
    const shortAddr = p.address.split(',')[0];

    if (countXL > 0) { tarifaCalculadaBultos += countXL * OBTENER_TARIFA_POR_TRAMO("XL", billedDistanceKm); breakdown.push({ cat: "XL", qty: countXL, parada: shortAddr, kmFacturado: billedDistanceKm }); }
    if (countL > 0) { tarifaCalculadaBultos += countL * OBTENER_TARIFA_POR_TRAMO("L", billedDistanceKm); breakdown.push({ cat: "L", qty: countL, parada: shortAddr, kmFacturado: billedDistanceKm }); }
    if (countM > 0) { tarifaCalculadaBultos += countM * OBTENER_TARIFA_POR_TRAMO("M", billedDistanceKm); breakdown.push({ cat: "M", qty: countM, parada: shortAddr, kmFacturado: billedDistanceKm }); }
    if (countS > 0) { tarifaCalculadaBultos += countS * OBTENER_TARIFA_POR_TRAMO("S", billedDistanceKm); breakdown.push({ cat: "S", qty: countS, parada: shortAddr, kmFacturado: billedDistanceKm }); }
    if (countXS > 0) { tarifaCalculadaBultos += countXS * OBTENER_TARIFA_POR_TRAMO("XS", billedDistanceKm); breakdown.push({ cat: "XS", qty: countXS, parada: shortAddr, kmFacturado: billedDistanceKm }); }
  });

  const tarifaFinalBase = isTarifaManual ? Number(tarifaManualTotal || 0) : tarifaCalculadaBultos;

  const costosOperativosTerceros = Number(costoTac || 0) + Number(pagoConductor || 0);
  const totalCostosOperativos = (modoCarga === 'RETORNO' ? 0 : costoCombustibleCalculado) + costosOperativosTerceros;

  const margenGanancia = tarifaFinalBase - totalCostosOperativos;

  // El cliente paga solamente la tarifa base (Ingreso Total). 
  // Los costos operativos los asume la empresa de esa tarifa base.
  const totalAPagarCliente = tarifaFinalBase;

  const handleCrearRuta = async (e) => {
    e.preventDefault();
    if (isCapacidadExcedida) return;
    if (!clienteId || !camionId || bultos.length === 0 || paradas.length === 0 || !fechaEntregaTimestamp) {
      setMensaje({ tipo: "error", texto: "Revisa: Cliente, Camión, Fecha y al menos 1 parada/bulto deben ser definidos." });
      return;
    }

    setSaving(true);
    setMensaje(null);

    const destinoFinal = paradas[paradas.length - 1].address;

    try {
      const { data: ruta, error: rutaErr } = await supabase
        .from("rutas")
        .insert([{
          cliente_id: clienteId,
          camion_id: camionId || null,
          origen,
          destino: destinoFinal,
          distancia_km: distKmMax,
          costo_tac_peajes_clp: Number(costoTac || 0),
          pago_conductor_base_clp: Number(pagoConductor || 0),
          tarifa_base_total: tarifaFinalBase,
          costo_combustible_calculado: modoCarga === 'RETORNO' ? 0 : costoCombustibleCalculado,
          total_pagar: totalAPagarCliente, // Solo cobra la tarifa de matriz al cliente
          is_tarifa_manual: isTarifaManual,
          fecha_estimada_entrega: fechaEntregaTimestamp || null,
          estado: 'PENDIENTE',
          alerta_sub_financiada: false
        }])
        .select("id")
        .single();

      if (rutaErr || !ruta) throw new Error(rutaErr?.message || "Error al crear ruta.");

      const bultosInserts = bultos.map(b => ({
        ruta_id: ruta.id,
        tamaño: b.categoria,
        cuadrados_equivalentes: b.slots,
        categoria: b.categoria
      }));

      const { error: bultosErr } = await supabase.from("bultos").insert(bultosInserts);
      if (bultosErr) throw new Error(bultosErr.message);

      await supabase.from('historial_estados').insert([
        { ruta_id: ruta.id, estado: 'PENDIENTE', created_at: new Date().toISOString() }
      ]);

      setMensaje({ tipo: "ok", texto: "¡Ruta guardada exitosamente! Visita Gestión de Rutas." });

      localStorage.removeItem('creadorCargaDraft');
      setOrigen(""); setOrigenInput(""); setParadas([]); setCostoTac(""); setPagoConductor("");
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
        Arma tu carga (96 Micro-bloques). Usa <b>Click Izquierdo</b> para pintar en el camión y <b>Click Derecho</b> para borrar bultos.
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label className="liquid-label" style={{ fontSize: '13px', fontWeight: '700' }}>Cliente Principal B2B *</label>
              <select required value={clienteId} onChange={e => setClienteId(e.target.value)} className="liquid-input" style={{ padding: '12px', borderRadius: '8px', outline: 'none' }}>
                <option value="">Selecciona Cliente...</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre || c.contacto_email}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label className="liquid-label" style={{ fontSize: '13px', fontWeight: '700' }}>Origen (Autocompletado) *</label>
              <input ref={origenRef} required type="text" placeholder="Ej: Santiago, Chile" className="liquid-input" style={{ padding: '12px', borderRadius: '8px', outline: 'none' }} />
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
              <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }} className="liquid-label">Ruta Consolidada ({distKmMax} km total):</div>
              {paradas.map((p, idx) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', marginBottom: '6px', fontSize: '13px' }} className="liquid-text">
                  <span>{idx + 1}. {p.address}</span>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', color: '#38BDF8' }}>{p.distanceKm} km</span>
                    <button type="button" onClick={() => handleRemoveParada(p.id)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
                  </div>
                </div>
              ))}
            </div>
          )}

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
                {paradas.map((p, idx) => <option key={p.id} value={p.id}>{idx + 1}. {p.address} ({p.distanceKm} km)</option>)}
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label className="liquid-label" style={{ fontSize: '13px', fontWeight: '700' }}>Costo TAC / Peajes (CLP)</label>
              <input type="number" required disabled={!camionId} value={costoTac} onChange={e => setCostoTac(e.target.value)} className="liquid-input" style={{ padding: '12px', borderRadius: '8px', outline: 'none' }} placeholder="Ej: 5000" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label className="liquid-label" style={{ fontSize: '13px', fontWeight: '700' }}>Pago al Conductor (CLP)</label>
              <input type="number" required disabled={!camionId} value={pagoConductor} onChange={e => setPagoConductor(e.target.value)} className="liquid-input" style={{ padding: '12px', borderRadius: '8px', outline: 'none' }} placeholder="Ej: 45000" />
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
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', marginBottom: '20px', fontWeight: '900', color: '#10B981', paddingTop: '8px' }}>
              <span>Total Recaudado (Total a Pagar por Cliente)</span>
              <span>${tarifaFinalBase.toLocaleString()}</span>
            </div>

            <div style={{ fontSize: '16px', fontWeight: '900', color: '#FCA5A5', borderBottom: '1px solid rgba(248,113,113,0.3)', paddingBottom: '8px', marginBottom: '12px' }}>
              COSTOS OPERATIVOS (INTERNOS)
            </div>
            <div className="liquid-text" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px', fontWeight: '500' }}>
              <span>Costo Combustible Físico ({distanciaLogisticaKm}km {modoCarga === 'RETORNO' ? 'Solo Ida (Referencia)' : 'Viaje Redondo'} / {rendimientoCamion}km/L)</span>
              <span>{modoCarga === 'RETORNO' ? '$0 (-$' + costoCombustibleCalculado.toLocaleString() + ' Financiado por Ida)' : '-$' + costoCombustibleCalculado.toLocaleString()}</span>
            </div>
            <div className="liquid-text" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px', fontWeight: '500' }}>
              <span>TAC + Pago Conductor</span>
              <span>-${costosOperativosTerceros.toLocaleString()}</span>
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
