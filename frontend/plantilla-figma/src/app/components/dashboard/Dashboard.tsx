import { useState } from "react";
import {
  Truck, Package, Route, CheckCircle2, AlertTriangle,
  TrendingUp, TrendingDown, Clock, MapPin, ChevronRight,
  Activity, Zap, MoreHorizontal, ArrowUpRight,
} from "lucide-react";
import { LogisticsMap } from "./LogisticsMap";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from "recharts";

const kpis = [
  {
    label: "Entregas Activas",
    value: "14",
    sub: "+2 desde ayer",
    icon: Package,
    color: "#7C6CF6",
    bg: "#F2F0FF",
    trend: "up",
  },
  {
    label: "Completadas hoy",
    value: "64",
    sub: "92.8% éxito",
    icon: CheckCircle2,
    color: "#34D399",
    bg: "#ECFDF5",
    trend: "up",
  },
  {
    label: "Flota Activa",
    value: "5 / 8",
    sub: "3 en base",
    icon: Truck,
    color: "#60A5FA",
    bg: "#EFF6FF",
    trend: "neutral",
  },
  {
    label: "Alertas Abiertas",
    value: "3",
    sub: "1 crítica",
    icon: AlertTriangle,
    color: "#F59E0B",
    bg: "#FFFBEB",
    trend: "down",
  },
  {
    label: "Puntualidad",
    value: "91.2%",
    sub: "+3.1% vs semana ant.",
    icon: Clock,
    color: "#A78BFA",
    bg: "#F5F3FF",
    trend: "up",
  },
];

const activeDeliveries = [
  {
    id: "RUT-2831",
    origin: "Hub Santiago Centro",
    destination: "Valparaíso, Puerto",
    driver: "Carlos Mendez",
    vehicle: "V-01 · Volvo FH",
    status: "en_ruta",
    eta: "14:35",
    progress: 68,
    packages: 24,
    distance: "118 km",
  },
  {
    id: "RUT-2832",
    origin: "Hub Santiago Sur",
    destination: "Rancagua, Centro",
    driver: "Ana Rodriguez",
    vehicle: "V-02 · Mercedes Actros",
    status: "en_ruta",
    eta: "15:10",
    progress: 45,
    packages: 12,
    distance: "87 km",
  },
  {
    id: "RUT-2833",
    origin: "Valparaíso, Puerto",
    destination: "La Serena, Av. del Mar",
    driver: "Pedro López",
    vehicle: "V-03 · MAN TGX",
    status: "alerta",
    eta: "17:45",
    progress: 22,
    packages: 8,
    distance: "443 km",
  },
  {
    id: "RUT-2834",
    origin: "Hub Santiago Norte",
    destination: "Concepción, Centro",
    driver: "Martina Vidal",
    vehicle: "V-04 · Scania R",
    status: "en_ruta",
    eta: "18:20",
    progress: 31,
    packages: 36,
    distance: "512 km",
  },
];

const fleetItems = [
  { id: "V-01", name: "Volvo FH-540", driver: "Carlos M.", fuel: 78, temp: 22, status: "en_ruta", load: 82 },
  { id: "V-02", name: "Mercedes Actros", driver: "Ana R.", fuel: 54, temp: 24, status: "en_ruta", load: 65 },
  { id: "V-03", name: "MAN TGX 18.510", driver: "Pedro L.", fuel: 31, temp: 21, status: "alerta", load: 40 },
  { id: "V-04", name: "Scania R 500", driver: "Martina V.", fuel: 85, temp: 23, status: "en_ruta", load: 91 },
  { id: "V-05", name: "DAF XF 480", driver: "Diego S.", fuel: 67, temp: 22, status: "en_ruta", load: 73 },
];

