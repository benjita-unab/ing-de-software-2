// src/App.js
import React from "react";
import { useAuth } from "./hooks/useAuth";
import LoginPage from "./components/LoginPage";
import OperatorDashboard from "./components/OperatorDashboard";
import ClientPortalShell from "./components/ClientPortalShell";

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
        <div style={{ fontSize: "32px" }}>🚚</div>
        <span>Cargando sesión...</span>
      </div>
    );
  }

  if (!session) {
    return <LoginPage onLogin={signIn} />;
  }

  if (operator?.role === "CLIENTE") {
    return <ClientPortalShell user={operator} onSignOut={signOut} />;
  }

  return <OperatorDashboard operator={operator} onSignOut={signOut} />;
}
