import React, { useEffect, useState, useCallback } from "react";
import { apiFetch } from "../lib/apiClient";

const base = {
  container: {
    minHeight: "100%",
    background: "transparent",
    color: "#fff",
    padding: "10px",
    fontFamily: "'Inter', 'Poppins', sans-serif",
    overflow: "auto",
  },
  card: {
    background: "rgba(8,8,12,0.72)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "16px",
    padding: "18px",
    marginBottom: "14px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
    backdropFilter: "blur(8px)",
  },
  title: {
    fontSize: "16px",
    fontWeight: 800,
    color: "#fff",
    marginBottom: "16px",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "14px",
  },
  th: {
    textAlign: "left",
    padding: "12px",
    borderBottom: "1px solid rgba(255,255,255,0.12)",
    color: "rgba(255,255,255,0.75)",
    fontSize: "14px",
    fontWeight: 600,
    background: "rgba(255,255,255,0.03)",
  },
  td: {
    padding: "14px 12px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    fontSize: "15px",
    color: "#e2e8f0",
    verticalAlign: "top",
  },
  badge: {
    display: "inline-block",
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "11px",
    fontWeight: 600,
    background: "rgba(58,12,163,0.45)",
    color: "#ffffff",
    border: "1px solid rgba(76,201,240,0.45)",
  },
  evidenciasButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 12px",
    borderRadius: "8px",
    background: "rgba(59,130,246,0.18)",
    border: "1px solid rgba(59,130,246,0.45)",
    color: "#93C5FD",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "12px",
    fontFamily: "inherit",
  },
};

