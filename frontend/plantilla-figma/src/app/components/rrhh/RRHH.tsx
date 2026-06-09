import { useState } from "react";
import { Search, Plus, User, Phone, Mail, Truck, FileText, Clock, MoreHorizontal, AlertTriangle, Fuel, Activity, Package } from "lucide-react";

const driversData = [
  {
    id: "DRV-001",
    name: "Carlos Mendez",
    rut: "21.333.888-0",
    phone: "+56 9 8765 4321",
    email: "cmendez@logitrack.cl",
    license: "LIC-1008",
    licenseType: "Clase A2",
    licenseExp: "15-10-2027",
    status: "activo",
    currentRoute: "RUT-2831",
    currentVehicle: "V-01",
    experience: "8 años",
    totalKm: "342,450",
    rating: 4.9,
    hrsMonth: 168,
    completedRoutes: 284,
    incidents: 0,
    joinDate: "Mar 2019",
    lastMedical: "12-01-2026",
    nextMedical: "12-01-2027",
  },
  {
    id: "DRV-002",
    name: "Ana Rodriguez",
    rut: "20.370.444-5",
    phone: "+56 9 7654 3210",
    email: "arodriguez@logitrack.cl",
    license: "LIC-1011",
    licenseType: "Clase A2",
    licenseExp: "22-06-2026",
    status: "activo",
    currentRoute: "RUT-2832",
    currentVehicle: "V-02",
    experience: "6 años",
    totalKm: "218,320",
    rating: 4.7,
    hrsMonth: 156,
    completedRoutes: 198,
    incidents: 1,
    joinDate: "Ago 2021",
    lastMedical: "05-03-2026",
    nextMedical: "05-03-2027",
  },
  {
    id: "DRV-003",
    name: "Pedro López",
    rut: "18.777.111-2",
    phone: "+56 9 6543 2109",
    email: "plopez@logitrack.cl",
    license: "LIC-1015",
    licenseType: "Clase A3",
    licenseExp: "30-11-2025",
    status: "alerta",
    currentRoute: "RUT-2833",
    currentVehicle: "V-03",
    experience: "12 años",
    totalKm: "567,890",
    rating: 4.2,
    hrsMonth: 144,
    completedRoutes: 412,
    incidents: 3,
    joinDate: "Feb 2014",
    lastMedical: "20-11-2025",
    nextMedical: "20-11-2026",
  },
  {
    id: "DRV-004",
    name: "Martina Vidal",
    rut: "19.000.777-3",
    phone: "+56 9 5432 1098",
    email: "mvidal@logitrack.cl",
    license: "LIC-1077",
    licenseType: "Clase A2",
    licenseExp: "14-07-2028",
    status: "activo",
    currentRoute: "RUT-2834",
    currentVehicle: "V-04",
    experience: "4 años",
    totalKm: "98,450",
    rating: 4.8,
    hrsMonth: 172,
    completedRoutes: 127,
    incidents: 0,
    joinDate: "Nov 2022",
    lastMedical: "02-04-2026",
    nextMedical: "02-04-2027",
  },
  {
    id: "DRV-005",
    name: "Diego Salinas",
    rut: "20.123.456-7",
    phone: "+56 9 4321 0987",
    email: "dsalinas@logitrack.cl",
    license: "LIC-2001",
    licenseType: "Clase A2",
    licenseExp: "08-09-2027",
    status: "activo",
    currentRoute: "RUT-2829",
    currentVehicle: "V-05",
    experience: "5 años",
    totalKm: "167,230",
    rating: 4.5,
    hrsMonth: 160,
    completedRoutes: 156,
    incidents: 1,
    joinDate: "Mar 2021",
    lastMedical: "15-02-2026",
    nextMedical: "15-02-2027",
  },
  {
    id: "DRV-006",
    name: "Sofía Torres",
    rut: "22.456.789-1",
    phone: "+56 9 3210 9876",
    email: "storres@logitrack.cl",
    license: "LIC-3001",
    licenseType: "Clase A2",
    licenseExp: "25-03-2029",
    status: "disponible",
    currentRoute: "—",
    currentVehicle: "—",
    experience: "2 años",
    totalKm: "45,120",
    rating: 4.6,
    hrsMonth: 0,
    completedRoutes: 52,
    incidents: 0,
    joinDate: "Ene 2024",
    lastMedical: "10-04-2026",
    nextMedical: "10-04-2027",
  },
];

const statusConfig = {
  activo: { label: "En ruta", color: "#7C6CF6", bg: "#F2F0FF" },
  disponible: { label: "Disponible", color: "#10B981", bg: "#ECFDF5" },
  alerta: { label: "Alerta", color: "#EF4444", bg: "#FEF2F2" },
  descanso: { label: "Descanso", color: "#F59E0B", bg: "#FFFBEB" },
};

