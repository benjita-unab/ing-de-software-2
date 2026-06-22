import React, { useMemo, useState } from "react";
import { Search, MessageSquare } from "lucide-react";
import Badge from "./ui/Badge";
import Spinner from "./ui/Spinner";
import EmptyState from "./ui/EmptyState";

function formatTimestamp(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function ChatConversacionLista({
  conversaciones = [],
  selectedRutaId,
  onSelect,
  loading = false,
  error = null,
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversaciones;
    return conversaciones.filter((conv) => {
      const haystack = [
        conv.codigo_ruta,
        conv.conductor,
        conv.patente,
        conv.ultimo_mensaje,
        conv.ruta_id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [conversaciones, search]);

  return (
    <aside className="lt-mensajes-conversations">
      <div className="lt-mensajes-conversations__search">
        <Search size={14} className="lt-search-icon" />
        <input
          type="search"
          className="lt-input"
          placeholder="Buscar ruta, conductor o patente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && (
        <div className="lt-alert-banner lt-alert-banner--error" style={{ margin: "12px" }}>
          {error}
        </div>
      )}

      <div className="lt-mensajes-conversations__list lt-scroll">
        {loading && conversaciones.length === 0 ? (
          <Spinner label="Cargando conversaciones..." />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="Sin conversaciones"
            description="Cuando operador o conductor envíen un mensaje, aparecerá aquí."
          />
        ) : (
          filtered.map((conv) => {
            const isActive = selectedRutaId === conv.ruta_id;
            const hasUnread = conv.cantidad_no_leidos > 0;
            return (
              <button
                key={conv.ruta_id}
                type="button"
                className={`lt-mensajes-conv-item ${isActive ? "lt-mensajes-conv-item--active" : ""} ${hasUnread ? "lt-mensajes-conv-item--urgent" : ""}`}
                onClick={() => onSelect?.(conv.ruta_id)}
              >
                <div className="lt-mensajes-conv-item__title">{conv.codigo_ruta}</div>
                <div className="lt-mensajes-conv-item__meta">
                  <span>
                    {conv.ultimo_mensaje
                      ? conv.ultimo_mensaje.substring(0, 48) +
                        (conv.ultimo_mensaje.length > 48 ? "…" : "")
                      : "Sin mensajes"}
                  </span>
                  {hasUnread ? (
                    <Badge variant="danger" showDot={false}>
                      {conv.cantidad_no_leidos}
                    </Badge>
                  ) : (
                    <span>{formatTimestamp(conv.fecha_ultimo_mensaje)}</span>
                  )}
                </div>
                {(conv.conductor || conv.patente) && (
                  <div className="lt-mensajes-conv-item__meta" style={{ marginTop: 4 }}>
                    <span>
                      {[conv.conductor, conv.patente].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
