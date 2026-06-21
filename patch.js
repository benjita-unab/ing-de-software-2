const fs = require('fs');
let c = fs.readFileSync('frontend/src/components/CamionesFlota.jsx', 'utf8');
c = c.replace('import FormularioCamion from "./FormularioCamion";', 'import FormularioCamion from "./FormularioCamion";\nimport OccupancyBar from "./ui/OccupancyBar";');
c = c.replace('<td>{formatCapacidadKg(camion.capacidad_kg)}</td>', '<td><OccupancyBar slotsTotales={camion.slots} slotsUtilizados={camion.slots_utilizados} /><div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "4px" }}>Talla: {camion.talla || "DESCONOCIDO"}</div></td>');
fs.writeFileSync('frontend/src/components/CamionesFlota.jsx', c);
console.log('Patched');
