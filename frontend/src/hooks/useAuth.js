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

function parseJwtPayload(token) {
  try {
    const segment = token.split(".")[1];
    if (!segment) return null;
    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join(""),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function operatorFromToken(token, fallbackEmail = "") {
  const payload = parseJwtPayload(token);
  const email = payload?.email || fallbackEmail || "";
  const nameFromEmail = email ? email.split("@")[0] : "Operador";
  return {
    id: payload?.sub || email || "operator",
    full_name: nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1),
    email,
    branch: "Panel gerente / operador",
    role: payload?.role || "operator",
  };
}

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
    setSession({ access_token: token });
    setOperator(operatorFromToken(token));
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
      const msg =
        payload?.message ||
        (Array.isArray(payload?.message) ? payload.message.join(" ") : null) ||
        payload?.error ||
        (response.status === 401
          ? "Email o contraseña incorrectos."
          : `No se pudo iniciar sesión (HTTP ${response.status}).`);
      return new Error(msg);
    }

    setAuthToken(payload.accessToken);
    setSession({ access_token: payload.accessToken });
    setOperator(operatorFromToken(payload.accessToken, email));
    return null;
  }

  async function signOut() {
    clearAuthToken();
    setSession(null);
    setOperator(null);
  }

  return { session, operator, loading, signIn, signOut };
}
