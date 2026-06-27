/**
 * TECH-01: Auditoría ampliada (solo lectura).
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
    if (error) return { rows: null, error: error.message };
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return { rows, error: null };
}

const FAKER_RE = /(, | - | inc$| llc$| and | group$)/i;

async function main() {
  const { rows: clientes } = await fetchAll('clientes');
  const { rows: rutas } = await fetchAll('rutas');
  const { rows: pagos } = await fetchAll('pagos_cliente');
  const { rows: usuarios } = await fetchAll('usuarios');
  const { rows: conductores } = await fetchAll('conductores');
  const { rows: camiones } = await fetchAll('camiones');
  const { rows: entregas } = await fetchAll('entregas');

  const clienteRutas = new Map();
  for (const r of rutas) {
    clienteRutas.set(r.cliente_id, (clienteRutas.get(r.cliente_id) || 0) + 1);
  }
  const clientePagos = new Map();
  for (const p of pagos) {
    clientePagos.set(p.cliente_id, (clientePagos.get(p.cliente_id) || 0) + 1);
  }

  const sinRut = clientes.filter((c) => !c.rut);
  const fakerLike = clientes.filter((c) => FAKER_RE.test(c.nombre || ''));
  const rutInvalido = clientes.filter((c) => {
    const r = (c.rut || '').trim();
    return r && (r.length < 3 || r === 'k' || r === 'K' || /^[^0-9]/.test(r) && r.length < 5);
  });

  const testClienteIds = new Set([
    '99426706-6706-44aa-9954-3617b583bb0d', '0db98ee6-67a2-4e66-8898-183b5e8b9458',
    'd7401f26-05ad-4192-8736-e8230db07875', '7437914f-badb-4ffa-bec7-4ee18b8f9c31',
    '77893f7c-7046-41d1-b9f4-fa3cbb752719', '1f57a25d-1549-4bc2-86ea-5f984f753bb9',
    'cfa787c5-412f-4bbe-84e7-86fa59c84ac4',
  ]);

  const rutasEstado = {};
  for (const r of rutas) rutasEstado[r.estado] = (rutasEstado[r.estado] || 0) + 1;

  const rutasTest = rutas.filter((r) => testClienteIds.has(r.cliente_id));
  const rutasFaker = rutas.filter((r) => {
    const c = clientes.find((x) => x.id === r.cliente_id);
    return c && (FAKER_RE.test(c.nombre || '') || !c.rut);
  });

  const pagosDetail = pagos.map((p) => {
    const c = clientes.find((x) => x.id === p.cliente_id);
    return { ...p, cliente_nombre: c?.nombre, cliente_rut: c?.rut };
  });

  const usuariosDetail = usuarios.map((u) => ({
    ...u,
    password: u.password ? '[REDACTED]' : null,
    cliente_vinculado: clientes.find((c) => c.usuario_id === u.id)?.nombre || null,
    conductor_vinculado: conductores.find((c) => c.usuario_id === u.id)?.nombre || null,
  }));

  // Rutas duplicadas: mismo origen+destino+cliente en mismo día
  const dupMap = new Map();
  for (const r of rutas) {
    const k = `${r.cliente_id}|${(r.origen||'').trim().toLowerCase()}|${(r.destino||'').trim().toLowerCase()}|${(r.created_at||r.fecha_creacion||'').slice(0,10)}`;
    if (!dupMap.has(k)) dupMap.set(k, []);
    dupMap.get(k).push(r.id);
  }
  const rutasDup = [...dupMap.entries()].filter(([, ids]) => ids.length > 1);

  // Plantillas duplicadas
  const { rows: plantillas } = await fetchAll('rutas_plantilla');
  const plDup = new Map();
  for (const p of plantillas || []) {
    const k = `${(p.nombre||'').trim().toLowerCase()}|${(p.origen||'').trim().toLowerCase()}|${(p.destino||'').trim().toLowerCase()}`;
    if (!plDup.has(k)) plDup.set(k, []);
    plDup.get(k).push(p.id);
  }

  console.log(JSON.stringify({
    resumen: {
      total_clientes: clientes.length,
      clientes_sin_rut: sinRut.length,
      clientes_faker_like: fakerLike.length,
      clientes_rut_invalido: rutInvalido.length,
      clientes_con_rutas: [...clienteRutas.keys()].length,
      clientes_sin_rutas: clientes.length - [...clienteRutas.keys()].length,
      rutas_por_estado: rutasEstado,
      rutas_vinculadas_clientes_prueba: rutasTest.length,
      rutas_vinculadas_clientes_faker_o_sin_rut: rutasFaker.length,
      conductores_sin_email: conductores.filter((c) => !c.email).length,
      camiones_sin_marca_modelo: camiones.filter((c) => !c.marca || !c.modelo).length,
    },
    rut_invalido_muestra: rutInvalido.slice(0, 15).map((c) => ({ id: c.id, nombre: c.nombre, rut: c.rut })),
    faker_muestra: fakerLike.slice(0, 10).map((c) => ({
      id: c.id, nombre: c.nombre, rut: c.rut,
      rutas: clienteRutas.get(c.id) || 0,
    })),
    clientes_prueba_con_dependencias: [...testClienteIds].map((id) => {
      const c = clientes.find((x) => x.id === id);
      return {
        id, nombre: c?.nombre, rut: c?.rut,
        rutas: clienteRutas.get(id) || 0,
        pagos: clientePagos.get(id) || 0,
        usuario_id: c?.usuario_id,
      };
    }),
    pagos_detail: pagosDetail,
    usuarios: usuariosDetail,
    rutas_duplicadas_mismo_dia: rutasDup.slice(0, 10).map(([k, ids]) => ({ key: k, count: ids.length, ids })),
    plantillas_duplicadas: [...plDup.entries()].filter(([, ids]) => ids.length > 1),
    entregas_sin_firma: entregas.filter((e) => !e.firma_url && !e.foto_url).length,
    entregas_total: entregas.length,
  }, null, 2));
}

main();
