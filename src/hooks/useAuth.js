// src/hooks/useAuth.js
// ─────────────────────────────────────────────────────────────────────────────
// Hook de autenticación contra el backend NestJS (POST /api/auth/login).
// Persiste el token en localStorage en ambas claves para mantener
// compatibilidad con código legado:
//   - "accessToken"
//   - "logitrack_access_token"
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import {
  getApiBaseUrl,
  getAuthToken,
  setAuthToken,
  clearAuthToken,
} from "../lib/apiClient";

export function useAuth() {
  const [session, setSession] = useState(null);
  const [operator, setOperator] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      return;
    }
    setSession({ access_token: token, user: { id: "operator" } });
    setOperator({
      id: "operator",
      full_name: "Operador",
      branch: "",
      role: "operator",
    });
    setLoading(false);
  }, []);

  async function signIn(email, password) {
    const apiUrl = getApiBaseUrl();
    if (!apiUrl) {
      return new Error("Falta REACT_APP_API_URL o NEXT_PUBLIC_API_URL.");
    }

    const response = await fetch(`${apiUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.accessToken) {
      return new Error(
        payload?.message || payload?.error || "Credenciales inválidas",
      );
    }

    setAuthToken(payload.accessToken);
    setSession({ access_token: payload.accessToken, user: payload.user });
    setOperator({
      id: payload.user?.id || "operator",
      full_name:
        payload.user?.user_metadata?.full_name ||
        payload.user?.email ||
        "Operador",
      branch: "",
      role: payload.user?.role || "operator",
    });
    return null;
  }

  async function signOut() {
    clearAuthToken();
    setSession(null);
    setOperator(null);
  }

  return { session, operator, loading, signIn, signOut };
}
