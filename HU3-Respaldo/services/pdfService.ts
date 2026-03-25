import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "../lib/supabaseClient";

export type ClienteResumen = {
  nombre: string;
  contacto_email: string | null;
};

export type ComprobantePDFResult = {
  blob: Blob;
  base64: string;
  cliente: ClienteResumen;
  rutaId: string;
};

type EntregaRow = {
  id: string;
  firma_url: string | null;
  validado: boolean | null;
};

type FotoRow = {
  id: string;
  etapa: string;
  url: string | null;
};

type ClienteRow = {
  id: string;
  nombre: string;
  contacto_email: string | null;
};

type RutaQueryRow = {
  id: string;
  origen: string;
  destino: string;
  cliente_id: string;
  clientes: ClienteRow | ClienteRow[] | null;
  entregas: EntregaRow | EntregaRow[] | null;
  fotos: FotoRow | FotoRow[] | null;
};

function normalizeRelation<T>(value: T | T[] | null | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = () =>
      reject(reader.error ?? new Error("No se pudo leer la imagen."));
    reader.readAsDataURL(blob);
  });
}

async function convertBlobToJpegBase64(blob: Blob): Promise<string | null> {
  try {
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close?.();
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    const parts = dataUrl.split(",");
    return parts.length > 1 ? parts[1]! : null;
  } catch {
    return null;
  }
}

/**
 * Descarga una imagen por URL y la prepara para jsPDF.
 * Si falla (CORS, 404, URL vacía), retorna null sin lanzar.
 */
async function cargarImagenParaPdf(
  url: string | null | undefined
): Promise<{ data: string; format: "JPEG" | "PNG" } | null> {
  if (!url || !String(url).trim()) return null;
  try {
    const response = await fetch(String(url).trim(), {
      method: "GET",
      mode: "cors",
      cache: "no-store",
    });
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!blob || blob.size === 0) return null;

    const mime = (blob.type || "").toLowerCase();

    if (mime.includes("webp") || mime.includes("gif")) {
      const jpegB64 = await convertBlobToJpegBase64(blob);
      return jpegB64 ? { data: jpegB64, format: "JPEG" } : null;
    }

    const dataUrl = await blobToDataUrl(blob);
    const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1]! : dataUrl;

    if (mime.includes("png")) {
      return { data: base64, format: "PNG" };
    }

    if (mime.includes("jpeg") || mime.includes("jpg")) {
      return { data: base64, format: "JPEG" };
    }

    const jpegB64 = await convertBlobToJpegBase64(blob);
    return jpegB64 ? { data: jpegB64, format: "JPEG" } : null;
  } catch {
    return null;
  }
}

function formatFechaHora(): string {
  try {
    return new Intl.DateTimeFormat("es", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(new Date());
  } catch {
    return new Date().toISOString();
  }
}

function asegurarEspacio(
  doc: jsPDF,
  yActual: number,
  altoNecesario: number,
  margenInferior: number
): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (yActual + altoNecesario > pageHeight - margenInferior) {
    doc.addPage();
    return 20;
  }
  return yActual;
}

async function dibujarImagenOTexto(
  doc: jsPDF,
  x: number,
  y: number,
  maxAncho: number,
  maxAlto: number,
  url: string | null | undefined,
  etiqueta: string
): Promise<number> {
  const cargada = await cargarImagenParaPdf(url);
  if (!cargada) {
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text(`${etiqueta}: Imagen no disponible`, x, y + 6);
    doc.setTextColor(0, 0, 0);
    return y + 14;
  }

  let imgAncho = maxAncho;
  let imgAlto = maxAlto;
  try {
    doc.addImage(cargada.data, cargada.format, x, y, imgAncho, imgAlto);
  } catch {
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text(`${etiqueta}: Imagen no disponible`, x, y + 6);
    doc.setTextColor(0, 0, 0);
    return y + 14;
  }

  return y + imgAlto + 8;
}

/**
 * Consulta Supabase y genera el comprobante PDF del despacho para una ruta.
 * Retorna blob + base64 (para adjuntar en correo) y datos mínimos del cliente.
 */
