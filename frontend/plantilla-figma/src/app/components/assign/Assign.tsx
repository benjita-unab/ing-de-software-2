import { useState } from "react";
import { UserCheck, Truck, Route, ChevronDown, User, CheckCircle2 } from "lucide-react";

const availableRoutes = [
  { id: "RUT-2835", origin: "Salamanca, 2380714 Valparaíso", destination: "Ramón Ángel Jara, Quilpué, Valparaíso", client: "Bastian Prueba", eta: "—", created: "03-06-2026" },
  { id: "RUT-2836", origin: "Santiago Centro, RM", destination: "Viña del Mar, Valparaíso", client: "TechLogic S.A.", eta: "—", created: "07-06-2026" },
];

const activeDrivers = [
  { rut: "12.345.678-9", name: "Diego Salinas", license: "LIC-101", exp: "11-10-2027", status: "disponible" },
  { rut: "13.444.555-6", name: "Ana Rodriguez", license: "LIC-1011", exp: "09-04-2027", status: "disponible" },
  { rut: "13.666.000-8", name: "Carlos Mendez", license: "LIC-1016", exp: "27-02-2028", status: "en_ruta" },
  { rut: "18.777.111-2", name: "Pedro López", license: "LIC-1008", exp: "17-10-2026", status: "alerta" },
];

