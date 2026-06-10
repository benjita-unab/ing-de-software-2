import { useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./components/dashboard/Dashboard";
import { Alerts } from "./components/alerts/Alerts";
import { Routes } from "./components/routes/Routes";
import { Fleet } from "./components/fleet/Fleet";
import { Clients } from "./components/clients/Clients";
import { RRHH } from "./components/rrhh/RRHH";
import { Messages } from "./components/messages/Messages";
import { Assign } from "./components/assign/Assign";
import { Guides } from "./components/guides/Guides";
import { History } from "./components/history/History";

type Module =
  | "dashboard"
  | "alerts"
  | "routes"
  | "assign"
  | "guides"
  | "history"
  | "clients"
  | "rrhh"
  | "fleet"
  | "messages";

const moduleComponents: Record<Module, React.ComponentType> = {
  dashboard: Dashboard,
  alerts: Alerts,
  routes: Routes,
  assign: Assign,
  guides: Guides,
  history: History,
  clients: Clients,
  rrhh: RRHH,
  fleet: Fleet,
  messages: Messages,
};

export default function App() {
  const [activeModule, setActiveModule] = useState<Module>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const ActiveComponent = moduleComponents[activeModule];

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        fontFamily: "Inter, sans-serif",
        background: "#F7F8FC",
      }}
    >
      <Sidebar
        active={activeModule}
        onNavigate={(module) => setActiveModule(module as Module)}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
        alertCount={3}
      />

      <main
        style={{
          flex: 1,
          height: "100vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <ActiveComponent />
      </main>
    </div>
  );
}
