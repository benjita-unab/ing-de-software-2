import { getSupabaseAdmin } from "@/lib/supabase";
import { getSupabaseStorageBucket } from "@/lib/env";
import { jsonResponse, optionsResponse } from "@/lib/http";

export async function OPTIONS() {
  return optionsResponse();
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const bucket = String(formData.get("bucket") ?? getSupabaseStorageBucket());
  const folder = String(formData.get("folder") ?? "evidencias");

  if (!(file instanceof File)) {
    return jsonResponse({ error: "Debes enviar file en multipart/form-data" }, 400);
  }

  console.log("Archivo recibido:", file?.name);
  console.log("Tipo:", file?.type);
  console.log("Size:", file?.size);

  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = file.name.replace(/\s+/g, "_");
  const filePath = `${folder}/${Date.now()}-${safeName}`;

  const { data, error } = await getSupabaseAdmin()
    .storage
    .from(bucket)
    .upload(filePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: true
    });

  console.log("Resultado upload:", data, error);

  if (error) {
    console.error("Error subiendo a Supabase:", error);
    return jsonResponse(
      { error: "Error subiendo evidencia", detail: error.message },
      500
    );
  }

  const publicUrl = getSupabaseAdmin()
    .storage
    .from(bucket)
    .getPublicUrl(data.path).data.publicUrl;

  return jsonResponse({
    bucket,
    filePath: data.path,
    publicUrl
  });
}
