const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = "https://jmshzmwhbbufgxgxlpcd.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imptc2h6bXdoYmJ1Zmd4Z3hscGNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyOTgzNDMsImV4cCI6MjA4OTg3NDM0M30.qJtdNZ95krv1C_fEgIo-BFxacz9qQ1ytp1VKhu2uSoE";
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('conductores').select('id, rut, camion_id').not('camion_id', 'is', null);
  if (error) { console.error(error); return; }
  
  const map = {};
  const duplicates = [];
  data.forEach(c => {
    if (map[c.camion_id]) duplicates.push(c);
    else map[c.camion_id] = true;
  });
  console.log("Duplicados encontrados:", duplicates.length);
  if (duplicates.length > 0) console.log("Requerirá limpiar antes de UNIQUE.");
}
run();
