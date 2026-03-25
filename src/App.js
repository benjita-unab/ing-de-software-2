// src/App.js
import React from "react";
import OperatorDashboard from "./components/OperatorDashboard";

// ── Operador de demo (acceso sin login) ────────────────────────
// Para reactivar el login, descomentar el bloque de abajo y
// eliminar las líneas del operador demo y el return directo.
// ──────────────────────────────────────────────────────────────
// import { useAuth } from "./hooks/useAuth";
// import LoginPage from "./components/LoginPage";

const DEMO_OPERATOR = {
  id: "00000000-0000-0000-0000-000000000001",
  full_name: "Operador Demo",
  email: "demo@logitrack.cl",
  branch: "Sucursal Central",
  role: "operator",
};

export default function App() {
  // Acceso directo sin autenticación — modo demo
  return (
    <OperatorDashboard
      operator={DEMO_OPERATOR}
      onSignOut={() => window.location.reload()}
    />
  );

  // ── Login con Supabase Auth (descomentar para reactivar) ────
  // const { session, operator, loading, signIn, signOut } = useAuth();
  // if (loading) return <div style={{ minHeight:"100vh", background:"#0a0e1a", display:"flex", alignItems:"center", justifyContent:"center", color:"#556", fontFamily:"'DM Mono',monospace", fontSize:"14px", flexDirection:"column", gap:"12px" }}><div style={{fontSize:"32px"}}>🚚</div><span>Cargando sesión...</span></div>;
  // if (!session) return <LoginPage onLogin={signIn} />;
  // return <OperatorDashboard operator={operator} onSignOut={signOut} />;
}
