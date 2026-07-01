import React, { useEffect, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { getAuthToken, getApiBaseUrl } from "../lib/apiClient";
import { obtenerConductoresActivos } from "../lib/rutasService";
import Card from "./ui/Card";
import Spinner from "./ui/Spinner";

const API_BASE_URL = getApiBaseUrl();

function formatConductorLabel(conductor) {
  const rut = conductor.rut || "Sin RUT";
  const licencia = conductor.licencia_numero ? ` · Lic. ${conductor.licencia_numero}` : "";
  return `${rut}${licencia}`;
}

export default function MonitoreoLicencias() {
  const [conductores, setConductores] = useState([]);
  const [loadingConductores, setLoadingConductores] = useState(true);
  const [driverId, setDriverId] = useState("");
  const [file, setFile] = useState(null);
  const [expiryDate, setExpiryDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [successText, setSuccessText] = useState("");
  const [errorText, setErrorText] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const cargarConductores = async () => {
      setLoadingConductores(true);
      const res = await obtenerConductoresActivos();
      if (cancelled) return;
      if (res.error) {
        setErrorText(res.error);
        setConductores([]);
      } else {
        setConductores(res.data || []);
      }
      setLoadingConductores(false);
    };
    cargarConductores();
    return () => { cancelled = true; };
  }, []);

  const resetForm = () => {
    setDriverId("");
    setFile(null);
    setExpiryDate("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSuccessText("");
    setErrorText("");

    if (!driverId) {
      setErrorText("Seleccione un conductor.");
      return;
    }
    if (!file) {
      setErrorText("Selecciona un documento válido para subir.");
      return;
    }
    if (!expiryDate) {
      setErrorText("Ingresa la fecha de vencimiento de la licencia.");
      return;
    }

    setIsLoading(true);
    try {
      const token = getAuthToken();
      if (!token) throw new Error("No authentication token found. Please log in.");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("expiryDate", expiryDate);
      formData.append("conductorId", driverId);

      const response = await fetch(`${API_BASE_URL}/api/conductores/upload-license`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData?.message || errorData?.error || `Error uploading license: ${response.statusText}`,
        );
      }

      await response.json().catch(() => null);
      setSuccessText("Licencia cargada.");
      resetForm();
    } catch (err) {
      console.error("MonitoreoLicencias error:", err);
      setErrorText(err.message || "Ocurrió un error inesperado, inténtalo nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="lt-module-inner">
      <Card className="lt-module-card lt-module-card--narrow">
        <div className="lt-card__body">
          <h3 className="lt-module-card__title">Carga de licencia</h3>
          <p className="lt-module-card__subtitle">
            Asocie el documento y la fecha de vencimiento al conductor correspondiente.
          </p>

          {errorText ? (
            <div className="lt-alert-banner lt-alert-banner--error" role="alert">
              {errorText}
            </div>
          ) : null}
          {successText ? (
            <div className="lt-alert-banner lt-alert-banner--success" role="status">
              {successText}
            </div>
          ) : null}

          {loadingConductores ? (
            <Spinner message="Cargando conductores..." />
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="lt-field-group">
                <label htmlFor="driverSelect" className="lt-label">Conductor</label>
                <select
                  id="driverSelect"
                  className="lt-select"
                  value={driverId}
                  onChange={(e) => setDriverId(e.target.value)}
                  disabled={isLoading}
                >
                  <option value="">Seleccione...</option>
                  {conductores.map((conductor) => (
                    <option key={conductor.id} value={conductor.id}>
                      {formatConductorLabel(conductor)}
                    </option>
                  ))}
                </select>
              </div>

              {conductores.length === 0 && (
                <div className="lt-alert-banner lt-alert-banner--warning">
                  No hay conductores activos en el sistema.
                </div>
              )}

              <div className="lt-field-group">
                <label htmlFor="licenseFile" className="lt-label">Carga de documento</label>
                <input
                  ref={fileInputRef}
                  id="licenseFile"
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="lt-input"
                  disabled={isLoading}
                />
              </div>

              <div className="lt-field-group">
                <label htmlFor="expiryDate" className="lt-label">Fecha de vencimiento</label>
                <input
                  id="expiryDate"
                  type="date"
                  className="lt-input"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <button
                type="submit"
                className="lt-btn lt-btn--primary lt-btn--full"
                disabled={isLoading || conductores.length === 0}
              >
                <Upload size={14} />
                {isLoading ? "Subiendo..." : "Subir licencia"}
              </button>
            </form>
          )}
        </div>
      </Card>
    </div>
  );
}
