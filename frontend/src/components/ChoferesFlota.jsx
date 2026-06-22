import React, { useEffect, useMemo, useState } from "react";
import { CircleHelp, Eye, Search } from "lucide-react";
import {
  displayNombreConductor,
  filtrarYOrdenarConductores,
  NOMBRE_API_AYUDA,
  ORDEN_CHOFERES,
} from "../lib/conductorUtils";
import { obtenerConductoresActivos } from "../lib/rutasService";
import Badge from "./ui/Badge";
import DetalleConductorModal from "./DetalleConductorModal";
import EmptyState from "./ui/EmptyState";
import Pagination from "./ui/Pagination";
function licenciaBadgeFromDias(diasRestantes) {
  if (diasRestantes < 0) {
    return { texto: "Vencida", variant: "danger" };
  }
  if (diasRestantes <= 30) {
    return { texto: `Por vencer (${diasRestantes}d)`, variant: "warning" };
  }
  return { texto: `Vigente (${diasRestantes}d)`, variant: "success" };
}
function licenciaBadgeFromStatus(licenseStatus) {
  if (!licenseStatus) return null;
  const status = licenseStatus.status;
  const dias = licenseStatus.daysUntilExpiry;
  if (status === "EXPIRED" || (typeof dias === "number" && dias < 0)) {
    return { texto: "Vencida", variant: "danger" };
  }
  if (status === "EXPIRING_SOON" || (typeof dias === "number" && dias <= 30)) {
    return { texto: dias != null ? `Por vencer (${dias}d)` : "Por vencer", variant: "warning" };
  }
  if (status === "NO_LICENSE") {
    return { texto: "Sin licencia", variant: "muted" };
  }
  if (status === "INACTIVE") {
    return { texto: "Inactivo", variant: "muted" };
  }
  return { texto: dias != null ? `Vigente (${dias}d)` : "Vigente", variant: "success" };
}
function resolveDisponibilidad(conductor) {
  if (conductor.disponibilidad == null || conductor.disponibilidad === "") {
    return "—";
  }
  return String(conductor.disponibilidad);
}
function tieneDisponibilidad(conductores) {
  return conductores.some(
    (c) => c.disponibilidad != null && c.disponibilidad !== "",
  );
}
const OPCIONES_ORDEN = [
  { value: ORDEN_CHOFERES.NOMBRE_ASC, label: "Nombre A-Z" },
  { value: ORDEN_CHOFERES.NOMBRE_DESC, label: "Nombre Z-A" },
  { value: ORDEN_CHOFERES.VENCIMIENTO_PROXIMO, label: "Vencimiento más próximo" },
  { value: ORDEN_CHOFERES.VENCIMIENTO_LEJANO, label: "Vencimiento más lejano" },
];
export default function ChoferesFlota({ configPagosVersion = 0 }) {
    const [conductores, setConductores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });
  const [conductorDetalle, setConductorDetalle] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [debouncedBusqueda, setDebouncedBusqueda] = useState("");
  const [orden, setOrden] = useState(ORDEN_CHOFERES.NOMBRE_ASC);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [meta, setMeta] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedBusqueda(busqueda), 400);
    return () => clearTimeout(timer);
  }, [busqueda]);

  useEffect(() => {
    setPage(1);
  }, [debouncedBusqueda, orden, limit]);

  useEffect(() => {
    let cancelled = false;
    async function cargarConductores() {
      setCargando(true);
      const res = await obtenerConductoresActivos({
        page,
        limit,
        search: debouncedBusqueda,
        orden,
      });
      if (cancelled) return;
      if (res.error) {
        setMensaje({ tipo: "error", texto: `Error cargando conductores: ${res.error}` });
        setConductores([]);
        setMeta(null);
      } else {
        setConductores(res.data || []);
        setMeta(res.meta || null);
      }
      setCargando(false);
    }
    cargarConductores();
    return () => { cancelled = true; };
  }, [page, limit, debouncedBusqueda, orden]);

  const mostrarDisponibilidad = tieneDisponibilidad(conductores);
  const nombreDependeDeApi = conductores.length > 0 && conductores.every((c) => !c.nombre && !c.usuarios?.nombre);
  const alertClass =
    mensaje.tipo === "success"
      ? "lt-alert-banner--success"
      : mensaje.tipo === "warning"
      ? "lt-alert-banner--warning"
      : "lt-alert-banner--error";
  const handleConductorActualizado = async () => {
    const res = await obtenerConductoresActivos();
    if (res.error) {
      setMensaje({ tipo: "error", texto: res.error });
      return;
    }
    const lista = res.data || [];
    setConductores(lista);
    setConductorDetalle((prev) => {
      if (!prev?.id) return prev;
      return lista.find((item) => item.id === prev.id) || prev;
    });
  };
  return (
    <>
      <div className="lt-card lt-module-card">
        <div className="lt-card__body">
          <h3 className="lt-module-card__title">
            Choferes activos ({(meta?.total_items ?? conductores.length)}
            {busqueda.trim() ? ` de ${conductores.length}` : ""})
          </h3>
          <div className="lt-toolbar" style={{ marginBottom: 16 }}>
            <div className="lt-search-wrap" style={{ flex: 1, maxWidth: 420 }}>
              <Search size={14} className="lt-search-icon" />
              <input
                type="text"
                className="lt-input"
                placeholder="Buscar por nombre, apellido o RUT..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            <select
              className="lt-select"
              value={orden}
              onChange={(e) => setOrden(e.target.value)}
              aria-label="Ordenar choferes"
              style={{ minWidth: 220 }}
            >
              {OPCIONES_ORDEN.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>
          </div>
          {nombreDependeDeApi && !cargando && (
            <p
              className="lt-module-card__subtitle"
              style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 12 }}
              title={NOMBRE_API_AYUDA}
            >
              <CircleHelp size={14} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden />
              <span>
                La columna Nombre muestra &quot;No disponible (API)&quot; porque el backend no expone
                usuarios.nombre en GET /api/conductores.
              </span>
            </p>
          )}
          {mensaje.texto && (
            <div className={`lt-alert-banner ${alertClass}`} role="alert">
              {mensaje.texto}
            </div>
          )}
          {cargando ? (
            <p className="lt-empty">Cargando conductores...</p>
          ) : conductores.length === 0 ? (
            <div className="lt-alert-banner lt-alert-banner--warning">
              No hay conductores activos
            </div>
          ) : (meta?.total_items ?? conductores.length) === 0 ? (
            <EmptyState
              title="Sin resultados"
              description="No hay choferes que coincidan con la búsqueda."
            />
          ) : (
            <div className="lt-table-wrap">
              <table className="lt-table">
                <thead>
                  <tr>
                    <th>
                      <span
                        style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                        title={NOMBRE_API_AYUDA}
                      >
                        Nombre
                        <CircleHelp size={12} aria-label={NOMBRE_API_AYUDA} />
                      </span>
                    </th>
                    <th>RUT</th>
                    <th>Licencia</th>
                    <th>Vencimiento</th>
                    <th>Estado</th>
                    {mostrarDisponibilidad && <th>Disponibilidad</th>}
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {conductores.map((conductor) => {
                    let badge = licenciaBadgeFromStatus(conductor.licenseStatus);
                    if (!badge && conductor.licencia_vencimiento) {
                      const vencimiento = new Date(conductor.licencia_vencimiento);
                      const hoy = new Date();
                      vencimiento.setHours(0, 0, 0, 0);
                      hoy.setHours(0, 0, 0, 0);
                      const diasRestantes = Math.ceil(
                        (vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24),
                      );
                      badge = licenciaBadgeFromDias(diasRestantes);
                    }
                    if (!badge) {
                      badge = { texto: "—", variant: "muted" };
                    }
                    return (
                      <tr key={conductor.id}>
                        <td title={NOMBRE_API_AYUDA}>{displayNombreConductor(conductor)}</td>
                        <td>{conductor.rut || "—"}</td>
                        <td>{conductor.licencia_numero || "—"}</td>
                        <td>
                          {conductor.licencia_vencimiento
                            ? new Date(conductor.licencia_vencimiento).toLocaleDateString("es-CL")
                            : "—"}
                        </td>
                        <td>
                          <Badge variant={badge.variant} showDot={false}>
                            {badge.texto}
                          </Badge>
                        </td>
                        {mostrarDisponibilidad && (
                          <td>{resolveDisponibilidad(conductor)}</td>
                        )}
                        <td>
                          <button
                            type="button"
                            className="lt-btn lt-btn--ghost"
                            onClick={() => setConductorDetalle(conductor)}
                          >
                            <Eye size={14} />
                            Ver detalle
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {meta && (
                <Pagination
                  currentPage={meta.current_page}
                  totalPages={meta.total_pages}
                  totalItems={meta.total_items}
                  limit={meta.limit}
                  onPageChange={setPage}
                  onLimitChange={setLimit}
                />
              )}
            </div>
          )}
        </div>
      </div>
      {conductorDetalle && (
        <DetalleConductorModal
          conductorResumen={conductorDetalle}
          onClose={() => setConductorDetalle(null)}
          onConductorActualizado={handleConductorActualizado}
          configPagosVersion={configPagosVersion}
        />
      )}
    </>
  );
}
