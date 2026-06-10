import React, { useEffect } from "react";

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
    background: "rgba(8,12,24,0.96)",
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: "16px",
    boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
    color: "#E2E8F0",
    padding: "22px 24px",
    fontFamily: "'Inter', system-ui, sans-serif",
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
    letterSpacing: "0.06em",
    color: "#fff",
  },
  headerSub: {
    fontSize: "12px",
    color: "#94A3B8",
    marginTop: "4px",
  },
  closeButton: {
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.15)",
    color: "#e2e8f0",
    borderRadius: "8px",
    width: "36px",
    height: "36px",
    cursor: "pointer",
    fontSize: "16px",
  },
  section: { marginBottom: "20px" },
  sectionTitle: {
    fontSize: "13px",
    fontWeight: 700,
    marginBottom: "10px",
    color: "#cbd5e1",
  },
  emptyText: { fontSize: "13px", color: "#94A3B8", margin: 0 },
  errorText: { fontSize: "13px", color: "#f87171", margin: 0 },
  pdfRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    padding: "10px 12px",
    borderRadius: "8px",
    background: "rgba(255,255,255,0.04)",
    marginBottom: "8px",
  },
  pdfName: {
    fontSize: "13px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    flex: 1,
  },
  pdfLink: {
    fontSize: "13px",
    color: "#93C5FD",
    textDecoration: "none",
    fontWeight: 600,
  },
  fotosGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
    gap: "12px",
  },
  fotoItem: {
    display: "block",
    borderRadius: "10px",
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.1)",
    textDecoration: "none",
    color: "inherit",
  },
  fotoImg: {
    width: "100%",
    height: "120px",
    objectFit: "cover",
    display: "block",
    background: "rgba(0,0,0,0.3)",
  },
  fotoMeta: {
    padding: "8px",
    fontSize: "11px",
    color: "#94A3B8",
  },
  firmaWrap: { textAlign: "center" },
  firmaImg: {
    maxWidth: "100%",
    maxHeight: "160px",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "#fff",
  },
};

function etiquetaEtapaVisible(foto) {
  const raw = String(foto?.etapa ?? "").trim();
  const u = raw.toUpperCase();
  if (u === "RECEPCION") return "Recepción de carga";
  if (u === "ENTREGADO") return "Entrega final";
  if (u === "HOJA_DESPACHO") return "Hoja de despacho";
  if (u === "EVIDENCIA_ADICIONAL") return "Evidencia extra";
  const low = raw.toLowerCase();
  if (low === "ficha") return "Hoja de despacho";
  if (["carga", "salida", "transito", "tránsito"].includes(low)) return "Recepción de carga";
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

/**
 * Modal de evidencias del portal cliente (HU-27 CA-5).
 */
export default function PortalEvidenciasModal({
  pedido,
  evidencias,
  loading,
  error,
  onClose,
}) {
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
  const fotosMostrar = [...fotosEvidencia, ...fichasDespacho];

  const noHayNada =
    !loading &&
    !error &&
    pdfs.length === 0 &&
    fotosMostrar.length === 0 &&
    !firmaUrl;

  const subtitulo = pedido
    ? `${pedido.origen || "—"} → ${pedido.destino || "—"} · ${pedido.estado || "—"}`
    : "";

  return (
    <div
      style={modalStyles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="portal-evidencias-title"
    >
      <div style={modalStyles.dialog}>
        <div style={modalStyles.header}>
          <div>
            <div id="portal-evidencias-title" style={modalStyles.headerTitle}>
              Evidencias del pedido
            </div>
            {subtitulo ? (
              <div style={modalStyles.headerSub}>{subtitulo}</div>
            ) : null}
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
          <p style={modalStyles.emptyText}>Sin evidencias disponibles para este pedido.</p>
        )}

        {!loading && !error && !noHayNada && (
          <>
            <div style={modalStyles.section}>
              <div style={modalStyles.sectionTitle}>Documentos PDF</div>
              {pdfs.length === 0 ? (
                <p style={modalStyles.emptyText}>Sin documentos PDF adjuntos.</p>
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
                      Ver PDF
                    </a>
                  </div>
                ))
              )}
            </div>

            <div style={modalStyles.section}>
              <div style={modalStyles.sectionTitle}>Fotografías</div>
              {fotosMostrar.length === 0 ? (
                <p style={modalStyles.emptyText}>Sin fotografías registradas.</p>
              ) : (
                <div style={modalStyles.fotosGrid}>
                  {fotosMostrar.map((foto) => (
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
                        {foto.timestamp ? ` · ${formatFecha(foto.timestamp)}` : ""}
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div style={modalStyles.section}>
              <div style={modalStyles.sectionTitle}>Firma de recepción</div>
              {!firmaUrl ? (
                <p style={modalStyles.emptyText}>Sin firma registrada.</p>
              ) : (
                <div style={modalStyles.firmaWrap}>
                  <img
                    src={firmaUrl}
                    alt="Firma de recepción"
                    style={modalStyles.firmaImg}
                  />
                  <p style={{ marginTop: "10px" }}>
                    <a
                      href={firmaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={modalStyles.pdfLink}
                    >
                      Abrir firma en pestaña nueva
                    </a>
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
