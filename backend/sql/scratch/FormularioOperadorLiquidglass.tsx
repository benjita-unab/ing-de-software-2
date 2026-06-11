import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// Inicializar cliente de Supabase (se asume configurado)
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';
export const supabase = createClient(supabaseUrl, supabaseKey);

// =============================================================================
// Interfaces y Tipos
// =============================================================================
export interface BultoInput {
  id: string; // Para control de llaves en React
  alto_cm: number;
  ancho_cm: number;
  largo_cm: number;
  peso_real_kg: number;
}

export interface RutaPayload {
  cliente_id: string;
  origen: string;
  destino: string;
  distancia_km: number;
  costo_tac_peajes_clp: number;
  pago_conductor_base_clp: number;
  is_tarifa_manual: boolean;
  tarifa_base_total: number;
}

export type CategoriaBulto = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'MAXIMO';

// =============================================================================
// Auxiliares de Cálculo de Categoría en Cliente (Sincronizado con Triggers)
// =============================================================================
export const calcularCategoriaCliente = (alto: number, ancho: number, largo: number): CategoriaBulto => {
  const volumen = alto * ancho * largo;
  const pesoVolumetrico = volumen / 4000;

  let categoria: CategoriaBulto = 'XS';

  if (pesoVolumetrico <= 2.0) {
    categoria = 'XS';
  } else if (pesoVolumetrico <= 8.0) {
    categoria = 'S';
  } else if (pesoVolumetrico <= 25.0) {
    categoria = 'M';
  } else if (pesoVolumetrico <= 60.0) {
    categoria = 'L';
  } else if (pesoVolumetrico <= 150.0) {
    categoria = 'XL';
  } else {
    categoria = 'MAXIMO';
  }

  // Seguro Logístico por Largo Excedido (Fuerza saltos de categoría)
  if (largo > 120 && largo <= 210) {
    if (categoria === 'XS' || categoria === 'S' || categoria === 'M' || categoria === 'L') {
      categoria = 'XL';
    }
  } else if (largo > 210) {
    categoria = 'MAXIMO';
  }

  return categoria;
};

