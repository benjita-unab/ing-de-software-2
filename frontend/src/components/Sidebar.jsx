import React from "react";
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
  DollarSign,
  Map,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sun,
  Moon,
} from "lucide-react";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "alertas", label: "Alertas", icon: Bell, badgeKey: "urgent" },
  { id: "rutas-plantilla", label: "Plantillas", icon: Map },
  { id: "rutas", label: "Rutas", icon: Route },
  { id: "panol", label: "Creador de Carga", icon: Package },

  { id: "camiones", label: "Flota", icon: Truck },
  { id: "clientes", label: "Clientes", icon: Users },
  { id: "pagos", label: "Pagos", icon: DollarSign },
  { id: "rrhh", label: "RRHH", icon: UserCog },
  { id: "mensajes", label: "Mensajes", icon: MessageSquare },
  { id: "despachos", label: "Rutas Activas", icon: Package },
  { id: "historial", label: "Historial", icon: History },
];

export default function Sidebar({
  activeSection,
  onNavigate,
  collapsed = false,
  onToggle,
  urgentCount = 0,
  operator,
  onSignOut,
  isDark = false,
  onToggleTheme,
}) {
  const sidebarClass = `lt-sidebar ${collapsed ? "lt-sidebar--collapsed" : "lt-sidebar--expanded"}`;

  return (
    <aside className={sidebarClass}>
      <div className="lt-sidebar__logo">
        <div className="lt-sidebar__logo-icon">
          <Truck size={18} color="#fff" />
        </div>
        {!collapsed && (
          <div>
            <div className="lt-sidebar__logo-title">LogiTrack</div>
            <div className="lt-sidebar__logo-sub">Fleet Operations</div>
          </div>
        )}
      </div>

      <nav className="lt-sidebar__nav lt-scroll">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          const showUrgentBadge = item.badgeKey === "urgent" && urgentCount > 0;

          return (
            <button
              key={item.id}
              type="button"
              className={`lt-sidebar__nav-btn ${isActive ? "lt-sidebar__nav-btn--active" : ""}`}
              onClick={() => onNavigate?.(item.id)}
              title={collapsed ? item.label : undefined}
            >
              <div style={{ position: "relative", flexShrink: 0, display: "flex" }}>
                <Icon
                  size={18}
                  color={isActive ? "var(--lt-accent)" : "var(--lt-sidebar-muted)"}
                />
                {showUrgentBadge && (
                  <span className="lt-sidebar__badge">
                    {urgentCount > 9 ? "9+" : urgentCount}
                  </span>
                )}
              </div>
              {!collapsed && <span className="lt-sidebar__nav-label">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="lt-sidebar__footer">
        <button
          type="button"
          className="lt-sidebar__action-btn"
          onClick={onToggleTheme}
          title={isDark ? "Modo claro" : "Modo oscuro"}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
          {!collapsed && <span>{isDark ? "Modo claro" : "Modo oscuro"}</span>}
        </button>

        {!collapsed && operator && (
          <div className="lt-sidebar__user">
            <div className="lt-sidebar__avatar">
              {operator?.full_name?.[0]?.toUpperCase() ?? "O"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="lt-sidebar__user-name">{operator?.full_name ?? "Operador"}</div>
              <div className="lt-sidebar__user-role">{operator?.branch ?? "Sucursal"}</div>
            </div>
            <button
              type="button"
              onClick={onSignOut}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}
              title="Cerrar sesión"
            >
              <LogOut size={14} color="var(--lt-text-muted)" />
            </button>
          </div>
        )}

        {collapsed && (
          <button
            type="button"
            className="lt-sidebar__action-btn"
            onClick={onSignOut}
            title="Cerrar sesión"
          >
            <LogOut size={18} />
          </button>
        )}

        <button type="button" className="lt-sidebar__toggle" onClick={onToggle} aria-label="Colapsar sidebar">
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>
    </aside>
  );
}
