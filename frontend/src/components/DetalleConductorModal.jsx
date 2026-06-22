import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Pencil, Search, X } from "lucide-react";
import {
  displayNombreConductor,
  formatRutaCodigo,
  mergeConductorData,
  NOMBRE_NO_DISPONIBLE_API,
  parseLicensesPayload,
  resolveLicenciaDocumentoUrl,
  resolveLicenciaNumero,
  rutaCoincideBusqueda,
} from "../lib/conductorUtils";
import {
  obtenerConductorDetalle,
  obtenerRutasPorConductor,
} from "../lib/rutasService";
import { getAuthToken as getToken } from "../lib/apiClient";
import Badge from "./ui/Badge";
import FormularioConductor from "./FormularioConductor";
import MetricasPagoConductor from "./MetricasPagoConductor";
import Spinner from "./ui/Spinner";

const DETALLE_TABS = [
  { id: "general", label: "Información general" },
  { id: "metricas-pago", label: "Métricas y Pago" },
];

const NO_DISPONIBLE = "No disponible";

const LICENSE_STATUS_LABELS = {
  VALID: "Vigente",
  EXPIRING_SOON: "Por vencer",
  EXPIRED: "Vencida",
  NO_LICENSE: "Sin licencia",
  INACTIVE: "Inactivo",
};

function licenciaBadgeFromStatus(licenseStatus, diasRestantes) {
  const status = licenseStatus?.status;
  if (status === "EXPIRED" || (typeof diasRestantes === "number" && diasRestantes < 0)) {
    return { texto: "Vencida", variant: "danger" };
  }
  if (status === "EXPIRING_SOON" || (typeof diasRestantes === "number" && diasRestantes <= 30)) {
    const dias = typeof diasRestantes === "number" ? diasRestantes : licenseStatus?.daysUntilExpiry;
    return { texto: dias != null ? `Por vencer (${dias} días)` : "Por vencer", variant: "warning" };
  }
  if (status === "NO_LICENSE") {
    return { texto: "Sin licencia", variant: "muted" };
  }
  if (status === "INACTIVE") {
    return { texto: "Inactivo", variant: "muted" };
  }
  const dias = typeof diasRestantes === "number" ? diasRestantes : licenseStatus?.daysUntilExpiry;
  return {
    texto: dias != null ? `Vigente (${dias} días)` : "Vigente",
    variant: "success",
  };
}

function formatFecha(fecha) {
  if (!fecha) return NO_DISPONIBLE;
  const parsed = new Date(fecha);
  if (Number.isNaN(parsed.getTime())) return NO_DISPONIBLE;
  return parsed.toLocaleDateString("es-CL");
}

function resolveDisponibilidad(conductor) {
  if (!conductor) return NO_DISPONIBLE;
  if (conductor.disponibilidad == null || conductor.disponibilidad === "") {
    return NO_DISPONIBLE;
  }
  return String(conductor.disponibilidad);
}

function estadoRutaLabel(estado) {
  if (!estado) return "—";
  return String(estado).replace(/_/g, " ");
}

