function requireResendApiKey(): string {
  const key = process.env.EXPO_PUBLIC_RESEND_API_KEY;
  if (!key || !String(key).trim()) {
    throw new Error(
      "Falta EXPO_PUBLIC_RESEND_API_KEY en el entorno. Configúrala para enviar correos."
    );
  }
  return String(key).trim();
}

function resolveFromAddress(): string {
  const configured = process.env.EXPO_PUBLIC_RESEND_FROM_EMAIL;
  if (configured && String(configured).trim()) {
    return String(configured).trim();
  }
  return "Sistema Cargas <onboarding@resend.dev>";
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * Envía al cliente un correo formal con el comprobante PDF adjunto (base64 sin prefijo data:).
 * Requiere REACT_APP_RESEND_API_KEY. Opcional: REACT_APP_RESEND_FROM_EMAIL (dominio verificado en Resend).
 *
 * Nota de seguridad: en producción, la API key de Resend no debería exponerse en el bundle del navegador;
 * lo ideal es llamar a Resend desde un backend o Supabase Edge Function.
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

  const limpioBase64 = String(pdfBase64).replace(/^data:application\/pdf;base64,/, "").trim();
  if (!limpioBase64) {
    throw new Error("El PDF en base64 está vacío.");
  }

  const apiKey = requireResendApiKey();
  const nombreSeguro = escapeHtml(nombreCliente);
  const from = resolveFromAddress();

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Comprobante de despacho</title>
</head>
<body style="font-family: Arial, Helvetica, sans-serif; line-height: 1.5; color: #111827;">
  <p>Estimado/a <strong>${nombreSeguro}</strong>,</p>
  <p>
    Le informamos que su despacho ha sido procesado en nuestro
    <strong>Sistema de Seguimiento de Cargas Valiosas</strong>.
  </p>
  <p>
    Adjunto a este mensaje encontrará el <strong>comprobante en formato PDF</strong>
    con el resumen del trayecto, datos del envío y la documentación gráfica disponible.
  </p>
  <p>
    Si tiene alguna consulta, puede responder a este correo o contactar a nuestro equipo de operaciones.
  </p>
  <p style="margin-top: 24px;">Atentamente,<br/>Equipo de Operaciones</p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
  <p style="font-size: 12px; color: #6b7280;">
    Este es un mensaje automático. Por favor no comparta datos sensibles por correo si no conoce el remitente.
  </p>
</body>
</html>
`.trim();

  const payload = {
    from,
    to: destino,
    subject: `Comprobante de despacho – ${nombreCliente}`,
    html,
    attachments: [
      {
        filename: "comprobante-despacho.pdf",
        content: limpioBase64, // base64 SIN prefijo data:...
        contentType: "application/pdf",
      },
    ],
  };

  // Expo móvil (Hermes) - evitar librerías; usar fetch nativo.
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
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
    throw new Error(`Resend no pudo enviar el correo: ${detalle}`);
  }

  if (!responseJson) {
    throw new Error("Resend no devolvió datos de confirmación del envío.");
  }
}