export function Assign() {
  const [selectedRoute, setSelectedRoute] = useState("");
  const [selectedDriver, setSelectedDriver] = useState("");
  const [selectedTruck, setSelectedTruck] = useState("");
  const [assigned, setAssigned] = useState<string[]>([]);

  const handleAssign = () => {
    if (selectedRoute && selectedDriver) {
      setAssigned(a => [...a, selectedRoute]);
      setSelectedRoute("");
      setSelectedDriver("");
      setSelectedTruck("");
    }
  };

  return (
    <div style={{ height: "100%", overflowY: "auto", background: "#F7F8FC", fontFamily: "Inter, sans-serif" }}>
      <div style={{ padding: "24px 28px 20px", background: "#fff", borderBottom: "1px solid #EEEEF3" }}>
        <h1 style={{ margin: 0, fontWeight: 700, fontSize: 22, color: "#0F0F1A", letterSpacing: "-0.5px" }}>
          Asignar conductor a ruta
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#9B9BB4" }}>
          Asigna un conductor y camión disponible a una ruta sin conductor
        </p>
      </div>

      <div style={{ padding: "24px 28px" }}>
        {/* Assignment form */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #EEEEF3", padding: "24px", marginBottom: 20 }}>
          <h3 style={{ margin: "0 0 16px", fontWeight: 700, fontSize: 15, color: "#0F0F1A" }}>Asignación</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 16 }}>
            {[
              { label: "Seleccionar ruta", state: selectedRoute, setState: setSelectedRoute, options: availableRoutes.map(r => ({ value: r.id, label: r.id })), placeholder: "— Selecciona una ruta —" },
              { label: "Conductor (activo)", state: selectedDriver, setState: setSelectedDriver, options: activeDrivers.filter(d => d.status === "disponible").map(d => ({ value: d.rut, label: d.name })), placeholder: "— Selecciona un conductor —" },
              { label: "Camión (disponible)", state: selectedTruck, setState: setSelectedTruck, options: [{ value: "v06", label: "V-06 · Volvo FE 280" }, { value: "v08", label: "V-08 · Iveco Daily" }], placeholder: "— Selecciona un camión —" },
            ].map(field => (
              <div key={field.label}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#5A5A7A", marginBottom: 6 }}>{field.label}</label>
                <div style={{ position: "relative" }}>
                  <select
                    value={field.state}
                    onChange={e => field.setState(e.target.value)}
                    style={{
                      width: "100%", padding: "9px 32px 9px 12px", borderRadius: 8, border: "1px solid #EEEEF3",
                      fontSize: 13, fontFamily: "Inter, sans-serif", background: "#F7F8FC", outline: "none",
                      appearance: "none", cursor: "pointer", color: field.state ? "#0F0F1A" : "#9B9BB4",
                    }}
                  >
                    <option value="">{field.placeholder}</option>
                    {field.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <ChevronDown size={13} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#9B9BB4", pointerEvents: "none" }} />
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={handleAssign}
            disabled={!selectedRoute || !selectedDriver}
            style={{
              padding: "10px 24px", borderRadius: 8,
              background: selectedRoute && selectedDriver ? "#7C6CF6" : "#EEEEF3",
              border: "none", fontSize: 13, color: selectedRoute && selectedDriver ? "#fff" : "#9B9BB4",
              fontWeight: 600, cursor: selectedRoute && selectedDriver ? "pointer" : "not-allowed",
              fontFamily: "Inter, sans-serif",
              boxShadow: selectedRoute && selectedDriver ? "0 2px 8px rgba(124,108,246,0.3)" : "none",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            <UserCheck size={14} />
            Asignar ruta
          </button>
        </div>

        {/* Available routes */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #EEEEF3", overflow: "hidden", marginBottom: 16 }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #EEEEF3", display: "flex", alignItems: "center", gap: 8 }}>
            <Route size={15} color="#7C6CF6" />
            <span style={{ fontWeight: 600, fontSize: 14, color: "#0F0F1A" }}>
              Rutas disponibles ({availableRoutes.filter(r => !assigned.includes(r.id)).length})
            </span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F7F8FC" }}>
                {["Origen → Destino", "Cliente", "ETA", "Creada"].map(col => (
                  <th key={col} style={{ padding: "10px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#9B9BB4", borderBottom: "1px solid #EEEEF3" }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {availableRoutes.filter(r => !assigned.includes(r.id)).map((route, i) => (
                <tr key={route.id} style={{ borderBottom: "1px solid #F5F5FA" }}>
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: "#7C6CF6", marginBottom: 4 }}>{route.id}</div>
                    <div style={{ fontSize: 11, color: "#5A5A7A" }}>{route.origin.split(",")[0]}</div>
                    <div style={{ fontSize: 11, color: "#9B9BB4" }}>→ {route.destination.split(",")[0]}</div>
                  </td>
                  <td style={{ padding: "14px 20px", fontSize: 12, color: "#5A5A7A" }}>{route.client}</td>
                  <td style={{ padding: "14px 20px", fontSize: 12, color: "#9B9BB4" }}>{route.eta}</td>
                  <td style={{ padding: "14px 20px", fontSize: 12, color: "#9B9BB4" }}>{route.created}</td>
                </tr>
              ))}
              {availableRoutes.filter(r => !assigned.includes(r.id)).length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: "24px", textAlign: "center", color: "#9B9BB4", fontSize: 13 }}>
                    <CheckCircle2 size={20} color="#34D399" style={{ marginBottom: 6 }} />
                    <div>Todas las rutas tienen conductor asignado</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Active drivers */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #EEEEF3", overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #EEEEF3", display: "flex", alignItems: "center", gap: 8 }}>
            <User size={15} color="#7C6CF6" />
            <span style={{ fontWeight: 600, fontSize: 14, color: "#0F0F1A" }}>
              Conductores activos ({activeDrivers.length})
            </span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F7F8FC" }}>
                {["RUT", "Licencia", "Vencimiento", "Estado"].map(col => (
                  <th key={col} style={{ padding: "10px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#9B9BB4", borderBottom: "1px solid #EEEEF3" }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeDrivers.map(driver => {
                const statusCfg = {
                  disponible: { label: "Disponible", color: "#10B981", bg: "#ECFDF5" },
                  en_ruta: { label: "En ruta", color: "#7C6CF6", bg: "#F2F0FF" },
                  alerta: { label: "Alerta", color: "#EF4444", bg: "#FEF2F2" },
                }[driver.status] ?? { label: driver.status, color: "#9B9BB4", bg: "#F0F0F8" };
                return (
                  <tr key={driver.rut} style={{ borderBottom: "1px solid #F5F5FA" }}>
                    <td style={{ padding: "12px 20px", fontSize: 12, fontWeight: 600, color: "#0F0F1A" }}>{driver.rut}</td>
                    <td style={{ padding: "12px 20px", fontSize: 12, color: "#5A5A7A" }}>{driver.license}</td>
                    <td style={{ padding: "12px 20px", fontSize: 12, color: "#9B9BB4" }}>{driver.exp}</td>
                    <td style={{ padding: "12px 20px" }}>
                      <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: statusCfg.bg, color: statusCfg.color }}>
                        {statusCfg.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
