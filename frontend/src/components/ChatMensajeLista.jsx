import React, { useEffect, useMemo, useRef, useState } from "react";
import { MessageSquare } from "lucide-react";
import { isUrgentAlerta } from "../lib/alertasConductorUtils";
import Card from "./ui/Card";
import Badge from "./ui/Badge";
import Spinner from "./ui/Spinner";
import EmptyState from "./ui/EmptyState";
import ChatInput from "./ChatInput";
import AlertasRutaTabla from "./AlertasRutaTabla";

function formatTimestamp(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export default function ChatMensajeLista({
  conversacion,
  mensajes = [],
  loading = false,
  onSend,
  sending = false,
  alertas = [],
  alertasLoading = false,
  alertasError = null,
  acknowledgeAlerta,
}) {
  const scrollRef = useRef(null);
  const [activeTab, setActiveTab] = useState("conversacion");

  const alertasRuta = useMemo(
    () => (conversacion?.ruta_id
      ? alertas.filter((a) => a.ruta_id === conversacion.ruta_id)
      : []),
    [alertas, conversacion?.ruta_id],
  );

  const alertasPendientes = useMemo(
    () => alertasRuta.filter(isUrgentAlerta).length,
    [alertasRuta],
  );

  useEffect(() => {
    setActiveTab("conversacion");
  }, [conversacion?.ruta_id]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [mensajes, conversacion?.ruta_id]);

  if (!conversacion) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="Selecciona una conversación"
        description="Elige una ruta a la izquierda para ver el historial de chat."
      />
    );
  }

  return (
    <div className="lt-mensajes-detail">
      <div className="lt-mensajes-detail__header">
        <div>
          <h3 className="lt-mensajes-detail__title">
            {conversacion.conductor || conversacion.codigo_ruta}
          </h3>
          <p className="lt-mensajes-detail__sub">
            {conversacion.conductor ? conversacion.codigo_ruta : "Sin conductor"}
            {conversacion.patente ? ` · ${conversacion.patente}` : ""}
          </p>
        </div>
      </div>

      <div className="lt-tabs" style={{ padding: "0 var(--lt-space-3)", flexShrink: 0 }}>
        <button
          type="button"
          className={`lt-tab ${activeTab === "conversacion" ? "lt-tab--active" : ""}`}
          onClick={() => setActiveTab("conversacion")}
        >
          Conversación
        </button>
        <button
          type="button"
          className={`lt-tab ${activeTab === "alertas" ? "lt-tab--active" : ""}`}
          onClick={() => setActiveTab("alertas")}
        >
          Alertas
          {alertasPendientes > 0 && (
            <span className="lt-tab__count">{alertasPendientes}</span>
          )}
        </button>
      </div>

      {activeTab === "conversacion" ? (
        <>
          <div ref={scrollRef} className="lt-mensajes-detail__table lt-scroll">
            {loading && mensajes.length === 0 ? (
              <Spinner label="Cargando mensajes..." />
            ) : mensajes.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title="Sin mensajes aún"
                description="Envía el primer mensaje para iniciar la conversación."
              />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--lt-space-3)" }}>
                {mensajes.map((mensaje) => {
                  const esOperador = mensaje.remitente_tipo === "OPERADOR";
                  return (
                    <Card
                      key={mensaje.id}
                      className="lt-module-card"
                      style={{
                        alignSelf: esOperador ? "flex-end" : "flex-start",
                        maxWidth: "85%",
                      }}
                    >
                      <div className="lt-card__body">
                        <div className="lt-toolbar" style={{ marginBottom: "var(--lt-space-2)" }}>
                          <Badge variant={esOperador ? "accent" : "info"} showDot={false}>
                            {esOperador ? "Operador" : "Conductor"}
                          </Badge>
                          <span style={{ fontSize: 12, color: "var(--lt-text-muted)" }}>
                            {formatTimestamp(mensaje.created_at)}
                          </span>
                        </div>
                        <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{mensaje.contenido}</p>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          <ChatInput onSend={onSend} sending={sending} disabled={!conversacion} />
          <p className="lt-mensajes-polling">Actualización automática cada 5 segundos</p>
        </>
      ) : (
        <>
          <AlertasRutaTabla
            mensajes={alertasRuta}
            loading={alertasLoading}
            error={alertasError}
            acknowledgeMensaje={acknowledgeAlerta}
          />
          <p className="lt-mensajes-polling">Actualización automática cada 10 segundos</p>
        </>
      )}
    </div>
  );
}