export async function generarComprobantePDF(
  rutaId: string
): Promise<ComprobantePDFResult> {
  if (!rutaId || !String(rutaId).trim()) {
    throw new Error("rutaId es obligatorio.");
  }

  const { data, error } = await supabase
    .from("rutas")
    .select(
      `
        id,
        origen,
        destino,
        cliente_id,
        clientes ( id, nombre, contacto_email ),
        entregas ( id, firma_url, validado ),
        fotos ( id, etapa, url )
      `
    )
    .eq("id", rutaId)
    .maybeSingle();

  if (error) {
    throw new Error(`Error al obtener datos de la ruta: ${error.message}`);
  }

  if (!data) {
    throw new Error(`No se encontró la ruta con id "${rutaId}".`);
  }

  const row = data as unknown as RutaQueryRow;
  const clientesRel = normalizeRelation(row.clientes);
  const cliente = clientesRel[0];

  if (!cliente) {
    throw new Error("La ruta no tiene un cliente asociado en la base de datos.");
  }

  const entregasRel = normalizeRelation(row.entregas);
  const primeraEntrega = entregasRel[0];
  const firmaUrl = primeraEntrega?.firma_url ?? null;

  const fotosRel = normalizeRelation(row.fotos).slice();
  fotosRel.sort((a, b) =>
    String(a.etapa).localeCompare(String(b.etapa), "es", {
      numeric: true,
      sensitivity: "base",
    })
  );

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  const contentW = pageWidth - margin * 2;
  let y = 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Comprobante de despacho", margin, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Generado: ${formatFechaHora()}`, margin, y);
  y += 10;

  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  const tablaResumen: (string | number)[][] = [
    ["ID de ruta", row.id],
    ["Cliente", cliente.nombre],
    ["Correo de contacto", cliente.contacto_email ?? "—"],
    ["Origen", row.origen ?? "—"],
    ["Destino", row.destino ?? "—"],
    [
      "Estado validación (entrega)",
      primeraEntrega
        ? primeraEntrega.validado
          ? "Validado"
          : "Pendiente"
        : "Sin registro de entrega",
    ],
  ];

  autoTable(doc, {
    startY: y,
    head: [["Concepto", "Detalle"]],
    body: tablaResumen,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [41, 98, 255], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 45 },
      1: { cellWidth: contentW - 45 },
    },
    margin: { left: margin, right: margin },
    theme: "striped",
  });

  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
    ?.finalY
    ? (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable
        .finalY + 12
    : y + 40;

  y = asegurarEspacio(doc, y, 14, margin);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Evidencias fotográficas por etapa", margin, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  const altoBloqueFoto = 45;
  const anchoFoto = Math.min(contentW, 90);

  if (fotosRel.length === 0) {
    doc.setTextColor(120, 120, 120);
    doc.text("No hay fotos registradas para esta ruta.", margin, y);
    doc.setTextColor(0, 0, 0);
    y += 10;
  } else {
    for (const foto of fotosRel) {
      y = asegurarEspacio(doc, y, altoBloqueFoto + 16, margin);
      doc.setFont("helvetica", "bold");
      doc.text(`Etapa: ${foto.etapa}`, margin, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      y = await dibujarImagenOTexto(
        doc,
        margin,
        y,
        anchoFoto,
        altoBloqueFoto,
        foto.url,
        `Foto etapa ${foto.etapa}`
      );
    }
  }

  y = asegurarEspacio(doc, y, 60, margin);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Firma digital del receptor", margin, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  y = await dibujarImagenOTexto(
    doc,
    margin,
    y,
    70,
    35,
    firmaUrl,
    "Firma"
  );

  y = asegurarEspacio(doc, y, 20, margin);
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(
    "Sistema de Seguimiento de Cargas Valiosas — Documento generado electrónicamente.",
    margin,
    y,
    { maxWidth: contentW }
  );

  const base64 = doc.output("datauristring").split(",")[1] ?? "";
  const arrayBuffer = doc.output("arraybuffer") as ArrayBuffer;
  const blob = new Blob([arrayBuffer], { type: "application/pdf" });

  return {
    blob,
    base64,
    cliente: {
      nombre: cliente.nombre,
      contacto_email: cliente.contacto_email,
    },
    rutaId: row.id,
  };
}
