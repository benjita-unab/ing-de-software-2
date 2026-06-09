import React from "react";

export default function Card({ children, className = "", style }) {
  return (
    <div className={`lt-card ${className}`.trim()} style={style}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, actions }) {
  return (
    <div className="lt-card__header">
      <div>
        {title && <h3 className="lt-card__title">{title}</h3>}
        {subtitle && <p className="lt-card__subtitle">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function CardBody({ children, flushTop = false, className = "" }) {
  return (
    <div className={`lt-card__body ${flushTop ? "lt-card__body--flush-top" : ""} ${className}`.trim()}>
      {children}
    </div>
  );
}
