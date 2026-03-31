import { Resend } from 'resend';

// Tomamos tu llave directamente del archivo .env
const resend = new Resend(process.env.EXPO_PUBLIC_RESEND_API_KEY);

async function probarCorreoDirecto() {
  try {
    console.log("🚀 Enviando correo de prueba directamente desde Resend...");
    
    const data = await resend.emails.send({
      from: 'Logística <onboarding@resend.dev>',
      //
      //
      to: ['oyanadelbastian5@gmail.com'], // 👈 ¡PON TU CORREO REAL AQUÍ!
      //
      //
      subject: 'Comprobante de Entrega Finalizada (Prueba)',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>¡Viaje Finalizado!</h2>
            <p>Hola, este es un correo de prueba de tu sistema de logística.</p>
            <p>El comprobante en PDF con la firma digital viaja adjunto a este mensaje.</p>
        </div>
      `,
      attachments: [{
        filename: 'comprobante_prueba.pdf',
        // Esto es un PDF real, muy pequeñito y en blanco, convertido a base64 para la prueba
        content: 'JVBERi0xLjcKCjEgMCBvYmogICUgZW50cnkgcG9pbnQKPDwKICAvVHlwZSAvQ2F0YWxvZwogIC9QYWdlcyAyIDAgUgo+PgplbmRvYmoKCjIgMCBvYmoKPDwKICAvVHlwZSAvUGFnZXMKICAvTWVkaWFCb3ggWyAwIDAgMjAwIDIwMCBdCiAgL0NvdW50IDEKICAvS2lkcyBbIDMgMCBSIF0KPj4KZW5kb2JqCgozIDAgb2JqCjw8CiAgL1R5cGUgL1BhZ2UKICAvUGFyZW50IDIgMCBSCiAgL1Jlc291cmNlcyA8PAogICAgL0ZvbnQgPDwKICAgICAgL0YxIDQgMCBSCgkJPj4KICA+PgogIC9Db250ZW50cyA1IDAgUgo+PgplbmRvYmoKCjQgMCBvYmoKPDwKICAvVHlwZSAvRm9udAogIC9TdWJ0eXBlIC9UeXBlMQogIC9CYXNlRm9udCAvVGltZXMtUm9tYW4KPj4KZW5kb2JqCgo1IDAgb2JqCjw8IC9MZW5ndGggMzggPj4Kc3RyZWFtCkJUCi9GMSAxOCBUZgoxMCAxMDAgVGQKKEhvbGEgTXVuZG8hKSBUagoRVAplbmRzdHJlYW0KZW5kb2JqCgp4cmVmCjAgNgowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTAgMDAwMDAgbiAKMDAwMDAwMDA2MCAwMDAwMCBuIAowMDAwMDAwMTU3IDAwMDAwIG4gCjAwMDAwMDAyNjEgMDAwMDAgbiAKMDAwMDAwMDM0OSAwMDAwMCBuIAp0cmFpbGVyCjw8CiAgL1NpemUgNgogIC9Sb290IDEgMCBSCj4+CnN0YXJ0eHJlZgo0MzgKJSVFT0YK',
      }]
    });

    console.log("✅ ¡Correo enviado exitosamente! Revisa tu bandeja de entrada.");
    console.log("Detalles del servidor:", data);

  } catch (error) {
    console.error("❌ Error al enviar:", error);
  }
}

probarCorreoDirecto();