// src/components/LoginPage.jsx
import React, { useState } from "react";

export default function LoginPage({ onLogin }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const err = await onLogin(email, password);
    if (err) setError(err.message);
    setLoading(false);
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
          border-color: #1565c0 !important;
          box-shadow: 0 0 0 3px #1565c022;
        }
        .login-btn:hover:not(:disabled) {
          filter: brightness(1.15);
          transform: translateY(-1px);
        }
        .login-btn:active:not(:disabled) {
          transform: translateY(0);
        }
      `}</style>

      {/* Fondo con gradiente animado */}
      <div style={styles.bg} />

      <div style={styles.card}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <div style={styles.logoIcon}>🚚</div>
          <div style={styles.logoTitle}>LogiTrack</div>
          <div style={styles.logoSub}>PANEL OPERADOR DE SUCURSAL</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label style={styles.label}>Correo electrónico</label>
            <input
              className="login-input"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="operador@empresa.cl"
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
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={styles.input}
            />
          </div>

          {error && (
            <div style={styles.errorBox}>
              ⚠️{" "}
              {error === "Invalid login credentials"
                ? "Email o contraseña incorrectos."
                : error}
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
    background: "#0a0e1a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Syne', sans-serif",
    padding: "20px",
    position: "relative",
    overflow: "hidden",
  },
  bg: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(ellipse 60% 50% at 50% 0%, #1565c018 0%, transparent 70%)," +
      "radial-gradient(ellipse 40% 40% at 80% 80%, #0d47a112 0%, transparent 60%)",
    pointerEvents: "none",
  },
  card: {
    position: "relative",
    background: "#0d1221",
    border: "1px solid #1e2a3a",
    borderRadius: "20px",
    padding: "44px 40px",
    width: "100%",
    maxWidth: "420px",
    animation: "fadeIn 0.5s ease, glow 4s infinite",
    boxShadow: "0 24px 80px #00000088",
  },
  logoIcon: {
    fontSize: "40px",
    marginBottom: "10px",
    display: "block",
  },
  logoTitle: {
    color: "#fff",
    fontWeight: 800,
    fontSize: "26px",
    letterSpacing: "-0.02em",
  },
  logoSub: {
    color: "#334",
    fontSize: "10px",
    fontFamily: "'DM Mono', monospace",
    letterSpacing: "0.18em",
    marginTop: "6px",
  },
  field: {
    marginBottom: "18px",
  },
  label: {
    display: "block",
    color: "#556",
    fontSize: "11px",
    fontFamily: "'DM Mono', monospace",
    marginBottom: "8px",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  },
  input: {
    width: "100%",
    background: "#111827",
    border: "1px solid #1e2a3a",
    borderRadius: "10px",
    padding: "12px 16px",
    color: "#fff",
    fontSize: "14px",
    transition: "border-color 0.2s, box-shadow 0.2s",
    fontFamily: "'Syne', sans-serif",
  },
  errorBox: {
    marginBottom: "16px",
    padding: "11px 16px",
    borderRadius: "10px",
    background: "#ff174412",
    border: "1px solid #ff174444",
    color: "#ff6b6b",
    fontSize: "13px",
    fontFamily: "'DM Mono', monospace",
  },
  button: {
    width: "100%",
    background: "linear-gradient(135deg, #1565c0 0%, #1976d2 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    padding: "14px",
    fontSize: "15px",
    fontWeight: 700,
    fontFamily: "'Syne', sans-serif",
    transition: "filter 0.2s, transform 0.15s",
    letterSpacing: "0.02em",
    marginTop: "4px",
  },
  footer: {
    marginTop: "24px",
    textAlign: "center",
    color: "#2a3444",
    fontSize: "11px",
    fontFamily: "'DM Mono', monospace",
    lineHeight: 1.5,
  },
};
