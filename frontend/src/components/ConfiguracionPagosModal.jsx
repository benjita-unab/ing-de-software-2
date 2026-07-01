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
    label: "Precio por pedido entregado",
    hint: "Monto fijo por cada pedido en estado entregado",
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
    hint: "Monto por kilómetro recorrido",
  },
  {
    key: "precioCombustibleLitro",
    label: "Precio combustible por litro",
    hint: "Valor al calcular costos del pedido",
  },
  {
    key: "precioEsperaMinuto",
    label: "Precio espera por minuto",
    hint: "Costo por minuto de espera en destino",
  },
];

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
    precioCombustibleLitro: "",
    precioEsperaMinuto: "",
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
          precioCombustibleLitro: String(data.precioCombustibleLitro ?? ""),
          precioEsperaMinuto: String(data.precioEsperaMinuto ?? ""),
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
      precioCombustibleLitro: Number(valores.precioCombustibleLitro),
      precioEsperaMinuto: Number(valores.precioEsperaMinuto),
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
      precioCombustibleLitro: String(
        data.precioCombustibleLitro ?? payload.precioCombustibleLitro,
      ),
      precioEsperaMinuto: String(data.precioEsperaMinuto ?? payload.precioEsperaMinuto),
    });
    setMeta({
      updatedAt: data.updatedAt ?? new Date().toISOString(),
      source: "database",
    });
    setSuccess("Tarifas actualizadas.");
    onGuardado?.(data);
  };

  return (
    <div
      className="lt-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="lt-modal-dialog lt-modal-dialog--sm"
        onClick={(e) => e.stopPropagation()}
        aria-labelledby="config-pagos-title"
      >
        <div className="lt-modal-header">
          <div>
            <div className="lt-modal-header__title" id="config-pagos-title">
              Configuración de pagos
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

        {loading ? (
          <div className="lt-modal-body">
            <Spinner message="Cargando tarifas…" />
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="lt-modal-body lt-modal-field-stack">
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
                <p className="lt-module-card__subtitle">
                  Última actualización: {formatFecha(meta.updatedAt)}
                  {meta.source === "env_fallback" ? " (valores por defecto)" : ""}
                </p>
              )}

              {CAMPOS.map((campo) => (
                <div key={campo.key} className="lt-field-group">
                  <label className="lt-label" htmlFor={campo.key}>
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
                  <div className="lt-card__subtitle">{campo.hint}</div>
                </div>
              ))}
            </div>

            <div className="lt-modal-footer">
              <button
                type="button"
                className="lt-btn lt-btn--secondary"
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
