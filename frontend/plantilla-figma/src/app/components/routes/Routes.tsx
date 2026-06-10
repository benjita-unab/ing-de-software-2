import { useState } from "react";
import {
  Plus, Search, Filter, ChevronDown, MapPin, Truck, User,
  Calendar, Package, AlertTriangle, CheckCircle2, Clock,
  MoreHorizontal, Route, ArrowRight, Eye, Pencil, Trash2,
} from "lucide-react";

const routesData = [
  {
    id: "RUT-2831",
    origin: "La Ligua, Vña del Mar, Valparaíso",
    destination: "Agua Santa, Vña del Mar, Valparaíso",
    client: "Bastian Prueba",
    driver: "paco-prue32",
    vehicle: "Camión asignado",
    etb: "15.987.654-+",
    status: "activa",
    dateRange: "01-05-2025 / 28-02-2026",
    anomalies: 0,
    packages: 24,
    distance: "12 km",
    notes: "Sin notas",
  },
  {
    id: "RUT-2832",
    origin: "Algarrobo, Vña del Mar, Valparaíso",
    destination: "Agua Santa, Vña del Mar, Valparaíso",
    client: "Bastian Prueba",
    driver: "Bastian Prueba",
    vehicle: "Camión asignado",
    etb: "10.444.555-6",
    status: "entregado",
    dateRange: "27-02-2028",
    anomalies: 1,
    packages: 18,
    distance: "38 km",
    notes: "1 anomalía reportada",
  },
  {
    id: "RUT-2833",
    origin: "Santiago, Región Metropolitana",
    destination: "Valparaíso, Puerto",
    client: "TechLogic S.A.",
    driver: "Carlos Mendez",
    vehicle: "V-01 Volvo FH",
    etb: "21.333.888-0",
    status: "activa",
    dateRange: "07-06-2026 / 08-06-2026",
    anomalies: 0,
    packages: 52,
    distance: "118 km",
    notes: "Carga fragile, manejo cuidadoso",
  },
  {
    id: "RUT-2834",
    origin: "Hub Santiago Norte",
    destination: "Concepción, Centro",
    client: "RetailMax Chile",
    driver: "Martina Vidal",
    vehicle: "V-04 Scania R",
    etb: "18.777.111-2",
    status: "activa",
    dateRange: "07-06-2026 / 08-06-2026",
    anomalies: 0,
    packages: 36,
    distance: "512 km",
    notes: "",
  },
  {
    id: "RUT-2829",
    origin: "Rancagua, O'Higgins",
    destination: "Talca, Maule",
    client: "FarmaDistribuidor",
    driver: "Diego Salinas",
    vehicle: "V-05 DAF XF",
    etb: "20.123.456-7",
    status: "activa",
    dateRange: "07-06-2026 / 07-06-2026",
    anomalies: 0,
    packages: 8,
    distance: "95 km",
    notes: "Temperatura controlada requerida",
  },
];

const statusConfig = {
  activa: { label: "Activa", color: "#7C6CF6", bg: "#F2F0FF" },
  entregado: { label: "Entregado", color: "#10B981", bg: "#ECFDF5" },
  pendiente: { label: "Pendiente", color: "#F59E0B", bg: "#FFFBEB" },
  cancelada: { label: "Cancelada", color: "#EF4444", bg: "#FEF2F2" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status as keyof typeof statusConfig] ?? statusConfig.pendiente;
  return (
    <span style={{
      padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: cfg.bg, color: cfg.color, display: "inline-flex", alignItems: "center", gap: 4,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.color, display: "inline-block" }} />
      {cfg.label}
    </span>
  );
}

type RouteFormData = {
  client: string;
  driver: string;
  vehicle: string;
  origin: string;
  destination: string;
  startDate: string;
  eta: string;
  packages: string;
  distance: string;
};

