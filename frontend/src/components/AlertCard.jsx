import React, { useState } from "react";
import { MapPin, User, Truck, Clock, CheckCircle, ExternalLink } from "lucide-react";
import Badge from "./ui/Badge";

/** @legacy Tarjeta de incidencia. Usada solo por AlertQueue (incidencias legacy). */

const PRIORITY_VARIANT = {
  CRITICA: { variant: "danger", cardClass: "lt-alert-card--critical" },
  ALTA: { variant: "warning", cardClass: "lt-alert-card--high" },
  NORMAL: { variant: "info", cardClass: "lt-alert-card--normal" },
  BAJA: { variant: "muted", cardClass: "lt-alert-card--low" },
};

const STATUS_VARIANT = {
  PENDIENTE: "warning",
  EN_GESTION: "accent",
  RESUELTA: "success",
};

const STATUS_LABEL = {
  PENDIENTE: "Pendiente",
  EN_GESTION: "En gestión",
  RESUELTA: "Resuelta",
};

const ALERT_TYPE_LABELS = {
  DESVIO_RUTA: "Desvío de Ruta",
  BOTON_PANICO: "Botón de Pánico",
  ANOMALIA: "Anomalía en Ruta",
  MANTENCION: "Mantención Requerida",
  ALERTA: "Alerta Identificada",
  NORMAL: "Incidencia Normal",
  EMERGENCIA: "Emergencia Grave",
};

function formatTimestamp(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("es-CL", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function timeAgo(ts) {
  if (!ts) return "";
  const diff = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (diff < 60) return `hace ${diff}s`;
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
  return `hace ${Math.floor(diff / 3600)}h`;
}

function buildMapsLink(alert) {
  if (alert.lat && alert.lng) return `https://www.google.com/maps?q=${alert.lat},${alert.lng}`;
  if (alert.last_location_label) {
    return `https://www.google.com/maps/search/${encodeURIComponent(alert.last_location_label)}`;
  }
  return null;
}

export default function AlertCard({
  alert,
  onAcknowledge,
  onResolve,
  onSelect,
  currentOperatorId,
  isSelected = false,
}) {
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [ackError, setAckError] = useState(null);
  const [resolveError, setResolveError] = useState(null);

  const cfg = PRIORITY_VARIANT[alert.priority] ?? PRIORITY_VARIANT.NORMAL;
  const isPending = alert.status === "PENDIENTE";
  const isManaging = alert.status === "EN_GESTION";
  const mapsLink = buildMapsLink(alert);

  async function handleAcknowledge() {
    setAckError(null);
    setIsAcknowledging(true);
    try {
      const res = await onAcknowledge(alert.id, currentOperatorId);
      if (res && res.ok === false) {
        setAckError(res.message || "No se pudo registrar el acuse.");
      }
    } finally {
      setIsAcknowledging(false);
    }
  }

  async function handleResolve() {
    setResolveError(null);
    setIsResolving(true);
    try {
      const res = await onResolve(alert.id);
      if (res && res.ok === false) {
        setResolveError(res.message || "No se pudo marcar como resuelta.");
      }
    } finally {
      setIsResolving(false);
    }
  }

  return (
    <div
      className={`lt-alert-card ${cfg.cardClass} ${isSelected ? "lt-alert-card--selected" : ""}`}
      onClick={() => onSelect?.(alert)}
    >
      <div className="lt-alert-card__meta">
        <Badge variant={cfg.variant}>{alert.priority}</Badge>
        <Badge variant="muted" showDot={false}>
          {ALERT_TYPE_LABELS[alert.alert_type] ?? alert.alert_type}
        </Badge>
        <span style={{ marginLeft: "auto" }}>
          <Badge variant={STATUS_VARIANT[alert.status] || "muted"}>
            {STATUS_LABEL[alert.status] ?? alert.status}
          </Badge>
        </span>
      </div>

      <div className="lt-alert-card__grid">
        <Field icon={User} label="Conductor" value={alert.driver_name ?? "—"} />
        <Field icon={Truck} label="Patente" value={alert.vehicle_plate ?? "—"} highlight />
        <Field
          icon={MapPin}
          label="Ubicación"
          value={
            alert.last_location_label ??
            (alert.lat != null && alert.lng != null
              ? `${Number(alert.lat).toFixed(5)}, ${Number(alert.lng).toFixed(5)}`
              : "Sin datos")
          }
        />
        <Field
          icon={Clock}
          label="Evento"
          value={`${formatTimestamp(alert.created_at)} (${timeAgo(alert.created_at)})`}
        />
        {alert.acknowledged_by && (
          <Field icon={CheckCircle} label="Acusado por" value={`${alert.acknowledged_by} — ${formatTimestamp(alert.acknowledged_at)}`} />
        )}
      </div>

      {alert.description && (
        <p className="lt-alert-card__desc">{alert.description}</p>
      )}

      <div className="lt-alert-card__actions" onClick={(e) => e.stopPropagation()}>
        {mapsLink && (
          <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="lt-btn lt-btn--secondary">
            <ExternalLink size={13} />
            Ver ubicación
          </a>
        )}
        {isPending && (
          <button type="button" onClick={handleAcknowledge} disabled={isAcknowledging} className="lt-btn lt-btn--primary">
            {isAcknowledging ? "Procesando..." : "Acuse de recibo"}
          </button>
        )}
        {isManaging && (
          <button type="button" onClick={handleResolve} disabled={isResolving} className="lt-btn lt-btn--primary">
            {isResolving ? "Procesando..." : "Marcar resuelta"}
          </button>
        )}
        <button type="button" onClick={() => onSelect?.(alert)} className="lt-btn lt-btn--ghost">
          {isSelected ? "Seleccionada" : "Ver detalle"}
        </button>
      </div>

      {(ackError || resolveError) && (
        <div className="lt-alert-banner lt-alert-banner--error" role="alert" style={{ marginTop: 10 }}>
          {ackError || resolveError}
        </div>
      )}
    </div>
  );
}

function Field({ icon: Icon, label, value, highlight }) {
  return (
    <div>
      <div className="lt-alert-card__field-label">
        <Icon size={10} style={{ display: "inline", marginRight: 4, verticalAlign: -1 }} />
        {label}
      </div>
      <div className={`lt-alert-card__field-value ${highlight ? "lt-alert-card__field-value--mono" : ""}`}>
        {value}
      </div>
    </div>
  );
}
