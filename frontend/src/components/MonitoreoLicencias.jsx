import React, { useEffect, useRef, useState } from "react";
import { getAuthToken, getApiBaseUrl } from "../lib/apiClient";
import { obtenerConductoresActivos } from "../lib/rutasService";

const API_BASE_URL = getApiBaseUrl();

const base = {
  container: {
    minHeight: "100%",
    background: "transparent",
    color: "#E2E8F0",
    padding: "10px",
    fontFamily: "Inter, system-ui, sans-serif",
    overflow: "auto",
  },
  card: {
    width: "100%",
    maxWidth: "680px",
    margin: "0 auto",
    borderRadius: "16px",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(8,8,12,0.72)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
    padding: "24px",
    backdropFilter: "blur(8px)",
  },
  label: {
    display: "block",
    color: "rgba(226,232,240,0.9)",
    marginBottom: "8px",
    fontSize: "0.92rem",
    fontWeight: 600,
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(15,23,42,0.65)",
    color: "#F8FAFC",
    marginBottom: "16px",
    outline: "none",
    boxSizing: "border-box",
  },
  select: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(15,23,42,0.95)",
    color: "#F8FAFC",
    marginBottom: "16px",
    boxSizing: "border-box",
  },
  button: {
    width: "100%",
    padding: "12px 14px",
    border: "none",
    borderRadius: "10px",
    background: "linear-gradient(135deg, #2563eb, #7c3aed)",
    color: "#FFFFFF",
    fontWeight: 700,
    fontSize: "0.95rem",
    cursor: "pointer",
    transition: "filter 0.2s ease",
  },
  buttonDisabled: {
    filter: "brightness(0.8)",
    cursor: "not-allowed",
  },
  messageSuccess: {
    background: "rgba(34,197,94,0.15)",
    color: "#86efac",
    border: "1px solid rgba(34,197,94,0.45)",
    borderRadius: "10px",
    padding: "10px 12px",
    marginBottom: "14px",
    fontSize: "13px",
  },
  messageError: {
    background: "rgba(239,68,68,0.12)",
    color: "#fecaca",
    border: "1px solid rgba(248,113,113,0.45)",
    borderRadius: "10px",
    padding: "10px 12px",
    marginBottom: "14px",
    fontSize: "13px",
  },
  subtitle: {
    color: "#60A5FA",
    marginBottom: "16px",
    fontSize: "1.08rem",
    fontWeight: 700,
  },
};

function formatConductorLabel(conductor) {
  const rut = conductor.rut || "Sin RUT";
  const licencia = conductor.licencia_numero
    ? ` · Lic. ${conductor.licencia_numero}`
    : "";
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
    return () => {
      cancelled = true;
    };
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
      setErrorText("Selecciona un chofer antes de continuar.");
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
      if (!token) {
        throw new Error("No authentication token found. Please log in.");
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("expiryDate", expiryDate);
      formData.append("conductorId", driverId);

      const response = await fetch(
        `${API_BASE_URL}/api/conductores/upload-license`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData?.message || errorData?.error || `Error uploading license: ${response.statusText}`
        );
      }

      await response.json().catch(() => null);

      setSuccessText(
        "Licencia cargada correctamente. La vigencia quedó sincronizada en el panel de asignación."
      );
      resetForm();
    } catch (err) {
      console.error("MonitoreoLicencias error:", err);
      setErrorText(
        err.message || "Ocurrió un error inesperado, inténtalo nuevamente."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={base.container}>
      <div style={base.card} className="operator-glass-card">
        <h2 style={base.subtitle} className="rrhh-section-title">
          Monitoreo de licencias
        </h2>

        {errorText && <div style={base.messageError}>{errorText}</div>}
        {successText && <div style={base.messageSuccess}>{successText}</div>}

        <form onSubmit={handleSubmit}>
          <label htmlFor="driverSelect" style={base.label} className="rrhh-field-label">
            Selector de Chofer
          </label>
          <select
            id="driverSelect"
            style={base.select}
            value={driverId}
            onChange={(e) => setDriverId(e.target.value)}
            disabled={isLoading || loadingConductores}
          >
            <option value="">
              {loadingConductores
                ? "Cargando conductores..."
                : "-- Selecciona un chofer --"}
            </option>
            {conductores.map((conductor) => (
              <option key={conductor.id} value={conductor.id}>
                {formatConductorLabel(conductor)}
              </option>
            ))}
          </select>

          {!loadingConductores && conductores.length === 0 && (
            <p style={{ ...base.messageError, marginTop: "-8px" }}>
              No hay conductores activos en el sistema.
            </p>
          )}

          <label htmlFor="licenseFile" style={base.label} className="rrhh-field-label">
            Carga de Documento
          </label>
          <input
            ref={fileInputRef}
            id="licenseFile"
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            style={base.input}
            disabled={isLoading}
          />

          <label htmlFor="expiryDate" style={base.label} className="rrhh-field-label">
            Fecha de Vencimiento
          </label>
          <input
            id="expiryDate"
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            style={base.input}
            disabled={isLoading}
          />

          <button
            type="submit"
            style={{
              ...base.button,
              ...(isLoading ? base.buttonDisabled : {}),
            }}
            disabled={isLoading || loadingConductores}
          >
            {isLoading ? "Guardando..." : "Guardar"}
          </button>
        </form>
      </div>
    </div>
  );
}
