import { supabase } from "../lib/supabaseClient";
import { enviarComprobanteEmail } from "./emailService";
import { generarComprobantePDF } from "./pdfService";

export type CierreDespachoResultado = {
  emailEnviadoA: string;
  rutaId: string;
  nombreCliente: string;
};

/**
 * Orquesta el cierre: genera PDF, envía correo al cliente y marca la entrega como validada.
 */
export async function cerrarDespachoYEnviarComprobante(
  rutaId: string
): Promise<CierreDespachoResultado> {
  const id = String(rutaId).trim();
  if (!id) {
    throw new Error("rutaId es obligatorio.");
  }

  const pdf = await generarComprobantePDF(id);
  const email = pdf.cliente.contacto_email;

  if (!email || !String(email).trim()) {
    throw new Error(
      "El cliente no tiene un correo electrónico registrado (contacto_email). No se puede enviar el comprobante."
    );
  }

  await enviarComprobanteEmail(
    String(email).trim(),
    pdf.base64,
    pdf.cliente.nombre
  );

  const { data: actualizadas, error: updateError } = await supabase
    .from("entregas")
    .update({ validado: true })
    .eq("ruta_id", id)
    .select("id");

  if (updateError) {
    throw new Error(
      `El correo se envió, pero no se pudo marcar la entrega como validada: ${updateError.message}`
    );
  }

  if (!actualizadas || actualizadas.length === 0) {
    throw new Error(
      "El correo se envió, pero no existe ningún registro en entregas con ese ruta_id para actualizar validado."
    );
  }

  return {
    emailEnviadoA: String(email).trim(),
    rutaId: id,
    nombreCliente: pdf.cliente.nombre,
  };
}
