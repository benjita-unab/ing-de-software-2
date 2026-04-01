const fs = require('fs');

const code = `
export async function enviarCorreoQRCliente(
  emailCliente: string,
  nombreCliente: string,
  clienteId: string
): Promise<void> {
  const destino = String(emailCliente).trim();
  if (!destino) {
    throw new Error('El correo del cliente está vacío.');
  }

  const apiKey = requireResendApiKey();
  const nombreSeguro = escapeHtml(nombreCliente);
  const from = resolveFromAddress();
  const qrUrl = \`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=\${encodeURIComponent(clienteId)}\`;
  const html = \`<!DOCTYPE html><html><body><h1>Hola, \${nombreSeguro}</h1><p>Aquí está tu código QR para presentar a la hora de la recepción de carga:</p><div><img src="\${qrUrl}" alt="QR" /></div><p>Slds,<br>LogiTrack</p></body></html>\`;

  const payload = {
    from,
    to: destino,
    subject: \`Código QR para Entrega - \${nombreSeguro}\`,
    html,
  };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: \`Bearer \${apiKey}\`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch {}
    throw new Error(\`Resend Error QR: \${errorData?.message || response.statusText}\`);
  }
}
`;

fs.appendFileSync('app-choferes-logistica/src/services/emailService.ts', code);
