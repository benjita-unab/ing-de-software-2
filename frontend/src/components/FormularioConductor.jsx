import React, { useEffect, useRef, useState } from "react";
import { X, Upload } from "lucide-react";
import { getAuthToken, getApiBaseUrl } from "../lib/apiClient";
import Spinner from "./ui/Spinner";

const API_BASE_URL = getApiBaseUrl();

async function archivoDesdeUrl(documentoUrl, nombreFallback = "licencia-existente.pdf") {
  const response = await fetch(documentoUrl);
  if (!response.ok) {
    throw new Error("No se pudo reutilizar el documento existente. Sube un archivo nuevo.");
  }
  const blob = await response.blob();
  const nombre =
    documentoUrl.split("/").pop()?.split("?")[0] || nombreFallback;
  return new File([blob], nombre, { type: blob.type || "application/octet-stream" });
}

export default function FormularioConductor({
  conductor,
  documentoExistenteUrl = null,
  onGuardado,
  onCancel,
}) {
  const fileInputRef = useRef(null);
  const [expiryDate, setExpiryDate] = useState("");
  const [fechaOriginal, setFechaOriginal] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!conductor) return;
    const fecha =
      conductor.licencia_vencimiento
        ? String(conductor.licencia_vencimiento).slice(0, 10)
        : "";
    setExpiryDate(fecha);
    setFechaOriginal(fecha);
    setFile(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [conductor]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!conductor?.id) {
      setError("Conductor no válido.");
      return;
    }

    if (!expiryDate) {
      setError("Ingresa la fecha de vencimiento de la licencia.");
      return;
    }

    const fechaCambio = expiryDate !== fechaOriginal;
    if (!file && !fechaCambio) {
      setError("No hay cambios para guardar.");
      return;
    }

    setLoading(true);
    try {
      const token = getAuthToken();
      if (!token) throw new Error("No autenticado. Inicia sesión nuevamente.");

      let archivo = file;
      if (!archivo) {
        if (!documentoExistenteUrl) {
          throw new Error(
            "Para actualizar la fecha necesitas subir un documento o tener uno previamente cargado.",
          );
        }
        archivo = await archivoDesdeUrl(documentoExistenteUrl);
      }

      const formData = new FormData();
      formData.append("file", archivo);
      formData.append("expiryDate", expiryDate);
      formData.append("conductorId", conductor.id);

      const response = await fetch(`${API_BASE_URL}/api/conductores/upload-license`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData?.message || errorData?.error || "No se pudo actualizar la licencia.",
        );
      }

      onGuardado?.();
    } catch (err) {
      setError(err.message || "Ocurrió un error al guardar.");
    } finally {
      setLoading(false);
    }
  };

  if (!conductor) return null;

  return (
    <div
      className="lt-modal-overlay"
      onClick={onCancel}
      role="presentation"
      style={{ zIndex: 1100 }}
    >
      <div
        className="lt-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="editar-conductor-title"
      >
        <div className="lt-modal-header">
          <div>
            <div className="lt-modal-header__title" id="editar-conductor-title">
              Editar conductor
            </div>
            <div className="lt-modal-header__sub">
              {conductor.rut || "Conductor"}
            </div>
          </div>
          <button type="button" className="lt-modal-close" onClick={onCancel} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="lt-modal-body">
            {error && (
              <div className="lt-alert-banner lt-alert-banner--error" role="alert">
                {error}
              </div>
            )}

            <div className="lt-field-group">
              <label className="lt-label" htmlFor="editar-conductor-rut">RUT</label>
              <input
                id="editar-conductor-rut"
                type="text"
                className="lt-input"
                value={conductor.rut || ""}
                readOnly
              />
            </div>

            <div className="lt-field-group">
              <label className="lt-label" htmlFor="editar-conductor-telefono">Teléfono</label>
              <input
                id="editar-conductor-telefono"
                type="text"
                className="lt-input"
                value={conductor.telefono || ""}
                readOnly
              />
            </div>

            <div className="lt-field-group">
              <label className="lt-label" htmlFor="editar-conductor-licencia">Número de licencia</label>
              <input
                id="editar-conductor-licencia"
                type="text"
                className="lt-input"
                value={conductor.licencia_numero || ""}
                readOnly
              />
            </div>

            <div className="lt-field-group">
              <label className="lt-label" htmlFor="editar-conductor-vencimiento">Fecha de vencimiento *</label>
              <input
                id="editar-conductor-vencimiento"
                type="date"
                className="lt-input"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="lt-field-group">
              <label className="lt-label" htmlFor="editar-conductor-archivo">
                Documento de licencia {documentoExistenteUrl ? "(opcional)" : ""}
              </label>
              <input
                ref={fileInputRef}
                id="editar-conductor-archivo"
                type="file"
                accept="image/*,application/pdf"
                className="lt-input"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="lt-modal-footer">
            <button
              type="button"
              className="lt-btn lt-btn--secondary"
              onClick={onCancel}
              disabled={loading}
            >
              Cancelar
            </button>
            <button type="submit" className="lt-btn lt-btn--primary" disabled={loading}>
              <Upload size={14} />
              {loading ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>

        {loading && (
          <div className="lt-empty" style={{ paddingBottom: 16 }}>
            <Spinner message="Actualizando licencia..." />
          </div>
        )}
      </div>
    </div>
  );
}
