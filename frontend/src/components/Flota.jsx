import React, { useState } from "react";
import { Truck } from "lucide-react";
import ChoferesFlota from "./ChoferesFlota";
import { ConfiguracionPagosButton } from "./ConfiguracionPagosModal";
import EmptyState from "./ui/EmptyState";

const TABS = [
  { id: "choferes", label: "Choferes" },
  { id: "camiones", label: "Camiones" },
];

export default function Flota({ operator }) {
  const [activeTab, setActiveTab] = useState("choferes");
  const [configVersion, setConfigVersion] = useState(0);

  return (
    <div className="lt-module-inner">
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div className="lt-tabs" style={{ marginBottom: 0 }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`lt-tab ${activeTab === tab.id ? "lt-tab--active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <ConfiguracionPagosButton
          operator={operator}
          onConfigGuardada={() => setConfigVersion((v) => v + 1)}
        />
      </div>

      {activeTab === "choferes" && (
        <ChoferesFlota configPagosVersion={configVersion} />
      )}

      {activeTab === "camiones" && (
        <EmptyState
          icon={Truck}
          title="Funcionalidad disponible en HU-39"
          description="La gestión de camiones se habilitará en una próxima historia de usuario."
        />
      )}
    </div>
  );
}
