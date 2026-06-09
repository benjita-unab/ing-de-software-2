import { useState } from "react";
import {
  AlertTriangle, Zap, CheckCircle2, Clock, Search, Filter,
  ChevronRight, X, MessageSquare, Truck, MapPin, Phone,
} from "lucide-react";

const alertsData = [
  {
    id: "ALT-445",
    priority: "critica",
    vehicle: "V-03",
    driver: "Pedro López",
    route: "RUT-2833",
    title: "Vehículo detenido sin programar",
    description: "El vehículo MAN TGX 18.510 lleva 47 minutos detenido en Autopista del Sol km 82, sin justificación registrada. Temperatura de carga dentro de rango.",
    location: "Autopista del Sol km 82, RM",
    time: "07:43:18",
    date: "07-06-2026",
    status: "pendiente",
    tags: ["Parada no autorizada", "Control policial"],
    rut: "21.333.888-0",
    camion: "MAN-13",
    incidencia: "Accidente menor",
  },
  {
    id: "ALT-444",
    priority: "advertencia",
    vehicle: "V-02",
    driver: "Ana Rodriguez",
    route: "RUT-2832",
    title: "Combustible bajo — repostar requerido",
    description: "El nivel de combustible del vehículo Mercedes Actros ha bajado al 31%. Se recomienda repostar en la próxima estación de servicio antes de llegar al destino en Rancagua.",
    location: "Ruta 5 Sur km 34, O'Higgins",
    time: "06:30:00",
    date: "07-06-2026",
    status: "pendiente",
    tags: ["Combustible", "Acción requerida"],
    rut: "20.370.444-5",
    camion: "MAN-13",
    incidencia: "Datos identificativos",
  },
  {
    id: "ALT-443",
    priority: "info",
    vehicle: "V-01",
    driver: "Carlos Mendez",
    route: "RUT-2831",
    title: "Ruta completada — regresando a base",
    description: "Carlos Mendez completó la entrega en Valparaíso Puerto a las 14:15. El vehículo V-01 (Volvo FH-540) está de regreso al Hub Santiago Centro. ETA: 16:45.",
    location: "En ruta a Hub SCL",
    time: "14:15:00",
    date: "07-06-2026",
    status: "resuelta",
    tags: ["Completado", "Retorno"],
    rut: "18.777.111-2",
    camion: "LIC-1008",
    incidencia: "Ruta finalizada",
  },
  {
    id: "ALT-442",
    priority: "advertencia",
    vehicle: "V-04",
    driver: "Martina Vidal",
    route: "RUT-2834",
    title: "Demora estimada por tráfico",
    description: "Tráfico pesado en Autopista del Maipo. La entrega en Concepción tendrá una demora aproximada de 35 minutos respecto a la ETA original. Cliente notificado.",
    location: "Autopista del Maipo km 15",
    time: "05:12:00",
    date: "07-06-2026",
    status: "en_gestion",
    tags: ["Demora", "Tráfico"],
    rut: "19.000.777-3",
    camion: "LIC-1077",
    incidencia: "Retraso",
  },
  {
    id: "ALT-441",
    priority: "info",
    vehicle: "V-05",
    driver: "Diego Salinas",
    route: "RUT-2829",
    title: "Check-in de parada programada",
    description: "Diego Salinas realizó parada programada de 30 minutos en la ciudad de Rancagua para descanso obligatorio. Tiempo de conducción: 4h 12min.",
    location: "Rancagua, O'Higgins",
    time: "04:45:00",
    date: "07-06-2026",
    status: "resuelta",
    tags: ["Parada programada", "Descanso"],
    rut: "20.123.456-7",
    camion: "LIC-2001",
    incidencia: "Parada reglamentaria",
  },
];

const priorityConfig = {
  critica: { color: "#EF4444", bg: "#FEF2F2", border: "#FECACA", label: "CRÍTICA" },
  advertencia: { color: "#F59E0B", bg: "#FFFBEB", border: "#FDE68A", label: "ADVERTENCIA" },
  info: { color: "#7C6CF6", bg: "#F2F0FF", border: "#C4B9FF", label: "INFO" },
};

const statusConfig = {
  pendiente: { color: "#F59E0B", bg: "#FFFBEB", label: "Pendiente" },
  en_gestion: { color: "#7C6CF6", bg: "#F2F0FF", label: "En gestión" },
  resuelta: { color: "#10B981", bg: "#ECFDF5", label: "Resuelta" },
};

type AlertTab = "todas" | "pendientes" | "en_gestion" | "resueltas";

