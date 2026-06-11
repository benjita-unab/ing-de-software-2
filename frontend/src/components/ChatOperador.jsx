import React, { useMemo, useState } from "react";
import { useChatRuta } from "../hooks/useChatRuta";
import ChatConversacionLista from "./ChatConversacionLista";
import ChatMensajeLista from "./ChatMensajeLista";
export default function ChatOperador() {
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

  return (
    <div className="lt-mensajes-split">
      <ChatConversacionLista
        conversaciones={conversaciones}
        selectedRutaId={selectedRutaId}
        onSelect={setSelectedRutaId}
        loading={loadingConversaciones}
        error={error}
      />

      <ChatMensajeLista
        conversacion={conversacionSeleccionada}
        mensajes={mensajes}
        loading={loadingMensajes}
        onSend={sendMensaje}
        sending={sending}
      />
    </div>
  );
}
