import React, { useState } from "react";
import CamionesFlota from "./CamionesFlota";
import ChoferesFlota from "./ChoferesFlota";
import { ConfiguracionPagosButton } from "./ConfiguracionPagosModal";

const TABS = [
  { id: "choferes", label: "Conductores" },
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

        {activeTab === "choferes" && (
          <ConfiguracionPagosButton
            operator={operator}
            onConfigGuardada={() => setConfigVersion((v) => v + 1)}
          />
        )}
      </div>

      {activeTab === "choferes" && (
        <ChoferesFlota configPagosVersion={configVersion} />
      )}

      {activeTab === "camiones" && <CamionesFlota operator={operator} />}
    </div>
  );
}
