import { bffFetch } from "./bffService";

export type TraceabilityTipo = "EVIDENCIA" | "FICHA_DESPACHO";

export type TraceabilityRecord = {
  id: string;
  /** Etapa lógica en app (RECEPCION, ENTREGADO, HOJA_DESPACHO, EVIDENCIA_ADICIONAL) o valores legacy */
  etapa: string;
  /** Compatibilidad registros antiguos que usaban `stage` */
  stage?: string;
  tipo?: TraceabilityTipo;
  /** UUID de ruta en almacenamiento local (snake_case) */
  ruta_id?: string;
  /** Alias camelCase en registros locales */
  rutaId?: string;
  photoUri: string;
  latitude: number;
  longitude: number;
  timestamp: string;
};

function sinTildesUpper(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

/**
 * Carpeta dentro del bucket `fotos_trazabilidad` en Storage (nombres legacy).
 * No debe crearse RECEPCION/ENTREGADO/HOJA_DESPACHO en Storage.
 */
export function storageFolderFromEtapa(etapa: string): string {
  const s = (etapa ?? "").trim();
  const upper = sinTildesUpper(s);

  if (upper === "RECEPCION") return "Carga";
  if (upper === "ENTREGADO") return "Entrega";
  if (upper === "HOJA_DESPACHO") return "Ficha";
  if (upper === "EVIDENCIA_ADICIONAL") return "Extra";

  if (upper === "CARGA") return "Carga";
  if (upper === "SALIDA") return "Salida";
  if (upper === "TRANSITO") return "Transito";
  if (upper === "ENTREGA") return "Entrega";
  if (upper === "FICHA") return "Ficha";
  if (upper === "EXTRA") return "Extra";

  return "Carga";
}

/**
 * Etapa canónica para el POST /api/trazabilidad (modelo actual de la app).
 */
function logicalEtapaForApi(r: TraceabilityRecord): string {
  const raw = (r.etapa || r.stage || "").trim();
  if (!raw) return "RECEPCION";
  const upper = sinTildesUpper(raw);

  if (upper === "RECEPCION") return "RECEPCION";
  if (upper === "ENTREGADO") return "ENTREGADO";
  if (upper === "HOJA_DESPACHO") return "HOJA_DESPACHO";
  if (upper === "EVIDENCIA_ADICIONAL") return "EVIDENCIA_ADICIONAL";

  if (
    raw === "Carga" ||
    raw === "Salida" ||
    raw === "Transito" ||
    raw === "Tránsito"
  ) {
    return "RECEPCION";
  }
  if (raw === "Entrega") return "ENTREGADO";
  if (raw === "Ficha") return "HOJA_DESPACHO";
  if (upper === "EXTRA" || raw === "Extra") return "EVIDENCIA_ADICIONAL";

  return "RECEPCION";
}

function storageFolderFromRecord(r: TraceabilityRecord): string {
  return storageFolderFromEtapa(r.etapa || r.stage || "");
}

function resolveRutaId(
  record: TraceabilityRecord,
  rutaIdOpcional?: string,
): string {
  const fromParam = rutaIdOpcional?.trim();
  if (fromParam) return fromParam;
  const fromRecord =
    record.ruta_id?.trim() || record.rutaId?.trim() || "";
  return fromRecord;
}

function resolveTipo(record: TraceabilityRecord, etapaLogica: string): TraceabilityTipo {
  const explicit = record.tipo?.trim();
  if (explicit === "FICHA_DESPACHO" || explicit === "EVIDENCIA") {
    return explicit;
  }
  if (etapaLogica === "HOJA_DESPACHO") return "FICHA_DESPACHO";
  return "EVIDENCIA";
}

export async function syncTraceabilityRecords(
  records: TraceabilityRecord[],
  rutaIdOpcional?: string,
): Promise<string[]> {
  const syncedIds: string[] = [];

  for (const record of records) {
    const folder = storageFolderFromRecord(record);
    const etapaLogica = logicalEtapaForApi(record);
    const rutaId = resolveRutaId(record, rutaIdOpcional);
    const tipo = resolveTipo(record, etapaLogica);
    const ext =
      record.photoUri?.split(".").pop()?.split("?")[0]?.toLowerCase() || "jpg";
    const fileExtension = ["jpg", "jpeg", "png", "webp"].includes(ext)
      ? ext
      : "jpg";

    const formData = new FormData();
    const contentType = `image/${
      fileExtension === "jpg" ? "jpeg" : fileExtension
    }`;
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

    const payload: Record<string, unknown> = {
      id: record.id,
      etapa: etapaLogica,
      tipo,
      foto_uri: uploadPayload.filePath,
      latitud: record.latitude,
      longitud: record.longitude,
      timestamp_evento: record.timestamp,
    };
    if (rutaId) {
      payload.ruta_id = rutaId;
    } else {
      console.warn(
        "SYNC TRAZABILIDAD -> evidencia sin ruta_id (param ni registro local):",
        record.id,
        etapaLogica,
      );
    }

    console.log("BODY TRAZABILIDAD:", payload);

    const eventResponse = await bffFetch("/api/trazabilidad", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const eventPayload = await eventResponse.json().catch(() => ({}));
    if (!eventResponse.ok && eventPayload?.code !== "23505") {
      throw new Error(eventPayload?.error ?? "Error insertando trazabilidad");
    }

    syncedIds.push(record.id);
  }

  return syncedIds;
}
