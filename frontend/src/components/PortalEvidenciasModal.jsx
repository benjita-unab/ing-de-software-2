import React, { useEffect } from "react";

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
      className="lt-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="portal-evidencias-title"
    >
      <div className="lt-modal-dialog lt-modal-dialog--lg">
        <div className="lt-modal-header">
          <div>
            <div className="lt-modal-header__title" id="portal-evidencias-title">
              Evidencias del pedido
            </div>
            {subtitulo ? (
              <div className="lt-modal-header__sub">{subtitulo}</div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="lt-modal-close"
            aria-label="Cerrar"
          >
            ×
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
            <p className="lt-empty">Sin evidencias disponibles para este pedido.</p>
          )}

          {!loading && !error && !noHayNada && (
            <>
              <div className="lt-modal-section">
                <div className="lt-modal-section__title">Documentos PDF</div>
                {pdfs.length === 0 ? (
                  <p className="lt-empty">Sin documentos PDF adjuntos.</p>
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
                        Ver PDF
                      </a>
                    </div>
                  ))
                )}
              </div>

              <div className="lt-modal-section">
                <div className="lt-modal-section__title">Fotografías</div>
                {fotosMostrar.length === 0 ? (
                  <p className="lt-empty">Sin fotografías registradas.</p>
                ) : (
                  <div className="lt-modal-fotos-grid">
                    {fotosMostrar.map((foto) => (
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
                          {foto.timestamp ? ` · ${formatFecha(foto.timestamp)}` : ""}
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>

              <div className="lt-modal-section">
                <div className="lt-modal-section__title">Firma de recepción</div>
                {!firmaUrl ? (
                  <p className="lt-empty">Sin firma registrada.</p>
                ) : (
                  <div className="lt-modal-firma-wrap">
                    <img
                      src={firmaUrl}
                      alt="Firma de recepción"
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

        <div className="lt-modal-footer">
          <button type="button" className="lt-btn lt-btn--secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
