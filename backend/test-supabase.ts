import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jmshzmwhbbufgxgxlpcd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imptc2h6bXdoYmJ1Zmd4Z3hscGNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDI5ODM0MywiZXhwIjoyMDg5ODc0MzQzfQ.ebYzQoeFwBHE_Lf2rj3z3gbY3qq-mcm3mhzkZiAIeSo';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const { data: rutas, error } = await supabase.from('rutas').select('id, eta, fecha_estimada_entrega').limit(5);
  console.log('Rutas cols:', rutas, 'Error:', error);
}

run();
