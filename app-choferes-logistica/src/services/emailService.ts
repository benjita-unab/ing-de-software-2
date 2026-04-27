import { getAccessToken, bffFetch } from "./bffService";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001";



function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * Sends a formal email to the client with the PDF receipt (base64 without data: prefix).
 * Now uses backend API instead of direct Resend access.
 *
 * Security note: Never expose API keys in client bundles. All email operations
 * go through the backend API with JWT authentication.
 */
export async function enviarComprobanteEmail(
  emailCliente: string,
  pdfBase64: string,
  nombreCliente: string
): Promise<void> {
  const destino = String(emailCliente).trim();
  if (!destino) {
    throw new Error("El correo del cliente está vacío.");
  }

  const limpioBase64 = String(pdfBase64)
    .replace(/^data:application\/pdf;base64,/, "")
    .trim();
  if (!limpioBase64) {
    throw new Error("El PDF en base64 está vacío.");
  }

  const token = await getAccessToken();
  if (!token) {
    throw new Error("No authentication token found. Please log in.");
  }

  const payload = {
    email: destino,
    pdfBase64: limpioBase64,
    nombreCliente: escapeHtml(nombreCliente),
  };

  // Call backend API instead of Resend directly
  const response = await fetch(`${API_BASE_URL}/api/emails/send-receipt`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  let responseJson: any = null;
  try {
    responseJson = await response.json();
  } catch {
    responseJson = null;
  }

  if (!response.ok) {
    const detalle =
      responseJson?.error?.message ||
      responseJson?.message ||
      responseJson?.errors?.[0]?.message ||
      JSON.stringify(responseJson ?? {});
    throw new Error(`Backend error sending email: ${detalle}`);
  }

  if (!responseJson) {
    throw new Error("Backend did not return confirmation data.");
  }
}

export async function enviarCorreoQRCliente(
  emailCliente: string,
  nombreCliente: string,
  clienteId: string
): Promise<void> {
  const destino = String(emailCliente).trim();
  if (!destino) {
    throw new Error('El correo del cliente está vacío.');
  }

  // Delegates to backend — Resend API key never touches the mobile bundle.
  const response = await bffFetch("/api/email/enviar-qr", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: destino,
      clienteId,
      nombreCliente,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.error ?? "No se pudo enviar el QR al cliente");
  }
}
