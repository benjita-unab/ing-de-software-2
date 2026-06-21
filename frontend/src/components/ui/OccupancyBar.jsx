import React from 'react';

export default function OccupancyBar({ slotsUtilizados = 0, slotsTotales = 96, className = '' }) {
  const maxSlots = Math.max(Number(slotsTotales) || 96, 1);
  const usados = Math.max(0, Math.min(Number(slotsUtilizados) || 0, maxSlots));
  const porcentaje = Math.round((usados / maxSlots) * 100);

  let colorClass = 'lt-bg-success';
  if (porcentaje >= 90) {
    colorClass = 'lt-bg-danger';
  } else if (porcentaje >= 75) {
    colorClass = 'lt-bg-warning';
  }

  return (
    <div className={`occupancy-bar-container ${className}`} style={{ minWidth: '120px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px', color: '#64748b' }}>
        <span>{usados} / {maxSlots} slots</span>
        <span style={{ fontWeight: 600 }}>{porcentaje}%</span>
      </div>
      <div 
        style={{ 
          height: '8px', 
          width: '100%', 
          backgroundColor: '#e2e8f0', 
          borderRadius: '4px', 
          overflow: 'hidden' 
        }}
      >
        <div 
          className={colorClass}
          style={{ 
            height: '100%', 
            width: `${porcentaje}%`, 
            transition: 'width 0.3s ease',
            backgroundColor: porcentaje >= 90 ? '#ef4444' : porcentaje >= 75 ? '#f59e0b' : '#10b981'
          }} 
        />
      </div>
    </div>
  );
}
