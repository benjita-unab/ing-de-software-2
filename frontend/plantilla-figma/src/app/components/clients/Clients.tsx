import { useState } from "react";
import { Search, Plus, MoreHorizontal, Building2, Phone, Mail, MapPin, Package, TrendingUp, ChevronRight, Star } from "lucide-react";

const clientsData = [
  {
    id: "CLI-001",
    name: "TechLogic S.A.",
    rut: "76.543.210-9",
    contact: "Felipe Morales",
    phone: "+56 9 8765 4321",
    email: "fmorales@techlogic.cl",
    address: "Av. Providencia 1234, Santiago",
    category: "Electrónica",
    status: "activo",
    routes: 24,
    monthlyVolume: 148,
    totalSpend: "$4.2M",
    rating: 4.8,
    since: "Mar 2023",
    lastDelivery: "07-06-2026",
  },
  {
    id: "CLI-002",
    name: "RetailMax Chile",
    rut: "77.123.456-0",
    contact: "Valentina Cruz",
    phone: "+56 9 7654 3210",
    email: "vcruz@retailmax.cl",
    address: "Av. Las Condes 5678, Santiago",
    category: "Retail",
    status: "activo",
    routes: 36,
    monthlyVolume: 312,
    totalSpend: "$8.7M",
    rating: 4.6,
    since: "Ene 2022",
    lastDelivery: "07-06-2026",
  },
  {
    id: "CLI-003",
    name: "FarmaDistribuidor",
    rut: "75.987.654-3",
    contact: "Roberto Soto",
    phone: "+56 9 6543 2109",
    email: "rsoto@farmadist.cl",
    address: "Av. Apoquindo 2345, Las Condes",
    category: "Farmacéutico",
    status: "activo",
    routes: 18,
    monthlyVolume: 89,
    totalSpend: "$2.1M",
    rating: 4.9,
    since: "Jun 2023",
    lastDelivery: "06-06-2026",
  },
  {
    id: "CLI-004",
    name: "Bastian Prueba",
    rut: "12.345.678-9",
    contact: "Bastian Prueba",
    phone: "+56 9 1234 5678",
    email: "bastian@prueba.cl",
    address: "Vña del Mar, Valparaíso",
    category: "General",
    status: "activo",
    routes: 4,
    monthlyVolume: 12,
    totalSpend: "$120K",
    rating: 4.2,
    since: "Abr 2025",
    lastDelivery: "05-06-2026",
  },
  {
    id: "CLI-005",
    name: "IndusMetal S.A.",
    rut: "74.321.098-5",
    contact: "Carmen Hidalgo",
    phone: "+56 9 5432 1098",
    email: "chidalgo@indusmetal.cl",
    address: "Av. Industrial 789, Pudahuel",
    category: "Industrial",
    status: "inactivo",
    routes: 9,
    monthlyVolume: 0,
    totalSpend: "$890K",
    rating: 3.8,
    since: "Feb 2021",
    lastDelivery: "12-02-2026",
  },
  {
    id: "CLI-006",
    name: "AlimentosNorte",
    rut: "73.654.321-7",
    contact: "Andrés Peña",
    phone: "+56 9 4321 0987",
    email: "apena@alimnorte.cl",
    address: "Zona Franca, Iquique",
    category: "Alimentos",
    status: "activo",
    routes: 15,
    monthlyVolume: 78,
    totalSpend: "$1.9M",
    rating: 4.5,
    since: "Sep 2022",
    lastDelivery: "07-06-2026",
  },
];

const categoryColors: Record<string, { color: string; bg: string }> = {
  "Electrónica": { color: "#7C6CF6", bg: "#F2F0FF" },
  "Retail": { color: "#60A5FA", bg: "#EFF6FF" },
  "Farmacéutico": { color: "#34D399", bg: "#ECFDF5" },
  "General": { color: "#9B9BB4", bg: "#F0F0F8" },
  "Industrial": { color: "#F59E0B", bg: "#FFFBEB" },
  "Alimentos": { color: "#F87171", bg: "#FEF2F2" },
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
      <Star size={11} fill="#F59E0B" color="#F59E0B" />
      <span style={{ fontSize: 11, fontWeight: 600, color: "#0F0F1A" }}>{rating}</span>
    </div>
  );
}

