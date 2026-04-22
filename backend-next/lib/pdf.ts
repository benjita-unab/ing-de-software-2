import PDFDocument from "pdfkit";

export async function buildDispatchPdfBase64(input: {
  rutaId: string;
  nombreCliente: string;
  fechaIso: string;
}): Promise<string> {
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const chunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks).toString("base64")));
    doc.on("error", reject);

    doc.fontSize(18).text("Comprobante de Cierre de Despacho");
    doc.moveDown();
    doc.fontSize(12).text(`Ruta ID: ${input.rutaId}`);
    doc.text(`Cliente: ${input.nombreCliente}`);
    doc.text(`Fecha: ${input.fechaIso}`);
    doc.moveDown();
    doc.text("Sistema LogiTrack - Documento generado por backend-next.");

    doc.end();
  });
}
