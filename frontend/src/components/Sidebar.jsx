import React from "react";
import {
  LayoutDashboard,
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
} from "lucide-react";
import { isNavSectionVisible } from "../lib/featureVisibility";
import ThemeToggle from "./ui/ThemeToggle";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "rutas-plantilla", label: "Plantillas de ruta", icon: Map },
  { id: "rutas", label: "Pedidos", icon: Route },


  { id: "camiones", label: "Flota", icon: Truck },
  { id: "clientes", label: "Clientes", icon: Users },
  { id: "pagos", label: "Pagos", icon: DollarSign },
  { id: "rrhh", label: "RRHH", icon: UserCog },
  { id: "mensajes", label: "Mensajes", icon: MessageSquare, badgeKey: "urgent" },
  { id: "despachos", label: "Despachos activos", icon: Package },
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
            <div className="lt-sidebar__logo-sub">Operaciones</div>
          </div>
        )}
      </div>

      <nav className="lt-sidebar__nav lt-scroll">
        {NAV_ITEMS.filter((item) => isNavSectionVisible(item.id)).map((item) => {
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
        <ThemeToggle
          isDark={isDark}
          onToggle={onToggleTheme}
          collapsed={collapsed}
        />

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
