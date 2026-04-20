// src/services/licenseAlertService.js
// ─────────────────────────────────────────────────────────────────────────────
// Servicio de Alertas de Licencias - HU-5 / CA-2
// Envía alertas automáticas 30 días antes del vencimiento de licencias
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";
import cron from "node-cron";

// ── Configuración ────────────────────────────────────────────────────────────
let supabase = null;

/**
 * Inicializa el cliente Supabase con credenciales del .env
 * @returns {object} Cliente Supabase inicializado
 */
function getSupabaseClient() {
  if (!supabase) {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error(
        "⚠️  Faltan variables de entorno: SUPABASE_URL y SUPABASE_SERVICE_KEY"
      );
    }

    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  }
  return supabase;
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCIÓN PRINCIPAL: Verificar y crear alertas de licencias
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula la fecha objetivo (hoy + 30 días)
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
function getTargetDate() {
  const today = new Date();
  const targetDate = new Date(today);
  targetDate.setDate(targetDate.getDate() + 30);

  // Formato YYYY-MM-DD
  return targetDate.toISOString().split("T")[0];
}

/**
 * Busca licencias que vencen exactamente en 30 días
 * @returns {Promise<Array>} Array de conductores con licencias vencidas en 30 días
 */
async function getLicensesExpiringIn30Days() {
  try {
    const targetDate = getTargetDate();
    console.log(`🔍 Buscando licencias que vencen el ${targetDate}...`);

    const { data, error } = await getSupabaseClient()
      .from("conductores")
      .select(
        `
        id,
        usuario_id,
        licencia_numero,
        licencia_vencimiento,
        usuarios:usuario_id (
          nombre,
          email
        )
      `
      )
      .eq("licencia_vencimiento", targetDate)
      .eq("activo", true)
      .not("licencia_vencimiento", "is", null);

    if (error) {
      console.error("❌ Error al consultar licencias:", error);
      throw error;
    }

    console.log(`✅ Se encontraron ${data?.length || 0} licencias vencidas en 30 días`);
    return data || [];
  } catch (error) {
    console.error("❌ Error en getLicensesExpiringIn30Days:", error.message);
    throw error;
  }
}

/**
 * Verifica si ya existe una alerta para este conductor
 * @param {string} conductorid - ID del conductor
 * @returns {Promise<boolean>} True si ya existe una alerta
 */
async function alertExists(conductorid) {
  try {
    const { data, error } = await getSupabaseClient()
      .from("incidencias")
      .select("id")
      .eq("conductor_id", conductorid)
      .eq("estado", "pendiente")
      .like("descripcion", "%vencerá en 30 días%")
      .single();

    // Si no encuentra registro, count_rows es 0 (no error)
    if (error && error.code !== "PGRST116") {
      throw error;
    }

    return !!data;
  } catch (error) {
    if (error.code !== "PGRST116") {
      // PGRST116 = No rows found (es ok)
      console.warn("⚠️  Error al verificar alerta existente:", error.message);
    }
    return false;
  }
}

/**
 * Crea una alerta en la tabla incidencias
 * @param {Object} conductor - Datos del conductor
 * @param {string} conductor.id - ID del conductor
 * @param {string} conductor.usuario_id - ID del usuario
 * @param {string} conductor.licencia_numero - Número de licencia
 * @param {Object} conductor.usuarios - Datos del usuario (nombre, email)
 * @returns {Promise<Object>} Alerta creada
 */
