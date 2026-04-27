import React, { useRef, useState, useEffect } from "react";
import { getAuthToken } from "../lib/apiClient";

const DRIVERS_TEMP = [
  { id: "driver-001", name: "Juan Pérez" },
  { id: "driver-002", name: "María Gómez" },
  { id: "driver-003", name: "Carlos Silva" },
];

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

const base = {
  dashboard: {
    minHeight: "100%",
    background: "#0F172A",
    color: "#E2E8F0",
    padding: "24px",
    fontFamily: "Inter, system-ui, sans-serif",
  },
  card: {
    width: "100%",
    maxWidth: "680px",
    margin: "0 auto",
    borderRadius: "16px",
    border: "1px solid #1E293B",
    background: "#111827",
    boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
    padding: "24px",
  },
  label: {
    display: "block",
    color: "#94A3B8",
    marginBottom: "8px",
    fontSize: "0.92rem",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid #334155",
    background: "#0F172A",
    color: "#F8FAFC",
    marginBottom: "16px",
    outline: "none",
  },
  select: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid #334155",
    background: "#0F172A",
    color: "#F8FAFC",
    marginBottom: "16px",
  },
  button: {
    width: "100%",
    padding: "12px 14px",
    border: "none",
    borderRadius: "10px",
    background: "#0EA5E9",
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
    background: "#0F766E",
    color: "#D1FAE5",
    borderRadius: "10px",
    padding: "10px 12px",
    marginBottom: "14px",
  },
  messageError: {
    background: "#991B1B",
    color: "#FEE2E2",
    borderRadius: "10px",
    padding: "10px 12px",
    marginBottom: "14px",
  },
  subtitle: {
    color: "#60A5FA",
    marginBottom: "16px",
    fontSize: "1.08rem",
    fontWeight: 600,
  },
};

export default function MonitoreoLicencias() {
  const [driverId, setDriverId] = useState("");
  const [file, setFile] = useState(null);
  const [expiryDate, setExpiryDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [successText, setSuccessText] = useState("");
  const [errorText, setErrorText] = useState("");

  const fileInputRef = useRef(null);

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

      const response = await fetch(
        `${API_BASE_URL}/api/conductores/license/upload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `Error uploading license: ${response.statusText}`
        );
      }

      const result = await response.json();

      setSuccessText(
        "Licencia cargada y registrada correctamente (estado pending_review)."
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
    <div style={base.dashboard}>
      <div style={base.card}>
        <h2 style={base.subtitle}>Monitoreo de licencias</h2>

        {errorText && <div style={base.messageError}>{errorText}</div>}
        {successText && <div style={base.messageSuccess}>{successText}</div>}

        <form onSubmit={handleSubmit}>
          <label htmlFor="driverSelect" style={base.label}>
            Selector de Chofer
          </label>
          <select
            id="driverSelect"
            style={base.select}
            value={driverId}
            onChange={(e) => setDriverId(e.target.value)}
            disabled={isLoading}
          >
            <option value="">-- Selecciona un chofer --</option>
            {DRIVERS_TEMP.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.name}
              </option>
            ))}
          </select>

          <label htmlFor="licenseFile" style={base.label}>
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

          <label htmlFor="expiryDate" style={base.label}>
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
            disabled={isLoading}
          >
            {isLoading ? "Guardando..." : "Guardar"}
          </button>
        </form>
      </div>
    </div>
  );
}