function RouteForm({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<RouteFormData>({
    client: "", driver: "", vehicle: "",
    origin: "", destination: "",
    startDate: "", eta: "", packages: "", distance: "",
  });

  return (
    <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #EEEEF3", padding: "24px 28px", marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontWeight: 700, fontSize: 16, color: "#0F0F1A" }}>Nueva ruta</h3>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9B9BB4" }}>✕</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
        {[
          { field: "client" as const, label: "Cliente *", placeholder: "Seleccionar cliente", icon: User },
          { field: "driver" as const, label: "Conductor (opcional)", placeholder: "— Seleccionar —", icon: User },
          { field: "vehicle" as const, label: "Camión (opcional)", placeholder: "— Seleccionar —", icon: Truck },
        ].map(({ field, label, placeholder, icon: Icon }) => (
          <div key={field}>
            <label style={{ display: "block", fontWeight: 600, fontSize: 12, color: "#5A5A7A", marginBottom: 6 }}>{label}</label>
            <div style={{ position: "relative" }}>
              <select
                value={form[field]}
                onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                style={{
                  width: "100%", padding: "9px 32px 9px 12px", borderRadius: 8, border: "1px solid #EEEEF3",
                  fontSize: 13, color: form[field] ? "#0F0F1A" : "#9B9BB4",
                  fontFamily: "Inter, sans-serif", background: "#F7F8FC", outline: "none", appearance: "none", cursor: "pointer",
                }}
              >
                <option value="">{placeholder}</option>
                <option value="bastian">Bastian Prueba</option>
                <option value="techlogic">TechLogic S.A.</option>
                <option value="retailmax">RetailMax Chile</option>
              </select>
              <ChevronDown size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#9B9BB4", pointerEvents: "none" }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        {[
          { field: "origin" as const, label: "Origen *", placeholder: "Escribe y selecciona una dirección sugerida..." },
          { field: "destination" as const, label: "Destino *", placeholder: "Escribe y selecciona una dirección sugerida..." },
        ].map(({ field, label, placeholder }) => (
          <div key={field}>
            <label style={{ display: "block", fontWeight: 600, fontSize: 12, color: "#5A5A7A", marginBottom: 6 }}>{label}</label>
            <div style={{ position: "relative" }}>
              <MapPin size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9B9BB4" }} />
              <input
                value={form[field]}
                onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                placeholder={placeholder}
                style={{
                  width: "100%", padding: "9px 12px 9px 30px", borderRadius: 8, border: "1px solid #EEEEF3",
                  fontSize: 13, color: "#0F0F1A", fontFamily: "Inter, sans-serif",
                  background: "#F7F8FC", outline: "none", boxSizing: "border-box",
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
        {[
          { field: "startDate" as const, label: "Fecha inicio (opcional)", placeholder: "dd-mm-aaaa", type: "date" },
          { field: "eta" as const, label: "ETA (opcional)", placeholder: "dd-mm-aaaa hh:mm", type: "datetime-local" },
          { field: "packages" as const, label: "Cantidad de Bultos *", placeholder: "Ej. 25", type: "number" },
        ].map(({ field, label, placeholder, type }) => (
          <div key={field}>
            <label style={{ display: "block", fontWeight: 600, fontSize: 12, color: "#5A5A7A", marginBottom: 6 }}>{label}</label>
            <input
              type={type}
              value={form[field]}
              onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
              placeholder={placeholder}
              style={{
                width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #EEEEF3",
                fontSize: 13, color: "#0F0F1A", fontFamily: "Inter, sans-serif",
                background: "#F7F8FC", outline: "none", boxSizing: "border-box",
              }}
            />
          </div>
        ))}
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: "block", fontWeight: 600, fontSize: 12, color: "#5A5A7A", marginBottom: 6 }}>
          Distancia vial calculada (km)
        </label>
        <input
          readOnly
          placeholder="Vacío — calcular por carretera con origen y destino"
          style={{
            width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #EEEEF3",
            fontSize: 13, color: "#9B9BB4", fontFamily: "Inter, sans-serif",
            background: "#F0F0F8", outline: "none", boxSizing: "border-box", cursor: "not-allowed",
          }}
        />
        <div style={{ fontSize: 10, color: "#9B9BB4", marginTop: 4 }}>
          La distancia se calcula por carretera usando origen y destino.
        </div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button style={{
          padding: "10px 20px", borderRadius: 8, background: "#F7F8FC", border: "1px solid #EEEEF3",
          fontSize: 13, color: "#5A5A7A", fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif",
          flex: 1,
        }}>
          Calcular distancia y fechas
        </button>
        <button style={{
          padding: "10px 24px", borderRadius: 8, background: "#7C6CF6", border: "none",
          fontSize: 13, color: "#fff", fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif",
          boxShadow: "0 2px 8px rgba(124,108,246,0.3)",
        }}>
          Guardar ruta
        </button>
      </div>
    </div>
  );
}

export function Routes() {
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const filtered = routesData.filter(r =>
    !search || r.id.toLowerCase().includes(search.toLowerCase()) ||
    r.destination.toLowerCase().includes(search.toLowerCase()) ||
    r.client.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ height: "100%", overflowY: "auto", background: "#F7F8FC", fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <div style={{ padding: "24px 28px 20px", background: "#fff", borderBottom: "1px solid #EEEEF3" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ margin: 0, fontWeight: 700, fontSize: 22, color: "#0F0F1A", letterSpacing: "-0.5px" }}>
              Gestión de rutas
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#9B9BB4" }}>
              Creá y consultá rutas operativas. El seguimiento y las evidencias siguen siendo responsabilidad de LogiTrack.
            </p>
          </div>
          <button
            onClick={() => setShowForm(f => !f)}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "9px 18px",
              borderRadius: 8, background: showForm ? "#F2F0FF" : "#7C6CF6",
              border: showForm ? "1px solid #C4B9FF" : "none",
              fontSize: 13, color: showForm ? "#7C6CF6" : "#fff", fontWeight: 600,
              cursor: "pointer", fontFamily: "Inter, sans-serif",
              boxShadow: showForm ? "none" : "0 2px 8px rgba(124,108,246,0.3)",
            }}
          >
            <Plus size={14} />
            {showForm ? "Ocultar formulario" : "Crear nueva ruta"}
          </button>
        </div>
      </div>

      <div style={{ padding: "20px 28px" }}>
        {/* Form */}
        {showForm && <RouteForm onClose={() => setShowForm(false)} />}

        {/* Table header */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #EEEEF3", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #EEEEF3", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontWeight: 600, fontSize: 14, color: "#0F0F1A" }}>
              Rutas registradas
              <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 500, color: "#9B9BB4" }}>({filtered.length})</span>
            </h3>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ position: "relative" }}>
                <Search size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#9B9BB4" }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar rutas..."
                  style={{
                    paddingLeft: 28, paddingRight: 12, paddingTop: 7, paddingBottom: 7,
                    borderRadius: 7, border: "1px solid #EEEEF3", fontSize: 12, color: "#0F0F1A",
                    fontFamily: "Inter, sans-serif", background: "#F7F8FC", outline: "none", width: 200,
                  }}
                />
              </div>
              <button style={{
                display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 7,
                border: "1px solid #EEEEF3", background: "#fff", fontSize: 12, color: "#5A5A7A",
                cursor: "pointer", fontFamily: "Inter, sans-serif",
              }}>
                <Filter size={12} />
                Filtrar
              </button>
            </div>
          </div>

          {/* Table */}
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F7F8FC" }}>
                {["Origen → Destino", "Cliente", "Estado", "Conductor / Camión", "ETA", "Fechas estimadas", "Anomalías", "Acciones"].map(col => (
                  <th key={col} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#9B9BB4", letterSpacing: "0.3px", borderBottom: "1px solid #EEEEF3", whiteSpace: "nowrap" }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((route, i) => (
                <>
                  <tr
                    key={route.id}
                    onClick={() => setExpandedRow(expandedRow === route.id ? null : route.id)}
                    style={{
                      borderBottom: "1px solid #F5F5FA",
                      background: expandedRow === route.id ? "#F7F6FF" : i % 2 === 0 ? "#fff" : "#FAFAFA",
                      cursor: "pointer",
                      transition: "background 0.1s",
                    }}
                  >
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#7C6CF6", marginBottom: 3 }}>{route.id}</div>
                      <div style={{ fontSize: 11, color: "#5A5A7A", maxWidth: 200 }}>
                        {route.origin.split(",")[0]}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: "#9B9BB4" }}>
                        <ArrowRight size={9} />
                        {route.destination.split(",")[0]}
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: 12, color: "#5A5A7A" }}>{route.client}</td>
                    <td style={{ padding: "14px 16px" }}><StatusBadge status={route.status} /></td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontSize: 12, color: "#5A5A7A" }}>{route.driver}</div>
                      <div style={{ fontSize: 11, color: "#9B9BB4" }}>{route.vehicle}</div>
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: 12, fontWeight: 600, color: "#0F0F1A" }}>
                      {route.etb}
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: 11, color: "#9B9BB4" }}>
                      {route.dateRange}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      {route.anomalies > 0 ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#F59E0B", fontWeight: 600 }}>
                          <AlertTriangle size={12} />
                          {route.anomalies}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: "#9B9BB4" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button style={{ padding: "5px 8px", borderRadius: 6, background: "#F2F0FF", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: "#7C6CF6", fontWeight: 600 }}>
                          <Eye size={11} /> Ver
                        </button>
                        <button style={{ padding: "5px", borderRadius: 6, background: "#F7F8FC", border: "1px solid #EEEEF3", cursor: "pointer" }}>
                          <MoreHorizontal size={13} color="#9B9BB4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedRow === route.id && (
                    <tr key={`${route.id}-expanded`}>
                      <td colSpan={8} style={{ padding: "0 16px 16px", background: "#F7F6FF", borderBottom: "1px solid #EEEEF3" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, paddingTop: 12 }}>
                          {[
                            { label: "Distancia", value: route.distance },
                            { label: "Bultos", value: `${route.packages} paquetes` },
                            { label: "Notas", value: route.notes || "Sin notas" },
                            { label: "RUT Conductor", value: route.etb },
                          ].map(item => (
                            <div key={item.label} style={{ background: "#fff", borderRadius: 8, padding: "10px 14px", border: "1px solid #EEEEF3" }}>
                              <div style={{ fontSize: 10, color: "#9B9BB4", marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{item.label}</div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: "#0F0F1A" }}>{item.value}</div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
