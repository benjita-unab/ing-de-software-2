import React, { useMemo } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { sortMensajes } from "../hooks/useMensajesConductor";
import Badge from "./ui/Badge";
import Spinner from "./ui/Spinner";
import EmptyState from "./ui/EmptyState";

function formatTimestamp(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "—";
  }
}

function estadoAlerta(mensaje) {
  if (mensaje.prioridad === "ALTA") {
    return mensaje.acknowledged ? "Atendida" : "Pendiente";
  }
  return "Registrada";
}

export default function AlertasRutaTabla({
  mensajes = [],
  loading = false,
  error = null,
  acknowledgeMensaje,
}) {
  const mensajesOrdenados = useMemo(() => sortMensajes(mensajes), [mensajes]);

  const handleAcknowledge = async (mensajeId) => {
    const res = await acknowledgeMensaje(mensajeId);
    if (!res.ok) {
      alert(`Error: ${res.message}`);
    }
  };

  if (loading && mensajes.length === 0) {
    return <Spinner message="Cargando alertas..." />;
  }

  if (error) {
    return <div className="lt-alert-banner lt-alert-banner--error">{error}</div>;
  }

  if (mensajesOrdenados.length === 0) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Sin alertas"
        description="Este conductor no tiene alertas registradas para este pedido."
      />
    );
  }

  const pendientes = mensajesOrdenados.filter(
    (m) => m.prioridad === "ALTA" && !m.acknowledged,
  );
  const atendidas = mensajesOrdenados.filter(
    (m) => !(m.prioridad === "ALTA" && !m.acknowledged),
  );

  const renderTable = (rows) => (
    <table className="lt-table">
      <thead>
        <tr>
          <th>Tipo</th>
          <th>Fecha</th>
          <th>Prioridad</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((mensaje) => {
          const isUrgentUnack = mensaje.prioridad === "ALTA" && !mensaje.acknowledged;
          return (
            <tr
              key={mensaje.id}
              className={isUrgentUnack ? "lt-table__row--urgent" : undefined}
            >
              <td>{mensaje.mensaje || mensaje.tipo || "—"}</td>
              <td>{formatTimestamp(mensaje.timestamp_evento)}</td>
              <td>
                <Badge variant={mensaje.prioridad === "ALTA" ? "danger" : "info"} showDot={false}>
                  {mensaje.prioridad === "ALTA" ? "ALTA" : "NORMAL"}
                </Badge>
              </td>
              <td>
                {mensaje.prioridad === "ALTA" ? (
                  !mensaje.acknowledged ? (
                    <button
                      type="button"
                      className="lt-btn lt-btn--secondary lt-btn--sm"
                      onClick={() => handleAcknowledge(mensaje.id)}
                    >
                      Aceptar
                    </button>
                  ) : (
                    <span className="lt-mensajes-ack">
                      <CheckCircle2 size={12} />
                      Atendida
                    </span>
                  )
                ) : (
                  <span className="lt-text-muted">{estadoAlerta(mensaje)}</span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  return (
    <div className="lt-mensajes-detail__table lt-scroll">
      {pendientes.length > 0 && (
        <div className="lt-table-wrap" style={{ marginBottom: pendientes.length && atendidas.length ? 16 : 0 }}>
          <h4 className="lt-mensajes-detail__sub" style={{ margin: "0 0 8px", fontWeight: 600 }}>
            Pendientes
          </h4>
          {renderTable(pendientes)}
        </div>
      )}
      {atendidas.length > 0 && (
        <div className="lt-table-wrap">
          {pendientes.length > 0 && (
            <h4 className="lt-mensajes-detail__sub" style={{ margin: "0 0 8px", fontWeight: 600 }}>
              Atendidas
            </h4>
          )}
          {renderTable(atendidas)}
        </div>
      )}
    </div>
  );
}
