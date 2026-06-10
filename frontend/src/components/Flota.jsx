import React, { useState } from "react";
import { Truck } from "lucide-react";
import ChoferesFlota from "./ChoferesFlota";
import EmptyState from "./ui/EmptyState";

const TABS = [
  { id: "choferes", label: "Choferes" },
  { id: "camiones", label: "Camiones" },
];

export default function Flota() {
  const [activeTab, setActiveTab] = useState("choferes");

  return (
    <div className="lt-module-inner">
      <div className="lt-tabs">
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

      {activeTab === "choferes" && <ChoferesFlota />}

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
