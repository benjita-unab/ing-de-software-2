// src/hooks/useAuth.js
// ─────────────────────────────────────────────────────────────────────────────
// Hook de autenticación contra el backend NestJS (POST /api/auth/login).
// JWT: { sub: usuarios.id, email, role: usuarios.rol }
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

/** Normaliza rol del JWT (incluye legacy `mobile` / `operator`). */
function normalizeRole(role) {
  const r = String(role || "").toUpperCase();
  if (r === "ADMIN" || r === "OPERADOR" || r === "CONDUCTOR" || r === "CLIENTE") {
    return r;
  }
  if (r === "MOBILE" || r === "OPERATOR") return "OPERADOR";
  return "OPERADOR";
}

function branchLabelForRole(role) {
  switch (role) {
    case "ADMIN":
      return "Administración";
    case "CLIENTE":
      return "Portal cliente B2B";
    case "CONDUCTOR":
      return "Conductor";
    default:
      return "Panel gerente / operador";
  }
}

function userFromToken(token, fallbackEmail = "") {
  const payload = parseJwtPayload(token);
  const email = payload?.email || fallbackEmail || "";
  const role = normalizeRole(payload?.role);
  const clienteId =
    typeof payload?.clienteId === "string" && payload.clienteId.trim()
      ? payload.clienteId.trim()
      : null;
  const nameFromEmail = email ? email.split("@")[0] : "Usuario";
  return {
    id: payload?.sub || "",
    full_name: nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1),
    email,
    branch: branchLabelForRole(role),
    role,
    clienteId,
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
    setOperator(userFromToken(token));
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
      body: JSON.stringify({ email: email.trim(), password }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.accessToken) {
      const msg =
        payload?.message ||
        (Array.isArray(payload?.message) ? payload.message.join(" ") : null) ||
        payload?.error ||
        (response.status === 401
          ? "Email o contraseña incorrectos."
          : response.status === 403
            ? payload?.message ||
              "Tu usuario no tiene acceso al portal cliente configurado."
            : `No se pudo iniciar sesión (HTTP ${response.status}).`);
      return new Error(msg);
    }

    setAuthToken(payload.accessToken);
    setSession({ access_token: payload.accessToken });
    setOperator(userFromToken(payload.accessToken, email));
    return null;
  }

  async function signOut() {
    clearAuthToken();
    setSession(null);
    setOperator(null);
  }

  return { session, operator, loading, signIn, signOut };
}
