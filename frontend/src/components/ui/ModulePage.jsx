import React from "react";
import PageHeader from "./PageHeader";

export default function ModulePage({ title, subtitle, actions, children, className = "" }) {
  return (
    <div className={`lt-module-page lt-scroll ${className}`.trim()}>
      {(title || subtitle || actions) && (
        <PageHeader title={title} subtitle={subtitle} actions={actions} />
      )}
      {children}
    </div>
  );
}