const recentAlerts = [
  { id: "ALT-445", type: "critica", vehicle: "V-03", message: "Vehículo detenido sin programar · 47 min", time: "Hace 47 min", icon: AlertTriangle, color: "#EF4444" },
  { id: "ALT-444", type: "advertencia", vehicle: "V-02", message: "Combustible bajo (31%) · Repostar antes de destino", time: "Hace 1h 12m", icon: Zap, color: "#F59E0B" },
  { id: "ALT-443", type: "info", vehicle: "V-01", message: "Ruta completada · Regresando a base", time: "Hace 2h 05m", icon: CheckCircle2, color: "#34D399" },
  { id: "ALT-442", type: "advertencia", vehicle: "V-04", message: "Demora estimada +35 min por tráfico", time: "Hace 2h 30m", icon: Clock, color: "#F59E0B" },
];

const deliveryTrendData = [
  { day: "L", value: 48 },
  { day: "M", value: 55 },
  { day: "X", value: 51 },
  { day: "J", value: 62 },
  { day: "V", value: 58 },
  { day: "S", value: 43 },
  { day: "D", value: 64 },
];

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ width: "100%", height: 4, borderRadius: 2, background: "#F0F0F8" }}>
      <div
        style={{
          width: `${value}%`, height: "100%", borderRadius: 2,
          background: color, transition: "width 0.5s ease",
        }}
      />
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === "en_ruta") return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 8px", borderRadius: 20, background: "#EDE9FF",
      fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 600, color: "#7C6CF6",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#7C6CF6", display: "inline-block" }} />
      EN RUTA
    </span>
  );
  if (status === "alerta") return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 8px", borderRadius: 20, background: "#FEE2E2",
      fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 600, color: "#EF4444",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#EF4444", display: "inline-block" }} />
      ALERTA
    </span>
  );
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 8px", borderRadius: 20, background: "#ECFDF5",
      fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 600, color: "#10B981",
    }}>
      COMPLETADO
    </span>
  );
}

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<"entregas" | "flota">("entregas");

  return (
    <div style={{ height: "100%", overflowY: "auto", background: "#F7F8FC", padding: "24px", display: "flex", flexDirection: "column", gap: 20, fontFamily: "Inter, sans-serif" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ margin: 0, fontWeight: 700, fontSize: 22, color: "#0F0F1A", letterSpacing: "-0.5px" }}>
            Centro de Operaciones
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#9B9BB4", fontWeight: 400 }}>
            Domingo 7 de junio, 2026 · Turno día · Todo Chile
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 14px", borderRadius: 8, background: "#fff",
            border: "1px solid #EEEEF3", fontSize: 12, color: "#5A5A7A", fontWeight: 500,
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}>
            <Activity size={14} color="#34D399" />
            Sistema operativo
          </div>
          <button style={{
            padding: "8px 16px", borderRadius: 8, background: "#7C6CF6",
            border: "none", fontSize: 12, color: "#fff", fontWeight: 600,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
            boxShadow: "0 2px 8px rgba(124,108,246,0.3)",
          }}>
            <Route size={14} />
            Nueva ruta
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16 }}>
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              style={{
                background: "#fff", borderRadius: 16, padding: "16px",
                border: "1px solid #EEEEF3", boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                display: "flex", alignItems: "flex-start", gap: 12,
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 10, background: kpi.bg,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <Icon size={18} color={kpi.color} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "#9B9BB4", fontWeight: 500, marginBottom: 4 }}>{kpi.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#0F0F1A", lineHeight: 1, letterSpacing: "-0.5px" }}>
                  {kpi.value}
                </div>
                <div style={{ fontSize: 10, color: kpi.trend === "up" ? "#34D399" : kpi.trend === "down" ? "#EF4444" : "#9B9BB4", marginTop: 4, fontWeight: 500 }}>
                  {kpi.sub}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main content: Map + Right panel */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16, flex: 1, minHeight: 440 }}>

        {/* Map */}
        <div style={{
          background: "#fff", borderRadius: 16, border: "1px solid #EEEEF3",
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)", overflow: "hidden",
          display: "flex", flexDirection: "column",
        }}>
          <div style={{ padding: "16px 16px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: "#0F0F1A" }}>Mapa de operaciones</div>
              <div style={{ fontSize: 11, color: "#9B9BB4", marginTop: 4 }}>Seguimiento en tiempo real</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {["Todos", "Alertas", "Completados"].map(f => (
                <button key={f} style={{
                  padding: "6px 12px", borderRadius: 6, border: f === "Todos" ? "1.5px solid #7C6CF6" : "1px solid #EEEEF3",
                  background: f === "Todos" ? "#F2F0FF" : "transparent",
                  fontSize: 11, color: f === "Todos" ? "#7C6CF6" : "#9B9BB4", fontWeight: 500, cursor: "pointer",
                  fontFamily: "Inter, sans-serif",
                }}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, padding: 16, minHeight: 0 }}>
            <LogisticsMap />
          </div>
        </div>

        {/* Right panel: Deliveries / Fleet */}
        <div style={{
          background: "#fff", borderRadius: 16, border: "1px solid #EEEEF3",
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column",
        }}>
          {/* Tabs */}
          <div style={{ padding: "16px 16px 0", borderBottom: "1px solid #EEEEF3" }}>
            <div style={{ display: "flex", gap: 0 }}>
              {[
                { key: "entregas", label: "Entregas activas", count: activeDeliveries.length },
                { key: "flota", label: "Flota", count: fleetItems.length },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as "entregas" | "flota")}
                  style={{
                    padding: "10px 16px", border: "none", background: "transparent",
                    cursor: "pointer", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600,
                    color: activeTab === tab.key ? "#0F0F1A" : "#9B9BB4",
                    borderBottom: activeTab === tab.key ? "2px solid #7C6CF6" : "2px solid transparent",
                    marginBottom: -1, display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  {tab.label}
                  <span style={{
                    background: activeTab === tab.key ? "#7C6CF6" : "#EEEEF3",
                    color: activeTab === tab.key ? "#fff" : "#9B9BB4",
                    fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 10,
                  }}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 0" }}>
            {activeTab === "entregas" ? (
              activeDeliveries.map((d, i) => (
                <div
                  key={d.id}
                  style={{
                    padding: "14px 16px",
                    borderBottom: i < activeDeliveries.length - 1 ? "1px solid #F5F5FA" : "none",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 12, color: "#0F0F1A" }}>{d.id}</span>
                        <StatusPill status={d.status} />
                      </div>
                      <div style={{ fontSize: 11, color: "#9B9BB4", display: "flex", alignItems: "center", gap: 4 }}>
                        <MapPin size={10} />
                        {d.origin}
                      </div>
                      <div style={{ fontSize: 11, color: "#5A5A7A", fontWeight: 500, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                        <ArrowUpRight size={10} />
                        {d.destination}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#7C6CF6" }}>{d.eta}</div>
                      <div style={{ fontSize: 10, color: "#9B9BB4", marginTop: 2 }}>ETA</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 10, color: "#9B9BB4" }}>{d.driver} · {d.vehicle}</span>
                    <span style={{ fontSize: 10, color: "#9B9BB4" }}>{d.distance}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <ProgressBar value={d.progress} color={d.status === "alerta" ? "#EF4444" : "#7C6CF6"} />
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: d.status === "alerta" ? "#EF4444" : "#7C6CF6", minWidth: 32 }}>
                      {d.progress}%
                    </span>
                  </div>
                </div>
              ))
            ) : (
              fleetItems.map((v, i) => (
                <div
                  key={v.id}
                  style={{
                    padding: "14px 16px",
                    borderBottom: i < fleetItems.length - 1 ? "1px solid #F5F5FA" : "none",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 12, color: "#0F0F1A" }}>{v.id}</span>
                        <StatusPill status={v.status} />
                      </div>
                      <div style={{ fontSize: 11, color: "#5A5A7A", marginTop: 2 }}>{v.name}</div>
                      <div style={{ fontSize: 10, color: "#9B9BB4", marginTop: 2 }}>{v.driver}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#0F0F1A" }}>{v.load}%</div>
                      <div style={{ fontSize: 10, color: "#9B9BB4", marginTop: 2 }}>Carga</div>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 9, color: "#9B9BB4", marginBottom: 3, fontWeight: 500 }}>COMBUSTIBLE</div>
                      <ProgressBar value={v.fuel} color={v.fuel < 35 ? "#EF4444" : v.fuel < 50 ? "#F59E0B" : "#34D399"} />
                      <div style={{ fontSize: 9, fontWeight: 600, color: "#5A5A7A", marginTop: 2 }}>{v.fuel}%</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 9, color: "#9B9BB4", marginBottom: 3, fontWeight: 500 }}>CARGA</div>
                      <ProgressBar value={v.load} color="#7C6CF6" />
                      <div style={{ fontSize: 9, fontWeight: 600, color: "#5A5A7A", marginTop: 2 }}>{v.load}%</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: "12px 16px", borderTop: "1px solid #EEEEF3" }}>
            <button style={{
              width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #EEEEF3",
              background: "#F7F8FC", fontSize: 12, color: "#7C6CF6", fontWeight: 600,
              cursor: "pointer", fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              Ver todos <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom row: Alerts feed + Delivery trend */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>

        {/* Alerts feed */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #EEEEF3", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#0F0F1A" }}>Alertas recientes</div>
            <button style={{ fontSize: 11, color: "#7C6CF6", fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", gap: 4 }}>
              Ver todas <ChevronRight size={12} />
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {recentAlerts.map(alert => {
              const Icon = alert.icon;
              return (
                <div
                  key={alert.id}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px",
                    borderRadius: 10, background: "#F8F8FC", border: "1px solid #EEEEF3",
                  }}
                >
                  <div style={{
                    width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                    background: `${alert.color}15`, display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon size={15} color={alert.color} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                      <span style={{ fontWeight: 600, fontSize: 12, color: "#0F0F1A" }}>{alert.id}</span>
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4,
                        background: `${alert.color}15`, color: alert.color,
                      }}>
                        {alert.vehicle}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "#5A5A7A", lineHeight: 1.4 }}>{alert.message}</div>
                  </div>
                  <div style={{ fontSize: 10, color: "#9B9BB4", whiteSpace: "nowrap" }}>{alert.time}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Delivery trend */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #EEEEF3", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: "#0F0F1A" }}>Entregas / día</div>
              <div style={{ fontSize: 11, color: "#9B9BB4", marginTop: 3 }}>Últimos 7 días</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 9px", borderRadius: 6, background: "#ECFDF5" }}>
              <TrendingUp size={12} color="#10B981" />
              <span style={{ fontSize: 11, fontWeight: 600, color: "#10B981" }}>+18.4%</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: "#0F0F1A", letterSpacing: "-1px" }}>381</span>
            <span style={{ fontSize: 12, color: "#9B9BB4" }}>entregas esta semana</span>
          </div>
          <ResponsiveContainer width="100%" height={100}>
            <AreaChart data={deliveryTrendData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="deliveryGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7C6CF6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#7C6CF6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9B9BB4", fontFamily: "Inter" }} />
              <Tooltip
                contentStyle={{ background: "#0F0F1A", border: "none", borderRadius: 8, fontSize: 11, color: "#fff", fontFamily: "Inter", padding: "6px 10px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}
                itemStyle={{ color: "#A593FF", padding: 0 }}
                cursor={{ stroke: "#7C6CF6", strokeWidth: 1, strokeDasharray: "3 3" }}
                wrapperStyle={{ zIndex: 100 }}
              />
              <Area type="monotone" dataKey="value" stroke="#7C6CF6" strokeWidth={2} fill="url(#deliveryGrad)" dot={false} activeDot={{ r: 4, fill: "#7C6CF6", stroke: "#fff", strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
            {[
              { label: "Promedio diario", value: "54.4" },
              { label: "Mejor día", value: "64 (Vier)" },
            ].map(item => (
              <div key={item.label} style={{ background: "#F7F8FC", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ fontSize: 10, color: "#9B9BB4", fontWeight: 500 }}>{item.label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0F0F1A", marginTop: 3 }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
