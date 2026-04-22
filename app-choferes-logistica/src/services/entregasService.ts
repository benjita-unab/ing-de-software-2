import { generateOtpCode } from "../utils/generateOtpCode";
import { bffFetch } from "./bffService";

export type EntregaCreateInput = {
  ruta_id: string;
  cliente_id: string;
  direccion: string;
  estado?: string;
};

export async function crearEntregaConOtp(input: EntregaCreateInput) {
  const codigo_otp = generateOtpCode(6);

  const response = await bffFetch("/api/entregas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...input,
      codigo_otp
    })
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(`No se pudo crear la entrega: ${payload?.error ?? "error backend"}`);
  }

  return response.json();
}
