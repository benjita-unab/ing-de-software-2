// src/components/LoginPage.jsx
import React, { useEffect, useState } from "react";
import { getDemoCredentials } from "../lib/apiClient";
import {
  restablecerPassword,
  solicitarRecuperacionPassword,
} from "../lib/clientesService";
import { useTheme } from "../hooks/useTheme";
import ThemeToggle from "./ui/ThemeToggle";

export default function LoginPage({ onLogin, resetToken = null }) {
  const { isDark, toggleTheme } = useTheme();
  const demo = getDemoCredentials();
  const [email, setEmail] = useState(demo.email || "");
  const [password, setPassword] = useState(demo.password || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [modoRecuperacion, setModoRecuperacion] = useState(false);
  const [modoReset, setModoReset] = useState(Boolean(resetToken));
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");

  useEffect(() => {
    if (resetToken) {
      setModoReset(true);
    }
  }, [resetToken]);

  async function handleSubmit(e) {
    e.preventDefault();

    setLoading(true);
    setError("");
    const err = await onLogin(email.trim(), password);
    if (err) {
      const message =
        err instanceof Error ? err.message : String(err || "Error al iniciar sesión");
      setError(
        message === "Invalid login credentials"
          ? "Email o contraseña incorrectos."
          : message,
      );
    }
    setLoading(false);
  }

  async function handleForgotPassword(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");
    try {
      const res = await solicitarRecuperacionPassword(email.trim());
      setInfo(res.message || "Revise su correo para continuar.");
      setModoRecuperacion(false);
    } catch (err) {
      setError(err.message || "No se pudo solicitar la recuperación.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    if (nuevaPassword !== confirmarPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    setError("");
    setInfo("");
    try {
      const res = await restablecerPassword(resetToken, nuevaPassword);
      setInfo(res.message || "Contraseña actualizada. Ya puede iniciar sesión.");
      setModoReset(false);
      setNuevaPassword("");
      setConfirmarPassword("");
      if (typeof window !== "undefined") {
        window.history.replaceState({}, "", window.location.pathname);
      }
    } catch (err) {
      setError(err.message || "No se pudo restablecer la contraseña.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.wrapper}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 30px #1565c033; }
          50%       { box-shadow: 0 0 60px #1565c066; }
        }
        .login-input:focus {
          outline: none;
          border-color: var(--lt-accent) !important;
          box-shadow: 0 0 0 3px var(--lt-accent-muted);
        }
        .login-btn:hover:not(:disabled) {
          filter: brightness(1.15);
          transform: translateY(-1px);
        }
        .login-btn:active:not(:disabled) {
          transform: translateY(0);
        }
      `}</style>

      <div style={styles.bg} />

      <div style={styles.themeBar}>
        <ThemeToggle
          isDark={isDark}
          onToggle={toggleTheme}
          className="lt-btn lt-btn--secondary"
        />
      </div>

      <div style={styles.card}>
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={styles.logoIcon}>🚚</div>
          <div style={styles.logoTitle}>LogiTrack</div>
          <div style={styles.logoSub}>ACCESO AL PANEL WEB</div>
        </div>

        {modoReset && (
          <form onSubmit={handleResetPassword}>
            <p style={{ ...styles.helperText, marginBottom: 16 }}>
              Ingrese su nueva contraseña para el portal cliente.
            </p>
            <div style={styles.field}>
              <label style={styles.label}>Nueva contraseña</label>
              <input
                className="login-input"
                type="password"
                required
                minLength={6}
                value={nuevaPassword}
                onChange={(e) => setNuevaPassword(e.target.value)}
                style={styles.input}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Confirmar contraseña</label>
              <input
                className="login-input"
                type="password"
                required
                minLength={6}
                value={confirmarPassword}
                onChange={(e) => setConfirmarPassword(e.target.value)}
                style={styles.input}
              />
            </div>
            {error && (
              <div style={styles.errorBox} role="alert">
                ⚠️ {error}
              </div>
            )}
            {info && (
              <div style={{ ...styles.errorBox, background: "#22c55e14", borderColor: "#22c55e44", color: "#86efac" }}>
                {info}
              </div>
            )}
            <button className="login-btn" type="submit" disabled={loading} style={styles.button}>
              {loading ? "Guardando..." : "Restablecer contraseña"}
            </button>
          </form>
        )}

        {!modoReset && modoRecuperacion && (
          <form onSubmit={handleForgotPassword}>
            <p style={{ ...styles.helperText, marginBottom: 16 }}>
              Ingrese el correo de su cuenta portal. Le enviaremos un enlace de recuperación.
            </p>
            <div style={styles.field}>
              <label style={styles.label}>Correo electrónico</label>
              <input
                className="login-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
              />
            </div>
            {error && (
              <div style={styles.errorBox} role="alert">
                ⚠️ {error}
              </div>
            )}
            {info && (
              <div style={{ ...styles.errorBox, background: "#22c55e14", borderColor: "#22c55e44", color: "#86efac" }}>
                {info}
              </div>
            )}
            <button className="login-btn" type="submit" disabled={loading} style={styles.button}>
              {loading ? "Enviando..." : "Enviar enlace"}
            </button>
            <button
              type="button"
              className="lt-btn lt-btn--secondary login-btn"
              onClick={() => {
                setModoRecuperacion(false);
                setError("");
                setInfo("");
              }}
              style={styles.secondaryButton}
            >
              Volver al login
            </button>
          </form>
        )}

        {!modoReset && !modoRecuperacion && (
          <form onSubmit={handleSubmit}>
            <div style={styles.field}>
              <label style={styles.label}>Correo electrónico</label>
              <input
                className="login-input"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@empresa.cl"
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Contraseña</label>
              <input
                className="login-input"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={styles.input}
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setModoRecuperacion(true);
                setError("");
                setInfo("");
              }}
              style={{
                background: "none",
                border: "none",
                color: "var(--lt-accent)",
                fontSize: 12,
                cursor: "pointer",
                marginBottom: 12,
                padding: 0,
              }}
            >
              ¿Olvidó su contraseña?
            </button>

            {error && (
              <div style={styles.errorBox} role="alert">
                ⚠️ {error}
              </div>
            )}
            {info && (
              <div style={{ ...styles.errorBox, background: "#22c55e14", borderColor: "#22c55e44", color: "#86efac" }}>
                {info}
              </div>
            )}

            <button
              className="login-btn"
              type="submit"
              disabled={loading}
              style={{
                ...styles.button,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "⏳ Ingresando..." : "Iniciar Sesión →"}
            </button>
          </form>
        )}

        <p style={styles.footer}>
          ¿Problemas para ingresar? Contacta al administrador del sistema.
        </p>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: "100vh",
    background: "var(--lt-bg-page)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "var(--lt-font)",
    padding: "20px",
    position: "relative",
    overflow: "hidden",
  },
  bg: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(ellipse 60% 50% at 50% 0%, var(--lt-accent-muted) 0%, transparent 70%)," +
      "radial-gradient(ellipse 40% 40% at 80% 80%, var(--lt-info-bg) 0%, transparent 60%)",
    pointerEvents: "none",
  },
  themeBar: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 2,
  },
  card: {
    position: "relative",
    background: "var(--lt-bg-surface)",
    border: "1px solid var(--lt-border-strong)",
    borderRadius: "var(--lt-radius-xl)",
    padding: "44px 40px",
    width: "100%",
    maxWidth: "480px",
    animation: "fadeIn 0.5s ease",
    boxShadow: "var(--lt-shadow-md)",
  },
  logoIcon: {
    fontSize: "40px",
    marginBottom: "10px",
    display: "block",
  },
  logoTitle: {
    color: "var(--lt-text-primary)",
    fontWeight: 800,
    fontSize: "26px",
    letterSpacing: "-0.02em",
  },
  logoSub: {
    color: "var(--lt-text-secondary)",
    fontSize: "10px",
    fontFamily: "'DM Mono', monospace",
    letterSpacing: "0.18em",
    marginTop: "6px",
  },
  helperText: {
    color: "var(--lt-text-secondary)",
    fontSize: "10px",
    fontFamily: "'DM Mono', monospace",
  },
  field: {
    marginBottom: "18px",
  },
  label: {
    display: "block",
    color: "var(--lt-text-secondary)",
    fontSize: "11px",
    fontFamily: "'DM Mono', monospace",
    marginBottom: "8px",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  },
  input: {
    width: "100%",
    background: "var(--lt-bg-surface)",
    border: "1px solid var(--lt-border-strong)",
    borderRadius: "var(--lt-radius-md)",
    padding: "12px 16px",
    color: "var(--lt-text-primary)",
    fontSize: "14px",
    transition: "border-color 0.2s, box-shadow 0.2s",
    fontFamily: "var(--lt-font)",
  },
  errorBox: {
    marginBottom: "16px",
    padding: "11px 16px",
    borderRadius: "var(--lt-radius-md)",
    background: "var(--lt-danger-bg)",
    border: "1px solid color-mix(in srgb, var(--lt-danger) 30%, transparent)",
    color: "var(--lt-danger-text)",
    fontSize: "13px",
    fontFamily: "'DM Mono', monospace",
  },
  button: {
    width: "100%",
    background: "var(--lt-accent)",
    color: "#fff",
    border: "none",
    borderRadius: "var(--lt-radius-lg)",
    padding: "14px",
    fontSize: "15px",
    fontWeight: 700,
    fontFamily: "var(--lt-font)",
    transition: "filter 0.2s, transform 0.15s",
    letterSpacing: "0.02em",
    marginTop: "4px",
  },
  secondaryButton: {
    width: "100%",
    marginTop: 8,
    padding: "12px 16px",
    fontSize: "14px",
    fontWeight: 600,
    justifyContent: "center",
  },
  footer: {
    marginTop: "24px",
    textAlign: "center",
    color: "var(--lt-text-muted)",
    fontSize: "11px",
    fontFamily: "'DM Mono', monospace",
    lineHeight: 1.5,
  },
};
