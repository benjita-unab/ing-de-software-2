const fs = require('fs');
let c = fs.readFileSync('frontend/src/components/DetalleCamionModal.jsx', 'utf8');

c = c.replace('import FormularioCamion from "./FormularioCamion";', 'import FormularioCamion from "./FormularioCamion";\nimport OccupancyBar from "./ui/OccupancyBar";');

c = c.replace('{ label: "Capacidad (kg)", value: formatCapacidadKg(camionActual.capacidad_kg) },', '{ label: "Capacidad (slots)", value: camionActual.slots },\n    { label: "Talla", value: camionActual.talla || "DESCONOCIDO" },\n    { label: "Ocupación", customValue: <OccupancyBar slotsTotales={camionActual.slots} slotsUtilizados={camionActual.slots_utilizados} /> },');

c = c.replace(`{fila.badge ? (
                      <Badge variant={fila.badge.variant} showDot={false}>
                        {fila.badge.texto}
                      </Badge>
                    ) : (
                      fila.value
                    )}`, `{fila.badge ? (
                      <Badge variant={fila.badge.variant} showDot={false}>
                        {fila.badge.texto}
                      </Badge>
                    ) : fila.customValue ? (
                      fila.customValue
                    ) : (
                      fila.value
                    )}`);

fs.writeFileSync('frontend/src/components/DetalleCamionModal.jsx', c);
console.log('Patched DetalleCamionModal');
