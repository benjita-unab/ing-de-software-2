import { bffFetch } from "./bffService";

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

  const email = "oyanadelbastian5@gmail.com";
  const response = await bffFetch("/api/dispatch/close", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      rutaId: id,
      email,
      nombreCliente: "Cliente"
    })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error ?? "No se pudo cerrar despacho");
  }

  return {
    emailEnviadoA: String(email).trim(),
    rutaId: id,
    nombreCliente: "Cliente",
  };
}

export async function guardarFirmaEnSupabase(rutaId: string, base64Signature: string) {
  const dataUri = String(base64Signature || "");
  if (!dataUri.trim()) return;
  const response = await fetch(dataUri);
  const blob = await response.blob();
  const formData = new FormData();
  formData.append("file", blob, `${rutaId}-${Date.now()}.png`);
  formData.append("bucket", "fotos_trazabilidad");
  formData.append("folder", "firmas");

  const uploadResponse = await bffFetch("/api/storage/upload", {
    method: "POST",
    body: formData
  });
  if (!uploadResponse.ok) {
    const payload = await uploadResponse.json().catch(() => ({}));
    console.warn("No se pudo subir la firma.", payload?.error ?? "error");
  }
}

export async function enviarQRPrevio(rutaId: string): Promise<CierreDespachoResultado> {
  const id = String(rutaId).trim();
  if (!id) {
    throw new Error('rutaId es obligatorio.');
  }

  const routeResponse = await bffFetch(`/api/routes/${id}`, { method: "GET" });
  const routePayload = await routeResponse.json().catch(() => ({}));
  const clienteNombre = routePayload?.clientes?.nombre ?? "Cliente de Prueba";
  const clienteId = routePayload?.cliente_id ?? "test-client-123";

  // Correo forzado a peticion del usuario
  const correoForzado = 'oyanadelbastian5@gmail.com';

  const emailResponse = await bffFetch("/api/email/enviar-qr", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: correoForzado,
      clienteId,
      nombreCliente: clienteNombre
    })
  });
  if (!emailResponse.ok) {
    const payload = await emailResponse.json().catch(() => ({}));
    throw new Error(payload?.error ?? "No se pudo enviar QR");
  }

  return {
    emailEnviadoA: correoForzado,
    rutaId: id,
    nombreCliente: clienteNombre,
  };
}

