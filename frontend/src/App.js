// src/App.js
import React from "react";
import { useAuth } from "./hooks/useAuth";
import LoginPage from "./components/LoginPage";
import OperatorDashboard from "./components/OperatorDashboard";
import B2BDashboard from "./components/B2BDashboard";

const loadingStyle = {
  minHeight: "100vh",
  background: "#0a0e1a",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#556",
  fontFamily: "'DM Mono', monospace",
  fontSize: "14px",
  flexDirection: "column",
  gap: "12px",
};

export default function App() {
  const { session, operator, loading, signIn, signOut } = useAuth();

  if (loading) {
    return (
      <div style={loadingStyle}>
        <div style={{ fontSize: "32px" }}>⏱️</div>
        <span>Cargando sesión...</span>
      </div>
    );
  }

  if (!session) {
    return <LoginPage onLogin={signIn} />;
  }

  // Verificar si es el usuario cliente B2B basado en el email asignado
  if (operator && operator.email === "portal.cliente@logitrack.cl") {
    return <B2BDashboard user={operator} onSignOut={signOut} />;
  }

  return <OperatorDashboard operator={operator} onSignOut={signOut} />;
}
