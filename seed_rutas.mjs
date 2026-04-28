import { createClient } from "@supabase/supabase-js";

// Necesitarás reemplazar estas variables por las reales que uses en tu .env o supabaseClient
// Para el propósito de carga de datos rápida, utilizaremos process.env.
// Asegúrate de correrlo con algo como: node seed_rutas.js

// Lee la configuración que deberías tener en "src/lib/supabaseClient.js". 
// Vamos a requerirlas dinámicamente si es posible, o hardcodear para la prueba si las provees:
import 'dotenv/config'; // Si usas dotenv

import fs from 'fs';
import path from 'path';

async function run() {
    // vamos a procesar supabaseClient.js para extraer las URL.
    const file = fs.readFileSync(path.join(process.cwd(), 'src/lib/supabaseClient.js'), 'utf8');
    const urlMatch = file.match(/const supabaseUrl = (['"`])(.*?)\1/);
    const keyMatch = file.match(/const supabaseAnonKey = (['"`])(.*?)\1/);
    
    let url = process.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
    let key = process.env.VITE_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
    
    if (urlMatch) url = urlMatch[2];
    if (keyMatch) key = keyMatch[2];

    if(!url || !key) {
        console.error("No se pudo obtener URL o KEY de Supabase");
        return;
    }

    const supabase = createClient(url, key);

    // Obtener un cliente existente o crear uno de prueba
    let clienteId = null;
    const { data: clientes } = await supabase.from('clientes').select('id').limit(1);
    if (clientes && clientes.length > 0) {
        clienteId = clientes[0].id;
    }

    const rutas = [
        {
            origen: "Centro Distribución Santiago",
            destino: "Sucursal Valparaíso",
            estado: "PENDIENTE",
            cliente_id: clienteId,
            conductor_id: null,
            camion_id: null,
            eta: "2026-04-22T12:00:00Z"
        },
        {
            origen: "Bodega Norte - Antofagasta",
            destino: "Calama - Centro",
            estado: "PENDIENTE",
            cliente_id: clienteId,
            conductor_id: null,
            camion_id: null,
            eta: "2026-04-23T08:30:00Z"
        },
        {
            origen: "Planta Concepción",
            destino: "Talcahuano Ind.",
            estado: "PENDIENTE",
            cliente_id: clienteId,
            conductor_id: null,
            camion_id: null,
            eta: "2026-04-21T18:00:00Z"
        },
        {
            origen: "Santiago Centro",
            destino: "Punta Arenas (Express)",
            estado: "PENDIENTE",
            cliente_id: clienteId,
            conductor_id: null,
            camion_id: null,
            eta: "2026-04-25T14:00:00Z"
        }
    ];

    console.log("Insertando rutas...");
    for (let r of rutas) {
        const { error } = await supabase.from('rutas').insert([r]);
        if (error) {
            console.error("Error insertando ruta a", r.destino, ":", error);
        } else {
            console.log("Ruta a", r.destino, "insertada correctamente.");
        }
    }
}

run();