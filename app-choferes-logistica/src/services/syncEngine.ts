import { bffFetch } from "./bffService";

export type TraceabilityTipo = "EVIDENCIA" | "FICHA_DESPACHO";

export type TraceabilityRecord = {
  id: string;
  /** Carpeta en storage / etapa en API (sin tilde: Transito) */
  etapa: string;
  /** Compatibilidad registros antiguos que usaban `stage` */
  stage?: string;
  tipo?: TraceabilityTipo;
  photoUri: string;
  latitude: number;
  longitude: number;
  timestamp: string;
};

function folderFromRecord(r: TraceabilityRecord): string {
  const raw = (r.etapa || r.stage || "Extra").trim();
  return raw || "Extra";
}

export async function syncTraceabilityRecords(
  records: TraceabilityRecord[],
  rutaIdOpcional?: string,
): Promise<string[]> {
  const rutaTrim = rutaIdOpcional?.trim();
  const syncedIds: string[] = [];

  for (const record of records) {
    const folder = folderFromRecord(record);
    const ext = record.photoUri?.split(".").pop()?.split("?")[0]?.toLowerCase() || "jpg";
    const fileExtension = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
    const filePath = `${folder}/${record.id}.${fileExtension}`;

    const formData = new FormData();
    const contentType = `image/${fileExtension === "jpg" ? "jpeg" : fileExtension}`;
    formData.append(
      "file",
      {
        uri: record.photoUri,
        name: `${record.id}.${fileExtension}`,
        type: contentType,
      } as unknown as Blob,
    );
    formData.append("bucket", "fotos_trazabilidad");
    formData.append("folder", folder);

    const uploadResponse = await bffFetch("/api/storage/upload", {
      method: "POST",
      body: formData,
    });
    const uploadPayload = await uploadResponse.json().catch(() => ({}));
    if (!uploadResponse.ok) {
      throw new Error(uploadPayload?.error ?? "Error subiendo evidencia");
    }

    const eventBody: Record<string, unknown> = {
      id: record.id,
      etapa: folder,
      foto_uri: uploadPayload.filePath,
      latitud: record.latitude,
      longitud: record.longitude,
      timestamp_evento: record.timestamp,
    };
    if (rutaTrim) {
      eventBody.ruta_id = rutaTrim;
    }

    const tipoVal = record.tipo?.trim();
    if (tipoVal) {
      eventBody.tipo = tipoVal;
    }

    const eventResponse = await bffFetch("/api/trazabilidad", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(eventBody),
    });
    const eventPayload = await eventResponse.json().catch(() => ({}));
    if (!eventResponse.ok && eventPayload?.code !== "23505") {
      throw new Error(eventPayload?.error ?? "Error insertando trazabilidad");
    }

    syncedIds.push(record.id);
  }

  return syncedIds;
}
