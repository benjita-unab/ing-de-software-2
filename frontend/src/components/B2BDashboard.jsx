import React, { useState } from "react";
import PagosCliente from "./PagosCliente";

// Mapeo estático para el demo: El ID del usuario en 'usuarios' se asocia al ID de la tabla 'clientes'
const DEMO_CLIENTE_ID = "99426706-6706-44aa-9954-3617b583bb0d"; // Empresa Demo

export default function B2BDashboard({ user, onSignOut }) {
  const [activeTab, setActiveTab] = useState("pagos");
  const [isLightMode, setIsLightMode] = useState(false);

  const theme = {
    bg: isLightMode ? "#f8fafc" : "#0a0e1a",
    text: isLightMode ? "#0f172a" : "#f1f5f9",
    navBg: isLightMode ? "#ffffff" : "rgba(15,23,42,0.6)",
    cardBg: isLightMode ? "#ffffff" : "rgba(15,23,42,0.4)",
    border: isLightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.05)",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: theme.bg,
        color: theme.text,
        fontFamily: "'Inter', sans-serif",
        display: "flex",
        flexDirection: "column",
        padding: "16px",
      }}
    >
      {/* TopBar Cliente */}
      <header
        style={{
          height: "64px",
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
          background: theme.navBg,
          borderRadius: "16px",
          border: `1px solid ${theme.border}`,
          marginBottom: "24px",
          boxShadow: isLightMode ? "0 4px 12px rgba(0,0,0,0.05)" : "none",
        }}
      >
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: "14px", fontWeight: 800, letterSpacing: "0.1em", color: "#0EA5E9" }}>
            PORTAL CLIENTE B2B
          </h1>
          <span style={{ fontSize: "11px", color: isLightMode ? "#64748b" : "#94a3b8" }}>
            Bienvenido, Empresa Demo
          </span>
        </div>

        <nav style={{ display: "flex", gap: "12px", marginRight: "32px" }}>
          <button
            onClick={() => setActiveTab("pagos")}
            style={{
              background: activeTab === "pagos" ? "#0EA5E9" : "transparent",
              color: activeTab === "pagos" ? "#fff" : theme.text,
              border: "none",
              padding: "8px 16px",
              borderRadius: "8px",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "13px",
              transition: "all 0.2s"
            }}
          >
            Mis Pagos
          </button>
          <button
            onClick={() => setActiveTab("despachos")}
            style={{
              background: activeTab === "despachos" ? "#0EA5E9" : "transparent",
              color: activeTab === "despachos" ? "#fff" : theme.text,
              border: "none",
              padding: "8px 16px",
              borderRadius: "8px",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "13px",
              transition: "all 0.2s"
            }}
          >
            Mis Despachos
          </button>
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button
            onClick={() => setIsLightMode(!isLightMode)}
            style={{
              background: "transparent",
              border: `1px solid ${theme.border}`,
              color: theme.text,
              padding: "6px 12px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "12px"
            }}
          >
            {isLightMode ? "🌙 Oscuro" : "☀️ Claro"}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #0EA5E9, #3a0ca3)",
                display: "grid",
                placeItems: "center",
                color: "#fff",
                fontWeight: "bold",
                fontSize: "14px"
              }}
            >
              E
            </div>
            <button
              onClick={onSignOut}
              style={{
                background: "#dc2626",
                color: "#fff",
                border: "none",
                padding: "6px 16px",
                borderRadius: "8px",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: "12px"
              }}
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main
        style={{
          background: theme.cardBg,
          border: `1px solid ${theme.border}`,
          borderRadius: "16px",
          padding: "24px",
          flex: 1,
        }}
      >
        {activeTab === "pagos" && (
          <div>
            <h2 style={{ fontSize: "18px", marginBottom: "8px", color: theme.text }}>Gestión Financiera</h2>
            <p style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "24px" }}>
              Visualiza tus servicios pendientes de cobro y tu historial de pagos emitidos.
            </p>
            <PagosCliente clienteId={DEMO_CLIENTE_ID} />
          </div>
        )}

        {activeTab === "despachos" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "400px" }}>
            <span style={{ fontSize: "48px", marginBottom: "16px" }}>🚚</span>
            <h3 style={{ margin: 0, color: theme.text }}>Módulo de Despachos en Desarrollo</h3>
            <p style={{ color: "#94a3b8", marginTop: "8px", fontSize: "14px" }}>
              Próximamente podrás ver el estado en vivo de tus entregas aquí.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
