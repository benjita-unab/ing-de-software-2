import React from "react";

// #97 HU19: Badge reutilizable para módulos en desarrollo.
export default function Badge({ text = "WIP" }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2px 8px",
        borderRadius: "999px",
        border: "1px solid #ff980055",
        background: "linear-gradient(135deg, #ffb30022, #ff980033)",
        color: "#ffb74d",
        fontSize: "10px",
        fontWeight: 700,
        letterSpacing: "0.04em",
        fontFamily: "'DM Mono', monospace",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}
