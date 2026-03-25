import { useState } from "react";
import { cerrarDespachoYEnviarComprobante } from "../services/cierreDespachoService";

export type BotonCerrarDespachoProps = {
  rutaId: string;
  className?: string;
  etiquetaListo?: string;
};

export function BotonCerrarDespacho({
  rutaId,
  className,
  etiquetaListo = "Cerrar despacho y enviar comprobante",
}: BotonCerrarDespachoProps) {
  const [cargando, setCargando] = useState(false);

  async function manejarClic(): Promise<void> {
    if (cargando) return;
    setCargando(true);
    try {
      const resultado = await cerrarDespachoYEnviarComprobante(rutaId);
      window.alert(
        `Éxito: comprobante enviado a ${resultado.emailEnviadoA}. La entrega quedó marcada como validada.`
      );
    } catch (err) {
      const mensaje =
        err instanceof Error ? err.message : "Ocurrió un error inesperado.";
      window.alert(`Error: ${mensaje}`);
    } finally {
      setCargando(false);
    }
  }

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        void manejarClic();
      }}
      disabled={cargando || !String(rutaId).trim()}
      style={{
        padding: "10px 16px",
        fontWeight: 600,
        cursor: cargando ? "wait" : "pointer",
        opacity: cargando ? 0.85 : 1,
      }}
    >
      {cargando ? "Cargando..." : etiquetaListo}
    </button>
  );
}
