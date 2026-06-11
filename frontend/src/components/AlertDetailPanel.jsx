import React, { useState } from "react";
import {
  Bell, User, Truck, MapPin, Clock, CheckCircle, Flag,
  ExternalLink, FileText,
} from "lucide-react";
import Badge from "./ui/Badge";
import EmptyState from "./ui/EmptyState";

/** @legacy Panel de detalle de incidencia. Usado solo por LegacyIncidenciasAlertPanel. */

const PRIORITY_VARIANT = {
  CRITICA: "danger",
  ALTA: "warning",
  NORMAL: "info",
  BAJA: "muted",
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
  if (alert.lat && alert.long) {
    return `https://www.google.com/maps?q=${alert.lat},${alert.long}`;
  }
  if (alert.lat && alert.lng) {
    return `https://www.google.com/maps?q=${alert.lat},${alert.lng}`;
  }
  if (alert.last_location_label) {
    return `https://www.google.com/maps/search/${encodeURIComponent(alert.last_location_label)}`;
  }
  return null;
}

export default function AlertDetailPanel({ alert, onAcknowledge, onResolve, currentOperatorId }) {
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [ackError, setAckError] = useState(null);
  const [resolveError, setResolveError] = useState(null);

  if (!alert) {
    return (
      <div className="lt-alert-detail lt-alert-detail--empty">
        <EmptyState
          icon={Bell}
          title="Selecciona una alerta"
          description="Haz clic en una alerta de la cola para ver su detalle completo y gestionarla."
        />
      </div>
    );
  }

  const isPending = alert.status === "PENDIENTE";
  const isManaging = alert.status === "EN_GESTION";
  const mapsLink = buildMapsLink(alert);
  const lat = alert.lat ?? null;
  const lng = alert.long ?? alert.lng ?? null;

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
    <div className="lt-alert-detail">
      <div className="lt-alert-detail__header">
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <Badge variant={PRIORITY_VARIANT[alert.priority] || "info"}>{alert.priority}</Badge>
          <Badge variant="muted" showDot={false}>
            {ALERT_TYPE_LABELS[alert.alert_type] ?? alert.alert_type}
          </Badge>
          <span style={{ marginLeft: "auto" }}>
            <Badge variant={STATUS_VARIANT[alert.status] || "muted"}>
              {STATUS_LABEL[alert.status] ?? alert.status}
            </Badge>
          </span>
        </div>
        <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 700, color: "var(--lt-text-primary)" }}>
          {ALERT_TYPE_LABELS[alert.alert_type] ?? alert.alert_type}
        </h2>
        <p style={{ margin: 0, fontSize: 12, color: "var(--lt-text-muted)" }}>
          ID #{String(alert.id).slice(0, 8).toUpperCase()} · {formatTimestamp(alert.created_at)} ({timeAgo(alert.created_at)})
        </p>
      </div>

      <div className="lt-alert-detail__body lt-scroll">
        <Section title="Vehículo y conductor">
          <InfoRow icon={User} label="Conductor" value={alert.driver_name ?? "—"} />
          <InfoRow icon={Truck} label="Patente" value={alert.vehicle_plate ?? "—"} highlight />
        </Section>

        <Section title="Ubicación">
          <InfoRow
            icon={MapPin}
            label="Coordenadas"
            value={
              alert.last_location_label ??
              (lat && lng ? `${lat}, ${lng}` : "Sin datos de ubicación")
            }
          />
          {lat && lng && (
            <div style={{ marginTop: 12, borderRadius: 8, overflow: "hidden", border: "1px solid var(--lt-border)" }}>
              <iframe
                title="Mapa de ubicación de incidencia"
                width="100%"
                height="200"
                style={{ border: 0, display: "block" }}
                loading="lazy"
                allowFullScreen
                src={`https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`}
              />
            </div>
          )}
          {mapsLink ? (
            <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="lt-btn lt-btn--secondary" style={{ marginTop: 12 }}>
              <ExternalLink size={14} />
              Ver ubicación en Google Maps
            </a>
          ) : (
            <p className="lt-empty" style={{ marginTop: 12, padding: 12 }}>
              Datos de GPS no disponibles aún
            </p>
          )}
        </Section>

        {alert.description && (
          <Section title="Descripción del evento">
            <p className="lt-alert-card__desc">
              <FileText size={14} style={{ display: "inline", marginRight: 6, verticalAlign: -2 }} />
              {alert.description}
            </p>
          </Section>
        )}

        {alert.acknowledged_by && (
          <Section title="Registro de gestión">
            <InfoRow icon={CheckCircle} label="Acusado por" value={alert.acknowledged_by} />
            <InfoRow icon={Clock} label="Hora de acuse" value={formatTimestamp(alert.acknowledged_at)} />
            {alert.resolved_at && (
              <InfoRow icon={Flag} label="Resuelto a las" value={formatTimestamp(alert.resolved_at)} />
            )}
          </Section>
        )}
      </div>

      <div className="lt-alert-detail__footer">
        <div className="lt-form-actions" style={{ marginTop: 0 }}>
          {isPending && (
            <button
              id="btn-acuse-recibo"
              type="button"
              onClick={handleAcknowledge}
              disabled={isAcknowledging}
              className="lt-btn lt-btn--primary"
            >
              {isAcknowledging ? "Procesando..." : "Acuse de recibo"}
            </button>
          )}
          {isManaging && (
            <button
              id="btn-marcar-resuelta"
              type="button"
              onClick={handleResolve}
              disabled={isResolving}
              className="lt-btn lt-btn--primary"
            >
              {isResolving ? "Procesando..." : "Marcar como resuelta"}
            </button>
          )}
          {!isPending && !isManaging && (
            <p style={{ margin: 0, fontSize: 13, color: "var(--lt-text-muted)" }}>
              Esta alerta ya fue resuelta.
            </p>
          )}
        </div>
        {(ackError || resolveError) && (
          <div className="lt-alert-banner lt-alert-banner--error" role="alert" style={{ marginTop: 10 }}>
            {ackError || resolveError}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="lt-alert-detail__section">
      <div className="lt-alert-detail__section-title">{title}</div>
      {children}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, highlight }) {
  return (
    <div className="lt-info-row">
      <span className="lt-info-row__label">
        <Icon size={12} style={{ display: "inline", marginRight: 6, verticalAlign: -2 }} />
        {label}
      </span>
      <span className={`lt-info-row__value ${highlight ? "lt-info-row__value--highlight" : ""}`}>
        {value}
      </span>
    </div>
  );
}
