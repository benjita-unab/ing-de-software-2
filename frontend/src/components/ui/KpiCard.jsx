import React from "react";

export default function KpiCard({ icon: Icon, label, value, sub, color, bg, iconClass, trend }) {
  const trendColor =
    trend === "up"
      ? "var(--lt-success-text)"
      : trend === "down"
        ? "var(--lt-danger-text)"
        : "var(--lt-text-muted)";

  const iconBoxClass = iconClass
    ? `lt-kpi-card__icon ${iconClass}`
    : "lt-kpi-card__icon";

  return (
    <div className="lt-kpi-card">
      <div
        className={iconBoxClass}
        style={!iconClass && bg ? { background: bg } : undefined}
      >
        <Icon size={18} color={iconClass ? undefined : color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="lt-kpi-card__label">{label}</div>
        <div className="lt-kpi-card__value">{value}</div>
        {sub && (
          <div className="lt-kpi-card__sub" style={{ color: trendColor }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}
