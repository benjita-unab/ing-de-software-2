// src/components/OperatorDashboard.jsx
// Layout principal del Operador — shell operacional con sidebar + dashboard

import React, { useState, useEffect, useRef } from "react";
import Sidebar from "./Sidebar";
import DashboardOperational from "./DashboardOperational";
import AlertQueue from "./AlertQueue";
import AlertDetailPanel from "./AlertDetailPanel";
import MensajesConductor from "./MensajesConductor";
import MonitoreoLicencias from "./MonitoreoLicencias";
import Flota from "./Flota";
import RutasActivas from "./RutasActivas";
import GuiasDespacho from "./GuiasDespacho";
import Clientes from "./Clientes";
import HistorialDespachos from "./HistorialDespachos";
import ModulePage from "./ui/ModulePage";
import PageHeader from "./ui/PageHeader";
import { useAlerts } from "../hooks/useAlerts";
import { useMensajesConductor } from "../hooks/useMensajesConductor";
import { useTheme } from "../hooks/useTheme";

function playAlarmSound() {
  if (typeof window === "undefined") return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 800;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {
    console.warn("Audio context failed:", e);
  }
}

export default function OperatorDashboard({ operator, onSignOut }) {
  const { alerts, loading, acknowledgeAlert, resolveAlert: rawResolveAlert } = useAlerts();
  const { mensajes, rutasMap, loading: mensajesLoading, error: mensajesError, acknowledgeMensaje } = useMensajesConductor();
  const { isDark, toggleTheme } = useTheme();

  const [activeSection, setActiveSection] = useState("dashboard");
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const playedUrgentIdsRef = useRef(new Set());

  useEffect(() => {
    const urgentMessages = mensajes.filter(
      (m) => m.prioridad === "ALTA" && !m.acknowledged,
    );
    const newUrgent = urgentMessages.filter((m) => !playedUrgentIdsRef.current.has(m.id));
    if (newUrgent.length > 0) {
      playAlarmSound();
      newUrgent.forEach((m) => playedUrgentIdsRef.current.add(m.id));
    }
  }, [mensajes]);

  const handleResolveAlert = async (alertId) => {
    const res = await rawResolveAlert(alertId);
    if (res?.ok) {
      alert("El problema ya está resuelto y removido de la cola.");
      if (selectedAlert?.id === alertId) {
        setSelectedAlert(null);
      }
    } else if (res?.message) {
      alert(res.message);
    }
  };

  const urgentCount = alerts.filter(
    (a) => ["CRITICA", "ALTA"].includes(a.priority) && a.status === "PENDIENTE",
  ).length;

  const hasUnreadEmergencies = mensajes.some(
    (m) => m.prioridad === "ALTA" && !m.acknowledged,
  );

  const selectedAlertLive = selectedAlert
    ? alerts.find((a) => a.id === selectedAlert.id) ?? selectedAlert
    : null;

  return (
    <div className="lt-app-shell">
      <Sidebar
        activeSection={activeSection}
        onNavigate={setActiveSection}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
        urgentCount={urgentCount}
        hasUnreadEmergencies={hasUnreadEmergencies}
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
              mensajes={mensajes}
              operator={operator}
              onNavigate={setActiveSection}
              isDark={isDark}
            />
          </div>
        )}

        {activeSection === "alertas" && (
          <div className="lt-module-page lt-module-page--ops-split">
            <PageHeader
              title="Centro de alertas"
              subtitle="Monitoreo y gestión de incidentes en tiempo real"
            />
            <div className="lt-module-split lt-module-split--nested">
              <div className="lt-module-split__queue">
                <AlertQueue
                  alerts={alerts}
                  loading={loading}
                  onAcknowledge={acknowledgeAlert}
                  onResolve={handleResolveAlert}
                  onSelectAlert={setSelectedAlert}
                  selectedAlertId={selectedAlert?.id}
                  operatorId={operator?.id}
                />
              </div>
              <div className="lt-module-split__detail">
                <AlertDetailPanel
                  alert={selectedAlertLive}
                  onAcknowledge={acknowledgeAlert}
                  onResolve={handleResolveAlert}
                  currentOperatorId={operator?.id}
                />
              </div>
            </div>
          </div>
        )}

        {activeSection === "mensajes" && (
          <ModulePage
            title="Mensajes de conductores"
            subtitle="Estados rápidos enviados desde la app móvil"
            className="lt-module-page--mensajes"
          >
            <MensajesConductor
              mensajes={mensajes}
              rutasMap={rutasMap}
              loading={mensajesLoading}
              error={mensajesError}
              acknowledgeMensaje={acknowledgeMensaje}
            />
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
                <ModulePage title="Guías de despacho" subtitle="Seguimiento de guías y cierre de despachos">
                  <GuiasDespacho />
                </ModulePage>
              )}
              {activeSection === "camiones" && (
                <ModulePage title="Flota" subtitle="Gestión de choferes y vehículos">
                  <Flota />
                </ModulePage>
              )}
            </div>
          )}
      </main>
    </div>
  );
}
