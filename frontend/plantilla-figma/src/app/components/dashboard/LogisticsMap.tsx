import { useState, useEffect } from "react";
import { Navigation, MapPin, Truck, Package, AlertTriangle } from "lucide-react";

const vehicles = [
  { id: "V-01", x: 28, y: 38, driver: "Carlos M.", route: "Santiago → Valparaíso", status: "en_ruta", speed: 87, eta: "14:35", cargo: "Electrónica" },
  { id: "V-02", x: 52, y: 55, driver: "Ana R.", route: "Santiago → Rancagua", status: "en_ruta", speed: 94, eta: "15:10", cargo: "Alimentos" },
  { id: "V-03", x: 68, y: 28, driver: "Pedro L.", route: "Valparaíso → La Serena", status: "alerta", speed: 0, eta: "17:45", cargo: "Industrial" },
  { id: "V-04", x: 75, y: 65, driver: "Martina V.", route: "Santiago → Concepción", status: "en_ruta", speed: 105, eta: "18:20", cargo: "Retail" },
  { id: "V-05", x: 42, y: 72, driver: "Diego S.", route: "Rancagua → Talca", status: "en_ruta", speed: 78, eta: "16:55", cargo: "Farmacéutico" },
];

const routes = [
  { from: { x: 22, y: 45 }, to: { x: 62, y: 22 }, color: "#7C6CF6", active: true },
  { from: { x: 45, y: 50 }, to: { x: 78, y: 70 }, color: "#34D399", active: true },
  { from: { x: 65, y: 25 }, to: { x: 82, y: 15 }, color: "#F59E0B", active: false },
  { from: { x: 40, y: 68 }, to: { x: 60, y: 82 }, color: "#7C6CF6", active: true },
];

const deliveryPoints = [
  { x: 62, y: 22, label: "Valparaíso", type: "destination" },
  { x: 78, y: 70, label: "Concepción", type: "destination" },
  { x: 82, y: 15, label: "La Serena", type: "destination" },
  { x: 60, y: 82, label: "Talca", type: "destination" },
  { x: 22, y: 45, label: "Hub SCL", type: "hub" },
];

const cityRoads = [
  // Major highways
  { x1: 15, y1: 20, x2: 85, y2: 20 },
  { x1: 15, y1: 45, x2: 85, y2: 45 },
  { x1: 15, y1: 70, x2: 85, y2: 70 },
  { x1: 20, y1: 10, x2: 20, y2: 90 },
  { x1: 45, y1: 10, x2: 45, y2: 90 },
  { x1: 70, y1: 10, x2: 70, y2: 90 },
  // Secondary roads
  { x1: 32, y1: 20, x2: 20, y2: 45 },
  { x1: 45, y1: 45, x2: 70, y2: 20 },
  { x1: 70, y1: 45, x2: 85, y2: 70 },
  { x1: 45, y1: 70, x2: 20, y2: 90 },
  { x1: 58, y1: 45, x2: 70, y2: 70 },
  { x1: 32, y1: 45, x2: 45, y2: 70 },
];

function VehicleDot({ vehicle, onClick, selected }: { vehicle: typeof vehicles[0]; onClick: () => void; selected: boolean }) {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(p => !p);
    }, 1800 + Math.random() * 600);
    return () => clearInterval(interval);
  }, []);

  const color = vehicle.status === "alerta" ? "#EF4444" : vehicle.status === "en_ruta" ? "#7C6CF6" : "#34D399";

  return (
    <g
      transform={`translate(${vehicle.x}, ${vehicle.y})`}
      style={{ cursor: "pointer" }}
      onClick={onClick}
    >
      {/* Pulse ring - reduced size */}
      <circle
        r={pulse ? 6 : 4.5}
        fill={color}
        opacity={pulse ? 0.12 : 0.22}
        style={{ transition: "all 1.8s ease" }}
      />
      {/* Vehicle dot - reduced size */}
      <circle
        r={selected ? 5 : 3.8}
        fill={color}
        stroke="#fff"
        strokeWidth={selected ? 2 : 1.5}
        style={{ filter: `drop-shadow(0 1.5px 3px ${color}50)`, transition: "all 0.2s" }}
      />
      {/* Truck icon - smaller */}
      <text
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="4.5"
        fill="#fff"
        fontWeight="bold"
      >
        🚛
      </text>
      {/* ID label - repositioned above to avoid route label collisions */}
      {selected && (
        <g transform="translate(0, -12)">
          <rect x="-14" y="-7" width="28" height="12" rx="3.5" fill="#0F0F1A" opacity="0.9" />
          <text textAnchor="middle" dominantBaseline="middle" fontSize="5" fill="#fff" fontWeight="600" fontFamily="Inter">
            {vehicle.id}
          </text>
        </g>
      )}
    </g>
  );
}

