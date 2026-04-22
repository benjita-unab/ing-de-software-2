import { getSupabaseAdmin } from "@/lib/supabase";
import { jsonResponse, optionsResponse } from "@/lib/http";

export async function OPTIONS() {
  return optionsResponse();
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const id = String(body?.id ?? "").trim();
  const etapa = String(body?.etapa ?? "").trim();
  const fotoUri = String(body?.foto_uri ?? "").trim();
  const latitud = Number(body?.latitud);
  const longitud = Number(body?.longitud);
  const timestamp = String(body?.timestamp_evento ?? new Date().toISOString());

  if (!id || !etapa || !fotoUri || Number.isNaN(latitud) || Number.isNaN(longitud)) {
    return jsonResponse({ error: "Payload incompleto para trazabilidad" }, 400);
  }

  const { data, error } = await getSupabaseAdmin()
    .from("traceability_events")
    .insert([
      {
        id,
        etapa,
        foto_uri: fotoUri,
        latitud,
        longitud,
        timestamp_evento: timestamp
      }
    ])
    .select("id")
    .single();

  if (error) {
    return jsonResponse({ error: error.message, code: error.code }, 500);
  }

  return jsonResponse({ id: data.id });
}
