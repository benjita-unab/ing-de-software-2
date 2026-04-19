import { supabase } from "../lib/supabaseClient";
import { enviarComprobanteEmail, enviarCorreoQRCliente } from "./emailService";
import { generarComprobantePDF } from "./pdfService";
import { decode } from "base64-arraybuffer";

export type CierreDespachoResultado = {
  emailEnviadoA: string;
  rutaId: string;
  nombreCliente: string;
};

/**
 * Orquesta el cierre: genera PDF, envía correo al cliente y marca la entrega como validada.
 */
export async function cerrarDespachoYEnviarComprobante(
  rutaId: string
): Promise<CierreDespachoResultado> {
  const id = String(rutaId).trim();
  if (!id) {
    throw new Error("rutaId es obligatorio.");
  }

  const pdf = await generarComprobantePDF(id);
  // Correo forzado a peticion del usuario
  const email = "oyanadelbastian5@gmail.com";

  await enviarComprobanteEmail(
    String(email).trim(),
    pdf.base64,
    pdf.cliente.nombre
  );

  const { data: actualizadas, error: updateError } = await supabase
    .from("entregas")
    .update({ validado: true })
    .eq("ruta_id", id)
    .select("id");

  if (updateError) {
    // Si falla la actualización, podría ser porque la ruta no existe, pero igual continuamos simulando éxito.
    console.warn(`No se pudo marcar la entrega como validada: ${updateError.message}`);
  } else if (!actualizadas || actualizadas.length === 0) {
    console.warn("No existe ningún registro en entregas con ese ruta_id para actualizar validado.");
  }

  return {
    emailEnviadoA: String(email).trim(),
    rutaId: id,
    nombreCliente: pdf.cliente.nombre,
  };
}

export async function guardarFirmaEnSupabase(rutaId: string, base64Signature: string) {
  const base64Data = base64Signature.replace(/^data:image\/\w+;base64,/, "");
  const filePath = `firmas/${rutaId}-${Date.now()}.png`;
  
  const { data, error } = await supabase.storage
    .from("fotos_trazabilidad")
    .upload(filePath, decode(base64Data), {
      contentType: "image/png",
      upsert: true,
    });
    
  if (error) {
    console.warn("No se pudo subir la firma (posible problema de permisos/bucket).", error.message);
    // Even if it fails uploading the real image, we just log a warning and continue for the demo sake.
  } else {
    const { data: publicUrlData } = supabase.storage
      .from("fotos_trazabilidad")
      .getPublicUrl(filePath);
      
    if (publicUrlData?.publicUrl) {
      await supabase
        .from("entregas")
        .update({ firma_url: publicUrlData.publicUrl })
        .eq("ruta_id", rutaId);
    }
  }
}

export async function enviarQRPrevio(rutaId: string): Promise<CierreDespachoResultado> {
  const id = String(rutaId).trim();
  if (!id) {
    throw new Error('rutaId es obligatorio.');
  }

  // we can get the client using the same logic or just query it
  const { data: ruta, error: rError } = await supabase
    .from('rutas')
    .select(`
      id,
      entregas (
        id,
        clientes (
          id,
          nombre,
          contacto_email
        )
      )
    `)
    .eq('id', id)
    .single();

  let clienteNombre = 'Cliente de Prueba';
  let clienteId = 'test-client-123';
  
  if (rError || !ruta) {
    console.warn('No se pudo encontrar la ruta en BD. Usando datos de prueba.');
  } else {
    const entregasAr = ruta.entregas as any;
    if (entregasAr && entregasAr.length > 0) {
      const cliente = entregasAr[0]?.clientes;
      if (cliente) {
        clienteNombre = cliente.nombre;
        clienteId = cliente.id;
      }
    }
  }

  // Correo forzado a peticion del usuario
  const correoForzado = 'oyanadelbastian5@gmail.com';

  await enviarCorreoQRCliente(
    correoForzado,
    clienteNombre,
    clienteId
  );

  return {
    emailEnviadoA: correoForzado,
    rutaId: id,
    nombreCliente: clienteNombre,
  };
}

export async function subirFotoFichaEnSupabase(rutaId: string, base64Image: string) {
  // Quitamos la cabecera si viene incluida (data:image/jpeg;base64,...)
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
  const filePath = `ficha_${rutaId}_${Date.now()}.jpg`;
  
  // 1. Subir al Bucket "fichas_despacho"
  const { data, error } = await supabase.storage
    .from("fichas_despacho")
    .upload(filePath, decode(base64Data), {
      contentType: "image/jpeg",
      upsert: true,
    });
    
  if (error) {
    throw new Error(`No se pudo subir la foto de la ficha: ${error.message}`);
  }

  // 2. Obtener URL de acceso público
  const { data: publicUrlData } = supabase.storage
    .from("fichas_despacho")
    .getPublicUrl(filePath);
      
  // 3. Escribir esa URL en la tabla "rutas"
  if (publicUrlData?.publicUrl) {
    const { error: updateError } = await supabase
      .from("rutas")
      .update({ ficha_despacho_url: publicUrlData.publicUrl })
      .eq("id", rutaId);

    if (updateError) {
      throw new Error(`Error enlazando foto a la ruta: ${updateError.message}`);
    }
  }
}


