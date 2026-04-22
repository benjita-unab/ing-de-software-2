import { getSupabaseAdmin } from "@/lib/supabase";
import { jsonResponse, optionsResponse } from "@/lib/http";

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(
  _request: Request,
  context: { params: { id: string } }
) {
  const id = context.params.id;
  const { data, error } = await getSupabaseAdmin()
    .from("rutas")
    .select(
      `
      id,
      origen,
      destino,
      cliente_id,
      clientes ( id, nombre, contacto_email ),
      entregas ( id, validado, firma_url )
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return jsonResponse({ error: error.message }, 500);
  }
  if (!data) {
    return jsonResponse({ error: "Ruta no encontrada" }, 404);
  }

  return jsonResponse(data);
}
