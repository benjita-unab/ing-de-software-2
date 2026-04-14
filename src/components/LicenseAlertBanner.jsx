// src/components/LicenseAlertBanner.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Componente Banner para alertas de vencimiento de licencias
// Muestra un banner prominente y notificaciones tipo campanita
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from "react";
import "./LicenseAlertBanner.css";

function LicenseAlertBanner({ alerts = [], onMarkAsRead, onDismiss }) {
  const [visibleAlerts, setVisibleAlerts] = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    // Mostrar solo alertas de vencimiento de licencias/reviiones
    const licenseAlerts = alerts.filter(
      (a) =>
        a.tipo === "vencimiento_licencia" ||
        a.tipo === "vencimiento_revision_tecnica"
    );
    setVisibleAlerts(licenseAlerts);
  }, [alerts]);

  const handleMarkAsRead = (alertId) => {
    if (onMarkAsRead) {
      onMarkAsRead(alertId);
      setVisibleAlerts((prev) => prev.filter((a) => a.id !== alertId));
    }
  };

  const handleDismiss = (alertId) => {
    if (onDismiss) {
      onDismiss(alertId);
    }
    setVisibleAlerts((prev) => prev.filter((a) => a.id !== alertId));
  };

  if (visibleAlerts.length === 0) return null;

  const urgentCount = visibleAlerts.filter(
    (a) => a.prioridad === "Alta" || a.prioridad === "Crítica"
  ).length;

  return (
    <div className="license-alert-banner-container">
      {/* ── Notification Bell Icon ── */}
      <div className="bell-icon-container">
        <button
          className="bell-button"
          onClick={() => setShowDropdown(!showDropdown)}
          title={`${visibleAlerts.length} alerta${visibleAlerts.length !== 1 ? "s"} sin leer`}
        >
          <span className="bell-icon">🔔</span>
          {visibleAlerts.length > 0 && (
            <span className="notification-badge">{visibleAlerts.length}</span>
          )}
        </button>

        {/* Dropdown Menu */}
        {showDropdown && (
          <div className="alert-dropdown">
            <div className="dropdown-header">
              <h3>Alertas de Vencimientos</h3>
              <button
                className="close-btn"
                onClick={() => setShowDropdown(false)}
              >
                ✕
              </button>
            </div>

            <div className="alerts-list">
              {visibleAlerts.map((alert) => (
                <div key={alert.id} className={`alert-item priority-${alert.prioridad.toLowerCase()}`}>
                  <div className="alert-content">
                    <div className="alert-header">
                      <span className="priority-badge">{alert.prioridad}</span>
                      <span className="alert-type">
                        {alert.tipo === "vencimiento_licencia"
                          ? "🪪 Licencia"
                          : "🔧 Revisión Técnica"}
                      </span>
                    </div>
                    <p className="alert-description">{alert.descripcion}</p>
                    <div className="alert-meta">
                      {new Date(alert.fecha_creacion).toLocaleString("es-CL")}
                    </div>
                  </div>

                  <div className="alert-actions">
                    <button
                      className="action-btn mark-read"
                      onClick={() => handleMarkAsRead(alert.id)}
                      title="Marcar como leída"
                    >
                      ✓
                    </button>
                    <button
                      className="action-btn dismiss"
                      onClick={() => handleDismiss(alert.id)}
                      title="Descartar"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="dropdown-footer">
              <small>
                {urgentCount} alertas de alta prioridad
              </small>
            </div>
          </div>
        )}
      </div>

      {/* ── Main Banner (for first urgent alert) ── */}
      {visibleAlerts.length > 0 && visibleAlerts[0].prioridad === "Alta" && (
        <div className={`main-banner priority-${visibleAlerts[0].prioridad.toLowerCase()}`}>
          <div className="banner-icon">⚠️</div>
          <div className="banner-content">
            <h2 className="banner-title">Alerta Importante</h2>
            <p className="banner-message">{visibleAlerts[0].descripcion}</p>
          </div>
          <div className="banner-actions">
            <button
              className="banner-btn primary"
              onClick={() => handleMarkAsRead(visibleAlerts[0].id)}
            >
              He visto
            </button>
            <button
              className="banner-btn secondary"
              onClick={() => handleDismiss(visibleAlerts[0].id)}
            >
              Descartar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default LicenseAlertBanner;
