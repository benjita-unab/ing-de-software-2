// src/components/LoginPage.jsx
import React, { useState } from "react";
import { getDemoCredentials } from "../lib/apiClient";

const ROLES = [
  {
    id: "operador",
    label: "Gerente / Operador",
    description: "Rutas, clientes, mensajes e incidencias",
    icon: "🚚",
    available: true,
  },
  {
    id: "cliente",
    label: "Cliente B2B",
    description: "Gestión de pagos y despachos",
    icon: "📦",
    available: true,
  },
  {
    id: "admin",
    label: "Administrador",
    description: "Configuración global (próximamente)",
    icon: "⚙️",
    available: false,
  },
];

export default function LoginPage({ onLogin }) {
  const demo = getDemoCredentials();
  const [selectedRole, setSelectedRole] = useState("operador");
  const [email, setEmail] = useState(demo.email || "");
  const [password, setPassword] = useState(demo.password || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (selectedRole !== "operador" && selectedRole !== "cliente") return;

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

  function handleRoleSelect(role) {
    setSelectedRole(role.id);
    if (!role.available) {
      setError("Este acceso estará disponible en una próxima versión.");
      return;
    }
    setError("");
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
        .role-card:hover {
          border-color: #2a4a6a !important;
        }
        .role-card.active {
          border-color: #1565c0 !important;
          background: #1565c014 !important;
        }
        .role-card.disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
      `}</style>

      <div style={styles.bg} />

      <div style={styles.card}>
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={styles.logoIcon}>🚚</div>
          <div style={styles.logoTitle}>LogiTrack</div>
          <div style={styles.logoSub}>ACCESO AL PANEL WEB</div>
        </div>

        <div style={styles.roleGrid}>
          {ROLES.map((role) => (
            <button
              key={role.id}
              type="button"
              className={`role-card ${selectedRole === role.id ? "active" : ""} ${!role.available ? "disabled" : ""}`}
              onClick={() => handleRoleSelect(role)}
              style={styles.roleCard}
            >
              <span style={{ fontSize: "22px" }}>{role.icon}</span>
              <span style={styles.roleLabel}>{role.label}</span>
              <span style={styles.roleDesc}>{role.description}</span>
              {!role.available && (
                <span style={styles.roleBadge}>Próximamente</span>
              )}
            </button>
          ))}
        </div>

        {["operador", "cliente"].includes(selectedRole) && (
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
                placeholder={selectedRole === "cliente" ? "portal.cliente@logitrack.cl" : "operador@empresa.cl"}
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

            {error && (
              <div style={styles.errorBox} role="alert">
                ⚠️ {error}
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

        {!["operador", "cliente"].includes(selectedRole) && error && (
          <div style={{ ...styles.errorBox, marginTop: 0 }} role="alert">
            ❌ {error}
          </div>
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
    maxWidth: "480px",
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
  roleGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "10px",
    marginBottom: "24px",
  },
  roleCard: {
    display: "grid",
    gridTemplateColumns: "auto 1fr",
    gridTemplateRows: "auto auto",
    columnGap: "12px",
    rowGap: "2px",
    alignItems: "center",
    textAlign: "left",
    width: "100%",
    background: "#111827",
    border: "1px solid #1e2a3a",
    borderRadius: "12px",
    padding: "12px 14px",
    cursor: "pointer",
    transition: "border-color 0.2s, background 0.2s",
  },
  roleLabel: {
    color: "#e2e8f0",
    fontSize: "13px",
    fontWeight: 700,
    gridColumn: 2,
  },
  roleDesc: {
    color: "#556",
    fontSize: "10px",
    fontFamily: "'DM Mono', monospace",
    gridColumn: 2,
  },
  roleBadge: {
    gridColumn: "1 / -1",
    justifySelf: "start",
    marginTop: "4px",
    marginLeft: "34px",
    fontSize: "9px",
    color: "#78909c",
    fontFamily: "'DM Mono', monospace",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
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
