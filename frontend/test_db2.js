const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = "https://jmshzmwhbbufgxgxlpcd.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imptc2h6bXdoYmJ1Zmd4Z3hscGNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyOTgzNDMsImV4cCI6MjA4OTg3NDM0M30.qJtdNZ95krv1C_fEgIo-BFxacz9qQ1ytp1VKhu2uSoE";
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: rutas, error } = await supabase.from('rutas').select('id, nombre_ruta, created_at, bultos_despachados').order('created_at', { ascending: false }).limit(3);
  console.log("Rutas:", rutas);
  
  if (rutas && rutas.length > 0) {
    const { data: bultos } = await supabase.from('bultos').select('*').eq('ruta_id', rutas[0].id);
    console.log("Bultos de la ultima ruta:", bultos);
  }
}
run();
