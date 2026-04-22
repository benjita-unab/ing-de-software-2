// src/hooks/useAuth.js
// ─────────────────────────────────────────────────────────────────────────────
// Hook de autenticación con Supabase Auth.
// Maneja sesión, perfil del operador, login y logout.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";

export function useAuth() {
  const [session, setSession] = useState(null);
  const [operator, setOperator] = useState(null);
  const [loading, setLoading] = useState(true);
  const API_URL = (process.env.REACT_APP_API_URL || process.env.NEXT_PUBLIC_API_URL || "")
    .replace(/\/$/, "")
    .replace(/\/api$/, "");

  useEffect(() => {
    const token = localStorage.getItem("logitrack_access_token");
    if (!token) {
      setLoading(false);
      return;
    }
    setSession({ access_token: token, user: { id: "operator" } });
    setOperator({
      id: "operator",
      full_name: "Operador",
      branch: "",
      role: "operator"
    });
    setLoading(false);
  }, []);

  async function signIn(email, password) {
    if (!API_URL) {
      return new Error("Falta REACT_APP_API_URL o NEXT_PUBLIC_API_URL.");
    }
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return new Error(payload?.error || "Credenciales inválidas");
    }
    localStorage.setItem("logitrack_access_token", payload.accessToken);
    setSession({ access_token: payload.accessToken, user: payload.user });
    setOperator({
      id: payload.user?.id || "operator",
      full_name: payload.user?.user_metadata?.full_name || payload.user?.email || "Operador",
      branch: "",
      role: payload.user?.role || "operator"
    });
    return null;
  }

  async function signOut() {
    localStorage.removeItem("logitrack_access_token");
    setSession(null);
    setOperator(null);
  }

  return { session, operator, loading, signIn, signOut };
}