const modalStyles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(2,6,23,0.72)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "20px",
  },
  dialog: {
    width: "100%",
    maxWidth: "720px",
    maxHeight: "85vh",
    overflow: "auto",
    background: "rgba(8,8,12,0.96)",
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: "16px",
    boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
    color: "#E2E8F0",
    padding: "22px 24px",
    fontFamily: "'Inter', 'Poppins', sans-serif",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "18px",
  },
  headerTitle: {
    fontSize: "16px",
    fontWeight: 800,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "#fff",
  },
  headerSub: {
    fontSize: "12px",
    color: "#94A3B8",
    marginTop: "4px",
  },
  closeButton: {
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.18)",
    color: "#E2E8F0",
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "16px",
    fontFamily: "inherit",
  },
  section: {
    marginTop: "18px",
    paddingTop: "16px",
    borderTop: "1px solid rgba(255,255,255,0.08)",
  },
  sectionTitle: {
    fontSize: "12px",
    fontWeight: 700,
    color: "#93C5FD",
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    marginBottom: "10px",
  },
  pdfRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    padding: "10px 12px",
    background: "rgba(15,23,42,0.7)",
    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.08)",
    marginBottom: "8px",
  },
  pdfName: {
    fontSize: "13px",
    color: "#E2E8F0",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  pdfLink: {
    flexShrink: 0,
    padding: "6px 10px",
    borderRadius: "8px",
    background: "rgba(59,130,246,0.22)",
    border: "1px solid rgba(59,130,246,0.5)",
    color: "#BFDBFE",
    textDecoration: "none",
    fontSize: "12px",
    fontWeight: 600,
  },
  fotosGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
    gap: "10px",
  },
  fotoItem: {
    background: "rgba(15,23,42,0.7)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "10px",
    overflow: "hidden",
    textDecoration: "none",
    color: "inherit",
    display: "block",
  },
  fotoImg: {
    display: "block",
    width: "100%",
    height: "100px",
    objectFit: "cover",
    background: "#0f172a",
  },
  fotoMeta: {
    padding: "6px 8px",
    fontSize: "11px",
    color: "#94A3B8",
  },
  firmaWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  firmaImg: {
    maxWidth: "260px",
    maxHeight: "150px",
    background: "#fff",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.16)",
    padding: "6px",
    objectFit: "contain",
  },
  emptyText: {
    color: "#94A3B8",
    fontSize: "12px",
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: "12px",
  },
};

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
      style={modalStyles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div style={modalStyles.dialog}>
        <div style={modalStyles.header}>
          <div>
            <div style={modalStyles.headerTitle}>Evidencias del despacho</div>
            <div style={modalStyles.headerSub}>
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
            style={modalStyles.closeButton}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {loading && <p style={modalStyles.emptyText}>Cargando evidencias…</p>}
        {error && (
          <p style={modalStyles.errorText}>
            No se pudieron cargar las evidencias: {error}
          </p>
        )}

        {!loading && !error && noHayNada && (
          <p style={modalStyles.emptyText}>Sin evidencias disponibles.</p>
        )}

        {!loading && !error && (pdfs.length > 0 || fotos.length > 0 || firmaUrl) && (
          <>
            <div style={modalStyles.section}>
              <div style={modalStyles.sectionTitle}>📄 Comprobante PDF</div>
              {pdfs.length === 0 ? (
                <p style={modalStyles.emptyText}>Sin comprobante adjunto.</p>
              ) : (
                pdfs.map((pdf, idx) => (
                  <div key={pdf.url || idx} style={modalStyles.pdfRow}>
                    <span style={modalStyles.pdfName} title={pdf.nombre}>
                      {pdf.nombre}
                    </span>
                    <a
                      href={pdf.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={modalStyles.pdfLink}
                    >
                      Ver comprobante
                    </a>
                  </div>
                ))
              )}
            </div>

            <div style={modalStyles.section}>
              <div style={modalStyles.sectionTitle}>📷 Evidencias fotográficas</div>
              {fotosEvidencia.length === 0 ? (
                <p style={modalStyles.emptyText}>
                  Sin evidencias fotográficas para este despacho.
                </p>
              ) : (
                <div style={modalStyles.fotosGrid}>
                  {fotosEvidencia.map((foto) => (
                    <a
                      key={foto.id}
                      href={foto.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={modalStyles.fotoItem}
                      title={etiquetaEtapaVisible(foto)}
                    >
                      <img
                        src={foto.url}
                        alt={etiquetaEtapaVisible(foto)}
                        style={modalStyles.fotoImg}
                        loading="lazy"
                      />
                      <div style={modalStyles.fotoMeta}>
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

            <div style={modalStyles.section}>
              <div style={modalStyles.sectionTitle}>📑 Ficha de despacho</div>
              {fichasDespacho.length === 0 ? (
                <p style={modalStyles.emptyText}>
                  Sin ficha registrada desde la app u otros canales.
                </p>
              ) : (
                <div style={modalStyles.fotosGrid}>
                  {fichasDespacho.map((foto) => (
                    <a
                      key={foto.id}
                      href={foto.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={modalStyles.fotoItem}
                      title={etiquetaEtapaVisible(foto)}
                    >
                      <img
                        src={foto.url}
                        alt={etiquetaEtapaVisible(foto)}
                        style={modalStyles.fotoImg}
                        loading="lazy"
                      />
                      <div style={modalStyles.fotoMeta}>
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

            <div style={modalStyles.section}>
              <div style={modalStyles.sectionTitle}>✍️ Firma del cliente</div>
              {!firmaUrl ? (
                <p style={modalStyles.emptyText}>Sin firma registrada.</p>
              ) : (
                <div style={modalStyles.firmaWrap}>
                  <img
                    src={firmaUrl}
                    alt="Firma del cliente"
                    style={modalStyles.firmaImg}
                  />
                  <a
                    href={firmaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={modalStyles.pdfLink}
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

  useEffect(() => {
    let cancelled = false;

    async function cargarHistorial() {
      setLoading(true);

      let lista = [];
      const resAll = await apiFetch("/api/rutas?estado=ENTREGADO");
      if (resAll.ok) {
        const payload = resAll.data;
        const data = Array.isArray(payload) ? payload : payload?.data ?? [];
        lista = data.filter((ruta) =>
          ESTADOS_FINALIZADOS.includes(String(ruta?.estado || "").toUpperCase())
        );
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
  }, []);

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
    <div style={base.container} className="premium-scroll operator-section">
      <div style={base.card} className="operator-glass-card">
        <div style={base.title}>📜 Historial de Despachos</div>

        {loading ? (
          <p style={{ color: "#94A3B8", fontSize: "14px" }}>Cargando historial...</p>
        ) : historial.length === 0 ? (
          <p style={{ color: "#94A3B8", fontSize: "14px" }}>No hay despachos finalizados todavía.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={base.table}>
              <thead>
                <tr>
                  <th style={base.th}>ID</th>
                  <th style={base.th}>Cliente</th>
                  <th style={base.th}>Conductor / Vehículo</th>
                  <th style={base.th}>Destino</th>
                  <th style={base.th}>Espera</th>
                  <th style={base.th}>Finalizado</th>
                  <th style={base.th}>Estado</th>
                  <th style={base.th}>Evidencias</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((despacho) => (
                  <tr key={despacho.id}>
                    <td style={base.td}>
                      <span style={{ color: "#94A3B8" }}>#{String(despacho.id).substring(0, 8)}</span>
                    </td>
                    <td style={base.td}>{despacho.clientes?.nombre || "N/A"}</td>
                    <td style={base.td}>
                      <div style={{ fontWeight: 500 }}>
                        {despacho.conductores?.usuarios?.nombre || despacho.conductores?.rut || "N/A"}
                      </div>
                      <div style={{ fontSize: "13px", color: "#94A3B8", marginTop: "4px" }}>
                        🚚 {despacho.camiones?.patente || "-"}
                      </div>
                    </td>
                    <td style={base.td}>{despacho.destino}</td>
                    <td style={base.td}>
                      {despacho.tiempo_espera_minutos !== null && despacho.tiempo_espera_minutos !== undefined ? (
                        <span style={{
                          color: despacho.tiempo_espera_minutos > 30 ? "#ef4444" : "#e2e8f0",
                          fontWeight: 600
                        }}>
                          {despacho.tiempo_espera_minutos} min
                        </span>
                      ) : (
                        <span style={{ color: "#94A3B8" }}>-</span>
                      )}
                    </td>
                    <td style={base.td}>{formatFecha(
                      despacho.fecha_fin || despacho.fecha_inicio || despacho.created_at
                    )}</td>
                    <td style={base.td}>
                      <span style={base.badge}>✅ {despacho.estado}</span>
                    </td>
                    <td style={base.td}>
                      <button
                        type="button"
                        style={base.evidenciasButton}
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
