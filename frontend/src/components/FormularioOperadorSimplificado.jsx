import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { apiFetch } from '../lib/apiClient';

// Inicialización del cliente de Supabase
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || "";
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

// =============================================================================
// Reglas y Constantes del Ramo Universitario (SISTEMA-PAÑOL)
// =============================================================================
const CAPACIDAD_MAXIMA_CUADRADOS = 6;

const SIZES_CONFIG = {
  S: { label: "Tamaño S (1/4 bloque)", cuadrados: 0.25, ranuras: 1, color: "#10b981", badge: "1/4 Bloque" },
  M: { label: "Tamaño M (1/2 bloque)", cuadrados: 0.50, ranuras: 2, color: "#0ea5e9", badge: "1/2 Bloque" },
  L: { label: "Tamaño L (3/4 bloque)", cuadrados: 0.75, ranuras: 3, color: "#f59e0b", badge: "3/4 Bloque" },
  XL: { label: "Tamaño XL (1 bloque)", cuadrados: 1.00, ranuras: 4, color: "#8b5cf6", badge: "1 Bloque" },
  MAXIMO: { label: "Tamaño MÁXIMO (Uso Exclusivo: 5-6 bloques)", cuadrados: 5.00, ranuras: 20, color: "#ec4899", badge: "5 o 6 Bloques" }
};

// Matriz de Tarifas Académicas Simplificadas (CLP Fijo por Tramo según tamaño)
const OBTENER_TARIFA_POR_TRAMO = (categoria, km) => {
  let tramo = 1;
  if (km <= 50) tramo = 1;
  else if (km <= 150) tramo = 2;
  else if (km <= 300) tramo = 3;
  else if (km <= 500) tramo = 4;
  else if (km <= 1000) tramo = 5;
  else tramo = 6;

  const matriz = {
    // Tramo 1 (0-50 Km)
    1: { S: 1500, M: 2500, L: 4500, XL: 7000, MAXIMO: 12000 },
    // Tramo 2 (51-150 Km)
    2: { S: 3000, M: 5000, L: 9000, XL: 14000, MAXIMO: 24000 },
    // Tramo 3 (151-300 Km)
    3: { S: 4500, M: 7500, L: 13500, XL: 21000, MAXIMO: 36000 },
    // Tramo 4 (301-500 Km)
    4: { S: 6000, M: 10000, L: 18000, XL: 28000, MAXIMO: 480000 },
    // Tramo 5 (501-1000 Km)
    5: { S: 8000, M: 13000, L: 24000, XL: 38000, MAXIMO: 750000 },
    // Tramo 6 (>1000 Km)
    6: { S: 10000, M: 16000, L: 30000, XL: 48000, MAXIMO: 1200000 }
  };

  return matriz[tramo][categoria] || 2000;
};