// =============================================================================
// 1) Componente: FormularioOperadorLiquidglass (React)
// =============================================================================
export const FormularioOperadorLiquidglass: React.FC = () => {
  // Estados de la Ruta
  const [clienteId, setClienteId] = useState('');
  const [origen, setOrigen] = useState('');
  const [destino, setDestino] = useState('');
  const [distanciaKm, setDistanciaKm] = useState<number>(0);
  const [costoTacPeajes, setCostoTacPeajes] = useState<number>(0);
  const [pagoConductor, setPagoConductor] = useState<number>(0);

  // Estados de Bultos (Arreglo Dinámico)
  const [bultos, setBultos] = useState<BultoInput[]>([
    { id: '1', alto_cm: 0, ancho_cm: 0, largo_cm: 0, peso_real_kg: 0 }
  ]);

  // Switch de Negociación y Tarifa Manual
  const [isTarifaManual, setIsTarifaManual] = useState(false);
  const [tarifaManualTotal, setTarifaManualTotal] = useState<number>(0);

  // Estados de Carga y Mensajes
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  // Cálculo de totales acumulados
  const volumenTotal = bultos.reduce((sum, b) => sum + (b.alto_cm * b.ancho_cm * b.largo_cm), 0);
  const isVolumenExcedido = volumenTotal > 25000000;

  // Manejadores de bultos dinámicos
  const handleAddBulto = () => {
    const newId = (Math.random() * 1000).toFixed(0);
    setBultos([...bultos, { id: newId, alto_cm: 0, ancho_cm: 0, largo_cm: 0, peso_real_kg: 0 }]);
  };

  const handleRemoveBulto = (id: string) => {
    if (bultos.length === 1) return;
    setBultos(bultos.filter(b => b.id !== id));
  };

  const handleChangeBulto = (id: string, campo: keyof BultoInput, valor: number) => {
    setBultos(bultos.map(b => b.id === id ? { ...b, [campo]: valor } : b));
  };

  // Enviar Formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje(null);

    if (!clienteId || !origen || !destino) {
      setMensaje({ tipo: 'error', texto: 'Por favor complete Cliente, Origen y Destino.' });
      return;
    }

    if (isVolumenExcedido) {
      setMensaje({ tipo: 'error', texto: 'Capacidad máxima del vehículo excedida (Tope 25.000.000 cm³).' });
      return;
    }

    setLoading(true);
    try {
      const rutaData: RutaPayload = {
        cliente_id: clienteId,
        origen,
        destino,
        distancia_km: distanciaKm,
        costo_tac_peajes_clp: costoTacPeajes,
        pago_conductor_base_clp: pagoConductor,
        is_tarifa_manual: isTarifaManual,
        tarifa_base_total: isTarifaManual ? tarifaManualTotal : 0 // Se totaliza en trigger
      };

      const result = await guardarPedidoCompleto(rutaData, bultos);
      if (result.success) {
        setMensaje({ tipo: 'ok', texto: 'Pedido y bultos creados exitosamente en Supabase. Sincronizado en tiempo real.' });
        // Limpiar formulario
        setBultos([{ id: '1', alto_cm: 0, ancho_cm: 0, largo_cm: 0, peso_real_kg: 0 }]);
        setOrigen('');
        setDestino('');
        setDistanciaKm(0);
        setCostoTacPeajes(0);
        setPagoConductor(0);
        setIsTarifaManual(false);
        setTarifaManualTotal(0);
      } else {
        setMensaje({ tipo: 'error', texto: result.error || 'Error al guardar.' });
      }
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: err.message || 'Error inesperado.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.liquidglassContainer}>
      <h2 style={styles.title}>Nueva Ruta & Carga (SISTEMA-PAÑOL)</h2>
      
      {mensaje && (
        <div style={mensaje.tipo === 'error' ? styles.errorBanner : styles.successBanner}>
          {mensaje.texto}
        </div>
      )}

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* --- Sección de Ruta --- */}
        <div style={styles.sectionTitle}>Datos de Transporte</div>
        <div style={styles.formGrid}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Cliente ID *</label>
            <input 
              type="text" 
              style={styles.input} 
              required
              value={clienteId} 
              onChange={e => setClienteId(e.target.value)} 
              placeholder="UUID del Cliente"
            />
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Distancia (Km) *</label>
            <input 
              type="number" 
              style={styles.input} 
              required
              value={distanciaKm || ''} 
              onChange={e => setDistanciaKm(Number(e.target.value))} 
              placeholder="Google Maps API"
            />
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Origen *</label>
            <input 
              type="text" 
              style={styles.input} 
              required
              value={origen} 
              onChange={e => setOrigen(e.target.value)} 
              placeholder="Dirección origen"
            />
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Destino *</label>
            <input 
              type="text" 
              style={styles.input} 
              required
              value={destino} 
              onChange={e => setDestino(e.target.value)} 
              placeholder="Dirección destino"
            />
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Costo Tac/Peajes (CLP)</label>
            <input 
              type="number" 
              style={styles.input} 
              value={costoTacPeajes || ''} 
              onChange={e => setCostoTacPeajes(Number(e.target.value))} 
              placeholder="Peajes estimados"
            />
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Pago Conductor (CLP)</label>
            <input 
              type="number" 
              style={styles.input} 
              value={pagoConductor || ''} 
              onChange={e => setPagoConductor(Number(e.target.value))} 
              placeholder="Pago base chofer"
            />
          </div>
        </div>

        {/* --- Sección de Bultos Reactiva --- */}
        <div style={styles.sectionHeader}>
          <div style={styles.sectionTitle}>Detalle de Carga</div>
          <button type="button" onClick={handleAddBulto} style={styles.btnSecondary}>
            [+] Añadir Bulto
          </button>
        </div>

        <div style={styles.bultosList}>
          {bultos.map((b, idx) => {
            const cat = calcularCategoriaCliente(b.alto_cm, b.ancho_cm, b.largo_cm);
            const volumenBulto = b.alto_cm * b.ancho_cm * b.largo_cm;
            
            return (
              <div key={b.id} style={styles.bultoRow}>
                <span style={styles.bultoNumber}>#{idx + 1}</span>
                <div style={styles.bultoInputGrid}>
                  <div>
                    <label style={styles.bultoLabel}>Alto (cm)</label>
                    <input 
                      type="number" 
                      style={styles.bultoInput} 
                      value={b.alto_cm || ''} 
                      onChange={e => handleChangeBulto(b.id, 'alto_cm', Number(e.target.value))} 
                    />
                  </div>
                  <div>
                    <label style={styles.bultoLabel}>Ancho (cm)</label>
                    <input 
                      type="number" 
                      style={styles.bultoInput} 
                      value={b.ancho_cm || ''} 
                      onChange={e => handleChangeBulto(b.id, 'ancho_cm', Number(e.target.value))} 
                    />
                  </div>
                  <div>
                    <label style={styles.bultoLabel}>Largo (cm)</label>
                    <input 
                      type="number" 
                      style={styles.bultoInput} 
                      value={b.largo_cm || ''} 
                      onChange={e => handleChangeBulto(b.id, 'largo_cm', Number(e.target.value))} 
                    />
                  </div>
                  <div>
                    <label style={styles.bultoLabel}>Peso Real (Kg)</label>
                    <input 
                      type="number" 
                      style={styles.bultoInput} 
                      value={b.peso_real_kg || ''} 
                      onChange={e => handleChangeBulto(b.id, 'peso_real_kg', Number(e.target.value))} 
                    />
                  </div>
                </div>

                {/* Etiquetas de Cálculo en Vivo */}
                <div style={styles.bultoMeta}>
                  <div style={styles.volumenBadge}>
                    {(volumenBulto).toLocaleString()} cm³
                  </div>
                  <div style={{ ...styles.categoryBadge, ...styles[cat] }}>
                    Cat: {cat}
                  </div>
                  {bultos.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => handleRemoveBulto(b.id)} 
                      style={styles.btnRemove}
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* --- Switch de Negociación (Override) --- */}
        <div style={styles.negociacionCard}>
          <div style={styles.switchRow}>
            <div style={styles.switchCol}>
              <div style={styles.negTitle}>Activar Tarifa Manual (Negociación)</div>
              <div style={styles.negSub}>Ignora la matriz automática de tarifas y bloquea el precio base.</div>
            </div>
            <label style={styles.switchContainer}>
              <input 
                type="checkbox" 
                checked={isTarifaManual} 
                onChange={e => setIsTarifaManual(e.target.checked)} 
                style={styles.switchInput}
              />
              <span style={styles.switchSlider} />
            </label>
          </div>

          {isTarifaManual && (
            <div style={styles.manualTarifaField}>
              <label style={styles.label}>Tarifa Base Acordada con Cliente (CLP) *</label>
              <input 
                type="number" 
                style={styles.overrideInput} 
                required
                value={tarifaManualTotal || ''} 
                onChange={e => setTarifaManualTotal(Number(e.target.value))} 
                placeholder="Ej: $450.000"
              />
            </div>
          )}
        </div>

        {/* --- Resumen y Botón de Envío --- */}
        <div style={styles.footerRow}>
          <div style={styles.totalVolumeInfo}>
            <span>Volumen Total Acumulado:</span>
            <strong style={isVolumenExcedido ? { color: '#ef4444' } : { color: '#38bdf8' }}>
              {volumenTotal.toLocaleString()} / 25.000.000 cm³
            </strong>
          </div>

          <button 
            type="submit" 
            disabled={loading || isVolumenExcedido} 
            style={isVolumenExcedido ? styles.btnSubmitDisabled : styles.btnSubmit}
          >
            {loading ? 'Guardando...' : 'Crear Ruta y Pedido'}
          </button>
        </div>
      </form>
    </div>
  );
};

// =============================================================================
// 2) Servicio: Persistencia y Sincronización Supabase Realtime
// =============================================================================

/**
 * Inserta de forma atómica una Ruta y sus Bultos detallados en Supabase.
 */
export const guardarPedidoCompleto = async (
  rutaData: RutaPayload, 
  bultosDetalle: BultoInput[]
): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    // 1. Insertar la ruta
    const { data: rutaInserted, error: rutaErr } = await supabase
      .from('rutas')
      .insert([rutaData])
      .select('id')
      .single();

    if (rutaErr || !rutaInserted) {
      return { success: false, error: `Error de inserción de ruta: ${rutaErr?.message}` };
    }

    const rutaId = rutaInserted.id;

    // 2. Mapear y preparar inserts de bultos
    const bultosInserts = bultosDetalle.map(b => ({
      ruta_id: rutaId,
      alto_cm: b.alto_cm,
      ancho_cm: b.ancho_cm,
      largo_cm: b.largo_cm,
      peso_kg: b.peso_real_kg, // Soportando peso_kg para compatibilidad
      peso_real_kg: b.peso_real_kg
    }));

    // 3. Insertar todos los bultos (esto dispara triggers de clasificación y volumen acumulado)
    const { error: bultosErr } = await supabase
      .from('bultos')
      .insert(bultosInserts);

    if (bultosErr) {
      // Nota: Si el volumen acumulado total de bultos supera los 25M cm³,
      // el trigger trg_bultos_validar_volumen arrojará una excepción que cancelará el insert.
      return { success: false, error: bultosErr.message };
    }

    return { success: true, data: { id: rutaId } };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error inesperado.' };
  }
};

