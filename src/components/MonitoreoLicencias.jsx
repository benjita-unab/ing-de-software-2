import React, { useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const DRIVERS_TEMP = [
  { id: "driver-001", name: "Juan Pérez" },
  { id: "driver-002", name: "María Gómez" },
  { id: "driver-003", name: "Carlos Silva" },
];

const base = {
  dashboard: {
    minHeight: "100%",
    background: "transparent",
    color: "#E2E8F0",
    padding: "10px",
    fontFamily: "'Inter', 'Poppins', sans-serif",
    overflow: "auto",
  },
  card: {
    width: "100%",
    maxWidth: "min(960px, 100%)",
    margin: "0 auto",
    borderRadius: "18px",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(8,8,12,0.72)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
    padding: "22px",
    backdropFilter: "blur(10px)",
  },
  label: {
    display: "block",
    color: "rgba(255,255,255,0.7)",
    marginBottom: "8px",
    fontSize: "1rem",
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "999px",
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(8,8,12,0.8)",
    color: "#F8FAFC",
    marginBottom: "16px",
    outline: "none",
    fontSize: "15px",
  },
  select: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "999px",
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(8,8,12,0.8)",
    color: "#F8FAFC",
    marginBottom: "16px",
    fontSize: "15px",
  },
  button: {
    width: "100%",
    padding: "14px 16px",
    border: "none",
    borderRadius: "999px",
    background: "linear-gradient(135deg, #3a0ca3, #12185c)",
    color: "#FFFFFF",
    fontWeight: 700,
    fontSize: "1.05rem",
    cursor: "pointer",
    transition: "filter 0.2s ease",
  },
  buttonDisabled: {
    filter: "brightness(0.8)",
    cursor: "not-allowed",
  },
  messageSuccess: {
    background: "rgba(18,24,92,0.55)",
    color: "#D1FAE5",
    borderRadius: "10px",
    padding: "10px 12px",
    marginBottom: "14px",
  },
  messageError: {
    background: "rgba(247,37,133,0.25)",
    color: "#FEE2E2",
    borderRadius: "10px",
    padding: "10px 12px",
    marginBottom: "14px",
  },
  subtitle: {
    color: "#fff",
    marginBottom: "16px",
    fontSize: "1.05rem",
    fontWeight: 800,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
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
  const expiryDateRef = useRef(null);

  const openExpiryDatePicker = () => {
    const el = expiryDateRef.current;
    if (!el || el.disabled) return;
    if (typeof el.showPicker === "function") {
      try {
        const maybePromise = el.showPicker();
        if (maybePromise != null && typeof maybePromise.catch === "function") {
          maybePromise.catch(() => el.focus());
        }
      } catch {
        el.focus();
      }
    } else {
      el.focus();
    }
  };

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
      const sanitizedFileName = file.name.replace(/\s+/g, "_");
      const generatedFilename = `${Date.now()}_${sanitizedFileName}`;
      const uploadPath = `driver_licenses/${driverId}/${generatedFilename}`;

      const { error: uploadError } = await supabase.storage
        .from("driver_licenses")
        .upload(uploadPath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) {
        throw new Error(`Error al subir archivo: ${uploadError.message}`);
      }

      const { data: publicData, error: publicError } = supabase.storage
        .from("driver_licenses")
        .getPublicUrl(uploadPath);

      if (publicError) {
        throw new Error(`Error al obtener URL pública: ${publicError.message}`);
      }

      const publicUrl = publicData?.publicUrl;
      if (!publicUrl) {
        throw new Error("No se generó la URL pública del archivo.");
      }

      const { error: dbError } = await supabase
        .from("driver_licenses")
        .insert([
          {
            user_id: driverId,
            file_url: publicUrl,
            file_name: file.name,
            expiry_date: expiryDate,
            status: "pending_review",
          },
        ]);

      if (dbError) {
        throw new Error(`Error guardando metadatos: ${dbError.message}`);
      }

      setSuccessText("Licencia cargada y registrada correctamente.");
      resetForm();
    } catch (err) {
      console.error("MonitoreoLicencias error:", err);
      setErrorText(err.message || "Ocurrió un error inesperado, inténtalo nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={base.dashboard} className="premium-scroll operator-section">
      <div style={base.card} className="operator-glass-card">
        <h2 style={base.subtitle}>Monitoreo de licencias</h2>

        {errorText && <div style={base.messageError}>{errorText}</div>}
        {successText && <div style={base.messageSuccess}>{successText}</div>}

        <form onSubmit={handleSubmit}>
          <label htmlFor="driverSelect" className="rrhh-field-label" style={base.label}>
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

          <label htmlFor="licenseFile" className="rrhh-field-label" style={base.label}>
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

          <div style={{ marginBottom: "16px", cursor: "pointer" }} onClick={openExpiryDatePicker}>
            <span className="rrhh-field-label" style={{ ...base.label, display: "block" }}>
              Fecha de Vencimiento
            </span>
            <input
              ref={expiryDateRef}
              id="expiryDate"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              onClick={(e) => {
                e.stopPropagation();
                openExpiryDatePicker();
              }}
              style={{ ...base.input, marginBottom: 0, cursor: "pointer" }}
              disabled={isLoading}
            />
          </div>

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
