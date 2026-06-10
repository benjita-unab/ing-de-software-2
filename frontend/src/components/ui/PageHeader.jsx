import React from "react";

export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="lt-page-header">
      <div>
        <h1 className="lt-page-header__title">{title}</h1>
        {subtitle && <p className="lt-page-header__subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="lt-page-header__actions">{actions}</div>}
    </div>
  );
}
