import React, { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "../lib/apiClient";
import Badge from "./ui/Badge";

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

  const cargarRutasEnCurso = useCallback(async (opts = {}) => {
    const silent = opts.silent === true;
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await apiFetch("/api/rutas");

      if (!mountedRef.current) return;

      if (!res.ok) {
        console.error("Error cargando rutas activas:", res.error);
        setRutas([]);
        return;
      }

      const payload = res.data;
      const lista = Array.isArray(payload) ? payload : payload?.data ?? [];

      const activas = lista
        .filter(
          (ruta) =>
            ruta?.conductor_id != null || ruta?.conductores != null,
        )
        .filter(
          (ruta) =>
            !ESTADOS_FINALIZADOS.has(String(ruta?.estado || "").toUpperCase()),
        );

      setRutas(activas);
    } finally {
      if (!mountedRef.current) return;
      if (!silent) setLoading(false);
      else setRefreshing(false);
    }
  }, []);

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
          <p className="lt-module-card__subtitle">
            La ficha de despacho se captura desde la app móvil («Hoja de despacho»). Esta pestaña es solo
            para consultar la ficha y finalizar el despacho cuando esté registrada.
          </p>

          <div className="lt-toolbar">
            <span className="lt-card__subtitle">
              {refreshing ? "Actualizando…" : `Auto-actualización cada ${AUTO_REFRESH_MS / 1000}s`}
            </span>
            <button
              type="button"
              className="lt-btn lt-btn--secondary"
              onClick={() => void cargarRutasEnCurso({ silent: !!rutas.length })}
              disabled={loading || refreshing}
            >
              🔄 Actualizar
            </button>
          </div>

          {loading ? (
            <p className="lt-empty">Cargando guías en curso...</p>
          ) : rutas.length === 0 ? (
            <p className="lt-empty">No hay rutas pendientes de guías en este momento.</p>
          ) : (
            <div className="lt-table-wrap">
              <table className="lt-table">
                <thead>
                  <tr>
                    <th>ID</th>
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
                          <span className="lt-card__subtitle">#{String(ruta.id).substring(0, 8)}</span>
                        </td>
                        <td>
                          <strong>{ruta.clientes?.nombre || "Sin Asignar"}</strong>
                          <div className="lt-card__subtitle">🛑 {ruta.destino}</div>
                        </td>
                        <td>
                          <strong>🚚 {ruta.camiones?.patente || "-"}</strong>
                          <div className="lt-card__subtitle">
                            👤 {ruta.conductores?.usuarios?.nombre || ruta.conductores?.rut || "N/A"}
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
                            {ruta.estado === "PENDIENTE" ? "⏳" : "🚛"} {ruta.estado || "EN CURSO"}
                          </Badge>
                        </td>
                        <td>
                          {tieneFicha ? (
                            <div>
                              <a
                                href={fichaUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="lt-btn lt-btn--ghost"
                              >
                                📄 Ver Ficha Adjunta
                              </a>
                              <div className="lt-card__subtitle">Ficha registrada</div>
                            </div>
                          ) : (
                            <div>
                              <Badge variant="warning" showDot={false}>
                                Sin ficha de despacho registrada
                              </Badge>
                              <div className="lt-card__subtitle">
                                Debe capturarse desde la app móvil
                              </div>
                            </div>
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="lt-btn lt-btn--primary"
                            onClick={() => void handleFinalizarDespacho(ruta)}
                            disabled={!tieneFicha}
                            title={
                              tieneFicha
                                ? "Finalizar despacho"
                                : "Requiere ficha capturada desde la app móvil"
                            }
                          >
                            {tieneFicha ? "✅ Finalizar Despacho" : "Requiere ficha"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