export default function FormularioOperadorSimplificado() {
  // 1) Estados de Clientes y Configuración Global
  const [clientes, setClientes] = useState([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [clienteId, setClienteId] = useState("");

  const [precioDiesel, setPrecioDiesel] = useState(1450);
  const [rendimientoKm, setRendimientoKm] = useState(4.5);

  // 2) Estados de la Ruta
  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const [distanciaKm, setDistanciaKm] = useState(0);
  const [costoTac, setCostoTac] = useState(0);
  const [pagoConductor, setPagoConductor] = useState(0);

  // 3) Estado de Bultos
  const [bultos, setBultos] = useState([
    { id: "1", categoria: "S", cuadrados: 0.25, ranuras: 1 }
  ]);

  // 4) Switch de Negociación y Override Manual
  const [isTarifaManual, setIsTarifaManual] = useState(false);
  const [tarifaManualTotal, setTarifaManualTotal] = useState(0);

  // Estados Operacionales
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  // Cargar Clientes y Configuración al montar
  useEffect(() => {
    const initData = async () => {
      setLoadingClientes(true);
      try {
        const res = await apiFetch("/api/clientes");
        if (res.ok) {
          setClientes(Array.isArray(res.data) ? res.data : res.data?.data || []);
        }

        // 3. Obtener configuración de costos (Sistema de Configuración General)
        const { data: config } = await supabase
          .from("sistema_config")
          .select("precio_diesel_por_litro, rendimiento_promedio_km_l")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (config && config.precio_diesel_por_litro) {
          setPrecioDiesel(Number(config.precio_diesel_por_litro));
          setRendimientoKm(Number(config.rendimiento_promedio_km_l));
        }
      } catch (err) {
        console.error("Error cargando configuración inicial:", err);
      } finally {
        setLoadingClientes(false);
      }
    };
    initData();
  }, []);

  // 5) Cálculo Reactivo de Cuadrados Acumulados
  const totalCuadrados = bultos.reduce((acc, b) => acc + b.cuadrados, 0);
  const isCapacidadExcedida = totalCuadrados > CAPACIDAD_MAXIMA_CUADRADOS;

  // 6) Costo Combustible Calculado
  const costoCombustibleCalculado = distanciaKm > 0 && rendimientoKm > 0 
    ? Math.round((distanciaKm / rendimientoKm) * precioDiesel) 
    : 0;

  // 7) Tarifa Base de los Bultos
  const tarifaCalculadaBultos = bultos.reduce((total, b) => {
    return total + OBTENER_TARIFA_POR_TRAMO(b.categoria, distanciaKm);
  }, 0);

  const tarifaFinalBase = isTarifaManual ? tarifaManualTotal : tarifaCalculadaBultos;

  // Total Final a Pagar por el cliente (Ingreso Total)
  const totalAPagar = tarifaFinalBase;

  // Acciones sobre bultos
  const handleAddBulto = () => {
    setBultos([...bultos, { id: Math.random().toString(), categoria: "S", cuadrados: 0.25, ranuras: 1 }]);
  };

  const handleRemoveBulto = (id) => {
    if (bultos.length > 1) {
      setBultos(bultos.filter(b => b.id !== id));
    }
  };

  const handleChangeCategoriaBulto = (id, categoria) => {
    const config = SIZES_CONFIG[categoria];
    setBultos(bultos.map(b => b.id === id ? { 
      ...b, 
      categoria, 
      cuadrados: config.cuadrados, 
      ranuras: config.ranuras 
    } : b));
  };

  const handleChangeCuadradosBulto = (id, cuadrados) => {
    // Para MAXIMO, permite seleccionar entre 5 o 6 cuadrados
    const ranuras = cuadrados * 4;
    setBultos(bultos.map(b => b.id === id ? { ...b, cuadrados, ranuras } : b));
  };

  // Guardar en la base de datos Supabase
  const handleCrearRuta = async (e) => {
    e.preventDefault();
    if (isCapacidadExcedida) return;
    if (!clienteId) {
      setMensaje({ tipo: "error", texto: "Debes seleccionar un cliente." });
      return;
    }

    setSaving(true);
    setMensaje(null);

    try {
      // 1. Guardar la ruta en public.rutas
      const { data: ruta, error: rutaErr } = await supabase
        .from("rutas")
        .insert([{
          cliente_id: clienteId,
          origen,
          destino,
          distancia_km: distanciaKm,
          costo_tac_peajes_clp: costoTac,
          pago_conductor_base_clp: pagoConductor,
          tarifa_base_total: tarifaFinalBase,
          costo_combustible_calculado: costoCombustibleCalculado,
          total_pagar: totalAPagar,
          is_tarifa_manual: isTarifaManual,
          estado: 'PENDIENTE'
        }])
        .select("id")
        .single();

      if (rutaErr || !ruta) {
        throw new Error(rutaErr?.message || "No se pudo crear la ruta.");
      }

      // 2. Guardar los bultos asociados en public.bultos
      const bultosInserts = bultos.map(b => ({
        ruta_id: ruta.id,
        tamaño: b.categoria,
        cuadrados_equivalentes: b.cuadrados,
        tarifa_calculada_clp: OBTENER_TARIFA_POR_TRAMO(b.categoria, distanciaKm),
        alto_cm: 10.0,
        ancho_cm: 10.0,
        largo_cm: 10.0,
        peso_kg: 1.0,
        peso_real_kg: 1.0,
        categoria: b.categoria
      }));

      const { error: bultosErr } = await supabase
        .from("bultos")
        .insert(bultosInserts);

      if (bultosErr) {
        throw new Error(bultosErr.message);
      }

      // Insertar en historial de estados
      await supabase.from('historial_estados').insert([
        {
          ruta_id: ruta.id,
          estado: 'PENDIENTE',
          created_at: new Date().toISOString()
        }
      ]);

      setMensaje({ tipo: "ok", texto: "¡Ruta y bultos creados exitosamente en Supabase! Sincronizado en tiempo real en la App Móvil." });
      
      // Reset del formulario
      setOrigen("");
      setDestino("");
      setDistanciaKm(0);
      setCostoTac(0);
      setPagoConductor(0);
      setBultos([{ id: "1", categoria: "S", cuadrados: 0.25, ranuras: 1 }]);
      setIsTarifaManual(false);
      setTarifaManualTotal(0);
    } catch (err) {
      setMensaje({ tipo: "error", texto: err.message });
    } finally {
      setSaving(false);
    }
  };

  // Generar mapeo de ranuras para el dibujo del camión
  const obtenerRanurasPintadas = () => {
    const ranurasColors = [];
    bultos.forEach((b, index) => {
      const color = SIZES_CONFIG[b.categoria].color;
      const ranurasCount = b.ranuras;
      for (let i = 0; i < ranurasCount; i++) {
        ranurasColors.push({ color, bultoIdx: index + 1 });
      }
    });
    return ranurasColors;
  };

  const ranurasPintadas = obtenerRanurasPintadas();

  const obtenerColorProgreso = () => {
    if (totalCuadrados <= 3) return "#10b981"; // Emerald
    if (totalCuadrados <= 5) return "#f59e0b"; // Amber
    return "#ef4444"; // Red
  };

  return (
    <div style={styles.liquidglassContainer}>
      <h2 style={styles.title}>Panel de Control Carga (SISTEMA-PAÑOL)</h2>

      {mensaje && (
        <div style={mensaje.tipo === "ok" ? styles.successBanner : styles.errorBanner}>
          {mensaje.texto}
        </div>
      )}

      <form onSubmit={handleCrearRuta} style={styles.form}>
        {/* --- Configuración Global e Inputs Manuales de Tarifa --- */}
        <div style={styles.sectionTitle}>Variables Operativas & Costos</div>
        <div style={styles.formGrid}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Cliente *</label>
            <select
              required
              style={styles.select}
              value={clienteId}
              onChange={e => setClienteId(e.target.value)}
              disabled={loadingClientes}
            >
              <option value="">Seleccione un cliente B2B...</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.nombre || c.contacto_email || c.id}</option>
              ))}
            </select>
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Precio Diésel Actual (CLP/L) *</label>
            <input
              type="number"
              required
              style={styles.input}
              value={precioDiesel}
              onChange={e => setPrecioDiesel(Number(e.target.value))}
              placeholder="Ej: 1450"
            />
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Rendimiento Promedio (Km/L) *</label>
            <input
              type="number"
              step="0.1"
              required
              style={styles.input}
              value={rendimientoKm}
              onChange={e => setRendimientoKm(Number(e.target.value))}
              placeholder="Ej: 4.5"
            />
          </div>
        </div>

        {/* --- Sección de Ruta --- */}
        <div style={styles.sectionTitle}>Transporte & Ruta</div>
        <div style={styles.formGrid}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Origen *</label>
            <input
              type="text"
              required
              style={styles.input}
              value={origen}
              onChange={e => setOrigen(e.target.value)}
              placeholder="Ej: Santiago, Chile"
            />
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Destino *</label>
            <input
              type="text"
              required
              style={styles.input}
              value={destino}
              onChange={e => setDestino(e.target.value)}
              placeholder="Ej: Valparaíso, Chile"
            />
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Distancia (Km) *</label>
            <input
              type="number"
              required
              style={styles.input}
              value={distanciaKm || ""}
              onChange={e => setDistanciaKm(Number(e.target.value))}
              placeholder="Ej: 120"
            />
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Costo TAC/Peajes (CLP) *</label>
            <input
              type="number"
              required
              style={styles.input}
              value={costoTac || ""}
              onChange={e => setCostoTac(Number(e.target.value))}
              placeholder="Ej: 8500"
            />
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Pago Conductor Base (CLP) *</label>
            <input
              type="number"
              required
              style={styles.input}
              value={pagoConductor || ""}
              onChange={e => setPagoConductor(Number(e.target.value))}
              placeholder="Ej: 45000"
            />
          </div>
        </div>

        {/* --- Sección de Bultos Reactiva --- */}
        <div style={styles.sectionHeader}>
          <div style={styles.sectionTitle}>Bultos / Carga</div>
          <button type="button" onClick={handleAddBulto} style={styles.btnSecondary}>
            [+] Añadir Bulto
          </button>
        </div>

        <div style={styles.bultosList}>
          {bultos.map((b, idx) => (
            <div key={b.id} style={styles.bultoRow}>
              <span style={styles.bultoNumber}>#{idx + 1}</span>
              
              <div style={{ flex: 2, textAlign: "left" }}>
                <label style={styles.bultoLabel}>Tamaño Bulto</label>
                <select
                  style={styles.select}
                  value={b.categoria}
                  onChange={e => handleChangeCategoriaBulto(b.id, e.target.value)}
                >
                  {Object.entries(SIZES_CONFIG).map(([k, val]) => (
                    <option key={k} value={k}>{val.label}</option>
                  ))}
                </select>
              </div>

              {b.categoria === "MAXIMO" && (
                <div style={{ flex: 1, textAlign: "left" }}>
                  <label style={styles.bultoLabel}>Bloques (5 o 6)</label>
                  <select
                    style={styles.select}
                    value={b.cuadrados}
                    onChange={e => handleChangeCuadradosBulto(b.id, Number(e.target.value))}
                  >
                    <option value={5.00}>5 bloques (Exclusivo)</option>
                    <option value={6.00}>6 bloques (Exclusivo)</option>
                  </select>
                </div>
              )}

              <div style={styles.badgeWrapper}>
                <span style={{ ...styles.cuadradosBadge, color: SIZES_CONFIG[b.categoria].color, borderColor: SIZES_CONFIG[b.categoria].color + "55" }}>
                  {SIZES_CONFIG[b.categoria].badge}
                </span>
                <span style={styles.precioBadge}>
                  ${OBTENER_TARIFA_POR_TRAMO(b.categoria, distanciaKm).toLocaleString()} CLP
                </span>
              </div>

              {bultos.length > 1 && (
                <button type="button" onClick={() => handleRemoveBulto(b.id)} style={styles.btnRemove}>
                  ×
                </button>
              )}
            </div>
          ))}
        </div>

        {/* --- DIBUJO INTERACTIVO DEL CAMIÓN (UX PREMIUM) --- */}
        <div style={styles.truckSection}>
          <div style={styles.truckHeader}>
            <span>Visualización del Camión (Grilla de 6 Bloques):</span>
            <strong style={{ color: obtenerColorProgreso() }}>
              {totalCuadrados.toFixed(2)} / 6.00 Bloques Ocupados ({((totalCuadrados / 6) * 100).toFixed(1)}%)
            </strong>
          </div>

          <div style={styles.truckWrapper}>
            {/* Cabina del Camión */}
            <div style={styles.truckCabin}>
              <div style={styles.cabinWindow}></div>
              <span style={styles.cabinText}>LOGI</span>
            </div>

            {/* Container del Camión (6 Bloques) */}
            <div style={styles.truckContainerGrid}>
              {[0, 1, 2, 3, 4, 5].map((blockIdx) => (
                <div key={blockIdx} style={styles.truckBlock}>
                  <span style={styles.blockLabel}>B{blockIdx + 1}</span>
                  {/* Cada bloque tiene 4 ranuras internas (2x2) */}
                  {[0, 1, 2, 3].map((slotSubIdx) => {
                    const slotGlobalIdx = (blockIdx * 4) + slotSubIdx;
                    const cellData = ranurasPintadas[slotGlobalIdx];
                    
                    return (
                      <div
                        key={slotSubIdx}
                        style={{
                          ...styles.truckSlot,
                          background: cellData ? cellData.color : 'rgba(255, 255, 255, 0.05)',
                          border: cellData ? `1px solid ${cellData.color}` : '1px solid rgba(255, 255, 255, 0.1)',
                          boxShadow: cellData ? `0 0 6px ${cellData.color}88` : 'none',
                        }}
                        title={cellData ? `Bulto #${cellData.bultoIdx}` : 'Ranura Vacía'}
                      >
                        {cellData && (
                          <span style={styles.slotLabel}>#{cellData.bultoIdx}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* --- Override Manual de Tarifa (Negociación) --- */}
        <div style={styles.negociacionCard}>
          <label style={styles.switchRow}>
            <div style={styles.switchTextContainer}>
              <div style={styles.negTitle}>Activar Tarifa Manual (Negociación)</div>
              <div style={styles.negSub}>Congela el cálculo automático y aplica un precio de bultos personalizado.</div>
            </div>
            <input
              type="checkbox"
              style={styles.checkbox}
              checked={isTarifaManual}
              onChange={e => setIsTarifaManual(e.target.checked)}
            />
          </label>
          {isTarifaManual && (
            <div style={{ marginTop: 14 }}>
              <input
                type="number"
                required
                style={styles.overrideInput}
                value={tarifaManualTotal || ""}
                onChange={e => setTarifaManualTotal(Number(e.target.value))}
                placeholder="Ingresa la tarifa base acordada (CLP)"
              />
            </div>
          )}
        </div>

        {/* --- Resumen de Costos y Enviar --- */}
        <div style={styles.resumenCard}>
          <div style={styles.resumenTitle}>Desglose del Viaje</div>
          <div style={styles.resumenGrid}>
            <div style={styles.resumenRow}>
              <span>Tarifa Base Carga:</span>
              <strong>${tarifaFinalBase.toLocaleString()} CLP</strong>
            </div>
            <div style={styles.resumenRow}>
              <span>Costo Combustible:</span>
              <span>${costoCombustibleCalculado.toLocaleString()} CLP</span>
            </div>
            <div style={styles.resumenRow}>
              <span>Costo TAC/Peajes:</span>
              <span>${costoTac.toLocaleString()} CLP</span>
            </div>
            <div style={styles.resumenRow}>
              <span>Pago al Conductor:</span>
              <span>${pagoConductor.toLocaleString()} CLP</span>
            </div>
            <div style={{ ...styles.resumenRow, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 10, marginTop: 5 }}>
              <span style={{ fontSize: 15, color: '#38bdf8' }}>Total a Cobrar:</span>
              <strong style={{ fontSize: 18, color: '#38bdf8' }}>${totalAPagar.toLocaleString()} CLP</strong>
            </div>
          </div>
        </div>

        <div style={styles.footerRow}>
          <div></div>
          <button
            type="submit"
            disabled={isCapacidadExcedida || saving}
            style={isCapacidadExcedida ? styles.btnSubmitDisabled : styles.btnSubmit}
          >
            {saving ? 'Creando pedido...' : 'Crear Ruta & Pedido'}
          </button>
        </div>

        {isCapacidadExcedida && (
          <div style={styles.errorAlert}>
            ⚠️ Capacidad del camión excedida (Máximo 6 cuadrados)
          </div>
        )}
      </form>
    </div>
  );
}

// Estilos de Vidriomorfismo (Liquidglass)
const styles = {
  liquidglassContainer: {
    padding: '24px',
    borderRadius: '16px',
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.25)',
    maxWidth: '850px',
    margin: '30px auto',
    color: '#f8fafc',
    fontFamily: '"Outfit", "Inter", sans-serif'
  },
  title: {
    fontSize: '22px',
    fontWeight: 600,
    background: 'linear-gradient(135deg, #38bdf8 0%, #a855f7 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '20px',
    textAlign: 'left'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  sectionTitle: {
    fontSize: '14px',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    fontWeight: 600,
    textAlign: 'left',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    paddingBottom: '6px'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '14px'
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    textAlign: 'left'
  },
  label: {
    fontSize: '13px',
    color: '#cbd5e1'
  },
  input: {
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    background: 'rgba(15, 23, 42, 0.4)',
    color: '#fff',
    fontSize: '14px',
    outline: 'none'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  btnSecondary: {
    padding: '6px 12px',
    background: 'rgba(56, 189, 248, 0.15)',
    color: '#38bdf8',
    border: '1px solid #38bdf8',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 500
  },
  bultosList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  bultoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 14px',
    borderRadius: '8px',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.05)'
  },
  bultoNumber: {
    fontWeight: 600,
    color: '#64748b'
  },
  bultoLabel: {
    fontSize: '11px',
    color: '#94a3b8',
    display: 'block',
    marginBottom: '4px'
  },
  select: {
    width: '100%',
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(15, 23, 42, 0.5)',
    color: '#fff',
    outline: 'none',
    fontSize: '13px'
  },
  badgeWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  cuadradosBadge: {
    padding: '6px 10px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600
  },
  precioBadge: {
    padding: '6px 10px',
    background: 'rgba(15,23,42,0.6)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#f8fafc'
  },
  btnRemove: {
    background: 'none',
    border: 'none',
    color: '#ef4444',
    fontSize: '22px',
    cursor: 'pointer'
  },
  truckSection: {
    padding: '16px',
    background: 'rgba(15, 23, 42, 0.2)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.05)',
    textAlign: 'left'
  },
  truckHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    marginBottom: '14px'
  },
  truckWrapper: {
    display: 'flex',
    alignItems: 'stretch',
    gap: '12px',
    background: 'rgba(15, 23, 42, 0.4)',
    padding: '12px',
    borderRadius: '10px',
    border: '1px solid rgba(255, 255, 255, 0.08)'
  },
  truckCabin: {
    width: '75px',
    minHeight: '120px',
    background: 'linear-gradient(135deg, #1e293b, #334155)',
    border: '2px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '12px 4px 4px 12px',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },
  cabinWindow: {
    width: '45px',
    height: '40px',
    background: 'linear-gradient(180deg, #38bdf8, #0284c7)',
    borderRadius: '6px 2px 2px 2px',
    boxShadow: '0 0 10px rgba(56, 189, 248, 0.5)'
  },
  cabinText: {
    fontSize: '12px',
    fontWeight: 800,
    color: '#94a3b8',
    letterSpacing: '1px'
  },
  truckContainerGrid: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: '8px'
  },
  truckBlock: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px dashed rgba(255, 255, 255, 0.15)',
    borderRadius: '8px',
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gridTemplateRows: 'repeat(2, 1fr)',
    gap: '4px',
    padding: '6px',
    position: 'relative'
  },
  blockLabel: {
    position: 'absolute',
    top: '-8px',
    left: '6px',
    fontSize: '8px',
    color: '#64748b',
    background: '#0a0e1a',
    padding: '0 4px',
    borderRadius: '4px',
    fontWeight: 'bold'
  },
  truckSlot: {
    aspectRatio: '1',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease'
  },
  slotLabel: {
    fontSize: '8px',
    fontWeight: 800,
    color: '#000',
    textShadow: '0 1px 1px rgba(255,255,255,0.8)'
  },
  negociacionCard: {
    padding: '14px',
    background: 'rgba(15, 23, 42, 0.25)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '10px'
  },
  switchRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer'
  },
  switchTextContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '2px'
  },
  negTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#cbd5e1'
  },
  negSub: {
    fontSize: '11px',
    color: '#64748b'
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer'
  },
  overrideInput: {
    width: '100%',
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid #fbbf24',
    background: 'rgba(251,191,36,0.05)',
    color: '#fbbf24',
    fontWeight: 'bold',
    outline: 'none',
    boxSizing: 'border-box'
  },
  resumenCard: {
    padding: '16px',
    background: 'rgba(15, 23, 42, 0.35)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    textAlign: 'left'
  },
  resumenTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#94a3b8',
    marginBottom: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  resumenGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  resumenRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    color: '#cbd5e1'
  },
  footerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  btnSubmit: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #0284c7 0%, #7c3aed 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)'
  },
  btnSubmitDisabled: {
    padding: '12px 24px',
    background: 'rgba(255,255,255,0.03)',
    color: '#64748b',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '8px',
    cursor: 'not-allowed'
  },
  errorAlert: {
    padding: '10px 14px',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid #ef4444',
    color: '#f87171',
    borderRadius: '8px',
    fontSize: '13px',
    textAlign: 'left'
  },
  successBanner: {
    padding: '10px 14px',
    background: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid #10b981',
    color: '#34d399',
    borderRadius: '8px',
    fontSize: '13px',
    textAlign: 'left'
  },
  errorBanner: {
    padding: '10px 14px',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid #ef4444',
    color: '#f87171',
    borderRadius: '8px',
    fontSize: '13px',
    textAlign: 'left'
  }
};
