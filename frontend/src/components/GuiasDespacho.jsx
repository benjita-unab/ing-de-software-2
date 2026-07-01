import React, { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "../lib/apiClient";
import { getNombreRuta } from "../lib/rutasUtils";
import Badge from "./ui/Badge";
import EmptyState from "./ui/EmptyState";
import Pagination from "./ui/Pagination";
import Spinner from "./ui/Spinner";

const AUTO_REFRESH_MS = 15000;

// Estados que se consideran "entregados" para excluir de las guías activas.
const ESTADOS_FINALIZADOS = new Set([
  "ENTREGADO",
  "ENTREGADA",
  "CANCELADO",
  "CANCELADA",
]);

function esUrlPublica(valor) {
  const s = String(valor ?? "").trim();
  if (!s || s.toLowerCase() === "null") return false;
  return /^https?:\/\//i.test(s);
}

function estadoBadgeVariant(estado) {
  const u = String(estado || "").toUpperCase();
  if (u === "PENDIENTE") return "warning";
  return "info";
}

/** HU-20: ficha capturada en app móvil → rutas.ficha_despacho_url o traceability fichasDespacho */
function obtenerFichaUrl(ruta) {
  const candidatos = [
    ruta?.ficha_despacho_url,
    ruta?.fichaDespachoUrl,
    ruta?.fichasDespacho?.[0]?.url,
    ruta?.fichasDespacho?.[0]?.foto_url,
    ruta?.fichasDespacho?.[0]?.foto_uri,
  ];

  for (const c of candidatos) {
    const s = String(c ?? "").trim();
    if (s && s.toLowerCase() !== "null" && esUrlPublica(s)) return s;
  }

  return "";
}

export default function GuiasDespacho() {
  const [rutas, setRutas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const mountedRef = useRef(true);

  // Estado de paginación
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  const cargarRutasEnCurso = useCallback(async (opts = {}) => {
    const silent = opts.silent === true;
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await apiFetch(`/api/rutas?page=${page}&limit=${limit}`);

      if (!mountedRef.current) return;

      if (!res.ok) {
        console.error("Error cargando rutas activas:", res.error);
        setRutas([]);
        return;
      }

      const payload = res.data;
      const data = Array.isArray(payload.data) ? payload.data : (Array.isArray(payload) ? payload : payload?.data ?? []);

      const activas = data
        .filter(
          (ruta) =>
            ruta?.conductor_id != null || ruta?.conductores != null,
        )
        .filter(
          (ruta) =>
            !ESTADOS_FINALIZADOS.has(String(ruta?.estado || "").toUpperCase()),
        );

      setRutas(activas);

      if (payload.meta) {
        setTotalPages(payload.meta.total_pages);
        setTotalItems(payload.meta.total_items);
      }
    } finally {
      if (!mountedRef.current) return;
      if (!silent) setLoading(false);
      else setRefreshing(false);
    }
  }, [page, limit]);

  useEffect(() => {
    mountedRef.current = true;
    void cargarRutasEnCurso();

    const intervalId = window.setInterval(() => {
      void cargarRutasEnCurso({ silent: true });
    }, AUTO_REFRESH_MS);

    return () => {
      mountedRef.current = false;
      window.clearInterval(intervalId);
    };
  }, [cargarRutasEnCurso]);

  const handleFinalizarDespacho = async (ruta) => {
    if (!obtenerFichaUrl(ruta)) {
      alert(
        "No se puede finalizar el despacho porque no hay ficha de despacho adjunta. Captúrela desde la app móvil.",
      );
      return;
    }

    if (!window.confirm("¿Estás seguro de finalizar este despacho?")) return;

    try {
      const res = await apiFetch(`/api/rutas/${ruta.id}/status`, {
        method: "PATCH",
        json: { estado: "ENTREGADO" },
      });

      if (!res.ok) {
        throw new Error(res.error || "Error al finalizar el despacho");
      }

      alert("Despacho finalizado con éxito.");
      await cargarRutasEnCurso({ silent: true });
    } catch (err) {
      console.error("Error al finalizar despacho:", err);
      alert(`Error al intentar finalizar el despacho: ${err.message}`);
    }
  };

  return (
    <div className="lt-module-inner">
      <div className="lt-card lt-module-card">
        <div className="lt-card__body">
          <div className="lt-toolbar">
            <button
              type="button"
              className="lt-btn lt-btn--secondary"
              onClick={() => void cargarRutasEnCurso({ silent: !!rutas.length })}
              disabled={loading || refreshing}
            >
              Actualizar
            </button>
          </div>

          {loading ? (
            <Spinner message="Cargando rutas activas…" />
          ) : rutas.length === 0 ? (
            <EmptyState
              title="Sin rutas activas"
              description="No hay rutas activas pendientes en este momento."
            />
          ) : (
            <div className="lt-table-wrap">
              <table className="lt-table">
                <thead>
                  <tr>
                    <th>Ruta</th>
                    <th>Cliente / Destino</th>
                    <th>Vehículo / Conductor</th>
                    <th>Inicio</th>
                    <th>Estado</th>
                    <th>Ficha de despacho</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {rutas.map((ruta) => {
                    const fichaUrl = obtenerFichaUrl(ruta);
                    const tieneFicha = !!fichaUrl;

                    return (
                      <tr key={ruta.id}>
                        <td>
                          <strong>{getNombreRuta(ruta)}</strong>
                          <div className="lt-card__subtitle">
                            #{String(ruta.id).substring(0, 8)}
                          </div>
                        </td>
                        <td>
                          <strong>{ruta.clientes?.nombre || "Sin asignar"}</strong>
                          <div className="lt-table__cell-sub">{ruta.destino}</div>
                        </td>
                        <td>
                          <strong>{ruta.camiones?.patente || "—"}</strong>
                          <div className="lt-table__cell-sub">
                            {ruta.conductores?.usuarios?.nombre || ruta.conductores?.rut || "N/A"}
                          </div>
                        </td>
                        <td>
                          {(() => {
                            const fecha = ruta.fecha_inicio || ruta.created_at;
                            return fecha
                              ? new Date(fecha).toLocaleString("es-CL", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  day: "2-digit",
                                  month: "short",
                                })
                              : "N/A";
                          })()}
                        </td>
                        <td>
                          <Badge variant={estadoBadgeVariant(ruta.estado)} showDot={false}>
                            {ruta.estado || "EN CURSO"}
                          </Badge>
                        </td>
                        <td>
                          {tieneFicha ? (
                            <div>
                              <a
                                href={fichaUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="lt-btn lt-btn--secondary lt-btn--sm"
                              >
                                Ver ficha
                              </a>
                              <div className="lt-table__cell-sub">Ficha registrada</div>
                            </div>
                          ) : (
                            <div>
                              <Badge variant="warning" showDot={false}>
                                Sin ficha
                              </Badge>
                              <div className="lt-table__cell-sub">
                                Debe capturarse desde la app móvil
                              </div>
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="lt-table__actions">
                            <button
                              type="button"
                              className="lt-btn lt-btn--primary lt-btn--sm"
                              onClick={() => void handleFinalizarDespacho(ruta)}
                              disabled={!tieneFicha}
                              title={
                                tieneFicha
                                  ? "Finalizar despacho"
                                  : "Requiere ficha capturada desde la app móvil"
                              }
                            >
                              {tieneFicha ? "Finalizar despacho" : "Requiere ficha"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={totalItems}
                limit={limit}
                onPageChange={setPage}
                onLimitChange={(newLimit) => {
                  setLimit(newLimit);
                  setPage(1);
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
