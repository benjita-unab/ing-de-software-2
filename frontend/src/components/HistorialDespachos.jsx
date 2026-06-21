import React, { useEffect, useState, useCallback } from "react";
import { apiFetch } from "../lib/apiClient";
import { getNombreRuta } from "../lib/rutasUtils";
import Badge from "./ui/Badge";
import Pagination from "./ui/Pagination";
import { Search } from "lucide-react";

const ESTADOS_FINALIZADOS = ["ENTREGADO", "ENTREGADA"];

/** Etiquetas para valores nuevos (API) y legacy en evidencias */
function etiquetaEtapaVisible(foto) {
  const raw = String(foto?.etapa ?? "").trim();
  const u = raw.toUpperCase();
  if (u === "RECEPCION") return "Recepción de carga";
  if (u === "ENTREGADO") return "Entrega final";
  if (u === "HOJA_DESPACHO") return "Hoja de despacho";
  if (u === "EVIDENCIA_ADICIONAL") return "Evidencia extra";
  const low = raw.toLowerCase();
  if (low === "ficha") return "Hoja de despacho";
  if (["carga", "salida", "transito", "tránsito"].includes(low))
    return "Recepción de carga";
  if (low === "entrega") return "Entrega final";
  if (low === "extra") return "Evidencia extra";
  return raw || "—";
}

function esFichaDespachoFallback(foto) {
  const t = String(foto?.tipo || "").trim().toUpperCase();
  if (t === "FICHA_DESPACHO") return true;
  const e = String(foto?.etapa || "").trim();
  if (!e) return false;
  if (e.toLowerCase() === "ficha") return true;
  if (e.toUpperCase() === "HOJA_DESPACHO") return true;
  return false;
}

function formatFecha(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-CL");
}

