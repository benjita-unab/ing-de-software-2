import React, { useCallback, useEffect, useState } from "react";
import {
  cancelarPortalRecurrencia,
  getPortalRecurrencias,
  pausarPortalRecurrencia,
  reanudarPortalRecurrencia,
} from "../lib/recurrenciasService";

function formatFecha(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("es-CL");
  } catch {
    return value;
  }
}

const styles = {
  card: {
    padding: "16px",
    borderRadius: "var(--lt-radius-lg)",
    border: "1px solid var(--lt-border)",
    background: "var(--lt-bg-surface)",
    marginBottom: "12px",
    boxShadow: "var(--lt-shadow-sm)",
  },
  badge: (estado) => ({
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: "var(--lt-radius-full)",
    fontSize: "12px",
    fontWeight: 600,
    background:
      estado === "activa"
        ? "var(--lt-success-bg)"
        : estado === "pausada"
          ? "var(--lt-warning-bg)"
          : "var(--lt-danger-bg)",
    color:
      estado === "activa"
        ? "var(--lt-success-text)"
        : estado === "pausada"
          ? "var(--lt-warning-text)"
          : "var(--lt-danger-text)",
  }),
  btn: {
    padding: "8px 12px",
    borderRadius: "var(--lt-radius-md)",
    border: "1px solid var(--lt-border-strong)",
    background: "var(--lt-bg-surface)",
    color: "var(--lt-text-primary)",
    cursor: "pointer",
    fontSize: "13px",
    marginRight: "8px",
    fontFamily: "inherit",
  },
};

function labelFrecuencia(r) {
  const base = r.frecuencia === "diaria"
    ? `Cada ${r.intervalo} día(s)`
    : r.frecuencia === "semanal"
      ? `Cada ${r.intervalo} semana(s)`
      : `Cada ${r.intervalo} mes(es)`;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

export default function PortalRecurrencias() {
  const [recurrencias, setRecurrencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [accionId, setAccionId] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await getPortalRecurrencias();
    if (res.error) {
      setError(res.error);
      setRecurrencias([]);
    } else {
      setRecurrencias(res.data?.data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function handlePausar(id) {
    setAccionId(id);
    const res = await pausarPortalRecurrencia(id);
    setAccionId(null);
    if (res.error) setError(res.error);
    else await cargar();
  }

  async function handleReanudar(id) {
    setAccionId(id);
    const res = await reanudarPortalRecurrencia(id);
    setAccionId(null);
    if (res.error) setError(res.error);
    else await cargar();
  }

  async function handleCancelar(id) {
    if (!window.confirm("¿Cancelar esta recurrencia? No se generarán más pedidos.")) {
      return;
    }
    setAccionId(id);
    const res = await cancelarPortalRecurrencia(id);
    setAccionId(null);
    if (res.error) setError(res.error);
    else await cargar();
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <p style={{ margin: 0, opacity: 0.8, fontSize: 14 }}>
          Administra pedidos recurrentes y consulta las próximas fechas programadas.
          Para crear una nueva recurrencia, use &quot;Usar pedido anterior&quot; en el detalle de un pedido.
        </p>
      </div>

      {error ? (
        <div className="lt-alert-banner lt-alert-banner--error" style={{ marginBottom: 16 }} role="alert">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="lt-text-muted">Cargando recurrencias…</p>
      ) : recurrencias.length === 0 ? (
        <div style={styles.card}>
          <p className="lt-text-muted" style={{ margin: 0 }}>
            No tienes recurrencias configuradas. Puedes crear una desde un pedido existente
            o solicitar al operador que configure una plantilla recurrente.
          </p>
        </div>
      ) : (
        recurrencias.map((r) => (
          <div key={r.id} style={styles.card}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <strong>
                  {r.plantillaNombre ||
                    r.configuracionLogistica?.nombre_ruta ||
                    `${r.configuracionLogistica?.origen || "—"} → ${r.configuracionLogistica?.destino || "—"}`}
                </strong>
                <div className="lt-text-muted" style={{ marginTop: 6, fontSize: 13 }}>
                  {labelFrecuencia(r)} · Próxima: {formatFecha(r.proximaEjecucion)}
                </div>
              </div>
              <span style={styles.badge(r.estado)}>{r.estado}</span>
            </div>

            {(r.proximasFechas || []).length > 0 ? (
              <div style={{ marginTop: 12, fontSize: 13 }}>
                <strong>Próximos pedidos:</strong>
                <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                  {r.proximasFechas.slice(0, 5).map((f) => (
                    <li key={f}>{formatFecha(f)}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div style={{ marginTop: 14 }}>
              {r.estado === "activa" ? (
                <button
                  type="button"
                  style={styles.btn}
                  disabled={accionId === r.id}
                  onClick={() => handlePausar(r.id)}
                >
                  Pausar
                </button>
              ) : null}
              {r.estado === "pausada" ? (
                <button
                  type="button"
                  style={styles.btn}
                  disabled={accionId === r.id}
                  onClick={() => handleReanudar(r.id)}
                >
                  Reanudar
                </button>
              ) : null}
              {r.estado !== "cancelada" ? (
                <button
                  type="button"
                  style={{ ...styles.btn, borderColor: "rgba(248,113,113,0.5)", color: "#fca5a5" }}
                  disabled={accionId === r.id}
                  onClick={() => handleCancelar(r.id)}
                >
                  Cancelar
                </button>
              ) : null}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
