import React from "react";
import { Moon, Sun } from "lucide-react";

/**
 * Selector claro/oscuro — misma UI que el footer del sidebar del operador.
 * Recibe isDark y onToggle desde useTheme() del padre.
 */
export default function ThemeToggle({
  isDark,
  onToggle,
  showLabel = true,
  collapsed = false,
  className = "lt-sidebar__action-btn",
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={onToggle}
      title={isDark ? "Modo claro" : "Modo oscuro"}
      aria-label={isDark ? "Activar modo claro" : "Activar modo oscuro"}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
      {showLabel && !collapsed && (
        <span>{isDark ? "Modo claro" : "Modo oscuro"}</span>
      )}
    </button>
  );
}
