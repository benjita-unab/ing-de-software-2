// src/components/LicenseMonitoringDashboard.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Dashboard principal para monitoreo de licencias y revisiones técnicas
// Muestra alertas, estadísticas y permite gestionar las notificaciones
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from "react";
import LicenseAlertBanner from "./LicenseAlertBanner";
import useLicenseAlerts from "../hooks/useLicenseAlerts";
import "./LicenseMonitoringDashboard.css";

function LicenseMonitoringDashboard() {
  const {
    alerts,
    loading,
    error,
    markAsRead,
    deleteAlert,
    getStats,
  } = useLicenseAlerts();

  const [stats, setStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      const statsData = await getStats();
      setStats(statsData);
    };
    fetchStats();
  }, [getStats, alerts]);

  const handleAlertRead = async (alertId) => {
    await markAsRead(alertId);
  };

  const handleAlertDismiss = async (alertId) => {
    await deleteAlert(alertId);
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setRefreshing(false);
  };

  if (error && !alerts.length) {
    return (
      <div className="monitoring-dashboard">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h3>Error en el Sistema de Monitoreo</h3>
          <p>{error}</p>
          <p style={{ fontSize: "12px", color: "#999" }}>
            Verifica que el backend esté corriendo en {process.env.REACT_APP_BACKEND_URL || "http://localhost:3001"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="monitoring-dashboard">
      <div className="dashboard-container">
        {/* Header */}
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Monitoreo de Licencias</h1>
            <p className="dashboard-subtitle">
              Control del vencimiento de licencias de conducción y revisiones técnicas
            </p>
          </div>
          <button
            className={`refresh-btn ${refreshing ? "refreshing" : ""}`}
            onClick={handleManualRefresh}
            disabled={refreshing}
            title="Actualizar alertas"
          >
            🔄
          </button>
        </div>

        {/* Banner de Alertas Principal */}
        <LicenseAlertBanner
          alerts={alerts}
          onMarkAsRead={handleAlertRead}
          onDismiss={handleAlertDismiss}
        />

        {/* Estadísticas Grid */}
        {stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">🔴</div>
              <div className="stat-content">
                <div className="stat-value">{stats.unreadCount}</div>
                <div className="stat-label">No Leídas</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">📋</div>
              <div className="stat-content">
                <div className="stat-value">{stats.totalCount}</div>
                <div className="stat-label">Total</div>
              </div>
            </div>

            <div className="stat-card critical-card">
              <div className="stat-icon">🚨</div>
              <div className="stat-content">
                <div className="stat-value">{stats.byPriority.Crítica}</div>
                <div className="stat-label">Críticas</div>
              </div>
            </div>

            <div className="stat-card warning-card">
              <div className="stat-icon">⚠️</div>
              <div className="stat-content">
                <div className="stat-value">{stats.byPriority.Alta}</div>
                <div className="stat-label">Alta</div>
              </div>
            </div>
          </div>
        )}

        {/* Información de Loading */}
        {loading && (
          <div className="loading-container">
            <span className="spinner"></span>
            <span>Actualizando alertas...</span>
          </div>
        )}

        {/* Mensaje cuando no hay alertas */}
        {!loading && alerts.length === 0 && (
          <div className="success-container">
            <div className="success-icon">✅</div>
            <h3>Sistema Funcionando Correctamente</h3>
            <p>No hay alertas activas. Todas las licencias y revisiones técnicas están al día.</p>
            <p style={{ fontSize: "12px", color: "#888" }}>
              Próxima verificación automática en menos de 30 segundos
            </p>
          </div>
        )}

        {/* Lista detallada de alertas (si las hay) */}
        {!loading && alerts.length > 0 && (
          <div className="alerts-list-section">
            <h3 className="section-title">Alertas Activas ({alerts.length})</h3>
            <div className="alerts-detailed-list">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`alert-list-item priority-${alert.prioridad.toLowerCase()}`}
                >
                  <div className="alert-list-icon">
                    {alert.tipo === "vencimiento_licencia" ? "🪪" : "🔧"}
                  </div>
                  <div className="alert-list-content">
                    <div className="alert-list-header">
                      <span className="alert-list-type">
                        {alert.tipo === "vencimiento_licencia"
                          ? "Licencia de Conducción"
                          : "Revisión Técnica"}
                      </span>
                      <span className="alert-list-time">
                        {new Date(alert.fecha_creacion).toLocaleString("es-CL", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="alert-list-description">{alert.descripcion}</p>
                  </div>
                  <div className="alert-list-actions">
                    <button
                      className="small-btn check"
                      onClick={() => handleAlertRead(alert.id)}
                      title="Marcar como leída"
                    >
                      ✓
                    </button>
                    <button
                      className="small-btn close"
                      onClick={() => handleAlertDismiss(alert.id)}
                      title="Descartar"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default LicenseMonitoringDashboard;
