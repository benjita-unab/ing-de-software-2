import React, { useState } from "react";
import { Send } from "lucide-react";

export default function ChatInput({ onSend, sending = false, disabled = false }) {
  const [texto, setTexto] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    const contenido = texto.trim();
    if (!contenido || sending || disabled) return;

    const result = await onSend?.(contenido);
    if (result?.ok !== false) {
      setTexto("");
    }
  };

  return (
    <form className="lt-toolbar" onSubmit={handleSubmit}>
      <input
        type="text"
        className="lt-input"
        placeholder="Escribe un mensaje..."
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        disabled={disabled || sending}
        maxLength={2000}
        aria-label="Mensaje de chat"
      />
      <button
        type="submit"
        className="lt-btn lt-btn--primary"
        disabled={disabled || sending || !texto.trim()}
      >
        <Send size={14} />
        Enviar
      </button>
    </form>
  );
}
