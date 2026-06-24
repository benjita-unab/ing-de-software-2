import React, { useState, useEffect } from 'react';
import { X, Truck, User } from 'lucide-react';
import { obtenerCamionesDisponibles, crearCamion, crearConductor } from '../lib/rutasService';

export default function CrearChoferModal({ onClose, onCreated }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [camionesDisponibles, setCamionesDisponibles] = useState([]);
  
  // Tabs: 'existente' | 'nuevo' para el camión
  const [modoCamion, setModoCamion] = useState('existente');

  const [formChofer, setFormChofer] = useState({
    nombre: '',
    rut: '',
    email: '',
    telefono: '',
    password: ''
  });

  const [formCamion, setFormCamion] = useState({
    patente: '',
    slots: ''
  });

  const [selectedCamionId, setSelectedCamionId] = useState('');

  useEffect(() => {
    async function loadCamiones() {
      const res = await obtenerCamionesDisponibles();
      if (!res.error) {
        setCamionesDisponibles(res.data);
      }
    }
    loadCamiones();
  }, []);

  const handleChangeChofer = (e) => {
    setFormChofer({ ...formChofer, [e.target.name]: e.target.value });
  };

  const handleChangeCamion = (e) => {
    setFormCamion({ ...formCamion, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let finalCamionId = selectedCamionId || null;

      // 1. Si seleccionó "Crear Nuevo Camión", lo creamos primero
      if (modoCamion === 'nuevo') {
        if (!formCamion.patente || !formCamion.slots) {
          throw new Error("Debe completar los campos del nuevo camión.");
        }
        const resCamion = await crearCamion({
          patente: formCamion.patente.trim().toUpperCase(),
          slots: parseInt(formCamion.slots) || 0,
          estado: 'DISPONIBLE'
        });
        if (resCamion.error) throw new Error(`Error al crear camión: ${resCamion.error}`);
        finalCamionId = resCamion.data.id;
      }

      // 2. Crear al chofer
      const resChofer = await crearConductor({
        ...formChofer,
        camion_id: finalCamionId
      });

      if (resChofer.error) {
        throw new Error(`Error al crear chofer: ${resChofer.error}`);
      }

      onCreated(resChofer.data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.4)',
      zIndex: 9999,
      display: 'flex',
      justifyContent: 'flex-end'
    }}>
      <div style={{
        width: '450px',
        maxWidth: '100%',
        backgroundColor: 'var(--lt-bg, #fff)',
        height: '100%',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideInRight 0.3s ease-out',
        borderLeft: '1px solid var(--lt-border)'
      }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--lt-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--lt-bg-muted, #f8fafc)'
        }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--lt-text-main, #1e293b)' }}>Crear Nuevo Chofer</h2>
          <button className="lt-btn lt-btn--ghost lt-btn--icon" onClick={onClose} disabled={loading} style={{ margin: 0, padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
            {error && (
              <div className="lt-alert-banner lt-alert-banner--error" style={{ marginBottom: 16 }}>
                {error}
              </div>
            )}

            <div className="lt-form-group">
              <label className="lt-label">Nombre Completo</label>
              <input required type="text" className="lt-input" name="nombre" value={formChofer.nombre} onChange={handleChangeChofer} placeholder="Ej: Juan Pérez" />
            </div>

            <div className="lt-form-group">
              <label className="lt-label">RUT</label>
              <input required type="text" className="lt-input" name="rut" value={formChofer.rut} onChange={handleChangeChofer} placeholder="Ej: 12.345.678-9" />
            </div>

            <div className="lt-form-group">
              <label className="lt-label">Teléfono</label>
              <input type="text" className="lt-input" name="telefono" value={formChofer.telefono} onChange={handleChangeChofer} placeholder="Ej: +569 1234 5678" />
            </div>

            <hr style={{ margin: '20px 0', borderColor: 'var(--lt-border)' }} />
            
            <h4 style={{ marginBottom: 10, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--lt-text-main, #1e293b)' }}>
              <User size={16} /> Credenciales App Móvil
            </h4>
            
            <div className="lt-form-group">
              <label className="lt-label">Email de Ingreso</label>
              <input required type="email" className="lt-input" name="email" value={formChofer.email} onChange={handleChangeChofer} placeholder="Ej: chofer1@logitrack.cl" />
            </div>

            <div className="lt-form-group">
              <label className="lt-label">Contraseña</label>
              <input required type="password" className="lt-input" name="password" value={formChofer.password} onChange={handleChangeChofer} placeholder="Mínimo 6 caracteres" minLength={6} />
            </div>

            <hr style={{ margin: '20px 0', borderColor: 'var(--lt-border)' }} />

            <h4 style={{ marginBottom: 10, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--lt-text-main, #1e293b)' }}>
              <Truck size={16} /> Asignación de Camión
            </h4>

            <div className="lt-tabs" style={{ marginBottom: 16 }}>
              <button
                type="button"
                className={`lt-tab ${modoCamion === 'existente' ? 'lt-tab--active' : ''}`}
                onClick={() => setModoCamion('existente')}
              >
                Seleccionar Existente
              </button>
              <button
                type="button"
                className={`lt-tab ${modoCamion === 'nuevo' ? 'lt-tab--active' : ''}`}
                onClick={() => setModoCamion('nuevo')}
              >
                + Crear Nuevo
              </button>
            </div>

            {modoCamion === 'existente' && (
              <div className="lt-form-group">
                <label className="lt-label">Camión Disponible</label>
                <select className="lt-select" value={selectedCamionId} onChange={(e) => setSelectedCamionId(e.target.value)}>
                  <option value="">-- Sin camión asignado --</option>
                  {camionesDisponibles.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.patente} ({c.slots} slots)
                    </option>
                  ))}
                </select>
                <p className="lt-help-text" style={{ marginTop: 4 }}>Si no se selecciona, quedará "libre".</p>
              </div>
            )}

            {modoCamion === 'nuevo' && (
              <div style={{ background: 'var(--lt-bg-muted)', padding: 16, borderRadius: 6 }}>
                <div className="lt-form-group">
                  <label className="lt-label">Patente</label>
                  <input required={modoCamion === 'nuevo'} type="text" className="lt-input" name="patente" value={formCamion.patente} onChange={handleChangeCamion} placeholder="AAAA-11" />
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div className="lt-form-group" style={{ flex: 1 }}>
                    <label className="lt-label">Capacidad (Slots)</label>
                    <input required={modoCamion === 'nuevo'} type="number" className="lt-input" name="slots" value={formCamion.slots} onChange={handleChangeCamion} placeholder="Ej: 64" />
                  </div>
                </div>
              </div>
            )}

          </div>
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--lt-border)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 12,
            backgroundColor: 'var(--lt-bg-muted, #f8fafc)'
          }}>
            <button type="button" className="lt-btn lt-btn--ghost" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="lt-btn lt-btn--primary" disabled={loading}>
              {loading ? 'Creando...' : 'Crear Chofer'}
            </button>
          </div>
        </form>
      </div>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
