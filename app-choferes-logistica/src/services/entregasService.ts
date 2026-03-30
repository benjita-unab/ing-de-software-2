import { supabase } from "../lib/supabaseClient";
import { generateOtpCode } from "../utils/generateOtpCode";

export type EntregaCreateInput = {
  ruta_id: string;
  cliente_id: string;
  direccion: string;
  estado?: string;
};

export async function crearEntregaConOtp(input: EntregaCreateInput) {
  const codigo_otp = generateOtpCode(6);

  const { data, error } = await supabase
    .from("entregas")
    .insert({
      ...input,
      codigo_otp,
    })
    .select("id, ruta_id, codigo_otp")
    .single();

  if (error) {
    throw new Error(`No se pudo crear la entrega: ${error.message}`);
  }

  return data;
}
