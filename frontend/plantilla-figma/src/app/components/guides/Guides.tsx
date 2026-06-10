import { useState } from "react";
import { Search, FileText, Download, Eye, Plus, Filter, CheckCircle2, Clock, AlertTriangle } from "lucide-react";

const guidesData = [
  { id: "GDE-1001", route: "RUT-2831", client: "TechLogic S.A.", driver: "Carlos Mendez", origin: "Hub Santiago", destination: "Valparaíso", date: "07-06-2026", status: "emitida", packages: 24, weight: "480 kg" },
  { id: "GDE-1002", route: "RUT-2832", client: "RetailMax Chile", driver: "Ana Rodriguez", origin: "Hub Santiago Sur", destination: "Rancagua Centro", date: "07-06-2026", status: "emitida", packages: 12, weight: "220 kg" },
  { id: "GDE-1003", route: "RUT-2834", client: "RetailMax Chile", driver: "Martina Vidal", origin: "Hub Santiago Norte", destination: "Concepción", date: "07-06-2026", status: "pendiente", packages: 36, weight: "720 kg" },
  { id: "GDE-0998", route: "RUT-2828", client: "FarmaDistribuidor", driver: "Diego Salinas", origin: "Lab Maipú", destination: "Valdivia", date: "06-06-2026", status: "recibida", packages: 8, weight: "60 kg" },
  { id: "GDE-0997", route: "RUT-2827", client: "AlimentosNorte", driver: "Pedro López", origin: "Planta Quilicura", destination: "Antofagasta", date: "05-06-2026", status: "recibida", packages: 44, weight: "1,320 kg" },
];

const statusConfig = {
  emitida: { label: "Emitida", color: "#7C6CF6", bg: "#F2F0FF", icon: FileText },
  pendiente: { label: "Pendiente", color: "#F59E0B", bg: "#FFFBEB", icon: Clock },
  recibida: { label: "Recibida", color: "#10B981", bg: "#ECFDF5", icon: CheckCircle2 },
  rechazada: { label: "Rechazada", color: "#EF4444", bg: "#FEF2F2", icon: AlertTriangle },
};

export function Guides() {
  const [search, setSearch] = useState("");

  const filtered = guidesData.filter(g =>
    !search || g.id.toLowerCase().includes(search.toLowerCase()) ||
    g.client.toLowerCase().includes(search.toLowerCase()) ||
    g.route.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ height: "100%", overflowY: "auto", background: "#F7F8FC", fontFamily: "Inter, sans-serif" }}>
      <div style={{ padding: "24px 28px 20px", background: "#fff", borderBottom: "1px solid #EEEEF3" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ margin: 0, fontWeight: 700, fontSize: 22, color: "#0F0F1A", letterSpacing: "-0.5px" }}>
              Guías de despacho
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#9B9BB4" }}>
              Documentos de traslado y guías electrónicas · {guidesData.length} guías registradas
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ position: "relative" }}>
              <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9B9BB4" }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar guía..."
                style={{ paddingLeft: 30, paddingRight: 12, paddingTop: 8, paddingBottom: 8, borderRadius: 8, border: "1px solid #EEEEF3", fontSize: 13, color: "#0F0F1A", fontFamily: "Inter, sans-serif", background: "#F7F8FC", outline: "none", width: 220 }}
              />
            </div>
            <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 8, background: "#7C6CF6", border: "none", fontSize: 13, color: "#fff", fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 8px rgba(124,108,246,0.3)", fontFamily: "Inter, sans-serif" }}>
              <Plus size={14} /> Nueva guía
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding: "20px 28px" }}>
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #EEEEF3", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F7F8FC" }}>
                {["N° Guía", "Ruta", "Cliente", "Conductor", "Destino", "Fecha", "Bultos", "Estado", "Acciones"].map(col => (
                  <th key={col} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#9B9BB4", letterSpacing: "0.3px", borderBottom: "1px solid #EEEEF3" }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((guide, i) => {
                const sCfg = statusConfig[guide.status as keyof typeof statusConfig];
                const Icon = sCfg.icon;
                return (
                  <tr key={guide.id} style={{ borderBottom: "1px solid #F5F5FA", background: i % 2 === 0 ? "#fff" : "#FAFAFA" }}>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 7, background: "#F2F0FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <FileText size={13} color="#7C6CF6" />
                        </div>
                        <span style={{ fontWeight: 700, fontSize: 12, color: "#0F0F1A" }}>{guide.id}</span>
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: 12, color: "#7C6CF6", fontWeight: 600 }}>{guide.route}</td>
                    <td style={{ padding: "14px 16px", fontSize: 12, color: "#5A5A7A" }}>{guide.client}</td>
                    <td style={{ padding: "14px 16px", fontSize: 12, color: "#5A5A7A" }}>{guide.driver}</td>
                    <td style={{ padding: "14px 16px", fontSize: 12, color: "#9B9BB4" }}>{guide.destination}</td>
                    <td style={{ padding: "14px 16px", fontSize: 12, color: "#9B9BB4" }}>{guide.date}</td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#0F0F1A" }}>{guide.packages}</div>
                      <div style={{ fontSize: 10, color: "#9B9BB4" }}>{guide.weight}</div>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: sCfg.bg, color: sCfg.color }}>
                        <Icon size={10} />
                        {sCfg.label}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button style={{ padding: "5px 8px", borderRadius: 6, background: "#F2F0FF", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: "#7C6CF6", fontWeight: 600 }}>
                          <Eye size={11} />
                        </button>
                        <button style={{ padding: "5px 8px", borderRadius: 6, background: "#F7F8FC", border: "1px solid #EEEEF3", cursor: "pointer", display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: "#5A5A7A" }}>
                          <Download size={11} />
                        </button>
                      </div>
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
