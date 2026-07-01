// src/App.js
import React from "react";
import { useAuth } from "./hooks/useAuth";
import LoginPage from "./components/LoginPage";
import OperatorDashboard from "./components/OperatorDashboard";
import ClientPortalShell from "./components/ClientPortalShell";

const loadingStyle = {
  minHeight: "100vh",
  background: "var(--lt-bg-page)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--lt-text-secondary)",
  fontFamily: "var(--lt-font)",
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
    const resetToken =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("resetToken")
        : null;
    return <LoginPage onLogin={signIn} resetToken={resetToken} />;
  }

  if (operator?.role === "CLIENTE") {
    return <ClientPortalShell user={operator} onSignOut={signOut} />;
  }

  return <OperatorDashboard operator={operator} onSignOut={signOut} />;
}
