import React, { useState } from 'react';
/**
 * Componente LicenseUploadForm
 * 
 * Renderiza un formulario para la carga de documentos de licencias de conducir
 * incluyendo la copia digital y su fecha de vencimiento.
 * 
 * Características:
 * - File upload para documentos (PDF, JPG, PNG)
 * - Date input para fecha de vencimiento
 * - Validaciones de formulario
 * - Diseño Bootstrap 5
 * - Integración preparada para Supabase
 */
const LicenseUploadForm = () => {
  // ==================== ESTADOS ====================
  const [file, setFile] = useState(null);
  const [expiryDate, setExpiryDate] = useState('');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // ==================== CONSTANTES ====================
  const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
  const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  // ==================== VALIDACIONES ====================
  /**
   * Valida el archivo seleccionado
   * @param {File} selectedFile - Archivo a validar
   * @returns {Object} Objeto con validación y mensaje de error
   */
  const validateFile = (selectedFile) => {
    if (!selectedFile) {
      return { isValid: false, error: 'Debes seleccionar un archivo' };
    }

    // Validar tipo de archivo
    if (!ALLOWED_FILE_TYPES.includes(selectedFile.type)) {
      return { 
        isValid: false, 
        error: 'Formato no permitido. Acepta: PDF, JPG, PNG' 
      };
    }

    // Validar tamaño de archivo
    if (selectedFile.size > MAX_FILE_SIZE) {
      return { 
        isValid: false, 
        error: 'El archivo excede 5MB. Por favor, selecciona un archivo más pequeño' 
      };
    }

    return { isValid: true, error: null };
  };

  /**
   * Valida la fecha de vencimiento
   * @param {string} date - Fecha a validar
   * @returns {Object} Objeto con validación y mensaje de error
   */
  const validateExpiryDate = (date) => {
    if (!date) {
      return { isValid: false, error: 'Debes seleccionar una fecha de vencimiento' };
    }

    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      return { 
        isValid: false, 
        error: 'La fecha debe ser posterior a hoy' 
      };
    }

    return { isValid: true, error: null };
  };

  // ==================== MANEJADORES DE EVENTOS ====================
  /**
   * Maneja el cambio del input de archivo
   */
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);

    // Validar archivo
    const fileValidation = validateFile(selectedFile);
    const newErrors = { ...errors };

    if (fileValidation.isValid) {
      delete newErrors.file;
    } else {
      newErrors.file = fileValidation.error;
    }

    setErrors(newErrors);
    setSuccessMessage('');
  };

  /**
   * Maneja el cambio del input de fecha
   */
  const handleDateChange = (e) => {
    const date = e.target.value;
    setExpiryDate(date);

    // Validar fecha
    const dateValidation = validateExpiryDate(date);
    const newErrors = { ...errors };

    if (dateValidation.isValid) {
      delete newErrors.expiryDate;
    } else {
      newErrors.expiryDate = dateValidation.error;
    }

    setErrors(newErrors);
    setSuccessMessage('');
  };

  /**
   * Valida el formulario completo
   * @returns {boolean} true si el formulario es válido
   */
  const validateForm = () => {
    const newErrors = {};

    const fileValidation = validateFile(file);
    if (!fileValidation.isValid) {
      newErrors.file = fileValidation.error;
    }

    const dateValidation = validateExpiryDate(expiryDate);
    if (!dateValidation.isValid) {
      newErrors.expiryDate = dateValidation.error;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Función principal para manejar el envío del formulario
   * 
   * TODO: Implementar la integración con Supabase:
   * 
   * 1. SUBIR ARCHIVO A STORAGE:
   *    - Usar: supabaseClient.storage.from('driver_licenses').upload(...)
   *    - Estructura de ruta sugerida: licenses/{userId}/{fileName}_${timestamp}
   *    - Obtener URL pública después de subir
   * 
   * 2. GUARDAR DATOS EN BD:
   *    - Usar: supabaseClient.from('driver_licenses').insert(...)
   *    - Campos sugeridos:
   *      {
   *        user_id: currentUserId,
   *        file_url: publicUrl,
   *        file_name: file.name,
   *        expiry_date: expiryDate,
   *        uploaded_at: new Date().toISOString(),
   *        status: 'pending_review'
   *      }
   * 
   * 3. MANEJO DE ERRORES:
   *    - Capturar errores de Supabase
   *    - Mostrar mensajes de error al usuario
   *    - Mantener el estado isLoading durante la operación
   */
  const handleUpload = async (e) => {
    e.preventDefault();

    // Validar formulario
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('logitrack_access_token');
      if (!token) {
        throw new Error('Token de autorización no disponible. Inicia sesión de nuevo.');
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('expiryDate', expiryDate);

      const response = await fetch('/api/conductores/upload-license', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const responseBody = await response.json().catch(() => null);

      if (!response.ok) {
        const message = responseBody?.message || responseBody?.error || 'Error al subir la licencia';
        throw new Error(message);
      }

      setSuccessMessage(`¡Archivo "${file.name}" cargado exitosamente en el sistema!`);

      // Resetear formulario para que quede limpio
      setFile(null);
      setExpiryDate('');
      setErrors({});

      // Limpiar el input de tipo file visualmente
      const fileInput = document.getElementById('licenseFileInput');
      if (fileInput) fileInput.value = '';

    } catch (error) {
      console.error('Error en handleUpload:', error);
      setErrors({
        submit: error?.message || 'Error al procesar la solicitud. Intenta nuevamente.'
      });
    } finally {
      // Pase lo que pase (éxito o error), apagamos el estado de carga
      setIsLoading(false);
    }
  };

  // ==================== CÁLCULO DE ESTADO DEL BOTÓN ====================
  const isSubmitDisabled = !file || !expiryDate || isLoading || Object.keys(errors).length > 0;
 
  // ==================== RENDER ====================
  return (
    <div className="container mt-5 mb-5">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card shadow-sm">
            {/* Header del Card */}
            <div className="card-header bg-primary text-white">
              <h5 className="card-title mb-0">
                <i className="bi bi-file-earmark-pdf"></i> Carga de Licencia de Conducir
              </h5>
            </div>

            {/* Body del Card */}
            <div className="card-body">
              {/* Mensaje de Error General */}
              {errors.submit && (
                <div className="alert alert-danger alert-dismissible fade show" role="alert">
                  <strong>Error:</strong> {errors.submit}
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setErrors({ ...errors, submit: null })}
                  />
                </div>
              )}

              {/* Mensaje de Éxito */}
              {successMessage && (
                <div className="alert alert-success alert-dismissible fade show" role="alert">
                  <strong>¡Éxito!</strong> {successMessage}
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setSuccessMessage('')}
                  />
                </div>
              )}

              {/* Formulario */}
              <form onSubmit={handleUpload}>
                {/* Input de Archivo */}
                <div className="mb-3">
                  <label htmlFor="licenseFileInput" className="form-label">
                    Copia Digital de Licencia <span className="text-danger">*</span>
                  </label>
                  <input
                    type="file"
                    className={`form-control ${errors.file ? 'is-invalid' : ''}`}
                    id="licenseFileInput"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    disabled={isLoading}
                  />
                  <small className="form-text text-muted d-block mt-2">
                    Formatos aceptados: PDF, JPG, PNG (máximo 5MB)
                  </small>
                  {errors.file && (
                    <div className="invalid-feedback d-block mt-2">
                      <i className="bi bi-exclamation-circle"></i> {errors.file}
                    </div>
                  )}
                  {file && !errors.file && (
                    <div className="text-success mt-2 small">
                      <i className="bi bi-check-circle"></i> Archivo seleccionado: {file.name}
                    </div>
                  )}
                </div>

                {/* Input de Fecha de Vencimiento */}
                <div className="mb-4">
                  <label htmlFor="expiryDateInput" className="form-label">
                    Fecha de Vencimiento <span className="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    className={`form-control ${errors.expiryDate ? 'is-invalid' : ''}`}
                    id="expiryDateInput"
                    value={expiryDate}
                    onChange={handleDateChange}
                    disabled={isLoading}
                  />
                  {errors.expiryDate && (
                    <div className="invalid-feedback d-block mt-2">
                      <i className="bi bi-exclamation-circle"></i> {errors.expiryDate}
                    </div>
                  )}
                  {expiryDate && !errors.expiryDate && (
                    <div className="text-success mt-2 small">
                      <i className="bi bi-check-circle"></i> Fecha válida: {new Date(expiryDate).toLocaleDateString('es-ES')}
                    </div>
                  )}
                </div>

                {/* Botón de Envío */}
                <button
                  type="submit"
                  className="btn btn-primary w-100"
                  disabled={isSubmitDisabled}
                >
                  {isLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                      Cargando...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-cloud-upload"></i> Guardar Licencia
                    </>
                  )}
                </button>

                {/* Indicador de Validación */}
                <small className="form-text text-muted d-block mt-3 text-center">
                  <span className="text-danger">*</span> Campos requeridos
                </small>
              </form>
            </div>

            {/* Footer del Card - Información adicional */}
            <div className="card-footer bg-light text-muted small">
              <i className="bi bi-info-circle"></i> Los documentos se almacenan de forma segura en nuestros servidores.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LicenseUploadForm;
