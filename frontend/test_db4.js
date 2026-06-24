const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = "https://jmshzmwhbbufgxgxlpcd.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imptc2h6bXdoYmJ1Zmd4Z3hscGNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyOTgzNDMsImV4cCI6MjA4OTg3NDM0M30.qJtdNZ95krv1C_fEgIo-BFxacz9qQ1ytp1VKhu2uSoE";
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const rutaId = "60aa9321-08af-4d02-8323-07c697f21582";
  const { data: bultosData, error } = await supabase
      .from('bultos')
      .select('id, alto_cm, ancho_cm, largo_cm, peso_kg, categoria')
      .eq('ruta_id', rutaId);
  console.log("BultosData:", bultosData);
  console.log("Error:", error);
}
run();
