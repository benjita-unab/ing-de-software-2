import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { apiFetch } from '../lib/apiClient';
import '../LiquidGlass.css';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || "";
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export default function GestionRutas() {
  const [rutas, setRutas] = useState([]);
  const [conductores, setConductores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: rutasData, error: rErr } = await supabase
        .from('rutas')
        .select(`
          id, origen, destino, distancia_km, total_pagar, estado, fecha_estimada_entrega,
          clientes (nombre),
          camion_id,
          camiones (patente)
        `)
        .eq('estado', 'PENDIENTE')
        .order('created_at', { ascending: false });
      
      if (rErr) throw rErr;
      setRutas(rutasData || []);

      const resCond = await apiFetch('/api/conductores');
      if (resCond.ok) {
        setConductores(Array.isArray(resCond.data) ? resCond.data : resCond.data?.data || []);
      }
    } catch (err) {
      console.error(err);
      setMensaje({ tipo: 'error', texto: 'Error cargando datos: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (rutaId) => {
    if (window.confirm("¿Deseas eliminar esta ruta?")) {
      if (window.confirm("¿Estás ABSOLUTAMENTE SEGURO de eliminar esta ruta? Esta acción no se puede deshacer.")) {
        setLoading(true);
        try {
          // Delete children first to satisfy foreign key constraints
          await supabase.from('historial_estados').delete().eq('ruta_id', rutaId);
          await supabase.from('bultos').delete().eq('ruta_id', rutaId);
          
          // Delete the route
          const { error } = await supabase.from('rutas').delete().eq('id', rutaId);
          if (error) throw error;
          setMensaje({ tipo: 'ok', texto: 'Ruta eliminada correctamente.' });
          fetchData();
        } catch (err) {
          console.error(err);
          setMensaje({ tipo: 'error', texto: 'Error al eliminar ruta: ' + err.message });
        } finally {
          setLoading(false);
        }
      }
    }
  };

  useEffect(() => {
    fetchData();

    const channel = supabase.channel('rutas_pendientes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rutas' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAssign = async (rutaId, conductorId) => {
    if (!conductorId) return;
    setMensaje(null);
    try {
      // Find the conductor to get their linked truck
      const conductor = conductores.find(c => (c.user_id || c.id) === conductorId);
      
      const updatePayload = { 
        conductor_id: conductorId, 
        estado: 'ASIGNADO'
      };

      // Si el chofer tiene un camión enlazado, se lo asignamos automáticamente a la ruta
      if (conductor && conductor.camion_id) {
        updatePayload.camion_id = conductor.camion_id;
      }

      const { error } = await supabase
        .from('rutas')
        .update(updatePayload)
        .eq('id', rutaId);

      if (error) throw error;
      
      await supabase.from('historial_estados').insert([
        { ruta_id: rutaId, estado: 'ASIGNADO', created_at: new Date().toISOString() }
      ]);

      setMensaje({ tipo: 'ok', texto: `Ruta asignada exitosamente. Evento enviado a la App Móvil.` });
      fetchData(); 
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message });
    }
  };

  return (
    <div className="liquid-container" style={{minHeight: '100%'}}>
      <h2 className="liquid-title" style={{fontSize: '28px', fontWeight: 900, marginBottom: '8px'}}>Gestión de Rutas (Administración)</h2>
      <p className="liquid-text" style={{marginBottom:'20px', fontWeight:'500'}}>Asigna conductores disponibles a las rutas pendientes para despacharlas y notificar a la app móvil.</p>

      {mensaje && (
        <div style={{padding: '12px', background: mensaje.tipo === "ok" ? '#D1FAE5' : '#FEE2E2', border: `1px solid ${mensaje.tipo === 'ok' ? '#10B981' : '#DC2626'}`, color: mensaje.tipo === 'ok' ? '#065F46' : '#991B1B', borderRadius: '8px', marginBottom: '20px', fontWeight: 'bold'}}>
          {mensaje.texto}
        </div>
      )}

      {loading && <div className="liquid-title" style={{fontWeight:'bold'}}>Cargando...</div>}

      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px'}}>
        {rutas.length === 0 && !loading ? (
          <div className="liquid-step-box liquid-text" style={{padding: '40px', textAlign: 'center', borderRadius: '12px', gridColumn: '1 / -1', fontWeight: 'bold'}}>No hay rutas pendientes.</div>
        ) : (
          rutas.map(r => (
            <div key={r.id} className="liquid-row" style={{borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)'}}>
              <div className="liquid-step-box" style={{padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(128,128,128,0.2)'}}>
                <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                  <span style={{padding: '4px 8px', background: '#D1FAE5', color: '#065F46', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', border: `1px solid #10B981`}}>
                    Lista para Despacho
                  </span>
                  <button onClick={() => handleDelete(r.id)} style={{background: 'transparent', border: '1px solid #EF4444', color: '#EF4444', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', padding: '4px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px'}}>
                    🗑️ Eliminar
                  </button>
                </div>
                <span style={{fontWeight:'900', color:'#38BDF8', fontSize:'18px'}}>${r.total_pagar?.toLocaleString()} CLP</span>
              </div>
              <div style={{padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '13px'}}><span className="liquid-label" style={{fontWeight:'700'}}>Cliente Principal:</span> <strong>{r.clientes?.nombre || 'Desconocido'}</strong></div>
                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '13px'}}><span className="liquid-label" style={{fontWeight:'700'}}>Camión Solicitado:</span> <strong>{r.camiones?.patente || 'N/A'}</strong></div>
                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '13px'}}><span className="liquid-label" style={{fontWeight:'700'}}>Ruta:</span> <strong>{r.origen} → {r.destino} ({r.distancia_km}km)</strong></div>
                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '13px'}}><span className="liquid-label" style={{fontWeight:'700'}}>Entrega Est.:</span> <strong>{r.fecha_estimada_entrega ? new Date(r.fecha_estimada_entrega).toLocaleDateString() : 'N/A'}</strong></div>
              </div>
              <div className="liquid-step-box" style={{padding: '16px', borderTop: '1px solid rgba(128,128,128,0.2)', display: 'flex', flexDirection: 'column', gap: '10px'}}>
                {r.camion_id && conductores.find(c => c.camion_id === r.camion_id) ? (
                  <>
                    <div style={{fontSize: '13px', color: '#10B981', fontWeight: 'bold'}}>✓ Camión asignado desde origen. Conductor detectado automáticamente.</div>
                    <button 
                      onClick={() => handleAssign(r.id, conductores.find(c => c.camion_id === r.camion_id).id)}
                      style={{padding: '12px', background: 'linear-gradient(90deg, #10B981, #059669)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 4px 10px rgba(16,185,129,0.3)', textTransform: 'uppercase'}}
                    >
                      Aprobar y Notificar a {conductores.find(c => c.camion_id === r.camion_id).nombre || 'Conductor'}
                    </button>
                  </>
                ) : (
                  <>
                    <select id={`select-${r.id}`} className="liquid-input" style={{padding: '12px', borderRadius: '8px', outline: 'none', fontWeight: '500'}}>
                      <option value="">Conductores disponibles...</option>
                      {conductores.map(c => (
                        <option key={c.id} value={c.user_id || c.id}>{c.profile?.full_name || c.profiles?.full_name || c.full_name || c.nombre || 'Chofer'}</option>
                      ))}
                    </select>
                    <button 
                      onClick={() => {
                        const sel = document.getElementById(`select-${r.id}`);
                        handleAssign(r.id, sel.value);
                      }}
                      style={{padding: '12px', background: 'linear-gradient(90deg, #1D4ED8, #3B82F6)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 4px 10px rgba(29,78,216,0.3)', textTransform: 'uppercase'}}
                    >
                      Asignar y Notificar App
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
