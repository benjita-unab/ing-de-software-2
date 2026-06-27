/**
 * TECH-01 Tier 1: preview de registros a eliminar (solo lectura).
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(resolve(__dirname, '../.env'), 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
);
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function fetchAll(table, select = '*') {
  const rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase.from(table).select(select).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return rows;
}

function isClienteBasura(c) {
  const rut = (c.rut || '').trim();
  return (
    /(prueba|test|demo|basura|fake)/i.test(c.nombre || '') ||
    /(, | - | inc$| llc$| and | group$)/i.test(c.nombre || '') ||
    rut.toLowerCase() === 'k' ||
    !rut
  );
}

async function main() {
  const clientes = await fetchAll('clientes');
  const rutas = await fetchAll('rutas');
  const pagos = await fetchAll('pagos_cliente');
  const usuarios = await fetchAll('usuarios');
  const tokens = await fetchAll('password_reset_tokens');

  const clientesConRuta = new Set(rutas.map((r) => r.cliente_id).filter(Boolean));
  const clientesConPago = new Set(pagos.map((p) => p.cliente_id));
  const EXCLUIR = new Set([
    '99426706-6706-44aa-9954-3617b583bb0d', // Empresa Demo HU-27
    '1f57a25d-1549-4bc2-86ea-5f984f753bb9', // EZE PRUEBA (Tier 2)
    'd7401f26-05ad-4192-8736-e8230db07875', // joaquin-prueba (Tier 2)
  ]);

  const clientesBasura = clientes
    .filter(
      (c) =>
        !clientesConRuta.has(c.id) &&
        !clientesConPago.has(c.id) &&
        !EXCLUIR.has(c.id) &&
        isClienteBasura(c),
    )
    .map((c) => ({
      id: c.id,
      nombre: c.nombre,
      rut: c.rut,
      contacto_email: c.contacto_email,
      usuario_id: c.usuario_id,
    }))
    .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

  const historial = await fetchAll('historial_estados', 'id,ruta_id');
  const entregas = await fetchAll('entregas', 'id,ruta_id');
  const trace = await fetchAll('traceability_events', 'id,ruta_id');
  const mensajes = await fetchAll('mensajes_conductor', 'id,ruta_id');
  const chat = await fetchAll('chat_mensajes_ruta', 'id,ruta_id');
  const notif = await fetchAll('notificaciones_cliente', 'id,ruta_id');

  const rutaHasDeps = (rutaId) => {
    const sets = [entregas, historial, trace, mensajes, chat, notif, pagos];
    return sets.some((arr) => arr.some((x) => x.ruta_id === rutaId || x.pedido_id === rutaId));
  };

  const rutasBasura = rutas
    .filter(
      (r) =>
        (r.origen || '').trim().toLowerCase() === 'test' &&
        (r.destino || '').trim().toLowerCase() === 'test' &&
        !rutaHasDeps(r.id),
    )
    .map((r) => ({
      id: r.id,
      origen: r.origen,
      destino: r.destino,
      nombre_ruta: r.nombre_ruta,
      estado: r.estado,
      cliente_id: r.cliente_id,
    }));

  const usuariosBasura = usuarios
    .filter((u) => u.email === 'test@gmail.com')
    .map((u) => ({
      id: u.id,
      email: u.email,
      nombre: u.nombre,
      rol: u.rol,
      tiene_cliente: clientes.some((c) => c.usuario_id === u.id),
      tiene_conductor: false,
    }));

  const now = new Date();
  const tokensBasura = tokens
    .filter((t) => t.used_at != null || new Date(t.expires_at) < now)
    .map((t) => ({
      id: t.id,
      usuario_id: t.usuario_id,
      used_at: t.used_at,
      expires_at: t.expires_at,
    }));

  console.log(JSON.stringify({
    resumen: {
      clientes_a_eliminar: clientesBasura.length,
      rutas_a_eliminar: rutasBasura.length,
      usuarios_a_eliminar: usuariosBasura.length,
      tokens_a_eliminar: tokensBasura.length,
    },
    clientes_basura: clientesBasura,
    rutas_basura: rutasBasura,
    usuarios_basura: usuariosBasura,
    tokens_basura: tokensBasura,
  }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
