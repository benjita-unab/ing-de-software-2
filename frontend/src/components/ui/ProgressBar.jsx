import React from "react";

export default function ProgressBar({ value = 0, color = "var(--lt-accent)" }) {
  const clamped = Math.min(100, Math.max(0, Number(value) || 0));
  return (
    <div className="lt-progress">
      <div className="lt-progress__bar" style={{ width: `${clamped}%`, background: color }} />
    </div>
  );
}
