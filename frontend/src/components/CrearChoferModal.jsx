import React, { useState, useEffect } from 'react';
import { Truck, User } from 'lucide-react';
import { obtenerCamionesDisponibles, crearCamion, crearConductor } from '../lib/rutasService';

export default function CrearChoferModal({ onClose, onCreated }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [camionesDisponibles, setCamionesDisponibles] = useState([]);
  const [modoCamion, setModoCamion] = useState('existente');

  const [formChofer, setFormChofer] = useState({
    nombre: '',
    rut: '',
    email: '',
    telefono: '',
    password: '',
  });

  const [formCamion, setFormCamion] = useState({
    patente: '',
    slots: '',
    km_l: '',
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

      if (modoCamion === 'nuevo') {
        if (!formCamion.patente || !formCamion.slots) {
          throw new Error('Debe completar los campos del nuevo camión.');
        }
        const resCamion = await crearCamion({
          patente: formCamion.patente.trim().toUpperCase(),
          slots: parseInt(formCamion.slots) || 0,
          km_l: parseFloat(formCamion.km_l) || 4.5,
          estado: 'DISPONIBLE',
        });
        if (resCamion.error) throw new Error(`Error al crear camión: ${resCamion.error}`);
        finalCamionId = resCamion.data.id;
      }

      const resChofer = await crearConductor({
        ...formChofer,
        camion_id: finalCamionId,
      });

      if (resChofer.error) {
        throw new Error(`No fue posible crear el conductor: ${resChofer.error}`);
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
    <div
      className="lt-modal-overlay"
      onClick={(e) => {
        if (!loading && e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="crear-chofer-title"
    >
      <div
        className="lt-modal-dialog lt-modal-dialog--lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lt-modal-header">
          <div>
            <div className="lt-modal-header__title" id="crear-chofer-title">
              Crear conductor
            </div>
            <div className="lt-modal-header__sub">
              Datos del conductor y asignación de camión
            </div>
          </div>
          <button
            type="button"
            className="lt-modal-close"
            onClick={onClose}
            disabled={loading}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="lt-modal-body lt-modal-field-stack">
            {error && (
              <div className="lt-alert-banner lt-alert-banner--error" role="alert">
                {error}
              </div>
            )}

            <div className="lt-form-group">
              <label className="lt-label">Nombre completo</label>
              <input
                required
                type="text"
                className="lt-input"
                name="nombre"
                value={formChofer.nombre}
                onChange={handleChangeChofer}
                placeholder="Ej: Juan Pérez"
              />
            </div>

            <div className="lt-form-group">
              <label className="lt-label">RUT</label>
              <input
                required
                type="text"
                className="lt-input"
                name="rut"
                value={formChofer.rut}
                onChange={handleChangeChofer}
                placeholder="Ej: 12.345.678-9"
              />
            </div>

            <div className="lt-form-group">
              <label className="lt-label">Teléfono</label>
              <input
                type="text"
                className="lt-input"
                name="telefono"
                value={formChofer.telefono}
                onChange={handleChangeChofer}
                placeholder="Ej: +569 1234 5678"
              />
            </div>

            <div className="lt-modal-section lt-modal-section--flush">
              <div className="lt-modal-section__title">
                <User size={14} aria-hidden /> Credenciales app móvil
              </div>
              <div className="lt-modal-field-stack">
                <div className="lt-form-group">
                  <label className="lt-label">Email de ingreso</label>
                  <input
                    required
                    type="email"
                    className="lt-input"
                    name="email"
                    value={formChofer.email}
                    onChange={handleChangeChofer}
                    placeholder="Ej: conductor@logitrack.cl"
                  />
                </div>
                <div className="lt-form-group">
                  <label className="lt-label">Contraseña</label>
                  <input
                    required
                    type="password"
                    className="lt-input"
                    name="password"
                    value={formChofer.password}
                    onChange={handleChangeChofer}
                    placeholder="Mínimo 6 caracteres"
                    minLength={6}
                  />
                </div>
              </div>
            </div>

            <div className="lt-modal-section lt-modal-section--flush">
              <div className="lt-modal-section__title">
                <Truck size={14} aria-hidden /> Asignación de camión
              </div>
              <div className="lt-tabs">
                <button
                  type="button"
                  className={`lt-tab ${modoCamion === 'existente' ? 'lt-tab--active' : ''}`}
                  onClick={() => setModoCamion('existente')}
                >
                  Seleccionar existente
                </button>
                <button
                  type="button"
                  className={`lt-tab ${modoCamion === 'nuevo' ? 'lt-tab--active' : ''}`}
                  onClick={() => setModoCamion('nuevo')}
                >
                  Crear nuevo
                </button>
              </div>

              {modoCamion === 'existente' && (
                <div className="lt-form-group">
                  <label className="lt-label">Camión disponible</label>
                  <select
                    className="lt-select"
                    value={selectedCamionId}
                    onChange={(e) => setSelectedCamionId(e.target.value)}
                  >
                    <option value="">— Sin camión asignado —</option>
                    {camionesDisponibles.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.patente} ({c.slots} slots)
                      </option>
                    ))}
                  </select>
                  <p className="lt-help-text">Si no se selecciona, quedará libre.</p>
                </div>
              )}

              {modoCamion === 'nuevo' && (
                <div className="lt-modal-nested-panel lt-modal-field-stack">
                  <div className="lt-form-group">
                    <label className="lt-label">Patente</label>
                    <input
                      required={modoCamion === 'nuevo'}
                      type="text"
                      className="lt-input"
                      name="patente"
                      value={formCamion.patente}
                      onChange={handleChangeCamion}
                      placeholder="AAAA-11"
                    />
                  </div>
                  <div className="lt-modal-field-row">
                    <div className="lt-form-group">
                      <label className="lt-label">Capacidad (slots)</label>
                      <input
                        required={modoCamion === 'nuevo'}
                        type="number"
                        className="lt-input"
                        name="slots"
                        value={formCamion.slots}
                        onChange={handleChangeCamion}
                        placeholder="Ej: 64"
                      />
                    </div>
                    <div className="lt-form-group">
                      <label className="lt-label">Rendimiento (km/L)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        className="lt-input"
                        name="km_l"
                        value={formCamion.km_l}
                        onChange={handleChangeCamion}
                        placeholder="Ej: 4.5"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lt-modal-footer">
            <button
              type="button"
              className="lt-btn lt-btn--secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </button>
            <button type="submit" className="lt-btn lt-btn--primary" disabled={loading}>
              {loading ? 'Creando…' : 'Crear conductor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
