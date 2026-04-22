import { getResendApiKey, getResendFromEmail } from "@/lib/env";
import { jsonResponse, optionsResponse } from "@/lib/http";

export async function OPTIONS() {
  return optionsResponse();
}

export async function POST(request: Request) {
  const resendApiKey = getResendApiKey();
  if (!resendApiKey) {
    return jsonResponse({ error: "RESEND_API_KEY no está configurada" }, 500);
  }

  const body = await request.json().catch(() => null);
  console.log("POST /api/email/enviar-qr body:", body);
  const email = String(body?.email ?? "").trim();
  const clienteId = String(body?.clienteId ?? "").trim();
  const idEntrega = String(body?.idEntrega ?? clienteId).trim();
  const nombreCliente = String(body?.nombreCliente ?? "Cliente").trim();

  if (!email || !clienteId) {
    return jsonResponse({ error: "email y clienteId son obligatorios" }, 400);
  }

  const qrData = `https://mi-app.com/entrega/${idEntrega}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;
  console.log("QR generado:", qrUrl);
  console.log("Email destino:", email);
  console.log("QR URL:", qrUrl);

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; color: #111827;">
      <h2>QR Entrega</h2>
      <p>Hola ${nombreCliente}</p>
      <p>Escanea este código para validar la entrega:</p>
      <img src="${qrUrl}" alt="QR Code" style="width:200px;height:200px;" />
      <p>Si no ves el QR, abre este link:</p>
      <a href="${qrData}">${qrData}</a>
      <p>LogiTrack</p>
    </div>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: getResendFromEmail() || "LogiTrack <onboarding@resend.dev>",
      to: email,
      subject: `Código QR para entrega - ${nombreCliente}`,
      html: htmlContent
    })
  });

  const payload = await response.json().catch(() => ({}));
  console.log("Respuesta Resend /email/enviar-qr:", {
    status: response.status,
    ok: response.ok,
    payload
  });
  if (!response.ok) {
    return jsonResponse({ error: payload?.message ?? "Error al enviar email" }, 502);
  }

  return jsonResponse({ ok: true, provider: payload });
}
