// src/components/OperatorDashboard.jsx
// Layout principal del Operador — shell operacional con sidebar + dashboard

import React, { useState } from "react";
import ChatOperador from "./ChatOperador";
import Sidebar from "./Sidebar";
import DashboardOperational from "./DashboardOperational";
import AlertQueue from "./AlertQueue";
import AlertDetailPanel from "./AlertDetailPanel";
import AlertasConductor from "./AlertasConductor";
import MonitoreoLicencias from "./MonitoreoLicencias";
import Flota from "./Flota";
import RutasActivas from "./RutasActivas";
import GuiasDespacho from "./GuiasDespacho";
import Clientes from "./Clientes";
import HistorialDespachos from "./HistorialDespachos";
import ModulePage from "./ui/ModulePage";
import PageHeader from "./ui/PageHeader";
import { useAlerts } from "../hooks/useAlerts";
import { useAlertasConductor } from "../hooks/useAlertasConductor";
import { useTheme } from "../hooks/useTheme";

export default function OperatorDashboard({ operator, onSignOut }) {
  const { alerts, loading } = useAlerts();
  const {
    alertas,
    rutasMap,
    loading: alertasLoading,
    error: alertasError,
    acknowledgeAlerta,
    urgentCount,
  } = useAlertasConductor();
  const { isDark, toggleTheme } = useTheme();

  const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="lt-app-shell">
      <Sidebar
        activeSection={activeSection}
        onNavigate={setActiveSection}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
        urgentCount={urgentCount}
        operator={operator}
        onSignOut={onSignOut}
        isDark={isDark}
        onToggleTheme={toggleTheme}
      />

      <main className="lt-main">
        {activeSection === "dashboard" && (
          <div className="lt-main-scroll lt-main-scroll--dashboard">
            <DashboardOperational
              alerts={alerts}
              alertsLoading={loading}
              eventosConductor={alertas}
              operator={operator}
              onNavigate={setActiveSection}
              isDark={isDark}
            />
          </div>
        )}

        {activeSection === "alertas" && (
          <ModulePage
            title="Centro de alertas"
            subtitle="Estados y emergencias enviados desde la app del conductor"
            className="lt-module-page--mensajes"
          >
            <AlertasConductor
              mensajes={alertas}
              rutasMap={rutasMap}
              loading={alertasLoading}
              error={alertasError}
              acknowledgeMensaje={acknowledgeAlerta}
            />
          </ModulePage>
        )}

        {activeSection === "mensajes" && (
          <ModulePage
            title="Mensajes"
            subtitle="Comunicación operador ↔ conductor"
            className="lt-module-page--mensajes"
          >
            <ChatOperador />
          </ModulePage>
        )}

        {activeSection !== "alertas" &&
          activeSection !== "mensajes" &&
          activeSection !== "dashboard" && (
            <div className="lt-main-scroll">
              {activeSection === "rrhh" && (
                <ModulePage title="Recursos Humanos" subtitle="Monitoreo de licencias de conductores">
                  <MonitoreoLicencias />
                </ModulePage>
              )}
              {activeSection === "rutas" && (
                <ModulePage title="Rutas" subtitle="Gestión y seguimiento de rutas operativas">
                  <RutasActivas />
                </ModulePage>
              )}
              {activeSection === "clientes" && (
                <ModulePage title="Clientes" subtitle="Directorio de clientes y historial de despachos">
                  <Clientes />
                </ModulePage>
              )}
              {activeSection === "historial" && (
                <ModulePage title="Historial de despachos" subtitle="Consulta de entregas completadas y evidencias">
                  <HistorialDespachos />
                </ModulePage>
              )}
              {activeSection === "despachos" && (
                <ModulePage title="Rutas Activas" subtitle="Seguimiento de rutas activas y cierre de despachos">
                  <GuiasDespacho />
                </ModulePage>
              )}
              {activeSection === "camiones" && (
                <ModulePage title="Flota" subtitle="Gestión de choferes y vehículos">
                  <Flota operator={operator} />
                </ModulePage>
              )}
            </div>
          )}
      </main>
    </div>
  );
}

// Legacy incidencias UI (HU previa) — conservado para Fase 2+ / referencia
export function LegacyIncidenciasAlertPanel({
  alerts,
  loading,
  acknowledgeAlert,
  onResolve,
  selectedAlert,
  selectedAlertLive,
  onSelectAlert,
  operatorId,
}) {
  return (
    <div className="lt-module-page lt-module-page--ops-split">
      <PageHeader
        title="Centro de alertas (incidencias)"
        subtitle="Monitoreo y gestión de incidentes en tiempo real"
      />
      <div className="lt-module-split lt-module-split--nested">
        <div className="lt-module-split__queue">
          <AlertQueue
            alerts={alerts}
            loading={loading}
            onAcknowledge={acknowledgeAlert}
            onResolve={onResolve}
            onSelectAlert={onSelectAlert}
            selectedAlertId={selectedAlert?.id}
            operatorId={operatorId}
          />
        </div>
        <div className="lt-module-split__detail">
          <AlertDetailPanel
            alert={selectedAlertLive}
            onAcknowledge={acknowledgeAlert}
            onResolve={onResolve}
            currentOperatorId={operatorId}
          />
        </div>
      </div>
    </div>
  );
}
