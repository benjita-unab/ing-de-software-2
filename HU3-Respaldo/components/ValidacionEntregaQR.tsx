import { QRCodeSVG } from "qrcode.react";

type ValidacionEntregaQRProps = {
  ruta_id: string;
  codigo_otp: string;
};

export function ValidacionEntregaQR({
  ruta_id,
  codigo_otp,
}: ValidacionEntregaQRProps) {
  const qrPayload = JSON.stringify({
    ruta_id,
    codigo_otp,
  });

  return (
    <section
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 16,
        width: "fit-content",
        background: "#fff",
      }}
    >
      <h3 style={{ margin: "0 0 12px", fontSize: 18 }}>Validacion de Entrega</h3>
      <QRCodeSVG value={qrPayload} size={220} level="M" includeMargin />
      <div style={{ marginTop: 12, fontFamily: "monospace", fontSize: 14 }}>
        OTP: <strong>{codigo_otp}</strong>
      </div>
    </section>
  );
}