function EvidenciasModal({ despacho, evidencias, loading, error, onClose }) {
  // Cierra con Escape para mejor UX (sin alterar estilos visibles).
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const pdfs = evidencias?.pdfs || [];
  const fotos = evidencias?.fotos || [];
  const fotosEvidencia =
    evidencias?.fotosEvidencia != null
      ? Array.isArray(evidencias.fotosEvidencia)
        ? evidencias.fotosEvidencia
        : []
      : fotos.filter((f) => !esFichaDespachoFallback(f));
  const fichasDespacho =
    evidencias?.fichasDespacho != null
      ? Array.isArray(evidencias.fichasDespacho)
        ? evidencias.fichasDespacho
        : []
      : fotos.filter((f) => esFichaDespachoFallback(f));
  const firmaUrl = evidencias?.firmaUrl || null;
  const noHayNada =
    !loading &&
    !error &&
    pdfs.length === 0 &&
    fotos.length === 0 &&
    !firmaUrl;

  return (
    <div
      className="lt-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="lt-modal-dialog lt-modal-dialog--lg">
        <div className="lt-modal-header">
          <div>
            <div className="lt-modal-header__title">Evidencias del despacho</div>
            <div className="lt-modal-header__sub">
              {despacho?.clientes?.nombre || "Cliente N/A"} ·{" "}
              {despacho?.destino || "Destino N/A"} ·{" "}
              {formatFecha(
                despacho?.fecha_fin ||
                  despacho?.fecha_inicio ||
                  despacho?.created_at
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="lt-modal-close"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="lt-modal-body">
          {loading && <p className="lt-empty">Cargando evidencias…</p>}
          {error && (
            <div className="lt-alert-banner lt-alert-banner--error" role="alert">
              No se pudieron cargar las evidencias: {error}
            </div>
          )}

          {!loading && !error && noHayNada && (
            <p className="lt-empty">Sin evidencias disponibles.</p>
          )}

          {!loading && !error && (pdfs.length > 0 || fotos.length > 0 || firmaUrl) && (
            <>
              <div className="lt-modal-section">
                <div className="lt-modal-section__title">📄 Comprobante PDF</div>
                {pdfs.length === 0 ? (
                  <p className="lt-empty">Sin comprobante adjunto.</p>
                ) : (
                  pdfs.map((pdf, idx) => (
                    <div key={pdf.url || idx} className="lt-modal-pdf-row">
                      <span className="lt-modal-pdf-name" title={pdf.nombre}>
                        {pdf.nombre}
                      </span>
                      <a
                        href={pdf.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="lt-btn lt-btn--secondary"
                      >
                        Ver comprobante
                      </a>
                    </div>
                  ))
                )}
              </div>

              <div className="lt-modal-section">
                <div className="lt-modal-section__title">📷 Evidencias fotográficas</div>
                {fotosEvidencia.length === 0 ? (
                  <p className="lt-empty">
                    Sin evidencias fotográficas para este despacho.
                  </p>
                ) : (
                  <div className="lt-modal-fotos-grid">
                    {fotosEvidencia.map((foto) => (
                      <a
                        key={foto.id}
                        href={foto.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="lt-modal-foto-item"
                        title={etiquetaEtapaVisible(foto)}
                      >
                        <img
                          src={foto.url}
                          alt={etiquetaEtapaVisible(foto)}
                          loading="lazy"
                        />
                        <div className="lt-modal-foto-meta">
                          {etiquetaEtapaVisible(foto)}
                          {foto.timestamp
                            ? " · " + formatFecha(foto.timestamp)
                            : ""}
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>

              <div className="lt-modal-section">
                <div className="lt-modal-section__title">📑 Ficha de despacho</div>
                {fichasDespacho.length === 0 ? (
                  <p className="lt-empty">
                    Sin ficha registrada desde la app u otros canales.
                  </p>
                ) : (
                  <div className="lt-modal-fotos-grid">
                    {fichasDespacho.map((foto) => (
                      <a
                        key={foto.id}
                        href={foto.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="lt-modal-foto-item"
                        title={etiquetaEtapaVisible(foto)}
                      >
                        <img
                          src={foto.url}
                          alt={etiquetaEtapaVisible(foto)}
                          loading="lazy"
                        />
                        <div className="lt-modal-foto-meta">
                          {etiquetaEtapaVisible(foto)}
                          {foto.timestamp
                            ? " · " + formatFecha(foto.timestamp)
                            : ""}
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>

              <div className="lt-modal-section">
                <div className="lt-modal-section__title">✍️ Firma del cliente</div>
                {!firmaUrl ? (
                  <p className="lt-empty">Sin firma registrada.</p>
                ) : (
                  <div className="lt-modal-firma-wrap">
                    <img
                      src={firmaUrl}
                      alt="Firma del cliente"
                      className="lt-modal-firma-img"
                    />
                    <a
                      href={firmaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="lt-btn lt-btn--secondary"
                    >
                      Abrir firma en pestaña nueva
                    </a>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function HistorialDespachos() {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estado del modal de evidencias.
  const [seleccionado, setSeleccionado] = useState(null);
  const [modalEvidencias, setModalEvidencias] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Estado de paginación y filtros
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function cargarHistorial() {
      setLoading(true);

      let lista = [];
      const queryParams = new URLSearchParams({
        page,
        limit,
        estado: "ENTREGADO" // Fijo para historial
      });
      if (searchQuery) {
        queryParams.append("search", searchQuery);
      }

      const resAll = await apiFetch(`/api/rutas?${queryParams.toString()}`);
      if (resAll.ok) {
        const payload = resAll.data;
        const data = Array.isArray(payload.data) ? payload.data : (Array.isArray(payload) ? payload : payload?.data ?? []);
        lista = data.filter((ruta) =>
          ESTADOS_FINALIZADOS.includes(String(ruta?.estado || "").toUpperCase())
        );
        if (payload.meta && !cancelled) {
          setTotalPages(payload.meta.total_pages);
          setTotalItems(payload.meta.total_items);
        }
      } else {
        console.error("Error cargando historial de rutas:", resAll.error);
      }

      const dedup = Array.from(new Map(lista.map((r) => [r.id, r])).values());
      dedup.sort((a, b) => {
        const da = new Date(a.fecha_fin || a.fecha_inicio || a.created_at || 0).getTime();
        const db = new Date(b.fecha_fin || b.fecha_inicio || b.created_at || 0).getTime();
        return db - da;
      });

      if (!cancelled) {
        setHistorial(dedup);
        setLoading(false);
      }
    }

    cargarHistorial();
    return () => {
      cancelled = true;
    };
  }, [page, limit, searchQuery]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    setPage(1); // Reset a primera página al buscar
  };

  const abrirEvidencias = useCallback(async (despacho) => {
    setSeleccionado(despacho);
    setModalEvidencias(null);
    setModalError(null);
    setModalLoading(true);

    try {
      const res = await apiFetch(`/api/rutas/${despacho.id}/evidencias`);
      if (!res.ok) {
        setModalError(res.error || "Error desconocido");
        setModalEvidencias(null);
      } else {
        const payload = res.data?.data ?? res.data ?? {};
        setModalEvidencias({
          pdfs: Array.isArray(payload.pdfs) ? payload.pdfs : [],
          fotos: Array.isArray(payload.fotos) ? payload.fotos : [],
          fotosEvidencia: Array.isArray(payload.fotosEvidencia)
            ? payload.fotosEvidencia
            : undefined,
          fichasDespacho: Array.isArray(payload.fichasDespacho)
            ? payload.fichasDespacho
            : undefined,
          firmaUrl: payload.firmaUrl || null,
        });
      }
    } catch (e) {
      setModalError(e?.message || "Error de red");
      setModalEvidencias(null);
    } finally {
      setModalLoading(false);
    }
  }, []);

  const cerrarModal = useCallback(() => {
    setSeleccionado(null);
    setModalEvidencias(null);
    setModalError(null);
    setModalLoading(false);
  }, []);

  return (
    <div className="lt-module-inner">
      <div className="lt-toolbar" style={{ marginBottom: "16px" }}>
        <form className="lt-search-wrap" onSubmit={handleSearchSubmit} style={{ flex: 1, maxWidth: "400px" }}>
          <Search size={16} className="lt-search-wrap__icon" />
          <input
            type="search"
            className="lt-input"
            placeholder="Buscar por cliente, conductor o ruta..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </form>
        <button
          type="button"
          className="lt-btn lt-btn--secondary"
          onClick={() => {
            setSearchQuery(searchInput);
            setPage(1);
          }}
        >
          Buscar
        </button>
      </div>

      <div className="lt-card lt-module-card">
        <div className="lt-card__body">
          {loading ? (
            <p className="lt-empty">Cargando historial...</p>
          ) : historial.length === 0 ? (
            <p className="lt-empty">No hay despachos finalizados todavía.</p>
          ) : (
            <div className="lt-table-wrap">
              <table className="lt-table">
                <thead>
                  <tr>
                    <th>Ruta</th>
                    <th>Cliente</th>
                    <th>Conductor / Vehículo</th>
                    <th>Destino</th>
                    <th>Espera</th>
                    <th>Finalizado</th>
                    <th>Estado</th>
                    <th>Evidencias</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map((despacho) => (
                    <tr key={despacho.id}>
                      <td>
                        <strong>{getNombreRuta(despacho)}</strong>
                        <div className="lt-card__subtitle">
                          #{String(despacho.id).substring(0, 8)}
                        </div>
                      </td>
                      <td>{despacho.clientes?.nombre || "N/A"}</td>
                      <td>
                        <strong>
                          {despacho.conductores?.usuarios?.nombre || despacho.conductores?.rut || "N/A"}
                        </strong>
                        <div className="lt-card__subtitle">
                          🚚 {despacho.camiones?.patente || "-"}
                        </div>
                      </td>
                      <td>{despacho.destino}</td>
                      <td>
                        {despacho.tiempo_espera_minutos !== null && despacho.tiempo_espera_minutos !== undefined ? (
                          despacho.tiempo_espera_minutos > 30 ? (
                            <Badge variant="danger" showDot={false}>
                              {despacho.tiempo_espera_minutos} min
                            </Badge>
                          ) : (
                            <span>{despacho.tiempo_espera_minutos} min</span>
                          )
                        ) : (
                          <span className="lt-card__subtitle">-</span>
                        )}
                      </td>
                      <td>{formatFecha(
                        despacho.fecha_fin || despacho.fecha_inicio || despacho.created_at
                      )}</td>
                      <td>
                        <Badge variant="success" showDot={false}>
                          ✅ {despacho.estado}
                        </Badge>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="lt-btn lt-btn--secondary"
                          onClick={() => abrirEvidencias(despacho)}
                        >
                          🔍 Ver evidencias
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && historial.length > 0 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalItems}
              limit={limit}
              onPageChange={setPage}
              onLimitChange={(newLimit) => {
                setLimit(newLimit);
                setPage(1); // Paginación No Destructiva
              }}
            />
          )}
        </div>
      </div>

      {seleccionado && (
        <EvidenciasModal
          despacho={seleccionado}
          evidencias={modalEvidencias}
          loading={modalLoading}
          error={modalError}
          onClose={cerrarModal}
        />
      )}
    </div>
  );
}
