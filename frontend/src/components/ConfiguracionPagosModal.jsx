import React, { useEffect, useState } from "react";
import { Settings, X } from "lucide-react";
import {
  actualizarConfiguracionPagos,
  obtenerConfiguracionPagos,
  puedeConfigurarPagos,
} from "../lib/configuracionPagosService";
import Spinner from "./ui/Spinner";

const CAMPOS = [
  {
    key: "precioPorRuta",
    label: "Precio por ruta completada",
    hint: "Monto fijo por cada ruta en estado ENTREGADO",
  },
  {
    key: "precioPorEntrega",
    label: "Precio por entrega",
    hint: "Monto por cada entrega validada",
  },
  {
    key: "precioPorBulto",
    label: "Precio por slot",
    hint: "Monto unitario por slot utilizado",
  },
  {
    key: "precioPorKm",
    label: "Precio por kilómetro",
    hint: "Monto por km recorrido (distancia_km)",
  },
];

function formatMontoPreview(valor) {
  if (valor === "" || valor == null || Number.isNaN(Number(valor))) return "—";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number(valor));
}

function formatFecha(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("es-CL");
}

export default function ConfiguracionPagosModal({ onClose, onGuardado }) {
  const [valores, setValores] = useState({
    precioPorRuta: "",
    precioPorEntrega: "",
    precioPorBulto: "",
    precioPorKm: "",
  });
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [meta, setMeta] = useState({ updatedAt: null, source: null });

  useEffect(() => {
    let cancelled = false;

    async function cargar() {
      setLoading(true);
      setError("");
      const res = await obtenerConfiguracionPagos();
      if (cancelled) return;

      if (res.error) {
        setError(res.error);
      } else {
        const data = res.data || {};
        setValores({
          precioPorRuta: String(data.precioPorRuta ?? ""),
          precioPorEntrega: String(data.precioPorEntrega ?? ""),
          precioPorBulto: String(data.precioPorBulto ?? ""),
          precioPorKm: String(data.precioPorKm ?? ""),
        });
        setMeta({
          updatedAt: data.updatedAt ?? null,
          source: data.source ?? null,
        });
      }
      setLoading(false);
    }

    cargar();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (key, value) => {
    setValores((prev) => ({ ...prev, [key]: value }));
    setSuccess("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const payload = {
      precioPorRuta: Number(valores.precioPorRuta),
      precioPorEntrega: Number(valores.precioPorEntrega),
      precioPorBulto: Number(valores.precioPorBulto),
      precioPorKm: Number(valores.precioPorKm),
    };

    for (const campo of CAMPOS) {
      const n = payload[campo.key];
      if (!Number.isFinite(n) || n < 0) {
        setError(`${campo.label}: ingresa un número válido mayor o igual a 0.`);
        return;
      }
    }

    setGuardando(true);
    const res = await actualizarConfiguracionPagos(payload);
    setGuardando(false);

    if (res.error) {
      setError(res.error);
      return;
    }

    const data = res.data || {};
    setValores({
      precioPorRuta: String(data.precioPorRuta ?? payload.precioPorRuta),
      precioPorEntrega: String(data.precioPorEntrega ?? payload.precioPorEntrega),
      precioPorBulto: String(data.precioPorBulto ?? payload.precioPorBulto),
      precioPorKm: String(data.precioPorKm ?? payload.precioPorKm),
    });
    setMeta({
      updatedAt: data.updatedAt ?? new Date().toISOString(),
      source: "database",
    });
    setSuccess("Tarifas actualizadas correctamente.");
    onGuardado?.(data);
  };

  return (
    <div className="lt-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="lt-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="config-pagos-title"
        style={{ maxWidth: 520 }}
      >
        <div className="lt-modal-header">
          <div>
            <div className="lt-modal-header__title" id="config-pagos-title">
              Configuración de pagos
            </div>
            <div className="lt-modal-header__sub">
              Tarifas unitarias para el cálculo HU-37
            </div>
          </div>
          <button
            type="button"
            className="lt-modal-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="lt-modal-body">
          {loading ? (
            <div
              className="lt-empty"
              style={{ display: "flex", justifyContent: "center", padding: "24px 0" }}
            >
              <Spinner />
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="lt-alert-banner lt-alert-banner--error" role="alert">
                  {error}
                </div>
              )}
              {success && (
                <div className="lt-alert-banner lt-alert-banner--success" role="status">
                  {success}
                </div>
              )}

              {meta.updatedAt && (
                <p className="lt-module-card__subtitle" style={{ marginBottom: 12 }}>
                  Última actualización: {formatFecha(meta.updatedAt)}
                  {meta.source === "env_fallback" ? " (valores por defecto)" : ""}
                </p>
              )}

              {CAMPOS.map((campo) => (
                <div key={campo.key} style={{ marginBottom: 14 }}>
                  <label className="lt-info-row__label" htmlFor={campo.key}>
                    {campo.label}
                  </label>
                  <input
                    id={campo.key}
                    type="number"
                    min="0"
                    step="1"
                    className="lt-input"
                    value={valores[campo.key]}
                    onChange={(e) => handleChange(campo.key, e.target.value)}
                    disabled={guardando}
                    required
                  />
                  <div className="lt-card__subtitle" style={{ marginTop: 4 }}>
                    {campo.hint} · Vista previa: {formatMontoPreview(valores[campo.key])}
                  </div>
                </div>
              ))}

              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  className="lt-btn lt-btn--ghost"
                  onClick={onClose}
                  disabled={guardando}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="lt-btn lt-btn--primary"
                  disabled={guardando}
                >
                  {guardando ? "Guardando..." : "Guardar tarifas"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export function ConfiguracionPagosButton({ operator, onConfigGuardada }) {
  const [abierto, setAbierto] = useState(false);

  if (!puedeConfigurarPagos(operator?.role)) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className="lt-btn lt-btn--secondary"
        onClick={() => setAbierto(true)}
      >
        <Settings size={14} />
        Configuración de pagos
      </button>

      {abierto && (
        <ConfiguracionPagosModal
          onClose={() => setAbierto(false)}
          onGuardado={(data) => {
            onConfigGuardada?.(data);
          }}
        />
      )}
    </>
  );
}
