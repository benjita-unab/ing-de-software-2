import {
  LayoutDashboard,
  Bell,
  Route,
  Truck,
  Users,
  UserCog,
  MessageSquare,
  Package,
  History,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Settings,
} from "lucide-react";

type Module =
  | "dashboard"
  | "alerts"
  | "routes"
  | "assign"
  | "guides"
  | "history"
  | "clients"
  | "rrhh"
  | "fleet"
  | "messages";

interface SidebarProps {
  active: Module;
  onNavigate: (module: Module) => void;
  collapsed: boolean;
  onToggle: () => void;
  alertCount?: number;
}

const navItems: { id: Module; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "alerts", label: "Alertas", icon: Bell },
  { id: "routes", label: "Rutas", icon: Route },
  { id: "assign", label: "Asignar", icon: UserCheck },
  { id: "fleet", label: "Flota", icon: Truck },
  { id: "clients", label: "Clientes", icon: Users },
  { id: "rrhh", label: "RRHH", icon: UserCog },
  { id: "messages", label: "Mensajes", icon: MessageSquare },
  { id: "guides", label: "Guías", icon: Package },
  { id: "history", label: "Historial", icon: History },
];

export function Sidebar({ active, onNavigate, collapsed, onToggle, alertCount = 0 }: SidebarProps) {
  return (
    <aside
      className="flex flex-col h-full transition-all duration-300 ease-in-out"
      style={{
        width: collapsed ? "72px" : "220px",
        background: "#fff",
        borderRight: "1px solid #EEEEF3",
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-4 py-5"
        style={{ borderBottom: "1px solid #EEEEF3", minHeight: "72px" }}
      >
        <div
          className="flex items-center justify-center rounded-xl"
          style={{ width: 36, height: 36, background: "#7C6CF6", flexShrink: 0 }}
        >
          <Truck size={18} color="#fff" />
        </div>
        {!collapsed && (
          <div>
            <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 15, color: "#0F0F1A", letterSpacing: "-0.3px" }}>
              LogiTrack
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 400, fontSize: 11, color: "#9B9BB4" }}>
              Fleet Operations
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 overflow-y-auto" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="flex items-center gap-3 w-full transition-all duration-150 group"
              style={{
                padding: collapsed ? "10px 0" : "10px 12px",
                borderRadius: 10,
                background: isActive ? "#F2F0FF" : "transparent",
                border: "none",
                cursor: "pointer",
                justifyContent: collapsed ? "center" : "flex-start",
                position: "relative",
              }}
            >
              <div style={{ position: "relative", flexShrink: 0 }}>
                <Icon
                  size={18}
                  className="transition-colors"
                  style={{ color: isActive ? "#7C6CF6" : "#9B9BB4" }}
                />
                {item.id === "alerts" && alertCount > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: -5,
                      right: -5,
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      background: "#EF4444",
                      color: "#fff",
                      fontSize: 8,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "Inter, sans-serif",
                    }}
                  >
                    {alertCount}
                  </span>
                )}
              </div>
              {!collapsed && (
                <span
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontWeight: isActive ? 600 : 500,
                    fontSize: 13.5,
                    color: isActive ? "#7C6CF6" : "#5A5A7A",
                    letterSpacing: "-0.1px",
                  }}
                >
                  {item.label}
                </span>
              )}
              {isActive && (
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 3,
                    height: 18,
                    borderRadius: "0 3px 3px 0",
                    background: "#7C6CF6",
                  }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-2 pb-4" style={{ borderTop: "1px solid #EEEEF3", paddingTop: 12 }}>
        <button
          className="flex items-center gap-3 w-full transition-all duration-150"
          style={{
            padding: collapsed ? "10px 0" : "10px 12px",
            borderRadius: 10,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            justifyContent: collapsed ? "center" : "flex-start",
          }}
        >
          <Settings size={18} style={{ color: "#9B9BB4", flexShrink: 0 }} />
          {!collapsed && (
            <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 500, fontSize: 13.5, color: "#5A5A7A" }}>
              Configuración
            </span>
          )}
        </button>

        {/* User */}
        {!collapsed && (
          <div
            className="flex items-center gap-3 mt-2"
            style={{ padding: "8px 12px", borderRadius: 10, background: "#F8F8FC" }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #7C6CF6, #A593FF)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 11, color: "#fff" }}>OP</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 12, color: "#0F0F1A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                Panel Operador
              </div>
              <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 400, fontSize: 11, color: "#9B9BB4" }}>
                Gerente
              </div>
            </div>
            <LogOut size={14} style={{ color: "#9B9BB4", flexShrink: 0 }} />
          </div>
        )}

        {/* Toggle */}
        <button
          onClick={onToggle}
          className="flex items-center justify-center w-full mt-2 transition-colors"
          style={{
            padding: "8px",
            borderRadius: 8,
            background: "transparent",
            border: "1px solid #EEEEF3",
            cursor: "pointer",
          }}
        >
          {collapsed ? (
            <ChevronRight size={14} style={{ color: "#9B9BB4" }} />
          ) : (
            <ChevronLeft size={14} style={{ color: "#9B9BB4" }} />
          )}
        </button>
      </div>
    </aside>
  );
}