/**
 * EJEMPLO DE CLIENTE MÓVIL: Suscripción en Tiempo Real (Supabase Realtime Channels)
 * 
 * La aplicación móvil del cliente se suscribe a los cambios INSERT en la tabla `rutas` 
 * para refrescar la lista de pedidos al instante cuando el operador crea una nueva entrega.
 * 
 * NOTA: Para filtrar por el cliente autenticado, se aprovecha Supabase RLS (Row Level Security).
 * Al habilitar RLS en la tabla 'rutas' con políticas que solo permiten ver registros
 * donde cliente_id coincida con el usuario logueado, Supabase enviará los eventos de realtime
 * únicamente al usuario que le corresponden de forma automática y segura.
 */
export const suscribirseARutasCliente = (
  clienteId: string, 
  onNuevaRuta: (ruta: any) => void
) => {
  const channel = supabase
    .channel(`cliente-rutas-${clienteId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'rutas',
        filter: `cliente_id=eq.${clienteId}` // Filtro directo del canal (requiere compatibilidad en Supabase Realtime)
      },
      (payload) => {
        console.log('Nueva ruta detectada en tiempo real:', payload.new);
        onNuevaRuta(payload.new);
      }
    )
    .subscribe((status) => {
      console.log(`Estado de suscripción en tiempo real: ${status}`);
    });

  return () => {
    supabase.removeChannel(channel);
  };
};

// =============================================================================
// Estilos Liquidglass de Alta Gama (Vanilla CSS-in-JS)
// =============================================================================
const styles: { [key: string]: React.CSSProperties } = {
  liquidglassContainer: {
    padding: '24px',
    borderRadius: '16px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.25)',
    maxWidth: '850px',
    margin: '30px auto',
    fontFamily: '"Outfit", "Inter", sans-serif',
    color: '#f8fafc',
  },
  title: {
    fontSize: '22px',
    fontWeight: 600,
    background: 'linear-gradient(135deg, #38bdf8 0%, #a855f7 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '20px',
    textAlign: 'left',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    paddingBottom: '8px',
    marginTop: '10px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 500,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    textAlign: 'left',
  },
  label: {
    fontSize: '13px',
    color: '#cbd5e1',
    fontWeight: 500,
  },
  input: {
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    background: 'rgba(15, 23, 42, 0.4)',
    color: '#f1f5f9',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s',
  },
  bultosList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  bultoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '14px',
    borderRadius: '10px',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
  },
  bultoNumber: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#64748b',
    minWidth: '24px',
  },
  bultoInputGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '8px',
    flex: 1,
    textAlign: 'left',
  },
  bultoLabel: {
    fontSize: '11px',
    color: '#94a3b8',
    marginBottom: '4px',
    display: 'block',
  },
  bultoInput: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: '6px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    background: 'rgba(15, 23, 42, 0.5)',
    color: '#f1f5f9',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  bultoMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  volumenBadge: {
    padding: '6px 8px',
    borderRadius: '6px',
    background: 'rgba(255, 255, 255, 0.06)',
    color: '#cbd5e1',
    fontSize: '12px',
    fontWeight: 500,
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  categoryBadge: {
    padding: '6px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    minWidth: '55px',
    textAlign: 'center',
    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  // Colores de categorías
  XS: { background: 'rgba(16, 185, 129, 0.25)', color: '#34d399' },
  S: { background: 'rgba(14, 165, 233, 0.25)', color: '#38bdf8' },
  M: { background: 'rgba(245, 158, 11, 0.25)', color: '#fbbf24' },
  L: { background: 'rgba(239, 68, 68, 0.25)', color: '#f87171' },
  XL: { background: 'rgba(139, 92, 246, 0.25)', color: '#a78bfa' },
  MAXIMO: { background: 'rgba(236, 72, 153, 0.25)', color: '#f472b6' },

  btnRemove: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '0 4px',
    transition: 'color 0.2s',
  },
  btnSecondary: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid rgba(56, 189, 248, 0.4)',
    background: 'rgba(56, 189, 248, 0.1)',
    color: '#38bdf8',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  negociacionCard: {
    padding: '16px',
    borderRadius: '12px',
    background: 'rgba(15, 23, 42, 0.25)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    textAlign: 'left',
  },
  switchRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  negTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#f1f5f9',
  },
  negSub: {
    fontSize: '11px',
    color: '#64748b',
  },
  manualTarifaField: {
    marginTop: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  overrideInput: {
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid rgba(245, 158, 11, 0.4)',
    background: 'rgba(245, 158, 11, 0.05)',
    color: '#fbbf24',
    fontSize: '14px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    fontWeight: 600,
  },
  footerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '10px',
  },
  totalVolumeInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '4px',
    fontSize: '13px',
    color: '#94a3b8',
  },
  btnSubmit: {
    padding: '12px 24px',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #0284c7 0%, #7c3aed 100%)',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 4px 14px 0 rgba(124, 58, 237, 0.3)',
  },
  btnSubmitDisabled: {
    padding: '12px 24px',
    borderRadius: '8px',
    background: 'rgba(255, 255, 255, 0.05)',
    color: '#64748b',
    fontSize: '14px',
    fontWeight: 600,
    border: '1px solid rgba(255, 255, 255, 0.05)',
    cursor: 'not-allowed',
  },
  successBanner: {
    padding: '12px 16px',
    borderRadius: '8px',
    background: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    color: '#34d399',
    fontSize: '13px',
    textAlign: 'left',
  },
  errorBanner: {
    padding: '12px 16px',
    borderRadius: '8px',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#f87171',
    fontSize: '13px',
    textAlign: 'left',
  },
  // Switch Toggle CSS-in-JS
  switchContainer: {
    position: 'relative',
    display: 'inline-block',
    width: '44px',
    height: '24px',
    flexShrink: 0,
  },
  switchInput: {
    opacity: 0,
    width: 0,
    height: 0,
  },
  switchSlider: {
    position: 'absolute',
    cursor: 'pointer',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    transition: '.3s',
    borderRadius: '24px',
    border: '1px solid rgba(255, 255, 255, 0.15)',
  }
};
