import { useState } from "react";
import { Search, Filter, Truck, Fuel, Thermometer, Zap, AlertTriangle, CheckCircle2, Clock, Plus, MoreHorizontal, MapPin, Activity, Package } from "lucide-react";

const fleetData = [
  {
    id: "V-01",
    name: "Volvo FH-540",
    plate: "LOGI-001",
    year: 2022,
    driver: "Carlos Mendez",
    driverRut: "21.333.888-0",
    status: "en_ruta",
    fuel: 78,
    temp: 22,
    load: 82,
    speed: 87,
    km: "142,330",
    lastService: "15-03-2026",
    nextService: "15-09-2026",
    location: "Autopista del Maipo km 45",
    route: "RUT-2831",
    insurance: "Vigente",
    revision: "Vigente",
    brand: "Volvo",
    model: "FH-540 6x4",
  },
  {
    id: "V-02",
    name: "Mercedes Actros",
    plate: "LOGI-002",
    year: 2021,
    driver: "Ana Rodriguez",
    driverRut: "20.370.444-5",
    status: "en_ruta",
    fuel: 54,
    temp: 24,
    load: 65,
    speed: 94,
    km: "198,450",
    lastService: "01-02-2026",
    nextService: "01-08-2026",
    location: "Ruta 5 Sur km 34",
    route: "RUT-2832",
    insurance: "Vigente",
    revision: "Por vencer",
    brand: "Mercedes-Benz",
    model: "Actros 2651",
  },
  {
    id: "V-03",
    name: "MAN TGX 18.510",
    plate: "LOGI-003",
    year: 2023,
    driver: "Pedro López",
    driverRut: "18.777.111-2",
    status: "alerta",
    fuel: 31,
    temp: 21,
    load: 40,
    speed: 0,
    km: "89,120",
    lastService: "20-04-2026",
    nextService: "20-10-2026",
    location: "Autopista del Sol km 82",
    route: "RUT-2833",
    insurance: "Vigente",
    revision: "Vigente",
    brand: "MAN",
    model: "TGX 18.510",
  },
  {
    id: "V-04",
    name: "Scania R 500",
    plate: "LOGI-004",
    year: 2022,
    driver: "Martina Vidal",
    driverRut: "19.000.777-3",
    status: "en_ruta",
    fuel: 85,
    temp: 23,
    load: 91,
    speed: 105,
    km: "156,780",
    lastService: "10-05-2026",
    nextService: "10-11-2026",
    location: "Ruta 5 Sur km 180",
    route: "RUT-2834",
    insurance: "Vigente",
    revision: "Vigente",
    brand: "Scania",
    model: "R 500 LA4x2HNA",
  },
  {
    id: "V-05",
    name: "DAF XF 480",
    plate: "LOGI-005",
    year: 2020,
    driver: "Diego Salinas",
    driverRut: "20.123.456-7",
    status: "en_ruta",
    fuel: 67,
    temp: 22,
    load: 73,
    speed: 78,
    km: "234,560",
    lastService: "05-01-2026",
    nextService: "05-07-2026",
    location: "Ruta 5 Sur km 95",
    route: "RUT-2829",
    insurance: "Vigente",
    revision: "Vigente",
    brand: "DAF",
    model: "XF 480 FT",
  },
  {
    id: "V-06",
    name: "Volvo FE 280",
    plate: "LOGI-006",
    year: 2021,
    driver: "—",
    driverRut: "—",
    status: "en_base",
    fuel: 95,
    temp: 20,
    load: 0,
    speed: 0,
    km: "87,230",
    lastService: "01-06-2026",
    nextService: "01-12-2026",
    location: "Hub Santiago Centro",
    route: "—",
    insurance: "Vigente",
    revision: "Vigente",
    brand: "Volvo",
    model: "FE 280",
  },
  {
    id: "V-07",
    name: "Mercedes Atego",
    plate: "LOGI-007",
    year: 2019,
    driver: "—",
    driverRut: "—",
    status: "mantenimiento",
    fuel: 40,
    temp: 20,
    load: 0,
    speed: 0,
    km: "312,450",
    lastService: "07-06-2026",
    nextService: "07-09-2026",
    location: "Taller Central SCL",
    route: "—",
    insurance: "Vigente",
    revision: "Vencida",
    brand: "Mercedes-Benz",
    model: "Atego 1726",
  },
  {
    id: "V-08",
    name: "Iveco Daily",
    plate: "LOGI-008",
    year: 2022,
    driver: "—",
    driverRut: "—",
    status: "en_base",
    fuel: 88,
    temp: 20,
    load: 0,
    speed: 0,
    km: "45,120",
    lastService: "15-04-2026",
    nextService: "15-10-2026",
    location: "Hub Santiago Norte",
    route: "—",
    insurance: "Vigente",
    revision: "Vigente",
    brand: "Iveco",
    model: "Daily 70C18",
  },
];

