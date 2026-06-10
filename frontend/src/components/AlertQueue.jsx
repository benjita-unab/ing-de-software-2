import React, { useState } from "react";
import { Search, Bell } from "lucide-react";
import AlertCard from "./AlertCard";
import Badge from "./ui/Badge";
import Spinner from "./ui/Spinner";
import EmptyState from "./ui/EmptyState";
import { CheckCircle2 } from "lucide-react";

const FILTERS = ["TODAS", "PENDIENTE", "EN_GESTION", "RESUELTA"];

const PRIORITY_SECTIONS = [
  { key: "CRITICA", label: "Críticas", variant: "danger" },
  { key: "ALTA", label: "Alta prioridad", variant: "warning" },
  { key: "NORMAL", label: "Normales", variant: "info" },
  { key: "BAJA", label: "Baja prioridad", variant: "muted" },
];

export default function AlertQueue({
  alerts,
  loading,
  onAcknowledge,
  onResolve,
  onSelectAlert,
  selectedAlertId,
  operatorId,
}) {
  const [statusFilter, setStatusFilter] = useState("TODAS");
  const [searchText, setSearchText] = useState("");

  const filtered = alerts.filter((a) => {
    const matchStatus = statusFilter === "TODAS" || a.status === statusFilter;
    const matchSearch =
      !searchText ||
      a.driver_name?.toLowerCase().includes(searchText.toLowerCase()) ||
      a.vehicle_plate?.toLowerCase().includes(searchText.toLowerCase());
    return matchStatus && matchSearch;
  });

  const pendingCritical = alerts.filter(
    (a) => ["CRITICA", "ALTA"].includes(a.priority) && a.status === "PENDIENTE",
  ).length;

  return (
    <div className="lt-alert-queue">
      <div className="lt-alert-queue__header">
        <div className="lt-alert-queue__title-row">
          <Bell size={16} color="var(--lt-accent)" />
          <h2 className="lt-alert-queue__title">Cola de alertas</h2>
          {pendingCritical > 0 && (
            <Badge variant="danger">{pendingCritical} urgente{pendingCritical > 1 ? "s" : ""}</Badge>
          )}
          <span className="lt-alert-queue__count">
            {filtered.length} alerta{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="lt-search-wrap" style={{ marginBottom: 10 }}>
          <Search size={14} className="lt-search-icon" />
          <input
            className="lt-input alert-search-input"
            type="text"
            placeholder="Buscar conductor o patente..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>

        <div className="lt-alert-queue__filters">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              className={`lt-filter-chip ${statusFilter === f ? "lt-filter-chip--active" : ""}`}
              onClick={() => setStatusFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="lt-alert-queue__list lt-scroll">
        {loading ? (
          <Spinner message="Cargando alertas..." />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title={statusFilter === "TODAS" ? "Sin alertas activas" : `Sin alertas con estado "${statusFilter}"`}
            description="Las nuevas incidencias aparecerán aquí automáticamente."
          />
        ) : (
          PRIORITY_SECTIONS.map(({ key, label, variant }) => {
            const section = filtered.filter((a) => a.priority === key);
            if (section.length === 0) return null;
            return (
              <div key={key} style={{ marginBottom: 8 }}>
                <div className="lt-alert-section-title">
                  <Badge variant={variant} showDot={false}>{label}</Badge>
                  <span style={{ marginLeft: 6 }}>({section.length})</span>
                </div>
                {section.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    onAcknowledge={onAcknowledge}
                    onResolve={onResolve}
                    onSelect={onSelectAlert}
                    isSelected={alert.id === selectedAlertId}
                    currentOperatorId={operatorId}
                  />
                ))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
