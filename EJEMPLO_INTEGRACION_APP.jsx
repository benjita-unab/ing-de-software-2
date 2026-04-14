// EJEMPLO DE INTEGRACIÓN EN App.js
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";
import "./App.css";

// ── Importar componentes del sistema de monitoreo ──
import LicenseMonitoringDashboard from "./components/LicenseMonitoringDashboard";
import LicenseAlertBanner from "./components/LicenseAlertBanner";
import useLicenseAlerts from "./hooks/useLicenseAlerts";

// ── Importar componentes existentes ──
import OperatorDashboard from "./components/OperatorDashboard";
import Sidebar from "./components/Sidebar";

/**
 * OPCIÓN 1: Dashboard Completo
 * Usa este componente si quieres un dashboard dedicado para monitoreo
 */
function AppWithFullDashboard() {
  return (
    <div className="app">
      <Sidebar />
      <main className="main-content">
        <LicenseMonitoringDashboard />
      </main>
    </div>
  );
}

/**
 * OPCIÓN 2: Banner Integrado en Header
 * Usa este componente si quieres mostrar las alertas en el header existente
 */
function AppWithBannerInHeader() {
  const { alerts, markAsRead, deleteAlert } = useLicenseAlerts();

  return (
    <div className="app">
      {/* Header con banner de alertas */}
      <header className="app-header">
        <div className="header-content">
          <h1>Logitrack - Panel de Administración</h1>
          <LicenseAlertBanner
            alerts={alerts}
            onMarkAsRead={markAsRead}
            onDismiss={deleteAlert}
          />
        </div>
      </header>

      <div className="app-body">
        <Sidebar />
        <main className="main-content">
          <OperatorDashboard />
        </main>
      </div>
    </div>
  );
}

/**
 * OPCIÓN 3: Ambos (Banner + Dashboard)
 * Para máximo control y visibilidad
 */
function AppWithBothComponents() {
  return (
    <div className="app">
      <Sidebar />
      <main className="main-content">
        {/* Banner flotante en la parte superior */}
        <div className="banner-section">
          <LicenseAlertBanner />
        </div>

        {/* Sección de monitoreo */}
        <section className="monitoreo-section">
          <LicenseMonitoringDashboard />
        </section>

        {/* Contenido principal */}
        <section className="dashboard-section">
          <OperatorDashboard />
        </section>
      </main>
    </div>
  );
}

/**
 * OPCIÓN 4: Uso del Hook Directamente
 * Para máxima personalización
 */
function AppCustomImplementation() {
  const {
    alerts,
    loading,
    error,
    markAsRead,
    deleteAlert,
    getStats,
  } = useLicenseAlerts();

  return (
    <div className="app">
      <Sidebar />
      <main className="main-content">
        {/* Tu componente personalizado */}
        <div className="custom-alerts-section">
          {loading && <div className="spinner">Cargando...</div>}

          {error && (
            <div className="error-message">
              Error: {error}
            </div>
          )}

          {alerts.length > 0 && (
            <div className="alerts-summary">
              <h2>⚠️ Tienes {alerts.length} alertas pendientes</h2>

              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`alert-card priority-${alert.prioridad.toLowerCase()}`}
                >
                  <div className="alert-body">
                    <h3>{alert.descripcion}</h3>
                    <small>
                      {new Date(alert.fecha_creacion).toLocaleString("es-CL")}
                    </small>
                  </div>

                  <div className="alert-buttons">
                    <button
                      onClick={() => markAsRead(alert.id)}
                      className="btn-success"
                    >
                      ✓ He visto
                    </button>
                    <button
                      onClick={() => deleteAlert(alert.id)}
                      className="btn-danger"
                    >
                      ✕ Descartar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT LA OPCIÓN QUE PREFIERAS
// ─────────────────────────────────────────────────────────────────────────────

// export default AppWithFullDashboard;           // Opción 1
// export default AppWithBannerInHeader;          // Opción 2
// export default AppWithBothComponents;          // Opción 3
export default AppCustomImplementation;          // Opción 4

// ─────────────────────────────────────────────────────────────────────────────
// CSS COMPLEMENTARIO (agrega a App.css)
// ─────────────────────────────────────────────────────────────────────────────

/*
.app-header {
  background: white;
  border-bottom: 1px solid #e0e0e0;
  padding: 12px 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1400px;
  margin: 0 auto;
}

.header-content h1 {
  margin: 0;
  font-size: 20px;
  color: #333;
}

.app-body {
  display: flex;
  height: calc(100vh - 60px);
}

.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.banner-section {
  margin-bottom: 20px;
}

.monitoreo-section {
  margin-bottom: 30px;
}

.dashboard-section {
  margin-top: 30px;
}

.custom-alerts-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.alerts-summary {
  margin-top: 16px;
}

.alert-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  margin-bottom: 12px;
  border-left: 4px solid;
  border-radius: 6px;
  background: #f8f9fa;
}

.alert-card.priority-alta {
  border-left-color: #ffc107;
  background: #fffbf0;
}

.alert-card.priority-critica {
  border-left-color: #dc3545;
  background: #fff5f5;
}

.alert-body {
  flex: 1;
}

.alert-body h3 {
  margin: 0 0 4px 0;
  font-size: 14px;
  color: #333;
}

.alert-body small {
  color: #999;
  font-size: 12px;
}

.alert-buttons {
  display: flex;
  gap: 8px;
  margin-left: 16px;
}

.btn-success,
.btn-danger {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  transition: all 0.2s;
}

.btn-success {
  background: #28a745;
  color: white;
}

.btn-success:hover {
  background: #218838;
  transform: translateY(-1px);
}

.btn-danger {
  background: #e74c3c;
  color: white;
}

.btn-danger:hover {
  background: #c0392b;
  transform: translateY(-1px);
}

.error-message {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #721c24;
  padding: 12px;
  border-radius: 4px;
  margin: 12px 0;
}

.spinner {
  text-align: center;
  padding: 20px;
  color: #666;
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .alert-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .alert-buttons {
    width: 100%;
    margin-left: 0;
    margin-top: 12px;
  }

  .alert-buttons button {
    flex: 1;
  }
}
*/
