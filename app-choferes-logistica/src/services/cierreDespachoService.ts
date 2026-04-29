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
  const response = await bffFetch(`/api/entregas/${id}/close`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clienteEmail: email,
    })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    // NestJS responde { statusCode, message, error: "Internal Server Error" }.
    // El mensaje útil está en `message`, no en `error` (que es el genérico).
    const mensaje =
      payload?.message ||
      payload?.error ||
      `No se pudo cerrar despacho (HTTP ${response.status})`;
    throw new Error(String(mensaje));
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

  const uploadResponse = await bffFetch(`/api/entregas/${rutaId}/signature`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base64Signature: dataUri }),
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

  const routeResponse = await bffFetch(`/api/rutas/${id}`, { method: "GET" });
  const routePayload = await routeResponse.json().catch(() => ({}));
  const clienteNombre = routePayload?.clientes?.nombre ?? "Cliente de Prueba";
  const clienteId = routePayload?.cliente_id ?? "test-client-123";

  // Correo forzado a peticion del usuario
  const correoForzado = 'oyanadelbastian5@gmail.com';

  // Mandamos `rutaId` para que el backend genere el QR con
  // {ruta_id, codigo_otp} en JSON. Sin esto el QR vendría con el
  // clienteId crudo y el scanner mobile diría "QR no corresponde".
  const emailResponse = await bffFetch("/api/email/enviar-qr", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: correoForzado,
      clienteId,
      nombreCliente: clienteNombre,
      rutaId: id,
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

