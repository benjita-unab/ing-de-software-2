import React, { useMemo, useState } from "react";
import { Search, MessageSquare, AlertTriangle, CheckCircle2 } from "lucide-react";
import { groupMensajesByRuta, sortMensajes } from "../hooks/useMensajesConductor";
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

const PLACEHOLDER_GUION = "—";

function esTextoVacio(valor) {
  const t = String(valor ?? "").trim();
  return !t || t === PLACEHOLDER_GUION;
}

function tituloGrupoRuta(rutaId, rutasMap = {}) {
  const ruta = rutasMap[rutaId] || {};
  const origen = String(ruta.origen ?? "").trim();
  const destino = String(ruta.destino ?? "").trim();

  if (!esTextoVacio(origen) && !esTextoVacio(destino)) {
    return `${origen} → ${destino}`;
  }

  const cliente = String(
    ruta.clientes?.nombre ?? ruta.cliente?.nombre ?? ruta.cliente_nombre ?? "",
  ).trim();
  if (!esTextoVacio(cliente) && !esTextoVacio(destino)) {
    return `${cliente} → ${destino}`;
  }
  if (!esTextoVacio(cliente)) return cliente;
  if (!esTextoVacio(destino)) return destino;
  if (!esTextoVacio(origen)) return origen;

  const nombre = String(ruta.nombre ?? "").trim();
  if (!esTextoVacio(nombre)) return nombre;

  const id = String(rutaId ?? "").trim();
  if (id && id !== "SIN_RUTA") {
    return `Ruta ${id.substring(0, 8)}`;
  }

  return "Ruta sin identificar";
}

export default function MensajesConductor({
  mensajes,
  rutasMap = {},
  loading,
  error,
  acknowledgeMensaje,
}) {
  const [searchRuta, setSearchRuta] = useState("");
  const [selectedRouteId, setSelectedRouteId] = useState(null);

  const mensajesOrdenados = useMemo(() => sortMensajes(mensajes), [mensajes]);
  const routeGroups = useMemo(() => {
    const groups = groupMensajesByRuta(mensajesOrdenados, searchRuta, rutasMap);
    return groups.map((route) => ({
      ...route,
      rutaLabel: tituloGrupoRuta(route.rutaId, rutasMap),
    }));
  }, [mensajesOrdenados, rutasMap, searchRuta]);

  const selectedRoute = routeGroups.find((r) => r.rutaId === selectedRouteId) ?? null;

  const handleAcknowledge = async (mensajeId) => {
    const res = await acknowledgeMensaje(mensajeId);
    if (!res.ok) {
      alert(`Error: ${res.message}`);
    }
  };

  return (
    <div className="lt-mensajes-split">
      <aside className="lt-mensajes-conversations">
        <div className="lt-mensajes-conversations__search">
          <Search size={14} className="lt-search-icon" />
          <input
            id="ruta-search"
            type="text"
            className="lt-input"
            value={searchRuta}
            onChange={(e) => setSearchRuta(e.target.value)}
            placeholder="Buscar por ruta o ID..."
          />
        </div>

        {loading && mensajes.length === 0 && (
          <Spinner message="Cargando mensajes..." />
        )}

        {error && (
          <div className="lt-alert-banner lt-alert-banner--error">{error}</div>
        )}

        <div className="lt-mensajes-conversations__list lt-scroll">
          {routeGroups.length === 0 && !loading ? (
            <EmptyState
              icon={MessageSquare}
              title="Sin conversaciones"
              description="No hay mensajes para la ruta indicada."
            />
          ) : (
            routeGroups.map((route) => (
              <button
                key={route.rutaId}
                type="button"
                className={`lt-mensajes-conv-item ${selectedRouteId === route.rutaId ? "lt-mensajes-conv-item--active" : ""} ${route.hasUrgent ? "lt-mensajes-conv-item--urgent" : ""}`}
                onClick={() => setSelectedRouteId(route.rutaId)}
              >
                <div className="lt-mensajes-conv-item__title">{route.rutaLabel}</div>
                <div className="lt-mensajes-conv-item__meta">
                  <span>{route.mensajes.length} mensaje{route.mensajes.length !== 1 ? "s" : ""}</span>
                  {route.hasUrgent && (
                    <Badge variant="danger" showDot={false}>Emergencia</Badge>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      <div className="lt-mensajes-detail">
        {!selectedRoute ? (
          <EmptyState
            icon={MessageSquare}
            title="Selecciona una conversación"
            description="Elige una ruta a la izquierda para ver los mensajes del conductor."
          />
        ) : (
          <>
            <div className="lt-mensajes-detail__header">
              <div>
                <h3 className="lt-mensajes-detail__title">{selectedRoute.rutaLabel}</h3>
                <p className="lt-mensajes-detail__sub">
                  {selectedRoute.mensajes.length} mensaje{selectedRoute.mensajes.length !== 1 ? "s" : ""}
                  {selectedRoute.hasUrgent && " · contiene emergencias"}
                </p>
              </div>
              {selectedRoute.hasUrgent && (
                <Badge variant="danger" showDot={false}>
                  <AlertTriangle size={12} />
                  Urgente
                </Badge>
              )}
            </div>

            <div className="lt-table-wrap lt-mensajes-detail__table">
              <table className="lt-table">
                <thead>
                  <tr>
                    <th>Mensaje</th>
                    <th>Fecha y hora</th>
                    <th>Prioridad</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRoute.mensajes.map((mensaje) => {
                    const isUrgentUnack =
                      mensaje.prioridad === "ALTA" && !mensaje.acknowledged;
                    return (
                      <tr
                        key={mensaje.id}
                        className={isUrgentUnack ? "lt-table__row--urgent" : undefined}
                      >
                        <td>{mensaje.mensaje || "—"}</td>
                        <td>{formatTimestamp(mensaje.timestamp_evento)}</td>
                        <td>
                          <Badge variant={mensaje.prioridad === "ALTA" ? "danger" : "info"}>
                            {mensaje.prioridad === "ALTA" ? "ALTA" : "NORMAL"}
                          </Badge>
                        </td>
                        <td>
                          {mensaje.prioridad === "ALTA" ? (
                            !mensaje.acknowledged ? (
                              <button
                                type="button"
                                className="lt-btn lt-btn--primary"
                                onClick={() => handleAcknowledge(mensaje.id)}
                              >
                                Confirmar
                              </button>
                            ) : (
                              <span className="lt-mensajes-ack">
                                <CheckCircle2 size={12} />
                                Notificado
                              </span>
                            )
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="lt-mensajes-polling">Actualización automática cada 10 segundos</p>
          </>
        )}
      </div>
    </div>
  );
}
