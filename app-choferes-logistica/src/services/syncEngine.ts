import AsyncStorage from '@react-native-async-storage/async-storage';
import { bffFetch } from "./bffService";

export type TraceabilityTipo = "EVIDENCIA" | "FICHA_DESPACHO";

export type TraceabilityRecord = {
  id: string;
  /** Etapa lógica en app (RECEPCION, ENTREGADO, HOJA_DESPACHO, EVIDENCIA_ADICIONAL) o valores legacy */
  etapa: string;
  /** Compatibilidad registros antiguos que usaban `stage` */
  stage?: string;
  tipo?: TraceabilityTipo;
  photoUri: string;
  latitude: number;
  longitude: number;
  timestamp: string;
};

<<<<<<< Updated upstream
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
=======
export type TiemposInspeccionRecord = {
  id: string; // Para identificar encolado único (ej: uuid o timestamp)
  rutaId: string;
  hora_llegada_destino?: string;
  hora_inspeccion_aprobada?: string;
};

const STORAGE_TIEMPOS_QUEUE = 'logitrack_tiempos_queue';

export async function encolarTiempoInspeccion(record: TiemposInspeccionRecord) {
  try {
    const arrStr = await AsyncStorage.getItem(STORAGE_TIEMPOS_QUEUE);
    const arr: TiemposInspeccionRecord[] = arrStr ? JSON.parse(arrStr) : [];
    arr.push(record);
    await AsyncStorage.setItem(STORAGE_TIEMPOS_QUEUE, JSON.stringify(arr));
  } catch (err) {
    console.error('Error encolando tiempo de inspección', err);
  }
}

export async function syncTiemposInspeccion(): Promise<void> {
  try {
    const arrStr = await AsyncStorage.getItem(STORAGE_TIEMPOS_QUEUE);
    if (!arrStr) return;
    const arr: TiemposInspeccionRecord[] = JSON.parse(arrStr);
    
    const failed: TiemposInspeccionRecord[] = [];
    
    for (const record of arr) {
      try {
        const payload: any = {};
        if (record.hora_llegada_destino) payload.hora_llegada_destino = record.hora_llegada_destino;
        if (record.hora_inspeccion_aprobada) payload.hora_inspeccion_aprobada = record.hora_inspeccion_aprobada;
        
        const res = await bffFetch(`/api/rutas/${record.rutaId}/tiempos`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        
        if (!res.ok) {
          throw new Error('Error HTTP ' + res.status);
        }
      } catch (e) {
        failed.push(record);
      }
    }
    
    if (failed.length > 0) {
      await AsyncStorage.setItem(STORAGE_TIEMPOS_QUEUE, JSON.stringify(failed));
    } else {
      await AsyncStorage.removeItem(STORAGE_TIEMPOS_QUEUE);
    }
  } catch (err) {
    console.error('Error sincronizando tiempos de inspección', err);
  }
>>>>>>> Stashed changes
}

export async function syncTraceabilityRecords(
  records: TraceabilityRecord[],
  rutaIdOpcional?: string,
): Promise<string[]> {
  const rutaTrim = rutaIdOpcional?.trim();
  const syncedIds: string[] = [];

  for (const record of records) {
    const folder = storageFolderFromRecord(record);
    const etapaLogica = logicalEtapaForApi(record);
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

    const eventBody: Record<string, unknown> = {
      id: record.id,
      etapa: etapaLogica,
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
