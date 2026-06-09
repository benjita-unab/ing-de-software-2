import React from "react";

export default function Spinner({ message = "Cargando..." }) {
  return (
    <div className="lt-spinner-wrap" aria-live="polite" aria-busy="true">
      <div className="lt-spinner" />
      <p style={{ margin: 0, fontSize: 14, color: "var(--lt-text-muted)" }}>{message}</p>
    </div>
  );
}
