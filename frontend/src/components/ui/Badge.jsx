import React from "react";

const VARIANT_CLASS = {
  accent: "lt-badge--accent",
  success: "lt-badge--success",
  warning: "lt-badge--warning",
  danger: "lt-badge--danger",
  info: "lt-badge--info",
  muted: "lt-badge--muted",
};

export default function Badge({ variant = "accent", children, showDot = true, className = "" }) {
  return (
    <span className={`lt-badge ${VARIANT_CLASS[variant] || VARIANT_CLASS.accent} ${className}`.trim()}>
      {showDot && <span className="lt-badge__dot" aria-hidden="true" />}
      {children}
    </span>
  );
}
