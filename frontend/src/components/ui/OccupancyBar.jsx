import React from 'react';

export default function OccupancyBar({ slotsUtilizados = 0, slotsTotales = 96, className = '' }) {
  const maxSlots = Math.max(Number(slotsTotales) || 96, 1);
  const usados = Math.max(0, Math.min(Number(slotsUtilizados) || 0, maxSlots));
  const porcentaje = Math.round((usados / maxSlots) * 100);

  let fillClass = 'lt-occupancy-bar__fill--ok';
  if (porcentaje >= 90) {
    fillClass = 'lt-occupancy-bar__fill--danger';
  } else if (porcentaje >= 75) {
    fillClass = 'lt-occupancy-bar__fill--warn';
  }

  return (
    <div className={`occupancy-bar-container ${className}`} style={{ minWidth: '120px' }}>
      <div className="lt-occupancy-bar__meta">
        <span>{usados} / {maxSlots} slots</span>
        <span style={{ fontWeight: 600 }}>{porcentaje}%</span>
      </div>
      <div className="lt-occupancy-bar__track">
        <div
          className={`lt-occupancy-bar__fill ${fillClass}`}
          style={{ width: `${porcentaje}%` }}
        />
      </div>
    </div>
  );
}
