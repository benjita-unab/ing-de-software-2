import React, { useMemo, useState } from "react";
import { Search, MessageSquare } from "lucide-react";
import { groupMensajesByRuta } from "../hooks/useMensajesConductor";
import Badge from "./ui/Badge";
import Spinner from "./ui/Spinner";
import EmptyState from "./ui/EmptyState";
import AlertasRutaTabla from "./AlertasRutaTabla";

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
    return `Pedido ${id.substring(0, 8)}`;
  }

  return "Pedido sin identificar";
}

const COPY = {
  mensajes: {
    loading: "Cargando mensajes...",
    emptyListTitle: "Sin conversaciones",
    emptyListDescription: "No hay mensajes para este pedido.",
    emptyDetailTitle: "Seleccione una conversación",
    emptyDetailDescription: "Elija un pedido a la izquierda.",
    urgentSuffix: " · emergencia",
    polling: "Actualización cada 10 s",
    searchPlaceholder: "Buscar...",
    messageCount: (n) => `${n} mensaje${n !== 1 ? "s" : ""}`,
  },
  alertas: {
    loading: "Cargando alertas...",
    emptyListTitle: "Sin alertas",
    emptyListDescription: "No hay alertas para este pedido.",
    emptyDetailTitle: "Seleccione un pedido",
    emptyDetailDescription: "Elija un pedido a la izquierda.",
    urgentSuffix: " · emergencia sin confirmar",
    polling: "Actualización cada 10 s",
    searchPlaceholder: "Buscar...",
    messageCount: (n) => `${n} alerta${n !== 1 ? "s" : ""}`,
  },
};

export default function MensajesConductor({
  mensajes,
  rutasMap = {},
  loading,
  error,
  acknowledgeMensaje,
  variant = "mensajes",
}) {
  const copy = COPY[variant] || COPY.mensajes;
  const [searchRuta, setSearchRuta] = useState("");
  const [selectedRouteId, setSelectedRouteId] = useState(null);

  const routeGroups = useMemo(() => {
    const groups = groupMensajesByRuta(mensajes, searchRuta, rutasMap);
    return groups.map((route) => ({
      ...route,
      rutaLabel: tituloGrupoRuta(route.rutaId, rutasMap),
    }));
  }, [mensajes, rutasMap, searchRuta]);

  const selectedRoute = routeGroups.find((r) => r.rutaId === selectedRouteId) ?? null;

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
            placeholder={copy.searchPlaceholder}
          />
        </div>

        {loading && mensajes.length === 0 && (
          <Spinner message={copy.loading} />
        )}

        {error && (
          <div className="lt-alert-banner lt-alert-banner--error">{error}</div>
        )}

        <div className="lt-mensajes-conversations__list lt-scroll">
          {routeGroups.length === 0 && !loading ? (
            <EmptyState
              icon={MessageSquare}
              title={copy.emptyListTitle}
              description={copy.emptyListDescription}
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
                  <span>{copy.messageCount(route.mensajes.length)}</span>
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
            title={copy.emptyDetailTitle}
            description={copy.emptyDetailDescription}
          />
        ) : (
          <>
            <div className="lt-mensajes-detail__header">
              <div>
                <h3 className="lt-mensajes-detail__title">{selectedRoute.rutaLabel}</h3>
                <p className="lt-mensajes-detail__sub">
                  {copy.messageCount(selectedRoute.mensajes.length)}
                  {selectedRoute.hasUrgent && copy.urgentSuffix}
                </p>
              </div>
              {selectedRoute.hasUrgent && (
                <Badge variant="danger" showDot={false}>
                  Urgente
                </Badge>
              )}
            </div>

            <div className="lt-table-wrap">
              <AlertasRutaTabla
                mensajes={selectedRoute.mensajes}
                loading={loading}
                error={error}
                acknowledgeMensaje={acknowledgeMensaje}
              />
            </div>


          </>
        )}
      </div>
    </div>
  );
}