const statusConfig = {
  en_ruta: { label: "En ruta", color: "#7C6CF6", bg: "#F2F0FF" },
  alerta: { label: "Alerta", color: "#EF4444", bg: "#FEF2F2" },
  en_base: { label: "En base", color: "#10B981", bg: "#ECFDF5" },
  mantenimiento: { label: "Mantenimiento", color: "#F59E0B", bg: "#FFFBEB" },
};

function FuelBar({ value }: { value: number }) {
  const color = value < 30 ? "#EF4444" : value < 50 ? "#F59E0B" : "#34D399";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 60, height: 5, borderRadius: 3, background: "#F0F0F8" }}>
        <div style={{ width: `${value}%`, height: "100%", borderRadius: 3, background: color }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: color, minWidth: 28 }}>{value}%</span>
    </div>
  );
}

export function Fleet() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = fleetData.filter(v => {
    if (statusFilter !== "todos" && v.status !== statusFilter) return false;
    if (search && !v.name.toLowerCase().includes(search.toLowerCase()) && !v.id.toLowerCase().includes(search.toLowerCase()) && !v.driver.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const selectedVehicle = fleetData.find(v => v.id === selected);

  const summary = {
    total: fleetData.length,
    en_ruta: fleetData.filter(v => v.status === "en_ruta").length,
    alerta: fleetData.filter(v => v.status === "alerta").length,
    en_base: fleetData.filter(v => v.status === "en_base").length,
    mantenimiento: fleetData.filter(v => v.status === "mantenimiento").length,
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#F7F8FC", fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <div style={{ padding: "24px 28px 20px", background: "#fff", borderBottom: "1px solid #EEEEF3" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, fontWeight: 700, fontSize: 22, color: "#0F0F1A", letterSpacing: "-0.5px" }}>
              Gestión de flota
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#9B9BB4" }}>
              {summary.en_ruta} vehículos en ruta · {summary.alerta} alertas · {summary.en_base} en base
            </p>
          </div>
          <button style={{
            display: "flex", alignItems: "center", gap: 6, padding: "9px 18px",
            borderRadius: 8, background: "#7C6CF6", border: "none",
            fontSize: 13, color: "#fff", fontWeight: 600, cursor: "pointer",
            boxShadow: "0 2px 8px rgba(124,108,246,0.3)", fontFamily: "Inter, sans-serif",
          }}>
            <Plus size={14} /> Agregar vehículo
          </button>
        </div>

        {/* Summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {[
            { label: "En ruta", value: summary.en_ruta, color: "#7C6CF6", bg: "#F2F0FF", icon: Truck },
            { label: "Alertas activas", value: summary.alerta, color: "#EF4444", bg: "#FEF2F2", icon: AlertTriangle },
            { label: "En base", value: summary.en_base, color: "#10B981", bg: "#ECFDF5", icon: CheckCircle2 },
            { label: "Mantenimiento", value: summary.mantenimiento, color: "#F59E0B", bg: "#FFFBEB", icon: Clock },
          ].map(item => {
            const Icon = item.icon;
            return (
              <div key={item.label} style={{
                background: item.bg, borderRadius: 12, padding: "12px 16px",
                display: "flex", alignItems: "center", gap: 12,
                border: `1px solid ${item.color}20`,
              }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={16} color={item.color} />
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: item.color, lineHeight: 1, letterSpacing: "-0.5px" }}>{item.value}</div>
                  <div style={{ fontSize: 11, color: item.color, fontWeight: 500, opacity: 0.8 }}>{item.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* List */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {/* Filters */}
          <div style={{ padding: "16px 28px", display: "flex", gap: 10, alignItems: "center", background: "#fff", borderBottom: "1px solid #EEEEF3" }}>
            <div style={{ position: "relative", flex: 1, maxWidth: 280 }}>
              <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9B9BB4" }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar vehículo o conductor..."
                style={{
                  paddingLeft: 30, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
                  borderRadius: 8, border: "1px solid #EEEEF3", fontSize: 13, color: "#0F0F1A",
                  fontFamily: "Inter, sans-serif", background: "#F7F8FC", outline: "none", width: "100%",
                }}
              />
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {["todos", "en_ruta", "alerta", "en_base", "mantenimiento"].map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  style={{
                    padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500,
                    border: statusFilter === s ? "1.5px solid #7C6CF6" : "1px solid #EEEEF3",
                    background: statusFilter === s ? "#F2F0FF" : "#fff",
                    color: statusFilter === s ? "#7C6CF6" : "#5A5A7A",
                    cursor: "pointer", fontFamily: "Inter, sans-serif",
                    textTransform: "capitalize",
                  }}
                >
                  {s === "todos" ? "Todos" : s.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding: "16px 28px" }}>
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #EEEEF3", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F7F8FC" }}>
                    {["Vehículo", "Estado", "Conductor", "Ubicación", "Combustible", "Carga", "Velocidad", "Próx. servicio", "Acciones"].map(col => (
                      <th key={col} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#9B9BB4", letterSpacing: "0.3px", borderBottom: "1px solid #EEEEF3", whiteSpace: "nowrap" }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((v, i) => {
                    const sCfg = statusConfig[v.status as keyof typeof statusConfig];
                    return (
                      <tr
                        key={v.id}
                        onClick={() => setSelected(selected === v.id ? null : v.id)}
                        style={{
                          borderBottom: "1px solid #F5F5FA",
                          background: selected === v.id ? "#F7F6FF" : i % 2 === 0 ? "#fff" : "#FAFAFA",
                          cursor: "pointer",
                        }}
                      >
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{
                              width: 36, height: 36, borderRadius: 8, background: sCfg.bg,
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                              <Truck size={16} color={sCfg.color} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13, color: "#0F0F1A" }}>{v.id}</div>
                              <div style={{ fontSize: 11, color: "#9B9BB4" }}>{v.name}</div>
                              <div style={{ fontSize: 10, color: "#C0C0D0" }}>{v.plate}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: sCfg.bg, color: sCfg.color }}>
                            {sCfg.label}
                          </span>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ fontSize: 12, fontWeight: 500, color: "#0F0F1A" }}>{v.driver}</div>
                          <div style={{ fontSize: 10, color: "#9B9BB4" }}>{v.route !== "—" ? v.route : "—"}</div>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#5A5A7A" }}>
                            <MapPin size={10} color="#9B9BB4" />
                            <span style={{ maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.location}</span>
                          </div>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <FuelBar value={v.fuel} />
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ width: 50, height: 5, borderRadius: 3, background: "#F0F0F8" }}>
                              <div style={{ width: `${v.load}%`, height: "100%", borderRadius: 3, background: "#7C6CF6" }} />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 600, color: "#5A5A7A" }}>{v.load}%</span>
                          </div>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: v.speed > 0 ? "#0F0F1A" : "#9B9BB4" }}>
                            <Activity size={11} color={v.speed > 0 ? "#7C6CF6" : "#9B9BB4"} />
                            {v.speed > 0 ? `${v.speed} km/h` : "Detenido"}
                          </div>
                        </td>
                        <td style={{ padding: "14px 16px", fontSize: 11, color: "#9B9BB4" }}>{v.nextService}</td>
                        <td style={{ padding: "14px 16px" }}>
                          <button style={{ padding: "6px", borderRadius: 6, background: "#F7F8FC", border: "1px solid #EEEEF3", cursor: "pointer" }}>
                            <MoreHorizontal size={14} color="#9B9BB4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Detail panel */}
        {selectedVehicle && (
          <div style={{ width: 300, borderLeft: "1px solid #EEEEF3", background: "#fff", overflowY: "auto", padding: "20px 20px", flexShrink: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#0F0F1A" }}>{selectedVehicle.id}</div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9B9BB4", fontSize: 16 }}>✕</button>
            </div>

            {/* Vehicle card */}
            <div style={{ background: "#F2F0FF", borderRadius: 12, padding: "16px", marginBottom: 16, textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: "#7C6CF6", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
                <Truck size={24} color="#fff" />
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#0F0F1A" }}>{selectedVehicle.name}</div>
              <div style={{ fontSize: 11, color: "#9B9BB4", marginTop: 2 }}>{selectedVehicle.brand} · {selectedVehicle.year}</div>
              <div style={{ fontSize: 12, color: "#7C6CF6", fontWeight: 600, marginTop: 4 }}>{selectedVehicle.plate}</div>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
              {[
                { label: "Combustible", value: `${selectedVehicle.fuel}%`, icon: Fuel, color: selectedVehicle.fuel < 30 ? "#EF4444" : "#34D399" },
                { label: "Velocidad", value: selectedVehicle.speed > 0 ? `${selectedVehicle.speed} km/h` : "Detenido", icon: Activity, color: "#7C6CF6" },
                { label: "Carga", value: `${selectedVehicle.load}%`, icon: Package, color: "#7C6CF6" },
                { label: "Kilómetros", value: selectedVehicle.km, icon: Truck, color: "#5A5A7A" },
              ].map(item => {
                const Icon = item.icon;
                return (
                  <div key={item.label} style={{ background: "#F7F8FC", borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ fontSize: 9, color: "#9B9BB4", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>{item.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: item.color }}>{item.value}</div>
                  </div>
                );
              })}
            </div>

            {/* Info */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "Conductor", value: selectedVehicle.driver },
                { label: "Ubicación", value: selectedVehicle.location },
                { label: "Ruta actual", value: selectedVehicle.route },
                { label: "Último servicio", value: selectedVehicle.lastService },
                { label: "Próximo servicio", value: selectedVehicle.nextService },
                { label: "Seguro", value: selectedVehicle.insurance },
                { label: "Revisión técnica", value: selectedVehicle.revision },
              ].map(item => (
                <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #F5F5FA" }}>
                  <span style={{ fontSize: 11, color: "#9B9BB4" }}>{item.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: item.value === "Vencida" ? "#EF4444" : item.value === "Por vencer" ? "#F59E0B" : "#0F0F1A" }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