async function createAlert(conductor) {
  try {
    const nombreConductor = conductor.usuarios?.nombre || `Conductor ${conductor.id}`;
    const mensaje = `La licencia del conductor con ID ${conductor.usuario_id} vencerá en 30 días.`;

    const { data, error } = await getSupabaseClient()
      .from("incidencias")
      .insert([
        {
          conductor_id: conductor.id,
          tipo: "ALERTA", // NORMAL, ALERTA, EMERGENCIA
          descripcion: mensaje,
          estado: "pendiente", // pendiente, en curso, resuelto
          prioridad: "media", // baja, media, alta
          foto_url: null,
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) {
      console.error("❌ Error al crear alerta:", error);
      throw error;
    }

    console.log(
      `✅ Alerta creada para ${nombreConductor} (Licencia: ${conductor.licencia_numero})`
    );
    return data?.[0];
  } catch (error) {
    console.error("❌ Error en createAlert:", error.message);
    throw error;
  }
}

/**
 * Función principal que se ejecuta en el cron job
 * Verifica todas las licencias y crea alertas si es necesario
 */
export async function checkLicensesAndCreateAlerts() {
  try {
    console.log("\n");
    console.log("═══════════════════════════════════════════════════════════");
    console.log(`⏰ INICIO: Verificación de licencias vencidas en 30 días`);
    console.log(`📅 Timestamp: ${new Date().toLocaleString("es-CL")}`);
    console.log("═══════════════════════════════════════════════════════════");

    // Obtener licencias que vencen en 30 días
    const licensesExpiring = await getLicensesExpiringIn30Days();

    if (licensesExpiring.length === 0) {
      console.log("✅ No hay licencias vencidas en 30 días");
      console.log(
        "═══════════════════════════════════════════════════════════\n"
      );
      return {
        success: true,
        processed: 0,
        created: 0,
        skipped: 0,
      };
    }

    let created = 0;
    let skipped = 0;

    // Procesar cada licencia
    for (const conductor of licensesExpiring) {
      console.log(`\n🔄 Procesando: ${conductor.usuarios?.nombre || conductor.id}`);

      // Verificar si ya existe una alerta
      const exists = await alertExists(conductor.id);

      if (exists) {
        console.log(`⏭️  Alerta ya existe. Saltando...`);
        skipped++;
        continue;
      }

      // Crear nueva alerta
      await createAlert(conductor);
      created++;
    }

    // Resumen
    console.log("\n");
    console.log("═══════════════════════════════════════════════════════════");
    console.log("📊 RESUMEN:");
    console.log(`   Total encontradas: ${licensesExpiring.length}`);
    console.log(`   Alertas creadas: ${created}`);
    console.log(`   Alertas saltadas: ${skipped}`);
    console.log(`⏱️  FIN: ${new Date().toLocaleString("es-CL")}`);
    console.log("═══════════════════════════════════════════════════════════\n");

    return {
      success: true,
      processed: licensesExpiring.length,
      created,
      skipped,
    };
  } catch (error) {
    console.error("\n❌ ERROR CRÍTICO EN checkLicensesAndCreateAlerts:");
    console.error(error);
    console.log("═══════════════════════════════════════════════════════════\n");

    return {
      success: false,
      error: error.message,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CRON JOB: Programar ejecución diaria a las 00:00
// ─────────────────────────────────────────────────────────────────────────────

let cronTask = null;

/**
 * Inicia el cron job diario
 * Se ejecuta todos los días a las 00:00 (medianoche)
 * Formato cron: "0 0 * * *" = minuto hora día mes día-semana
 *
 * @param {string} cronExpression - Expresión cron (default: "0 0 * * *")
 */
export function startLicenseAlertsCron(cronExpression = "0 0 * * *") {
  try {
    // Validar expresión cron
    if (!cron.validate(cronExpression)) {
      throw new Error(
        `Expresión cron inválida: ${cronExpression}. Use formato: "0 0 * * *"`
      );
    }

    // Detener cron anterior si existe
    if (cronTask) {
      cronTask.stop();
      console.log("🛑 Cron anterior detenido");
    }

    // Iniciar nuevo cron
    cronTask = cron.schedule(cronExpression, async () => {
      console.log(`\n⏰ Ejecutando cron job de alertas de licencias...`);
      await checkLicensesAndCreateAlerts();
    });

    console.log(`✅ Cron job iniciado con expresión: "${cronExpression}"`);
    console.log(`   Próxima ejecución: ${getNextExecutionTime(cronExpression)}`);

    return cronTask;
  } catch (error) {
    console.error("❌ Error al iniciar cron job:", error.message);
    throw error;
  }
}

/**
 * Detiene el cron job
 */
export function stopLicenseAlertsCron() {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
    console.log("🛑 Cron job de alertas de licencias detenido");
  }
}

/**
 * Calcula la próxima ejecución del cron (solo informativo)
 * @param {string} cronExpression - Expresión cron
 * @returns {string} Descripción de la próxima ejecución
 */
function getNextExecutionTime(cronExpression) {
  // "0 0 * * *" = medianoche todos los días
  if (cronExpression === "0 0 * * *") {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.toLocaleString("es-CL");
  }
  return "Configurada";
}

export default {
  checkLicensesAndCreateAlerts,
  startLicenseAlertsCron,
  stopLicenseAlertsCron,
};
