import React from "react";

export default function EmptyState({ icon: Icon, title, description, children }) {
  return (
    <div className="lt-empty-state">
      {Icon && (
        <div className="lt-empty-state__icon">
          <Icon size={28} />
        </div>
      )}
      {title && <p className="lt-empty-state__title">{title}</p>}
      {description && <p className="lt-empty-state__desc">{description}</p>}
      {children}
    </div>
  );
}
