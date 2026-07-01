// src/components/OperatorDashboard.jsx
// Layout principal del Operador — shell operacional con sidebar + dashboard

import React, { useEffect, useState } from "react";
import {
  puedeVerDashboardFinanciero,
  puedeVerDashboardRentabilidad,
} from "../lib/rolePermissions";
import ChatOperador from "./ChatOperador";
import Sidebar from "./Sidebar";
import DashboardOperational from "./DashboardOperational";
import AlertQueue from "./AlertQueue";
import AlertDetailPanel from "./AlertDetailPanel";
import MonitoreoLicencias from "./MonitoreoLicencias";

import Flota from "./Flota";
import RutasActivas from "./RutasActivas";
import GuiasDespacho from "./GuiasDespacho";
import Clientes from "./Clientes";
import HistorialDespachos from "./HistorialDespachos";
import PagosCliente from "./PagosCliente";
import DashboardFinanciero from "./DashboardFinanciero";
import DashboardRentabilidad from "./DashboardRentabilidad";
import RutasPlantilla from "./RutasPlantilla";
import ModulePage from "./ui/ModulePage";

import PageHeader from "./ui/PageHeader";
import { useAlertasConductor } from "../hooks/useAlertasConductor";
import { useTheme } from "../hooks/useTheme";
import { UI_FEATURES } from "../lib/featureVisibility";

export default function OperatorDashboard({ operator, onSignOut }) {
  const {
    alertas,
    loading: alertasLoading,
    error: alertasError,
    acknowledgeAlerta,
    urgentCount,
  } = useAlertasConductor();
  const { isDark, toggleTheme } = useTheme();

  const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [pagosView, setPagosView] = useState("gestion");

  const mostrarFinanciero = puedeVerDashboardFinanciero(operator?.role);
  const mostrarRentabilidad = puedeVerDashboardRentabilidad(operator?.role);

  useEffect(() => {
    if (!UI_FEATURES.rutasPlantilla && activeSection === "rutas-plantilla") {
      setActiveSection("dashboard");
    }
  }, [activeSection]);

  useEffect(() => {
    if (activeSection === "alertas") {
      setActiveSection("mensajes");
    }
  }, [activeSection]);

  useEffect(() => {
    if (!mostrarFinanciero && pagosView === "financiero") {
      setPagosView("gestion");
    }
    if (!mostrarRentabilidad && pagosView === "rentabilidad") {
      setPagosView("gestion");
    }
  }, [mostrarFinanciero, mostrarRentabilidad, pagosView]);

  const pagosPageMeta =
    pagosView === "financiero"
      ? { title: "Financiero" }
      : pagosView === "rentabilidad"
        ? { title: "Rentabilidad" }
        : { title: "Pagos" };

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
              eventosConductor={alertas}
              urgentCount={urgentCount}
              operator={operator}
              onNavigate={setActiveSection}
              isDark={isDark}
            />
          </div>
        )}

        {activeSection === "mensajes" && (
          <ModulePage
            title="Mensajes"
            className="lt-module-page--mensajes lt-module-page--compact"
          >
            <ChatOperador
              alertas={alertas}
              alertasLoading={alertasLoading}
              alertasError={alertasError}
              acknowledgeAlerta={acknowledgeAlerta}
            />
          </ModulePage>
        )}

        {activeSection !== "mensajes" &&
          activeSection !== "dashboard" && (
            <div className="lt-main-scroll">
              {activeSection === "rrhh" && (
                <ModulePage title="RRHH" className="lt-module-page--compact">
                  <MonitoreoLicencias />
                </ModulePage>
              )}
              {UI_FEATURES.rutasPlantilla && activeSection === "rutas-plantilla" && (
                <ModulePage title="Plantillas de ruta" className="lt-module-page--compact">
                  <RutasPlantilla operator={operator} />
                </ModulePage>
              )}
              {activeSection === "rutas" && (
                <ModulePage title="Pedidos" className="lt-module-page--compact">
                  <RutasActivas />
                </ModulePage>
              )}

  {
    activeSection === "clientes" && (
      <ModulePage title="Clientes" className="lt-module-page--compact">
        <Clientes operator={operator} />
      </ModulePage>
    )
  }
  {
    activeSection === "pagos" && (
      <ModulePage
        title={pagosPageMeta.title}
        className="lt-module-page--compact"
        actions={
          <div className="lt-dashboard__map-filters">
            <button
              type="button"
              className={`lt-btn--filter ${pagosView === "gestion" ? "lt-btn--filter-active" : ""}`}
              onClick={() => setPagosView("gestion")}
            >
              Cobros
            </button>
            {mostrarFinanciero ? (
              <button
                type="button"
                className={`lt-btn--filter ${pagosView === "financiero" ? "lt-btn--filter-active" : ""}`}
                onClick={() => setPagosView("financiero")}
              >
                Resumen financiero
              </button>
            ) : null}
            {mostrarRentabilidad ? (
              <button
                type="button"
                className={`lt-btn--filter ${pagosView === "rentabilidad" ? "lt-btn--filter-active" : ""}`}
                onClick={() => setPagosView("rentabilidad")}
              >
                Resumen rentabilidad
              </button>
            ) : null}
          </div>
        }
      >
        {pagosView === "financiero" ? (
          <DashboardFinanciero />
        ) : pagosView === "rentabilidad" ? (
          <DashboardRentabilidad />
        ) : (
          <PagosCliente />
        )}
      </ModulePage>
    )
  }
  {
    activeSection === "historial" && (
      <ModulePage title="Historial" className="lt-module-page--compact">
        <HistorialDespachos />
      </ModulePage>
    )
  }
  {
    activeSection === "despachos" && (
      <ModulePage title="Despachos activos" className="lt-module-page--compact">
        <GuiasDespacho />
      </ModulePage>
    )
  }
  {
    activeSection === "camiones" && (
      <ModulePage title="Flota" className="lt-module-page--compact">
        <Flota operator={operator} />
      </ModulePage>
    )
  }
            </div >
          )
}
      </main >
    </div >
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
        subtitle="Incidentes en tiempo real"
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