export function Alerts() {
  const [tab, setTab] = useState<AlertTab>("todas");
  const [selected, setSelected] = useState<string | null>("ALT-445");
  const [search, setSearch] = useState("");

  const filtered = alertsData.filter(a => {
    if (tab === "pendientes" && a.status !== "pendiente") return false;
    if (tab === "en_gestion" && a.status !== "en_gestion") return false;
    if (tab === "resueltas" && a.status !== "resuelta") return false;
    if (search && !a.title.toLowerCase().includes(search.toLowerCase()) && !a.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const selectedAlert = alertsData.find(a => a.id === selected);

  const tabs: { key: AlertTab; label: string; count: number }[] = [
    { key: "todas", label: "Todas", count: alertsData.length },
    { key: "pendientes", label: "Pendientes", count: alertsData.filter(a => a.status === "pendiente").length },
    { key: "en_gestion", label: "En gestión", count: alertsData.filter(a => a.status === "en_gestion").length },
    { key: "resueltas", label: "Resueltas", count: alertsData.filter(a => a.status === "resuelta").length },
  ];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#F7F8FC", fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <div style={{ padding: "24px 28px 0", background: "#fff", borderBottom: "1px solid #EEEEF3" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, fontWeight: 700, fontSize: 22, color: "#0F0F1A", letterSpacing: "-0.5px" }}>
              Cola de alertas
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#9B9BB4" }}>
              {alertsData.filter(a => a.status === "pendiente").length} alertas pendientes · 1 crítica requiere acción inmediata
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9B9BB4" }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar alertas..."
                style={{
                  paddingLeft: 32, paddingRight: 14, paddingTop: 8, paddingBottom: 8,
                  borderRadius: 8, border: "1px solid #EEEEF3", fontSize: 13, color: "#0F0F1A",
                  fontFamily: "Inter, sans-serif", background: "#F7F8FC", outline: "none", width: 220,
                }}
              />
            </div>
            <button style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8,
              border: "1px solid #EEEEF3", background: "#fff", fontSize: 13, color: "#5A5A7A",
              cursor: "pointer", fontFamily: "Inter, sans-serif", fontWeight: 500,
            }}>
              <Filter size={14} />
              Filtrar
            </button>
          </div>
        </div>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 0 }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: "10px 16px", border: "none", background: "transparent", cursor: "pointer",
                fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600,
                color: tab === t.key ? "#0F0F1A" : "#9B9BB4",
                borderBottom: tab === t.key ? "2px solid #7C6CF6" : "2px solid transparent",
                display: "flex", alignItems: "center", gap: 6, marginBottom: -1,
              }}
            >
              {t.label}
              {t.count > 0 && (
                <span style={{
                  background: tab === t.key ? "#7C6CF6" : "#EEEEF3",
                  color: tab === t.key ? "#fff" : "#9B9BB4",
                  fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 10,
                }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "380px 1fr", minHeight: 0 }}>
        {/* Alert list */}
        <div style={{ borderRight: "1px solid #EEEEF3", overflowY: "auto", background: "#fff" }}>
          {filtered.map((alert, i) => {
            const pCfg = priorityConfig[alert.priority as keyof typeof priorityConfig];
            const sCfg = statusConfig[alert.status as keyof typeof statusConfig];
            const isSelected = selected === alert.id;
            return (
              <div
                key={alert.id}
                onClick={() => setSelected(alert.id)}
                style={{
                  padding: "16px 20px",
                  borderBottom: "1px solid #F5F5FA",
                  cursor: "pointer",
                  background: isSelected ? "#F7F6FF" : "#fff",
                  borderLeft: isSelected ? "3px solid #7C6CF6" : "3px solid transparent",
                  transition: "all 0.1s",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%", background: pCfg.color,
                      boxShadow: `0 0 0 3px ${pCfg.color}20`,
                    }} />
                    <span style={{ fontWeight: 700, fontSize: 13, color: "#0F0F1A" }}>{alert.id}</span>
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                      background: pCfg.bg, color: pCfg.color, border: `1px solid ${pCfg.border}`,
                    }}>
                      {pCfg.label}
                    </span>
                  </div>
                  <span style={{ fontSize: 10, color: "#9B9BB4" }}>{alert.time}</span>
                </div>
                <div style={{ fontWeight: 600, fontSize: 12.5, color: "#0F0F1A", marginBottom: 4 }}>
                  {alert.title}
                </div>
                <div style={{ fontSize: 11, color: "#9B9BB4", display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
                  <Truck size={10} />
                  {alert.vehicle} · {alert.driver}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 4 }}>
                    {alert.tags.slice(0, 2).map(tag => (
                      <span key={tag} style={{ fontSize: 9, fontWeight: 500, padding: "2px 6px", borderRadius: 4, background: "#F0F0F8", color: "#5A5A7A" }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                    background: sCfg.bg, color: sCfg.color,
                  }}>
                    {sCfg.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Alert detail */}
        {selectedAlert ? (
          <div style={{ overflowY: "auto", padding: "28px 32px", background: "#F7F8FC" }}>
            <div style={{ maxWidth: 640 }}>
              {/* Alert header */}
              <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #EEEEF3", padding: "20px 24px", marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {(() => {
                      const pCfg = priorityConfig[selectedAlert.priority as keyof typeof priorityConfig];
                      return (
                        <div style={{
                          width: 40, height: 40, borderRadius: 10, background: pCfg.bg,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <AlertTriangle size={18} color={pCfg.color} />
                        </div>
                      );
                    })()}
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                        <span style={{ fontWeight: 700, fontSize: 15, color: "#0F0F1A" }}>{selectedAlert.id}</span>
                        {(() => {
                          const pCfg = priorityConfig[selectedAlert.priority as keyof typeof priorityConfig];
                          return (
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 4, background: pCfg.bg, color: pCfg.color }}>
                              {pCfg.label}
                            </span>
                          );
                        })()}
                      </div>
                      <div style={{ fontSize: 12, color: "#9B9BB4" }}>{selectedAlert.date} · {selectedAlert.time}</div>
                    </div>
                  </div>
                  {(() => {
                    const sCfg = statusConfig[selectedAlert.status as keyof typeof statusConfig];
                    return (
                      <span style={{ fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 20, background: sCfg.bg, color: sCfg.color }}>
                        {sCfg.label}
                      </span>
                    );
                  })()}
                </div>
                <h2 style={{ margin: "0 0 8px", fontWeight: 700, fontSize: 17, color: "#0F0F1A" }}>
                  {selectedAlert.title}
                </h2>
                <p style={{ margin: 0, fontSize: 13, color: "#5A5A7A", lineHeight: 1.6 }}>
                  {selectedAlert.description}
                </p>
              </div>

              {/* Details grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                {[
                  { label: "Vehículo", value: selectedAlert.vehicle, icon: Truck },
                  { label: "Conductor", value: selectedAlert.driver, icon: Truck },
                  { label: "RUT", value: selectedAlert.rut, icon: Truck },
                  { label: "Camión / Licencia", value: selectedAlert.camion, icon: Truck },
                  { label: "Ruta", value: selectedAlert.route, icon: ChevronRight },
                  { label: "Incidencia", value: selectedAlert.incidencia, icon: AlertTriangle },
                ].map(item => (
                  <div key={item.label} style={{ background: "#fff", borderRadius: 12, border: "1px solid #EEEEF3", padding: "14px 16px" }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "#9B9BB4", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#0F0F1A" }}>{item.value}</div>
                  </div>
                ))}
              </div>

              {/* Location */}
              <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #EEEEF3", padding: "14px 16px", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "#F2F0FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <MapPin size={14} color="#7C6CF6" />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "#9B9BB4", textTransform: "uppercase", letterSpacing: "0.5px" }}>Ubicación</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#0F0F1A" }}>{selectedAlert.location}</div>
                  </div>
                </div>
              </div>

              {/* Messages/Notes area */}
              <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #EEEEF3", padding: "16px" }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: "#0F0F1A", marginBottom: 12 }}>Notas del caso</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    placeholder="Añadir nota o comentario..."
                    style={{
                      flex: 1, padding: "9px 14px", borderRadius: 8, border: "1px solid #EEEEF3",
                      fontSize: 13, color: "#0F0F1A", fontFamily: "Inter, sans-serif",
                      background: "#F7F8FC", outline: "none",
                    }}
                  />
                  <button style={{
                    padding: "9px 16px", borderRadius: 8, background: "#7C6CF6", border: "none",
                    fontSize: 13, color: "#fff", fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif",
                  }}>
                    Añadir
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button style={{
                  flex: 1, padding: "11px", borderRadius: 10, background: "#7C6CF6", border: "none",
                  fontSize: 13, color: "#fff", fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif",
                  boxShadow: "0 2px 8px rgba(124,108,246,0.3)",
                }}>
                  Marcar como resuelta
                </button>
                <button style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "11px 16px", borderRadius: 10,
                  border: "1px solid #EEEEF3", background: "#fff", fontSize: 13, color: "#5A5A7A",
                  fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif",
                }}>
                  <Phone size={14} />
                  Contactar
                </button>
                <button style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "11px 16px", borderRadius: 10,
                  border: "1px solid #EEEEF3", background: "#fff", fontSize: 13, color: "#5A5A7A",
                  fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif",
                }}>
                  <MessageSquare size={14} />
                  Mensaje
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, color: "#9B9BB4", flexDirection: "column", gap: 8 }}>
            <AlertTriangle size={32} color="#EEEEF3" />
            <span style={{ fontSize: 13, fontFamily: "Inter, sans-serif" }}>Selecciona una alerta</span>
          </div>
        )}
      </div>
    </div>
  );
}
