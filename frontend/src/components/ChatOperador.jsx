import React, { useMemo, useState } from "react";
import { isUrgentAlerta } from "../lib/alertasConductorUtils";
import { useChatRuta } from "../hooks/useChatRuta";
import ChatConversacionLista from "./ChatConversacionLista";
import ChatMensajeLista from "./ChatMensajeLista";

export default function ChatOperador({
  alertas = [],
  alertasLoading = false,
  alertasError = null,
  acknowledgeAlerta,
}) {
  const [selectedRutaId, setSelectedRutaId] = useState(null);
  const {
    conversaciones,
    mensajes,
    loadingConversaciones,
    loadingMensajes,
    error,
    sending,
    sendMensaje,
  } = useChatRuta(selectedRutaId);

  const conversacionSeleccionada = useMemo(
    () => conversaciones.find((c) => c.ruta_id === selectedRutaId) ?? null,
    [conversaciones, selectedRutaId],
  );

  const urgentByRutaId = useMemo(() => {
    const map = {};
    alertas.forEach((item) => {
      if (!isUrgentAlerta(item) || !item.ruta_id) return;
      map[item.ruta_id] = (map[item.ruta_id] || 0) + 1;
    });
    return map;
  }, [alertas]);

  return (
    <div className="lt-mensajes-split">
      <ChatConversacionLista
        conversaciones={conversaciones}
        selectedRutaId={selectedRutaId}
        onSelect={setSelectedRutaId}
        loading={loadingConversaciones}
        error={error}
        urgentByRutaId={urgentByRutaId}
      />

      <ChatMensajeLista
        conversacion={conversacionSeleccionada}
        mensajes={mensajes}
        loading={loadingMensajes}
        onSend={sendMensaje}
        sending={sending}
        alertas={alertas}
        alertasLoading={alertasLoading}
        alertasError={alertasError}
        acknowledgeAlerta={acknowledgeAlerta}
      />
    </div>
  );
}
