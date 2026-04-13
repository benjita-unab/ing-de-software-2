import React from "react";

// #99 HU19: Vista dedicada para rutas/módulos aún no implementados.
export default function WIPView({ moduleLabel }) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        color: "#778",
      }}
    >
      <div style={{ fontSize: "52px" }}>🚧</div>
      <h2
        style={{
          margin: 0,
          color: "#fff",
          fontSize: "24px",
          fontWeight: 700,
          fontFamily: "'Syne', sans-serif",
        }}
      >
        Módulo en Desarrollo
      </h2>
      <p
        style={{
          margin: 0,
          color: "#889",
          fontSize: "13px",
          fontFamily: "'DM Mono', monospace",
        }}
      >
        {moduleLabel
          ? `El módulo "${moduleLabel}" estará disponible próximamente.`
          : "Esta funcionalidad estará disponible próximamente."}
      </p>
    </div>
  );
}
