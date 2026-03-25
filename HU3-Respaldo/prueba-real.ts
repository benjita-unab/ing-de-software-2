// 1. Inyectamos la llave a la fuerza en el objeto de Node para evitar el choque con Vite
process.env.REACT_APP_RESEND_API_KEY = "re_9CyhkjuZ_BcDMCj17sshEi1gK8yAJw33x";

import { cerrarDespachoYEnviarComprobante } from './src/services/cierreDespachoService';

// Usamos el ID de ruta que ya validamos que funciona
const RUTA_ID_DE_PRUEBA = '66db3419-97f0-44d6-9980-d9959b3cd182';

async function probarPDFyCorreo() {
  console.log("Iniciando generación de PDF y envío de correo...");
  
  try {
    const resultado = await cerrarDespachoYEnviarComprobante(RUTA_ID_DE_PRUEBA);
    console.log("✅ ¡Éxito total! El proceso terminó correctamente.");
    console.log("Detalles:", resultado);
  } catch (error) {
    console.error("❌ Hubo un problema durante la ejecución:");
    console.error(error);
  }
}

probarPDFyCorreo();