function RatingStars({ rating }: { rating: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
      <div style={{ display: "flex", gap: 1 }}>
        {[1, 2, 3, 4, 5].map(s => (
          <div key={s} style={{ width: 8, height: 8, borderRadius: 2, background: s <= Math.round(rating) ? "#F59E0B" : "#F0F0F8" }} />
        ))}
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: "#0F0F1A" }}>{rating}</span>
    </div>
  );
}

export function RRHH() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("todos");

  const filtered = driversData.filter(d => {
    if (statusFilter !== "todos" && d.status !== statusFilter) return false;
    if (search && !d.name.toLowerCase().includes(search.toLowerCase()) && !d.rut.includes(search)) return false;
    return true;
  });

  const selectedDriver = driversData.find(d => d.id === selected);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#F7F8FC", fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <div style={{ padding: "24px 28px 20px", background: "#fff", borderBottom: "1px solid #EEEEF3" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <h1 style={{ margin: 0, fontWeight: 700, fontSize: 22, color: "#0F0F1A", letterSpacing: "-0.5px" }}>
              Recursos Humanos
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#9B9BB4" }}>
              {driversData.length} conductores registrados · {driversData.filter(d => d.status === "activo").length} en ruta ahora
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ position: "relative" }}>
              <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9B9BB4" }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar conductor..."
                style={{
                  paddingLeft: 30, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
                  borderRadius: 8, border: "1px solid #EEEEF3", fontSize: 13, color: "#0F0F1A",
                  fontFamily: "Inter, sans-serif", background: "#F7F8FC", outline: "none", width: 220,
                }}
              />
            </div>
            <button style={{
              display: "flex", alignItems: "center", gap: 6, padding: "9px 18px",
              borderRadius: 8, background: "#7C6CF6", border: "none",
              fontSize: 13, color: "#fff", fontWeight: 600, cursor: "pointer",
              boxShadow: "0 2px 8px rgba(124,108,246,0.3)", fontFamily: "Inter, sans-serif",
            }}>
              <Plus size={14} /> Agregar conductor
            </button>
          </div>
        </div>

        {/* Summary */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {[
            { label: "En ruta", value: driversData.filter(d => d.status === "activo").length, color: "#7C6CF6", bg: "#F2F0FF" },
            { label: "Disponibles", value: driversData.filter(d => d.status === "disponible").length, color: "#10B981", bg: "#ECFDF5" },
            { label: "Con alertas", value: driversData.filter(d => d.status === "alerta").length, color: "#EF4444", bg: "#FEF2F2" },
            { label: "Licencias por vencer", value: driversData.filter(d => d.licenseExp.includes("2026") || d.licenseExp.includes("2025")).length, color: "#F59E0B", bg: "#FFFBEB" },
          ].map(item => (
            <div key={item.label} style={{ background: item.bg, borderRadius: 12, padding: "12px 16px", border: `1px solid ${item.color}20` }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: item.color, letterSpacing: "-0.5px" }}>{item.value}</div>
              <div style={{ fontSize: 11, color: item.color, fontWeight: 500, opacity: 0.8 }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px" }}>
          {/* Filter */}
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            {["todos", "activo", "disponible", "alerta"].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500,
                  border: statusFilter === s ? "1.5px solid #7C6CF6" : "1px solid #EEEEF3",
                  background: statusFilter === s ? "#F2F0FF" : "#fff",
                  color: statusFilter === s ? "#7C6CF6" : "#5A5A7A",
                  cursor: "pointer", fontFamily: "Inter, sans-serif", textTransform: "capitalize",
                }}
              >
                {s === "todos" ? "Todos" : (statusConfig[s as keyof typeof statusConfig]?.label ?? s)}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map(driver => {
              const sCfg = statusConfig[driver.status as keyof typeof statusConfig] ?? statusConfig.activo;
              const isSelected = selected === driver.id;
              const licenseExpiring = driver.licenseExp.includes("2025") || driver.licenseExp.includes("2026");
              return (
                <div
                  key={driver.id}
                  onClick={() => setSelected(isSelected ? null : driver.id)}
                  style={{
                    background: "#fff", borderRadius: 14, border: isSelected ? "2px solid #7C6CF6" : "1px solid #EEEEF3",
                    padding: "16px 20px", cursor: "pointer", transition: "all 0.1s",
                    boxShadow: isSelected ? "0 4px 16px rgba(124,108,246,0.1)" : "0 1px 4px rgba(0,0,0,0.04)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    {/* Avatar */}
                    <div style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: `linear-gradient(135deg, #7C6CF6, #A593FF)`,
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: "#fff" }}>
                        {driver.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </span>
                    </div>

                    {/* Main info */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: "#0F0F1A" }}>{driver.name}</span>
                        <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 600, background: sCfg.bg, color: sCfg.color }}>
                          {sCfg.label}
                        </span>
                        {licenseExpiring && (
                          <span style={{ padding: "2px 6px", borderRadius: 4, fontSize: 9, fontWeight: 700, background: "#FFFBEB", color: "#F59E0B", display: "flex", alignItems: "center", gap: 3 }}>
                            <AlertTriangle size={9} />
                            Lic. por vencer
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 16, fontSize: 11, color: "#9B9BB4" }}>
                        <span>{driver.rut}</span>
                        <span>{driver.licenseType} · {driver.license}</span>
                        <span>Exp: {driver.licenseExp}</span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                      {[
                        { label: "Rutas", value: driver.completedRoutes },
                        { label: "Km total", value: driver.totalKm },
                        { label: "Incidencias", value: driver.incidents },
                      ].map(item => (
                        <div key={item.label} style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: item.label === "Incidencias" && typeof item.value === "number" && item.value > 0 ? "#F59E0B" : "#0F0F1A" }}>
                            {item.value}
                          </div>
                          <div style={{ fontSize: 9, color: "#9B9BB4" }}>{item.label}</div>
                        </div>
                      ))}
                      <RatingStars rating={driver.rating} />
                      {driver.currentRoute !== "—" && (
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: "#7C6CF6" }}>{driver.currentRoute}</div>
                          <div style={{ fontSize: 10, color: "#9B9BB4" }}>{driver.currentVehicle}</div>
                        </div>
                      )}
                      <button style={{ padding: "6px", borderRadius: 6, background: "#F7F8FC", border: "1px solid #EEEEF3", cursor: "pointer" }}>
                        <MoreHorizontal size={14} color="#9B9BB4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detail */}
        {selectedDriver && (
          <div style={{ width: 310, borderLeft: "1px solid #EEEEF3", background: "#fff", overflowY: "auto", padding: "20px", flexShrink: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#0F0F1A" }}>Perfil del conductor</div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9B9BB4", fontSize: 16 }}>✕</button>
            </div>

            <div style={{ background: "linear-gradient(135deg, #7C6CF6, #9B8DFF)", borderRadius: 14, padding: "20px", textAlign: "center", marginBottom: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", border: "3px solid rgba(255,255,255,0.3)" }}>
                <span style={{ fontWeight: 700, fontSize: 18, color: "#fff" }}>
                  {selectedDriver.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#fff" }}>{selectedDriver.name}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>{selectedDriver.rut}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>Desde {selectedDriver.joinDate} · {selectedDriver.experience}</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
              {[
                { label: "Rutas completadas", value: selectedDriver.completedRoutes },
                { label: "Km recorridos", value: selectedDriver.totalKm },
                { label: "Horas este mes", value: `${selectedDriver.hrsMonth}h` },
                { label: "Incidencias", value: selectedDriver.incidents },
              ].map(item => (
                <div key={item.label} style={{ background: "#F7F8FC", borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ fontSize: 9, color: "#9B9BB4", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3 }}>{item.label}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: item.label === "Incidencias" && item.value > 0 ? "#F59E0B" : "#0F0F1A" }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {[
                { label: "Teléfono", value: selectedDriver.phone, icon: Phone },
                { label: "Email", value: selectedDriver.email, icon: Mail },
                { label: "Tipo licencia", value: selectedDriver.licenseType, icon: FileText },
                { label: "N° licencia", value: selectedDriver.license, icon: FileText },
                { label: "Venc. licencia", value: selectedDriver.licenseExp, icon: Clock },
                { label: "Ruta actual", value: selectedDriver.currentRoute, icon: Truck },
                { label: "Vehículo actual", value: selectedDriver.currentVehicle, icon: Truck },
                { label: "Última revisión médica", value: selectedDriver.lastMedical, icon: Clock },
                { label: "Próx. revisión médica", value: selectedDriver.nextMedical, icon: Clock },
              ].map(item => {
                const Icon = item.icon;
                const isWarning = (item.label.includes("licencia") || item.label.includes("Venc")) && (item.value.includes("2025") || item.value.includes("2026"));
                return (
                  <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #F5F5FA" }}>
                    <span style={{ fontSize: 11, color: "#9B9BB4" }}>{item.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: isWarning ? "#F59E0B" : "#0F0F1A" }}>{item.value}</span>
                  </div>
                );
              })}
            </div>

            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: "#9B9BB4", marginBottom: 6 }}>Calificación promedio</div>
              <RatingStars rating={selectedDriver.rating} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