export default function DetalleConductorModal({
  conductorResumen,
  onClose,
  onConductorActualizado,
  configPagosVersion = 0,
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detalle, setDetalle] = useState(null);
  const [rutasAsignadas, setRutasAsignadas] = useState([]);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [busquedaRutas, setBusquedaRutas] = useState("");
  const [activeTab, setActiveTab] = useState("general");

  const cargarDetalle = useCallback(async () => {
    if (!conductorResumen?.id) return;

    setLoading(true);
    setError("");

    const [resDetalle, resRutas] = await Promise.all([
      obtenerConductorDetalle(conductorResumen.id),
      obtenerRutasPorConductor(conductorResumen.id, conductorResumen.rut),
    ]);

    if (resDetalle.error) {
      setError(resDetalle.error);
      setDetalle({
        conductor: mergeConductorData(conductorResumen, null),
        licenses: [],
        licenseStatus: conductorResumen.licenseStatus,
      });
    } else {
      const payload = resDetalle.data || {};
      setDetalle({
        conductor: mergeConductorData(conductorResumen, payload.conductor),
        licenses: parseLicensesPayload(payload),
        licenseStatus: payload.licenseStatus || conductorResumen.licenseStatus,
      });
    }

    if (resRutas.error) {
      setRutasAsignadas([]);
      if (!resDetalle.error) {
        setError(resRutas.error);
      }
    } else {
      setRutasAsignadas(resRutas.data || []);
    }

    setLoading(false);
  }, [conductorResumen]);

  useEffect(() => {
    setModoEdicion(false);
    setBusquedaRutas("");
    setActiveTab("general");
    cargarDetalle();
  }, [cargarDetalle]);

  const rutasFiltradas = useMemo(
    () => rutasAsignadas.filter((ruta) => rutaCoincideBusqueda(ruta, busquedaRutas)),
    [rutasAsignadas, busquedaRutas],
  );

  const handleGuardadoEdicion = async () => {
    setModoEdicion(false);
    await cargarDetalle();
    onConductorActualizado?.();
  };

  const updateLicenseStatus = async (licenseId, status) => {
    try {
      const token = getToken();
      // use the correct backend URL if needed or relative if proxy is setup
      const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3001";
      const res = await fetch(`${apiUrl}/api/conductores/${conductorResumen.id}/licencias/${licenseId}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status })
      });
      
      if (!res.ok) {
        throw new Error("No se pudo actualizar la licencia");
      }
      
      await cargarDetalle();
      onConductorActualizado?.();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!conductorResumen) return null;

  const conductor = detalle?.conductor || conductorResumen;
  const licenses = detalle?.licenses || [];
  const licenseStatus = detalle?.licenseStatus || conductorResumen.licenseStatus;
  const diasRestantes = licenseStatus?.daysUntilExpiry;
  const badge = licenciaBadgeFromStatus(licenseStatus, diasRestantes);
  const estadoLicenciaTexto =
    LICENSE_STATUS_LABELS[licenseStatus?.status]
    || licenseStatus?.message
    || NO_DISPONIBLE;
  const licenciaNumero =
    resolveLicenciaNumero(conductor, conductorResumen) || NO_DISPONIBLE;
  const licenciaDocumentoUrl = resolveLicenciaDocumentoUrl(licenses);
  const nombreDisplay = displayNombreConductor(conductor);
  const nombreEnSubtitulo = nombreDisplay !== NOMBRE_NO_DISPONIBLE_API ? nombreDisplay : null;

  const filas = [
    { label: "Nombre", value: nombreDisplay },
    { label: "RUT", value: conductor.rut || NO_DISPONIBLE },
    { label: "Teléfono", value: conductor.telefono || NO_DISPONIBLE },
    { label: "Licencia", value: licenciaNumero },
    {
      label: "Fecha vencimiento",
      value: formatFecha(conductor.licencia_vencimiento || licenseStatus?.expiryDate),
    },
    { label: "Estado licencia", value: estadoLicenciaTexto, badge },
    { label: "Disponibilidad", value: resolveDisponibilidad(conductor) },
  ];

  return (
    <>
      <div
        className="lt-modal-overlay"
        onClick={onClose}
        role="presentation"
      >
        <div
          className="lt-modal-dialog lt-modal-dialog--lg"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-labelledby="detalle-conductor-title"
        >
          <div className="lt-modal-header">
            <div>
              <div className="lt-modal-header__title" id="detalle-conductor-title">
                Detalle del conductor
              </div>
              <div className="lt-modal-header__sub">
                {nombreEnSubtitulo ? `${nombreEnSubtitulo} · ` : ""}
                {conductor.rut || "Conductor"}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              {!loading && (
                <>
                  <button
                    type="button"
                    className="lt-btn lt-btn--secondary"
                    onClick={() => setModoEdicion(true)}
                  >
                    <Pencil size={14} />
                    Editar conductor
                  </button>
                  {licenciaDocumentoUrl ? (
                    <a
                      href={licenciaDocumentoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="lt-btn lt-btn--ghost"
                    >
                      <ExternalLink size={14} />
                      Ver licencia
                    </a>
                  ) : null}
                </>
              )}
              <button type="button" className="lt-modal-close" onClick={onClose} aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="lt-modal-body">
            {loading ? (
              <div className="lt-empty" style={{ display: "flex", justifyContent: "center", padding: "24px 0" }}>
                <Spinner />
              </div>
            ) : (
              <>
                {error && activeTab === "general" && (
                  <div className="lt-alert-banner lt-alert-banner--warning" role="alert">
                    {error}
                  </div>
                )}

                <div className="lt-tabs" style={{ marginBottom: 16 }}>
                  {DETALLE_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      className={`lt-tab ${activeTab === tab.id ? "lt-tab--active" : ""}`}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {activeTab === "metricas-pago" ? (
                  <MetricasPagoConductor
                    conductorId={conductor.id}
                    conductorRut={conductor.rut}
                    configPagosVersion={configPagosVersion}
                  />
                ) : (
                  <>
                <div className="lt-modal-section">
                  {filas.map((fila) => (
                    <div key={fila.label} className="lt-info-row">
                      <span className="lt-info-row__label">{fila.label}</span>
                      <span className="lt-info-row__value">
                        {fila.badge ? (
                          <Badge variant={fila.badge.variant} showDot={false}>
                            {fila.badge.texto}
                          </Badge>
                        ) : (
                          fila.value
                        )}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="lt-modal-section">
                  <div className="lt-modal-section__title">Documento de licencia</div>
                  {licenciaDocumentoUrl ? (
                    <>
                      <p className="lt-module-card__subtitle">Documento disponible en el sistema.</p>
                      {licenseStatus?.status === "PENDING" && licenses[0] && (
                        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                          <button 
                            className="lt-btn lt-btn--primary" 
                            style={{ backgroundColor: "#22c55e", borderColor: "#22c55e", color: "white" }}
                            onClick={() => updateLicenseStatus(licenses[0].id, "approved")}
                          >
                            Aprobar Licencia
                          </button>
                          <button 
                            className="lt-btn lt-btn--danger"
                            onClick={() => updateLicenseStatus(licenses[0].id, "rejected")}
                          >
                            Rechazar Licencia
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="lt-empty">Sin documento cargado</p>
                  )}
                </div>

                <div className="lt-modal-section">
                  <div className="lt-modal-section__title">
                    Rutas asignadas ({rutasFiltradas.length}
                    {busquedaRutas.trim() ? ` de ${rutasAsignadas.length}` : ""})
                  </div>
                  {rutasAsignadas.length === 0 ? (
                    <p className="lt-empty">Sin rutas asignadas</p>
                  ) : (
                    <>
                      <div className="lt-search-wrap" style={{ marginBottom: 12, maxWidth: "100%" }}>
                        <Search size={14} className="lt-search-icon" />
                        <input
                          type="text"
                          className="lt-input"
                          placeholder="Filtrar por código, origen, destino o estado..."
                          value={busquedaRutas}
                          onChange={(e) => setBusquedaRutas(e.target.value)}
                          aria-label="Filtrar rutas asignadas"
                        />
                      </div>
                      {rutasFiltradas.length === 0 ? (
                        <p className="lt-empty">Ninguna ruta coincide con el filtro.</p>
                      ) : (
                        <div className="lt-table-wrap">
                          <table className="lt-table">
                            <thead>
                              <tr>
                                <th>Ruta</th>
                                <th>Origen</th>
                                <th>Destino</th>
                                <th>Estado</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rutasFiltradas.map((ruta) => (
                                <tr key={ruta.id}>
                                  <td title={ruta.id}>{formatRutaCodigo(ruta)}</td>
                                  <td>{ruta.origen || "—"}</td>
                                  <td>{ruta.destino || "—"}</td>
                                  <td>{estadoRutaLabel(ruta.estado)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  )}
                </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {modoEdicion && (
        <FormularioConductor
          conductor={conductor}
          documentoExistenteUrl={licenciaDocumentoUrl}
          onCancel={() => setModoEdicion(false)}
          onGuardado={handleGuardadoEdicion}
        />
      )}
    </>
  );
}
