import { useState } from "react";
import { Search, Filter, ChevronDown, Calendar, TrendingUp, Package, CheckCircle2 } from "lucide-react";

const historyData = [
  { id: "RUT-2830", origin: "Hub SCL", destination: "La Serena", client: "RetailMax", driver: "Diego Salinas", vehicle: "V-05", startDate: "05-06-2026", endDate: "06-06-2026", packages: 44, distance: "472 km", status: "completada", anomalies: 0 },
  { id: "RUT-2829", origin: "Rancagua", destination: "Talca", client: "FarmaDistribuidor", driver: "Diego Salinas", vehicle: "V-05", startDate: "04-06-2026", endDate: "04-06-2026", packages: 8, distance: "95 km", status: "completada", anomalies: 0 },
  { id: "RUT-2828", origin: "Lab Maipú", destination: "Valdivia", client: "FarmaDistribuidor", driver: "Diego Salinas", vehicle: "V-05", startDate: "03-06-2026", endDate: "04-06-2026", packages: 8, distance: "847 km", status: "completada", anomalies: 1 },
  { id: "RUT-2827", origin: "Planta Quilicura", destination: "Antofagasta", client: "AlimentosNorte", driver: "Pedro López", vehicle: "V-03", startDate: "01-06-2026", endDate: "02-06-2026", packages: 44, distance: "1,380 km", status: "completada", anomalies: 0 },
  { id: "RUT-2826", origin: "Hub SCL", destination: "Concepción", client: "RetailMax Chile", driver: "Martina Vidal", vehicle: "V-04", startDate: "31-05-2026", endDate: "01-06-2026", packages: 28, distance: "512 km", status: "completada", anomalies: 0 },
  { id: "RUT-2825", origin: "Valparaíso", destination: "Coquimbo", client: "TechLogic S.A.", driver: "Carlos Mendez", vehicle: "V-01", startDate: "30-05-2026", endDate: "31-05-2026", packages: 16, distance: "416 km", status: "completada", anomalies: 2 },
];

export function History() {
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("todo");

  const filtered = historyData.filter(r =>
    !search || r.id.toLowerCase().includes(search.toLowerCase()) ||
    r.client.toLowerCase().includes(search.toLowerCase()) ||
    r.driver.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ height: "100%", overflowY: "auto", background: "#F7F8FC", fontFamily: "Inter, sans-serif" }}>
      <div style={{ padding: "24px 28px 20px", background: "#fff", borderBottom: "1px solid #EEEEF3" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <h1 style={{ margin: 0, fontWeight: 700, fontSize: 22, color: "#0F0F1A", letterSpacing: "-0.5px" }}>Historial de rutas</h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#9B9BB4" }}>
              Registro completo de entregas y operaciones completadas
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ position: "relative" }}>
              <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9B9BB4" }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar en historial..." style={{ paddingLeft: 30, paddingRight: 12, paddingTop: 8, paddingBottom: 8, borderRadius: 8, border: "1px solid #EEEEF3", fontSize: 13, color: "#0F0F1A", fontFamily: "Inter, sans-serif", background: "#F7F8FC", outline: "none", width: 220 }} />
            </div>
            <button style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 14px", borderRadius: 8, border: "1px solid #EEEEF3", background: "#fff", fontSize: 12, color: "#5A5A7A", cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
              <Calendar size={13} /> Rango de fechas
            </button>
          </div>
        </div>

        {/* Summary stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {[
            { label: "Total completadas", value: historyData.length, color: "#7C6CF6", bg: "#F2F0FF" },
            { label: "Paquetes entregados", value: historyData.reduce((s, r) => s + r.packages, 0), color: "#34D399", bg: "#ECFDF5" },
            { label: "Km recorridos", value: "3,722", color: "#60A5FA", bg: "#EFF6FF" },
            { label: "Con anomalías", value: historyData.filter(r => r.anomalies > 0).length, color: "#F59E0B", bg: "#FFFBEB" },
          ].map(item => (
            <div key={item.label} style={{ background: item.bg, borderRadius: 12, padding: "12px 16px", border: `1px solid ${item.color}20` }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: item.color, letterSpacing: "-0.5px" }}>{item.value}</div>
              <div style={{ fontSize: 11, color: item.color, fontWeight: 500, opacity: 0.8 }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "20px 28px" }}>
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #EEEEF3", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F7F8FC" }}>
                {["Ruta", "Origen → Destino", "Cliente", "Conductor", "Fechas", "Bultos", "Distancia", "Anomalías"].map(col => (
                  <th key={col} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#9B9BB4", letterSpacing: "0.3px", borderBottom: "1px solid #EEEEF3" }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((route, i) => (
                <tr key={route.id} style={{ borderBottom: "1px solid #F5F5FA", background: i % 2 === 0 ? "#fff" : "#FAFAFA" }}>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 7, background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <CheckCircle2 size={13} color="#10B981" />
                      </div>
                      <span style={{ fontWeight: 700, fontSize: 12, color: "#7C6CF6" }}>{route.id}</span>
                    </div>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ fontSize: 11, color: "#5A5A7A" }}>{route.origin}</div>
                    <div style={{ fontSize: 11, color: "#9B9BB4" }}>→ {route.destination}</div>
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: 12, color: "#5A5A7A" }}>{route.client}</td>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ fontSize: 12, color: "#5A5A7A" }}>{route.driver}</div>
                    <div style={{ fontSize: 10, color: "#9B9BB4" }}>{route.vehicle}</div>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ fontSize: 11, color: "#5A5A7A" }}>{route.startDate}</div>
                    <div style={{ fontSize: 10, color: "#9B9BB4" }}>→ {route.endDate}</div>
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: 12, fontWeight: 600, color: "#0F0F1A" }}>{route.packages}</td>
                  <td style={{ padding: "14px 16px", fontSize: 12, color: "#9B9BB4" }}>{route.distance}</td>
                  <td style={{ padding: "14px 16px" }}>
                    {route.anomalies > 0 ? (
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#F59E0B", display: "flex", alignItems: "center", gap: 4 }}>
                        ⚠ {route.anomalies}
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: "#34D399" }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
