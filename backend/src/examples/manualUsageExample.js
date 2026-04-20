// backend/src/examples/manualUsageExample.js
// ─────────────────────────────────────────────────────────────────────────────
// Ejemplo: Cómo usar el servicio de alertas de licencias de forma manual
// ─────────────────────────────────────────────────────────────────────────────
// Este archivo muestra diferentes formas de usar licenseAlertService.js

import dotenv from "dotenv";
import {
  checkLicensesAndCreateAlerts,
  startLicenseAlertsCron,
  stopLicenseAlertsCron,
} from "../services/licenseAlertService.js";

dotenv.config();

// ─────────────────────────────────────────────────────────────────────────────
// EJEMPLO 1: Ejecutar verificación una sola vez (sin cron)
// ─────────────────────────────────────────────────────────────────────────────
export async function example1_manualCheck() {
  console.log("📋 EJEMPLO 1: Verificación Manual (Sin Cron)");
  console.log("─".repeat(60));

  try {
    const result = await checkLicensesAndCreateAlerts();
    console.log("✅ Resultado:", result);
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EJEMPLO 2: Iniciar cron con expresión personalizada
// ─────────────────────────────────────────────────────────────────────────────
export async function example2_customCronSchedule() {
  console.log("\n📋 EJEMPLO 2: Cron con Horario Personalizado");
  console.log("─".repeat(60));

  // Opciones de expresiones cron comunes:
  const schedules = {
    "0 0 * * *": "Medianoche (00:00) diaria",
    "0 2 * * *": "02:00 AM diaria",
    "0 */6 * * *": "Cada 6 horas",
    "30 9 * * 1": "Lunes 09:30",
    "0 0 1 * *": "Primer día del mes a medianoche",
  };

  // Usar expresión personalizada
  const customCron = "0 0 * * *"; // Medianoche
  console.log(`🕐 Iniciando con: "${customCron}" (${schedules[customCron]})`);

  startLicenseAlertsCron(customCron);

  // Para pruebas, esperar 5 segundos y luego detener
  console.log("⏳ Esperando 5 segundos...");
  setTimeout(() => {
    stopLicenseAlertsCron();
    console.log("🛑 Cron detenido");
  }, 5000);
}

// ─────────────────────────────────────────────────────────────────────────────
// EJEMPLO 3: Ejecutar con intervalo de prueba (cada minuto)
// ─────────────────────────────────────────────────────────────────────────────
export async function example3_testingMode() {
  console.log("\n📋 EJEMPLO 3: Modo Testing (Verificar cada minuto)");
  console.log("─".repeat(60));

  // Para testing rápido: ejecutar cada minuto
  const testingCron = "* * * * *"; // Cada minuto
  console.log("🧪 Iniciando en MODO TESTING (cada minuto)");
  console.log("⚠️  ADVERTENCIA: Solo para desarrollo. Desactivar antes de producción");

  startLicenseAlertsCron(testingCron);

  // Auto-detener después de 3 minutos
  setTimeout(() => {
    stopLicenseAlertsCron();
    console.log("✅ Modo testing finalizado");
  }, 3 * 60 * 1000);
}

// ─────────────────────────────────────────────────────────────────────────────
// EJEMPLO 4: Combinación - Ejecutar una vez y luego schedule
// ─────────────────────────────────────────────────────────────────────────────
export async function example4_executeAndSchedule() {
  console.log("\n📋 EJEMPLO 4: Ejecutar Ahora + Programar para Medianoche");
  console.log("─".repeat(60));

  // Ejecutar inmediatamente
  console.log("🔍 Ejecutando verificación inicial...");
  const immediateResult = await checkLicensesAndCreateAlerts();
  console.log("✅ Verificación inmediata completada");

  // Luego programar para medianoche
  console.log("\n⏰ Programando para medianoche diariamente...");
  startLicenseAlertsCron("0 0 * * *");
  console.log("✅ Sistema en modo automático");
}

// ─────────────────────────────────────────────────────────────────────────────
// EJEMPLO 5: Ejecutar múltiples veces con intervalo
// ─────────────────────────────────────────────────────────────────────────────
export async function example5_multipleChecks() {
  console.log("\n📋 EJEMPLO 5: Múltiples Verificaciones con Intervalo");
  console.log("─".repeat(60));

  let checkCount = 1;
  const maxChecks = 3;
  const intervalMs = 10000; // 10 segundos entre checks

  console.log(`🔄 Ejecutaremos ${maxChecks} verificaciones cada ${intervalMs}ms`);

  const interval = setInterval(async () => {
    console.log(`\n[${checkCount}/${maxChecks}] Ejecutando verificación...`);
    await checkLicensesAndCreateAlerts();

    checkCount++;
    if (checkCount > maxChecks) {
      clearInterval(interval);
      console.log("\n✅ Todas las verificaciones completadas");
    }
  }, intervalMs);
}

// ─────────────────────────────────────────────────────────────────────────────
// CÓMO EJECUTAR ESTOS EJEMPLOS
// ─────────────────────────────────────────────────────────────────────────────
/*

1. EJEMPLO 1 - Verificación Manual (Sin Cron):
   └─ Bueno para: Testing inicial, verificaciones puntuales
   └─ Comando: node -e "import('./manualUsageExample.js').then(m => m.example1_manualCheck())"

2. EJEMPLO 2 - Cron Personalizado:
   └─ Bueno para: Ajustar horarios según necesidades
   └─ Modificar la variable `customCron` dentro de la función

3. EJEMPLO 3 - Modo Testing:
   └─ Bueno para: Desarrollo y debugging rápido
   └─ Ejecuta verificaciones cada minuto (solo para desarrollo)

4. EJEMPLO 4 - Execute + Schedule:
   └─ Bueno para: Ver resultados inmediatos + automatización
   └─ Combina verificación manual con cron automático

5. EJEMPLO 5 - Múltiples Checks:
   └─ Bueno para: Pruebas de carga, validación de lógica
   └─ Ejecuta 3 verificaciones con 10s de intervalo

*/

// ─────────────────────────────────────────────────────────────────────────────
// MENÚ INTERACTIVO
// ─────────────────────────────────────────────────────────────────────────────

console.log(`
╔════════════════════════════════════════════════════════════╗
║     Ejemplos de Uso: Servicio de Alertas de Licencias     ║
║                        (HU-5 / CA-2)                       ║
╚════════════════════════════════════════════════════════════╝

Selecciona un ejemplo para ejecutar:

  1. Verificación Manual (Sin Cron)
  2. Cron con Horario Personalizado
  3. Modo Testing (Cada minuto)
  4. Ejecutar Ahora + Programar
  5. Múltiples Verificaciones

Uso:
  node --input-type=module << EOF
  import('./src/examples/manualUsageExample.js').then(m => m.example1_manualCheck())
  EOF

O directamente en tu código:
  import { checkLicensesAndCreateAlerts, startLicenseAlertsCron } from './services/licenseAlertService.js'
  await checkLicensesAndCreateAlerts()
  startLicenseAlertsCron('0 0 * * *')
`);

export default {
  example1_manualCheck,
  example2_customCronSchedule,
  example3_testingMode,
  example4_executeAndSchedule,
  example5_multipleChecks,
};
