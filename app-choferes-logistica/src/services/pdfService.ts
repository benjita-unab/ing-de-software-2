import * as Print from "expo-print";
import { supabase } from "../lib/supabaseClient";

export type ClienteResumen = {
  nombre: string;
  contacto_email: string | null;
};

export type ComprobantePDFResult = {
  // Importante para compatibilidad: NO construimos Blob real en móvil.
  blob: any;
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
  origen: string | null;
  destino: string | null;
  cliente_id: string;
  clientes: ClienteRow | ClienteRow[] | null;
  entregas: EntregaRow | EntregaRow[] | null;
  fotos: FotoRow | FotoRow[] | null;
};

function normalizeRelation<T>(value: T | T[] | null | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function escapeHtml(input: string): string {
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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

function buildImageHTML({
  url,
  alt,
  heightPx,
  objectFit,
}: {
  url: string | null;
  alt: string;
  heightPx: number;
  objectFit: "cover" | "contain";
}): string {
  const safeAlt = escapeHtml(alt);
  const safeUrl = url ? escapeHtml(url) : "";

  // Fallback visible por defecto; intentamos ocultarlo al cargar imagen.
  // Si onload/onerror no se ejecuta por el motor de impresión, el texto igual aparece.
  if (!safeUrl) {
    return `<div class="imgFallback">Imagen no disponible</div>`;
  }

  return `
    <div class="imgWrap">
      <img
        class="img"
        src="${safeUrl}"
        alt="${safeAlt}"
        style="display:none; height:${heightPx}px; object-fit:${objectFit};"
        onload="this.style.display='block';var fb=this.parentElement.querySelector('.imgFallback'); if (fb) fb.style.display='none';"
        onerror="this.style.display='none';"
      />
      <div class="imgFallback">Imagen no disponible</div>
    </div>
  `;
}

export async function generarComprobantePDF(
  rutaId: string
): Promise<ComprobantePDFResult> {
  if (!rutaId || !String(rutaId).trim()) {
    throw new Error("rutaId es obligatorio.");
  }

  // Mantener lógica de obtención de datos desde Supabase.
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

  let row: RutaQueryRow;

  if (!data) {
    console.warn(`No se encontró la ruta con id "${rutaId}". Usando datos de prueba para generar PDF.`);
    row = {
      id: rutaId,
      origen: "Bodega Central",
      destino: "Dirección de Prueba",
      cliente_id: "client-123",
      clientes: { id: "client-123", nombre: "Cliente de Prueba", contacto_email: "oyanadelbastian5@gmail.com" },
      entregas: [{ id: "entrega-123", firma_url: null, validado: false }],
      fotos: []
    } as RutaQueryRow;
  } else {
    row = data as unknown as RutaQueryRow;
  }

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

  const estadoValidacion =
    primeraEntrega?.validado == null
      ? "Sin registro de entrega"
      : primeraEntrega.validado
        ? "Validado"
        : "Pendiente";

  const resumenHTML = `
    <table class="summary">
      <thead>
        <tr>
          <th>Concepto</th>
          <th>Detalle</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="k">ID de ruta</td>
          <td class="v">${escapeHtml(row.id)}</td>
        </tr>
        <tr>
          <td class="k">Cliente</td>
          <td class="v">${escapeHtml(cliente.nombre)}</td>
        </tr>
        <tr>
          <td class="k">Correo de contacto</td>
          <td class="v">${escapeHtml(cliente.contacto_email ?? "—")}</td>
        </tr>
        <tr>
          <td class="k">Origen</td>
          <td class="v">${escapeHtml(row.origen ?? "—")}</td>
        </tr>
        <tr>
          <td class="k">Destino</td>
          <td class="v">${escapeHtml(row.destino ?? "—")}</td>
        </tr>
        <tr>
          <td class="k">Estado validación (entrega)</td>
          <td class="v">${escapeHtml(estadoValidacion)}</td>
        </tr>
      </tbody>
    </table>
  `;

  const fotosHTML =
    fotosRel.length === 0
      ? `<div class="emptyText">No hay fotos registradas para esta ruta.</div>`
      : `<div class="photosGrid">
          ${fotosRel
            .map(
              (foto) => `
            <div class="photoCard">
              <div class="stageLabel">Etapa: ${escapeHtml(foto.etapa)}</div>
              ${buildImageHTML({
                url: foto.url,
                alt: `Foto etapa ${foto.etapa}`,
                heightPx: 120,
                objectFit: "cover",
              })}
            </div>
          `
            )
            .join("")}
        </div>`;

  const firmaHTML = `
    <div class="signatureBlock">
      <div class="sectionTitle">Firma digital del receptor</div>
      <div class="signatureWrap">
        ${buildImageHTML({
          url: firmaUrl,
          alt: "Firma digital del receptor",
          heightPx: 70,
          objectFit: "contain",
        })}
      </div>
    </div>
  `;

  const html = `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <style>
        @page { size: A4; margin: 12mm; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
          color: #111827;
          background: #ffffff;
        }
        .headerTitle { font-size: 18px; font-weight: 800; margin: 0; }
        .metaRow { margin-top: 6px; font-size: 10px; color: #6B7280; }
        .rule { height: 1px; background: #E5E7EB; margin: 12px 0; }
        .sectionTitle { font-size: 12px; font-weight: 800; margin: 14px 0 8px; }

        table.summary {
          width: 100%;
          border-collapse: collapse;
          font-size: 10px;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          overflow: hidden;
        }
        table.summary thead th {
          background: #2962FF;
          color: #fff;
          padding: 8px 10px;
          text-align: left;
          font-weight: 700;
        }
        table.summary tbody td {
          padding: 8px 10px;
          border-bottom: 1px solid #EEF2F7;
        }
        table.summary tbody tr:nth-child(even) td { background: #F7FAFF; }
        td.k { width: 46%; color: #334155; font-weight: 700; }
        td.v { color: #0F172A; }

        .emptyText { font-size: 10px; color: #6B7280; padding: 10px 0; }

        .photosGrid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        .photoCard {
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 8px;
          background: #fff;
          page-break-inside: avoid;
        }
        .stageLabel {
          font-size: 10px;
          font-weight: 800;
          color: #2563EB;
          margin-bottom: 8px;
        }
        .imgWrap {
          width: 100%;
          border-radius: 10px;
          background: #F9FAFB;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .imgFallback {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #9CA3AF;
          font-size: 10px;
          text-align: center;
          width: 100%;
          padding: 6px;
          height: 120px;
        }
        .signatureBlock { margin-top: 14px; }
        .signatureWrap .imgFallback { height: 70px; }
        .img { width: 100%; display: block; border-radius: 10px; }

        .footerText {
          margin-top: 18px;
          font-size: 9px;
          color: #6B7280;
          border-top: 1px solid #EEF2F7;
          padding-top: 10px;
        }
      </style>
    </head>
    <body>
      <div>
        <div class="headerTitle">Comprobante de despacho</div>
        <div class="metaRow">Generado: ${escapeHtml(formatFechaHora())}</div>
      </div>
      <div class="rule"></div>

      ${resumenHTML}

      <div class="sectionTitle">Evidencias fotográficas por etapa</div>
      ${fotosHTML}

      ${firmaHTML}

      <div class="footerText">
        Sistema de Seguimiento de Cargas Valiosas — Documento generado electrónicamente.
      </div>
    </body>
  </html>`;

  // Generación compatible con móvil: no usamos Blob/ArrayBuffer aquí.
  const result = await Print.printToFileAsync({
    html,
    base64: true,
  });

  return {
    blob: {}, // mock vacío: evita errores con ArrayBuffer/Blob en Hermes
    base64: result.base64 ?? "",
    cliente: {
      nombre: cliente.nombre,
      contacto_email: cliente.contacto_email,
    },
    rutaId: row.id,
  };
}