export function Clients() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("todos");

  const filtered = clientsData.filter(c => {
    if (statusFilter === "activos" && c.status !== "activo") return false;
    if (statusFilter === "inactivos" && c.status !== "inactivo") return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.rut.includes(search)) return false;
    return true;
  });

  const selectedClient = clientsData.find(c => c.id === selected);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#F7F8FC", fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <div style={{ padding: "24px 28px 20px", background: "#fff", borderBottom: "1px solid #EEEEF3" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <h1 style={{ margin: 0, fontWeight: 700, fontSize: 22, color: "#0F0F1A", letterSpacing: "-0.5px" }}>
              Clientes
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#9B9BB4" }}>
              {clientsData.filter(c => c.status === "activo").length} clientes activos · Gestión de cuentas y contratantes
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ position: "relative" }}>
              <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9B9BB4" }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nombre o RUT..."
                style={{
                  paddingLeft: 30, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
                  borderRadius: 8, border: "1px solid #EEEEF3", fontSize: 13, color: "#0F0F1A",
                  fontFamily: "Inter, sans-serif", background: "#F7F8FC", outline: "none", width: 240,
                }}
              />
            </div>
            <button style={{
              display: "flex", alignItems: "center", gap: 6, padding: "9px 18px",
              borderRadius: 8, background: "#7C6CF6", border: "none",
              fontSize: 13, color: "#fff", fontWeight: 600, cursor: "pointer",
              boxShadow: "0 2px 8px rgba(124,108,246,0.3)", fontFamily: "Inter, sans-serif",
            }}>
              <Plus size={14} /> Nuevo cliente
            </button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[
            { key: "todos", label: "Todos", count: clientsData.length },
            { key: "activos", label: "Activos", count: clientsData.filter(c => c.status === "activo").length },
            { key: "inactivos", label: "Inactivos", count: clientsData.filter(c => c.status === "inactivo").length },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              style={{
                padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500,
                border: statusFilter === f.key ? "1.5px solid #7C6CF6" : "1px solid #EEEEF3",
                background: statusFilter === f.key ? "#F2F0FF" : "#fff",
                color: statusFilter === f.key ? "#7C6CF6" : "#5A5A7A",
                cursor: "pointer", fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", gap: 5,
              }}
            >
              {f.label}
              <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 8, background: statusFilter === f.key ? "#7C6CF6" : "#EEEEF3", color: statusFilter === f.key ? "#fff" : "#9B9BB4" }}>
                {f.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* Grid */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
            {filtered.map(client => {
              const catCfg = categoryColors[client.category] ?? { color: "#9B9BB4", bg: "#F0F0F8" };
              const isSelected = selected === client.id;
              return (
                <div
                  key={client.id}
                  onClick={() => setSelected(isSelected ? null : client.id)}
                  style={{
                    background: "#fff", borderRadius: 16, border: isSelected ? "2px solid #7C6CF6" : "1px solid #EEEEF3",
                    padding: "20px", cursor: "pointer", transition: "all 0.15s",
                    boxShadow: isSelected ? "0 4px 16px rgba(124,108,246,0.15)" : "0 1px 4px rgba(0,0,0,0.04)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 12, background: catCfg.bg,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Building2 size={20} color={catCfg.color} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#0F0F1A" }}>{client.name}</div>
                        <div style={{ fontSize: 11, color: "#9B9BB4" }}>{client.rut}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 20,
                        background: client.status === "activo" ? "#ECFDF5" : "#F5F5FA",
                        color: client.status === "activo" ? "#10B981" : "#9B9BB4",
                      }}>
                        {client.status === "activo" ? "Activo" : "Inactivo"}
                      </span>
                      <button style={{ background: "none", border: "none", cursor: "pointer", color: "#9B9BB4" }}>
                        <MoreHorizontal size={16} />
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: catCfg.bg, color: catCfg.color }}>
                      {client.category}
                    </span>
                    <span style={{ fontSize: 10, color: "#9B9BB4", display: "flex", alignItems: "center", gap: 3 }}>
                      <MapPin size={9} />
                      {client.address.split(",")[1]?.trim() || "Santiago"}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
                    {[
                      { label: "Rutas", value: client.routes.toString() },
                      { label: "Vol. mensual", value: `${client.monthlyVolume}` },
                      { label: "Facturación", value: client.totalSpend },
                    ].map(item => (
                      <div key={item.label} style={{ background: "#F7F8FC", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#0F0F1A" }}>{item.value}</div>
                        <div style={{ fontSize: 9, color: "#9B9BB4", marginTop: 1 }}>{item.label}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#9B9BB4" }}>
                      <span>{client.contact}</span>
                      <StarRating rating={client.rating} />
                    </div>
                    <span style={{ fontSize: 10, color: "#C0C0D0" }}>Desde {client.since}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detail */}
        {selectedClient && (
          <div style={{ width: 320, borderLeft: "1px solid #EEEEF3", background: "#fff", overflowY: "auto", padding: "24px 20px", flexShrink: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#0F0F1A" }}>Detalle del cliente</div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9B9BB4", fontSize: 16 }}>✕</button>
            </div>

            <div style={{ background: "#F2F0FF", borderRadius: 14, padding: "20px", textAlign: "center", marginBottom: 16 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: "#7C6CF6", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
                <Building2 size={22} color="#fff" />
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#0F0F1A" }}>{selectedClient.name}</div>
              <div style={{ fontSize: 11, color: "#9B9BB4", marginTop: 2 }}>{selectedClient.rut}</div>
              <div style={{ marginTop: 8 }}>
                <StarRating rating={selectedClient.rating} />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { icon: Phone, label: selectedClient.phone },
                { icon: Mail, label: selectedClient.email },
                { icon: MapPin, label: selectedClient.address },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #F5F5FA" }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: "#F2F0FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon size={13} color="#7C6CF6" />
                    </div>
                    <span style={{ fontSize: 12, color: "#5A5A7A", flex: 1 }}>{item.label}</span>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 16 }}>
              {[
                { label: "Rutas totales", value: selectedClient.routes },
                { label: "Vol. mensual", value: selectedClient.monthlyVolume },
                { label: "Facturación total", value: selectedClient.totalSpend },
                { label: "Última entrega", value: selectedClient.lastDelivery },
              ].map(item => (
                <div key={item.label} style={{ background: "#F7F8FC", borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ fontSize: 9, color: "#9B9BB4", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0F0F1A" }}>{item.value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
              <button style={{
                padding: "10px", borderRadius: 8, background: "#7C6CF6", border: "none",
                fontSize: 13, color: "#fff", fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif",
              }}>
                Ver rutas del cliente
              </button>
              <button style={{
                padding: "10px", borderRadius: 8, background: "#F7F8FC", border: "1px solid #EEEEF3",
                fontSize: 13, color: "#5A5A7A", fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif",
              }}>
                Editar información
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
