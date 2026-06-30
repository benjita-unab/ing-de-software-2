import React, { useCallback, useEffect, useState } from "react";
import {
  congelarCostosOperativos,
  formatCLP,
  guardarCostosOperativos,
  obtenerCostosOperativos,
} from "../lib/costosOperativosService";
import Badge from "./ui/Badge";
import Spinner from "./ui/Spinner";

function CostoCard({ label, value, hint }) {
  return (
    <div className="lt-card" style={{ padding: 14 }}>
      <div className="lt-card__subtitle" style={{ marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 700 }}>{formatCLP(value)}</div>
      {hint ? (
        <div className="lt-card__subtitle" style={{ marginTop: 4 }}>
          {hint}
        </div>
      ) : null}
    </div>
  );
}

export default function CostosOperativosPanel({ rutaId, rutaEstado }) {
  const [costos, setCostos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    km_l_override: "",
    costo_peajes: "",
    tiempo_espera_minutos: "",
    distancia_km: "",
  });

  const cargar = useCallback(async () => {
    if (!rutaId) return;
    setLoading(true);
    setError("");
    const res = await obtenerCostosOperativos(rutaId);
    if (res.error) {
      setError(res.error);
      setCostos(null);
    } else {
      const data = res.data;
      setCostos(data);
      setForm({
        km_l_override: data.kmLOverride != null ? String(data.kmLOverride) : "",
        costo_peajes: data.costoPeajes != null ? String(data.costoPeajes) : "",
        tiempo_espera_minutos:
          data.tiempoEsperaMinutos != null ? String(data.tiempoEsperaMinutos) : "",
        distancia_km: data.distanciaKm != null ? String(data.distanciaKm) : "",
      });
    }
    setLoading(false);
  }, [rutaId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function handleRecalcular(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const payload = {};
    if (form.km_l_override.trim()) {
      payload.km_l_override = Number(form.km_l_override);
    }
    if (form.costo_peajes.trim()) {
      payload.costo_peajes = Number(form.costo_peajes);
    }
    if (form.tiempo_espera_minutos.trim()) {
      payload.tiempo_espera_minutos = Number(form.tiempo_espera_minutos);
    }
    if (form.distancia_km.trim()) {
      payload.distancia_km = Number(form.distancia_km);
    }

    const res = await guardarCostosOperativos(rutaId, payload);
    setSaving(false);

    if (res.error) {
      setError(res.error);
      return;
    }

    setCostos(res.data);
    setSuccess("Costos recalculados y guardados.");
  }

  async function handleCongelar() {
    if (!window.confirm("¿Congelar costos? No podrán modificarse después (HU-50).")) {
      return;
    }
    setSaving(true);
    setError("");
    const res = await congelarCostosOperativos(rutaId);
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setCostos(res.data);
    setSuccess("Costos congelados correctamente.");
  }

  if (loading) {
    return (
      <div style={{ padding: 16 }}>
        <Spinner message="Cargando costos operativos…" />
      </div>
    );
  }

  if (error && !costos) {
    return (
      <div style={{ padding: 16 }}>
        <div className="lt-alert-banner lt-alert-banner--error" role="alert">
          {error}
        </div>
      </div>
    );
  }

  if (!costos) {
    return (
      <div style={{ padding: 16 }}>
        <p className="lt-empty">Sin datos de costos.</p>
      </div>
    );
  }

  const editable = costos.editable !== false;

  return (
    <div className="lt-costos-panel" style={{ padding: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div>
          <h4 style={{ margin: 0 }}>Resumen financiero / Costos</h4>
          <p className="lt-card__subtitle" style={{ margin: "4px 0 0" }}>
            Rendimiento: {costos.kmLAplicado} Km/L
            {costos.kmLOverride != null ? " (ajuste manual)" : ""}
            {" · "}
            Consumo est.: {costos.consumoLitrosEstimado} L
          </p>
        </div>
        <Badge variant={costos.estado === "congelado" ? "muted" : "success"} showDot={false}>
          {costos.estado === "congelado" ? "Congelado" : "Borrador"}
        </Badge>
      </div>

      {error ? (
        <div className="lt-alert-banner lt-alert-banner--error" role="alert" style={{ marginBottom: 12 }}>
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="lt-alert-banner lt-alert-banner--success" role="status" style={{ marginBottom: 12 }}>
          {success}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <CostoCard
          label="Combustible"
          value={costos.costoCombustible}
          hint={`${formatCLP(costos.precioCombustibleLitro)}/L`}
        />
        <CostoCard label="Conductor (HU-37)" value={costos.costoConductor} />
        <CostoCard
          label="Espera"
          value={costos.costoEspera}
          hint={`${costos.tiempoEsperaMinutos} min`}
        />
        <CostoCard label="Peajes" value={costos.costoPeajes} />
        <CostoCard label="Total pedido" value={costos.costoTotal} />
      </div>

      {editable ? (
        <form onSubmit={handleRecalcular}>
          <h5 className="lt-form-subsection__title">Ajustes manuales (CA-03)</h5>
          <div className="lt-form-grid" style={{ marginBottom: 12 }}>
            <div className="lt-field-group">
              <label className="lt-label" htmlFor={`km-l-${rutaId}`}>
                Eficiencia Km/L (override)
              </label>
              <input
                id={`km-l-${rutaId}`}
                type="number"
                min="0.01"
                step="0.1"
                className="lt-input"
                placeholder={`Camión: ${costos.kmLCamion}`}
                value={form.km_l_override}
                onChange={(e) =>
                  setForm((p) => ({ ...p, km_l_override: e.target.value }))
                }
              />
            </div>
            <div className="lt-field-group">
              <label className="lt-label" htmlFor={`peajes-${rutaId}`}>
                Peajes (CLP)
              </label>
              <input
                id={`peajes-${rutaId}`}
                type="number"
                min="0"
                className="lt-input"
                value={form.costo_peajes}
                onChange={(e) =>
                  setForm((p) => ({ ...p, costo_peajes: e.target.value }))
                }
              />
            </div>
            <div className="lt-field-group">
              <label className="lt-label" htmlFor={`espera-${rutaId}`}>
                Tiempo espera (min)
              </label>
              <input
                id={`espera-${rutaId}`}
                type="number"
                min="0"
                className="lt-input"
                value={form.tiempo_espera_minutos}
                onChange={(e) =>
                  setForm((p) => ({ ...p, tiempo_espera_minutos: e.target.value }))
                }
              />
            </div>
            <div className="lt-field-group">
              <label className="lt-label" htmlFor={`dist-${rutaId}`}>
                Distancia (km)
              </label>
              <input
                id={`dist-${rutaId}`}
                type="number"
                min="0"
                step="0.1"
                className="lt-input"
                value={form.distancia_km}
                onChange={(e) =>
                  setForm((p) => ({ ...p, distancia_km: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="lt-form-actions">
            <button type="submit" className="lt-btn lt-btn--primary" disabled={saving}>
              {saving ? "Calculando…" : "Recalcular y guardar"}
            </button>
            {String(rutaEstado || "").toUpperCase() === "ENTREGADO" ||
            costos.estado === "borrador" ? (
              <button
                type="button"
                className="lt-btn lt-btn--secondary"
                disabled={saving}
                onClick={handleCongelar}
              >
                Congelar costos
              </button>
            ) : null}
          </div>
        </form>
      ) : (
        <p className="lt-card__subtitle">
          Costos congelados el{" "}
          {costos.congeladoAt
            ? new Date(costos.congeladoAt).toLocaleString("es-CL")
            : "—"}
          . Los cambios globales de combustible no afectan este pedido.
        </p>
      )}
    </div>
  );
}
