import { getSupabaseAdmin } from "@/lib/supabase";
import { jsonResponse, optionsResponse } from "@/lib/http";

export async function OPTIONS() {
  return optionsResponse();
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const payload = {
    ruta_id: String(body?.ruta_id ?? "").trim(),
    cliente_id: String(body?.cliente_id ?? "").trim(),
    direccion: String(body?.direccion ?? "").trim(),
    estado: String(body?.estado ?? "pendiente"),
    codigo_otp: String(body?.codigo_otp ?? "").trim()
  };

  if (!payload.ruta_id || !payload.cliente_id || !payload.direccion || !payload.codigo_otp) {
    return jsonResponse({ error: "Payload incompleto para crear entrega" }, 400);
  }

  const { data, error } = await getSupabaseAdmin()
    .from("entregas")
    .insert(payload)
    .select("id, ruta_id, codigo_otp")
    .single();

  if (error) {
    return jsonResponse({ error: error.message }, 500);
  }
  return jsonResponse(data);
}
