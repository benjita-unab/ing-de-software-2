import { getSupabaseAdmin } from "@/lib/supabase";
import { getResendApiKey, getResendFromEmail } from "@/lib/env";
import { jsonResponse, optionsResponse } from "@/lib/http";
import { buildDispatchPdfBase64 } from "@/lib/pdf";

export async function OPTIONS() {
  return optionsResponse();
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const rutaId = String(body?.rutaId ?? "").trim();
  const email = String(body?.email ?? "").trim();
  const nombreCliente = String(body?.nombreCliente ?? "Cliente").trim();

  if (!rutaId) {
    return jsonResponse({ error: "rutaId es obligatorio" }, 400);
  }

  const { data: entregas, error: routeError } = await getSupabaseAdmin()
    .from("entregas")
    .select("id, validado")
    .eq("ruta_id", rutaId);

  if (routeError) {
    return jsonResponse({ error: routeError.message }, 500);
  }
  if (!entregas || entregas.length === 0) {
    return jsonResponse({ error: "No hay entregas para la ruta enviada" }, 404);
  }

  const { data: updatedRows, error: updateError } = await getSupabaseAdmin()
    .from("entregas")
    .update({ validado: true })
    .eq("ruta_id", rutaId)
    .select("id");

  if (updateError) {
    return jsonResponse({ error: updateError.message }, 500);
  }

  let emailResult: unknown = null;
  const resendApiKey = getResendApiKey();
  if (email && resendApiKey) {
    const pdfBase64 = await buildDispatchPdfBase64({
      rutaId,
      nombreCliente,
      fechaIso: new Date().toISOString()
    });

    const qrResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: getResendFromEmail() || "LogiTrack <onboarding@resend.dev>",
        to: email,
        subject: `Comprobante de despacho - ${rutaId}`,
        html: `<p>Hola ${nombreCliente}, tu despacho fue cerrado exitosamente.</p><p>Ruta: ${rutaId}</p>`,
        attachments: [
          {
            filename: `comprobante-${rutaId}.pdf`,
            content: pdfBase64,
            contentType: "application/pdf"
          }
        ]
      })
    });
    emailResult = await qrResponse.json().catch(() => ({}));
  }

  return jsonResponse({
    rutaId,
    updatedCount: updatedRows?.length ?? 0,
    emailResult
  });
}