export function LogisticsMap() {
  const [selected, setSelected] = useState<string | null>("V-01");
  const [animOffset, setAnimOffset] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimOffset(o => (o + 1) % 100);
    }, 80);
    return () => clearInterval(interval);
  }, []);

  const selectedVehicle = vehicles.find(v => v.id === selected);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: "#F8F9FF", borderRadius: 16, overflow: "hidden" }}>
      {/* Map SVG */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        <defs>
          <pattern id="grid" width="5" height="5" patternUnits="userSpaceOnUse">
            <path d="M 5 0 L 0 0 0 5" fill="none" stroke="#E8E8F0" strokeWidth="0.3" />
          </pattern>
          <filter id="glow">
            <feGaussianBlur stdDeviation="0.8" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect width="100" height="100" fill="#F0F2FC" />
        <rect width="100" height="100" fill="url(#grid)" />

        {/* Water/ocean area */}
        <ellipse cx="5" cy="50" rx="12" ry="45" fill="#E0E8F8" opacity="0.6" />
        <ellipse cx="95" cy="50" rx="8" ry="40" fill="#E0E8F8" opacity="0.4" />

        {/* Urban areas */}
        <rect x="38" y="38" width="16" height="16" rx="2" fill="#E8E6FF" opacity="0.5" />
        <rect x="60" y="60" width="12" height="12" rx="2" fill="#E8E6FF" opacity="0.4" />
        <rect x="14" y="35" width="10" height="14" rx="2" fill="#E8E6FF" opacity="0.4" />

        {/* Road network */}
        {cityRoads.map((road, i) => (
          <line
            key={i}
            x1={road.x1} y1={road.y1}
            x2={road.x2} y2={road.y2}
            stroke="#D4D4E8"
            strokeWidth="0.6"
            strokeLinecap="round"
          />
        ))}

        {/* Highway highlights */}
        <line x1="20" y1="10" x2="20" y2="90" stroke="#C8C8E0" strokeWidth="1.2" />
        <line x1="45" y1="10" x2="45" y2="90" stroke="#C8C8E0" strokeWidth="1.2" />
        <line x1="15" y1="45" x2="85" y2="45" stroke="#C8C8E0" strokeWidth="1.2" />

        {/* Active route paths - improved visibility */}
        {routes.filter(r => r.active).map((route, i) => (
          <g key={i}>
            {/* Shadow - lighter for better visibility */}
            <line
              x1={route.from.x} y1={route.from.y}
              x2={route.to.x} y2={route.to.y}
              stroke={route.color}
              strokeWidth="2.2"
              strokeLinecap="round"
              opacity="0.12"
            />
            {/* Route line - slightly thicker */}
            <line
              x1={route.from.x} y1={route.from.y}
              x2={route.to.x} y2={route.to.y}
              stroke={route.color}
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeDasharray="3.5 2"
              strokeDashoffset={-animOffset * 0.3}
              opacity="0.75"
            />
          </g>
        ))}

        {/* Delivery points - reduced sizes */}
        {deliveryPoints.map((point, i) => (
          <g key={i} transform={`translate(${point.x}, ${point.y})`}>
            <circle
              r={point.type === "hub" ? 3.5 : 2.5}
              fill={point.type === "hub" ? "#7C6CF6" : "#34D399"}
              stroke="#fff"
              strokeWidth="1.2"
              style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.15))" }}
            />
            <circle
              r={point.type === "hub" ? 5.5 : 4}
              fill={point.type === "hub" ? "#7C6CF6" : "#34D399"}
              opacity="0.12"
            />
          </g>
        ))}

        {/* Vehicles */}
        {vehicles.map(v => (
          <VehicleDot
            key={v.id}
            vehicle={v}
            onClick={() => setSelected(v.id === selected ? null : v.id)}
            selected={selected === v.id}
          />
        ))}

        {/* City labels - repositioned to avoid marker collisions */}
        <g>
          {/* Santiago - offset down and right */}
          <rect x="44" y="45.5" width="19" height="5.5" rx="1.5" fill="#fff" opacity="0.85" />
          <text x="53.5" y="49.5" textAnchor="middle" fontSize="3.2" fill="#5A5A7A" fontWeight="600" fontFamily="Inter">Santiago</text>

          {/* Hub SCL - offset left */}
          <rect x="13.5" y="47" width="15" height="5" rx="1.5" fill="#fff" opacity="0.85" />
          <text x="21" y="50.2" textAnchor="middle" fontSize="2.8" fill="#7C6CF6" fontWeight="600" fontFamily="Inter">Hub SCL</text>

          {/* Valparaíso - offset up */}
          <rect x="55" y="24.5" width="20" height="5" rx="1.5" fill="#fff" opacity="0.85" />
          <text x="65" y="27.8" textAnchor="middle" fontSize="2.8" fill="#5A5A7A" fontFamily="Inter">Valparaíso</text>

          {/* Concepción - offset right and down */}
          <rect x="72" y="72" width="21" height="5" rx="1.5" fill="#fff" opacity="0.85" />
          <text x="82.5" y="75.3" textAnchor="middle" fontSize="2.8" fill="#5A5A7A" fontFamily="Inter">Concepción</text>

          {/* La Serena - offset right */}
          <rect x="79" y="16.5" width="18" height="5" rx="1.5" fill="#fff" opacity="0.85" />
          <text x="88" y="19.8" textAnchor="middle" fontSize="2.8" fill="#5A5A7A" fontFamily="Inter">La Serena</text>

          {/* Talca - offset down */}
          <rect x="54.5" y="84" width="11" height="5" rx="1.5" fill="#fff" opacity="0.85" />
          <text x="60" y="87.3" textAnchor="middle" fontSize="2.8" fill="#5A5A7A" fontFamily="Inter">Talca</text>
        </g>
      </svg>

      {/* Map controls */}
      <div style={{ position: "absolute", top: 14, right: 14, display: "flex", flexDirection: "column", gap: 8 }}>
        {["+", "−"].map(label => (
          <button
            key={label}
            style={{
              width: 32, height: 32, borderRadius: 7, background: "#fff",
              border: "1px solid #EEEEF3", fontSize: 15, fontWeight: 600, color: "#5A5A7A",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div
        style={{
          position: "absolute", bottom: 14, left: 14,
          background: "#fff", borderRadius: 10, padding: "10px 14px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)", border: "1px solid #EEEEF3",
        }}
      >
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          {[
            { color: "#7C6CF6", label: "En ruta" },
            { color: "#34D399", label: "Destino" },
            { color: "#EF4444", label: "Alerta" },
          ].map(item => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.color }} />
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 10.5, color: "#5A5A7A", fontWeight: 500 }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Vehicle tooltip - repositioned to top-right to avoid collision with legend */}
      {selectedVehicle && (
        <div
          style={{
            position: "absolute", top: 52, right: 12,
            background: "#fff", borderRadius: 12, padding: "14px 16px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)", border: "1px solid #EEEEF3",
            minWidth: 220, maxWidth: 240,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: selectedVehicle.status === "alerta" ? "#EF4444" : "#7C6CF6" }} />
            <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 13, color: "#0F0F1A" }}>
              {selectedVehicle.id}
            </span>
            <span style={{
              fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 600, padding: "3px 7px", borderRadius: 4,
              background: selectedVehicle.status === "alerta" ? "#FEE2E2" : "#EDE9FF",
              color: selectedVehicle.status === "alerta" ? "#DC2626" : "#7C6CF6",
            }}>
              {selectedVehicle.status === "alerta" ? "ALERTA" : "EN RUTA"}
            </span>
          </div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: "#5A5A7A", marginBottom: 3, fontWeight: 500 }}>
            {selectedVehicle.driver}
          </div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#9B9BB4", marginBottom: 10, lineHeight: 1.4 }}>
            {selectedVehicle.route}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color: "#9B9BB4", marginBottom: 3 }}>Velocidad</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 700, color: "#0F0F1A" }}>
                {selectedVehicle.speed} km/h
              </div>
            </div>
            <div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color: "#9B9BB4", marginBottom: 3 }}>ETA</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 700, color: "#7C6CF6" }}>
                {selectedVehicle.eta}
              </div>
            </div>
            <div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color: "#9B9BB4", marginBottom: 3 }}>Carga</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 700, color: "#0F0F1A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {selectedVehicle.cargo}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live indicator */}
      <div
        style={{
          position: "absolute", top: 14, left: 14,
          background: "#fff", borderRadius: 8, padding: "7px 12px",
          display: "flex", alignItems: "center", gap: 7,
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)", border: "1px solid #EEEEF3",
        }}
      >
        <div
          style={{
            width: 7, height: 7, borderRadius: "50%", background: "#34D399",
            boxShadow: "0 0 0 2px #34D39930",
          }}
        />
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 10.5, fontWeight: 600, color: "#5A5A7A" }}>
          LIVE · 5 vehículos
        </span>
      </div>
    </div>
  );
}
