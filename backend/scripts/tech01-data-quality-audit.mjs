/**
 * TECH-01: Auditoría de calidad de datos (solo lectura).
 * Ejecutar: node backend/scripts/tech01-data-quality-audit.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env');
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const TABLES = [
  'usuarios', 'clientes', 'conductores', 'camiones', 'rutas', 'rutas_paradas',
  'rutas_plantilla', 'rutas_plantilla_paradas', 'entregas', 'pagos_cliente',
  'historial_estados', 'traceability_events', 'fotos_trazabilidad', 'fotos',
  'anomalias', 'incidencias', 'mensajes_conductor', 'chat_mensajes_ruta',
  'notificaciones_cliente', 'driver_licenses', 'guias_despacho',
  'configuracion_pagos', 'password_reset_tokens', 'alerts', 'bultos_rutas',
];

async function fetchAll(table, select = '*') {
  const rows = [];
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(from, from + pageSize - 1);
    if (error) {
      if (error.code === 'PGRST205' || /does not exist/i.test(error.message)) {
        return { rows: null, error: `tabla no existe: ${table}` };
      }
      return { rows: null, error: `${table}: ${error.message}` };
    }
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return { rows, error: null };
}

function norm(s) {
  if (s == null) return '';
  return String(s).trim().toLowerCase().replace(/\s+/g, ' ');
}

function groupBy(rows, keys) {
  const map = new Map();
  for (const row of rows) {
    const k = keys.map((key) => norm(row[key])).join('||');
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(row);
  }
  return [...map.entries()].filter(([, g]) => g.length > 1);
}

function countNulls(rows, cols) {
  const out = {};
  for (const col of cols) {
    out[col] = rows.filter((r) => r[col] == null || r[col] === '').length;
  }
  return out;
}

const TEST_EMAIL_PATTERNS = [
  /test@/i, /@test\./i, /prueba/i, /demo/i, /fake/i, /example\.com/i,
  /mailinator/i, /temp/i, /debug/i,
];
const TEST_NAME_PATTERNS = [
  /prueba/i, /test/i, /demo/i, /basura/i, /fake/i, /xxx/i, /^asdf/i,
  /cliente de prueba/i, /dirección de prueba/i,
];

const report = {
  generatedAt: new Date().toISOString(),
  tableCounts: {},
  tableErrors: {},
  duplicates: {},
  testUsers: [],
  testData: {},
  nullRequired: {},
  orphans: {},
  protected: {},
};

async function main() {
  const data = {};

  for (const table of TABLES) {
    const { rows, error } = await fetchAll(table);
    if (error) {
      report.tableErrors[table] = error;
      continue;
    }
    data[table] = rows;
    report.tableCounts[table] = rows.length;
  }

  // --- Duplicados clientes ---
  if (data.clientes) {
    const byRut = groupBy(data.clientes.filter((c) => c.rut), ['rut']);
    const byNombre = groupBy(data.clientes.filter((c) => c.nombre), ['nombre']);
    const byEmail = groupBy(data.clientes.filter((c) => c.contacto_email), ['contacto_email']);
    report.duplicates.clientes_por_rut = byRut.map(([k, g]) => ({
      key: k, count: g.length, ids: g.map((x) => x.id),
    }));
    report.duplicates.clientes_por_nombre = byNombre.slice(0, 20).map(([k, g]) => ({
      key: k, count: g.length, ids: g.map((x) => x.id),
    }));
    report.duplicates.clientes_por_email = byEmail.map(([k, g]) => ({
      key: k, count: g.length, ids: g.map((x) => x.id),
    }));
    report.nullRequired.clientes = countNulls(data.clientes, ['nombre', 'rut', 'contacto_email']);
  }

  // --- Duplicados conductores ---
  if (data.conductores) {
    const byRut = groupBy(data.conductores.filter((c) => c.rut), ['rut']);
    const byEmail = groupBy(data.conductores.filter((c) => c.email), ['email']);
    const byNombre = groupBy(data.conductores.filter((c) => c.nombre), ['nombre']);
    report.duplicates.conductores_por_rut = byRut.map(([k, g]) => ({
      key: k, count: g.length, ids: g.map((x) => x.id),
    }));
    report.duplicates.conductores_por_email = byEmail.map(([k, g]) => ({
      key: k, count: g.length, ids: g.map((x) => x.id),
    }));
    report.duplicates.conductores_por_nombre = byNombre.slice(0, 20).map(([k, g]) => ({
      key: k, count: g.length, ids: g.map((x) => x.id),
    }));
    report.nullRequired.conductores = countNulls(data.conductores, ['nombre', 'rut', 'email']);
  }

  // --- Duplicados camiones ---
  if (data.camiones) {
    const byPatente = groupBy(data.camiones.filter((c) => c.patente), ['patente']);
    report.duplicates.camiones_por_patente = byPatente.map(([k, g]) => ({
      key: k, count: g.length, ids: g.map((x) => x.id),
    }));
    report.nullRequired.camiones = countNulls(data.camiones, ['patente', 'marca', 'modelo']);
  }

  // --- Duplicados rutas ---
  if (data.rutas) {
    const sig = (r) =>
      `${norm(r.origen)}|${norm(r.destino)}|${norm(r.cliente_id)}|${norm(r.conductor_id)}|${norm(r.camion_id)}|${(r.fecha_creacion || '').slice(0, 10)}`;
    const map = new Map();
    for (const r of data.rutas) {
      const k = sig(r);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(r);
    }
    report.duplicates.rutas_por_firma_operativa = [...map.entries()]
      .filter(([, g]) => g.length > 1)
      .map(([k, g]) => ({ key: k, count: g.length, ids: g.map((x) => x.id) }));

    const byNombre = groupBy(data.rutas.filter((r) => r.nombre_ruta), ['nombre_ruta']);
    report.duplicates.rutas_por_nombre = byNombre.slice(0, 20).map(([k, g]) => ({
      key: k, count: g.length, ids: g.map((x) => x.id),
    }));
    report.nullRequired.rutas = countNulls(data.rutas, ['origen', 'destino', 'cliente_id', 'estado']);
  }

  // --- Usuarios de prueba ---
  if (data.usuarios) {
    report.testUsers = data.usuarios
      .filter((u) =>
        TEST_EMAIL_PATTERNS.some((p) => p.test(u.email || '')) ||
        TEST_NAME_PATTERNS.some((p) => p.test(u.nombre || '')),
      )
      .map((u) => ({ id: u.id, email: u.email, nombre: u.nombre, rol: u.rol, activo: u.activo }));
    report.nullRequired.usuarios = countNulls(data.usuarios, ['email', 'password', 'rol']);
  }

  // --- Datos basura ---
  const junk = { clientes: [], conductores: [], rutas: [], camiones: [] };
  if (data.clientes) {
    junk.clientes = data.clientes
      .filter((c) =>
        TEST_NAME_PATTERNS.some((p) => p.test(c.nombre || '')) ||
        TEST_EMAIL_PATTERNS.some((p) => p.test(c.contacto_email || '')) ||
        /^0{5,}/.test(c.rut || '') ||
        norm(c.nombre) === 'asdf',
      )
      .map((c) => ({ id: c.id, nombre: c.nombre, rut: c.rut, email: c.contacto_email }));
  }
  if (data.conductores) {
    junk.conductores = data.conductores
      .filter((c) =>
        TEST_NAME_PATTERNS.some((p) => p.test(c.nombre || '')) ||
        TEST_EMAIL_PATTERNS.some((p) => p.test(c.email || '')),
      )
      .map((c) => ({ id: c.id, nombre: c.nombre, rut: c.rut, email: c.email }));
  }
  if (data.rutas) {
    junk.rutas = data.rutas
      .filter((r) =>
        TEST_NAME_PATTERNS.some((p) => p.test(r.origen || '')) ||
        TEST_NAME_PATTERNS.some((p) => p.test(r.destino || '')) ||
        TEST_NAME_PATTERNS.some((p) => p.test(r.nombre_ruta || '')),
      )
      .map((r) => ({ id: r.id, origen: r.origen, destino: r.destino, nombre_ruta: r.nombre_ruta }));
  }
  report.testData = junk;

  // --- Huérfanos FK ---
  const clienteIds = new Set((data.clientes || []).map((c) => c.id));
  const usuarioIds = new Set((data.usuarios || []).map((u) => u.id));
  const conductorIds = new Set((data.conductores || []).map((c) => c.id));
  const camionIds = new Set((data.camiones || []).map((c) => c.id));
  const rutaIds = new Set((data.rutas || []).map((r) => r.id));
  const plantillaIds = new Set((data.rutas_plantilla || []).map((p) => p.id));

  if (data.clientes) {
    report.orphans.clientes_usuario_id = data.clientes
      .filter((c) => c.usuario_id && !usuarioIds.has(c.usuario_id))
      .map((c) => ({ id: c.id, usuario_id: c.usuario_id }));
  }
  if (data.rutas) {
    report.orphans.rutas_cliente_id = data.rutas
      .filter((r) => r.cliente_id && !clienteIds.has(r.cliente_id))
      .map((r) => ({ id: r.id, cliente_id: r.cliente_id }));
    report.orphans.rutas_conductor_id = data.rutas
      .filter((r) => r.conductor_id && !conductorIds.has(r.conductor_id))
      .map((r) => ({ id: r.id, conductor_id: r.conductor_id }));
    report.orphans.rutas_camion_id = data.rutas
      .filter((r) => r.camion_id && !camionIds.has(r.camion_id))
      .map((r) => ({ id: r.id, camion_id: r.camion_id }));
    report.orphans.rutas_plantilla_id = data.rutas
      .filter((r) => r.ruta_plantilla_id && !plantillaIds.has(r.ruta_plantilla_id))
      .map((r) => ({ id: r.id, ruta_plantilla_id: r.ruta_plantilla_id }));
  }
  if (data.entregas) {
    report.orphans.entregas_ruta_id = data.entregas
      .filter((e) => e.ruta_id && !rutaIds.has(e.ruta_id))
      .map((e) => ({ id: e.id, ruta_id: e.ruta_id }));
    report.orphans.entregas_cliente_id = data.entregas
      .filter((e) => e.cliente_id && !clienteIds.has(e.cliente_id))
      .map((e) => ({ id: e.id, cliente_id: e.cliente_id }));
  }
  if (data.pagos_cliente) {
    report.orphans.pagos_cliente_id = data.pagos_cliente
      .filter((p) => p.cliente_id && !clienteIds.has(p.cliente_id))
      .map((p) => ({ id: p.id, cliente_id: p.cliente_id }));
    report.orphans.pagos_pedido_id = data.pagos_cliente
      .filter((p) => p.pedido_id && !rutaIds.has(p.pedido_id))
      .map((p) => ({ id: p.id, pedido_id: p.pedido_id }));
  }
  if (data.rutas_paradas) {
    report.orphans.rutas_paradas = data.rutas_paradas
      .filter((p) => p.ruta_id && !rutaIds.has(p.ruta_id))
      .map((p) => ({ id: p.id, ruta_id: p.ruta_id }));
  }
  if (data.rutas_plantilla_paradas) {
    report.orphans.plantilla_paradas = data.rutas_plantilla_paradas
      .filter((p) => p.ruta_id && !plantillaIds.has(p.ruta_id))
      .map((p) => ({ id: p.id, ruta_id: p.ruta_id }));
  }
  if (data.historial_estados) {
    report.orphans.historial_ruta_id = data.historial_estados
      .filter((h) => h.ruta_id && !rutaIds.has(h.ruta_id))
      .map((h) => ({ id: h.id, ruta_id: h.ruta_id }));
  }
  if (data.traceability_events) {
    report.orphans.traceability_ruta_id = data.traceability_events
      .filter((t) => t.ruta_id && !rutaIds.has(t.ruta_id))
      .map((t) => ({ id: t.id, ruta_id: t.ruta_id }));
  }

  // --- Protegidos (no eliminar) ---
  const pagosPagados = (data.pagos_cliente || []).filter((p) => p.estado === 'PAGADO');
  const rutasConEntrega = new Set((data.entregas || []).map((e) => e.ruta_id).filter(Boolean));
  const rutasConHistorial = new Set((data.historial_estados || []).map((h) => h.ruta_id).filter(Boolean));
  const rutasConTrazabilidad = new Set((data.traceability_events || []).map((t) => t.ruta_id).filter(Boolean));
  const rutasConPago = new Set(
    (data.pagos_cliente || [])
      .filter((p) => p.pedido_id)
      .map((p) => p.pedido_id),
  );
  const clientesConPago = new Set((data.pagos_cliente || []).map((p) => p.cliente_id));

  report.protected = {
    pagos_cliente_total: (data.pagos_cliente || []).length,
    pagos_pagados: pagosPagados.length,
    pagos_pagados_ids: pagosPagados.map((p) => p.id),
    rutas_con_entrega: rutasConEntrega.size,
    rutas_con_historial: rutasConHistorial.size,
    rutas_con_trazabilidad: rutasConTrazabilidad.size,
    clientes_con_pagos: clientesConPago.size,
    empresa_demo_id: '99426706-6706-44aa-9954-3617b583bb0d',
    portal_demo_email: 'portal.cliente@logitrack.cl',
  };

  // Safe-to-delete candidates: junk rutas without entregas/pagos/historial/trazabilidad
  const junkRutaIds = new Set(junk.rutas.map((r) => r.id));
  report.safeDeleteCandidates = {
    rutas_basura_sin_dependencias: [...junkRutaIds].filter(
      (id) =>
        !rutasConEntrega.has(id) &&
        !rutasConHistorial.has(id) &&
        !rutasConTrazabilidad.has(id) &&
        !rutasConPago.has(id),
    ),
    usuarios_prueba: report.testUsers.map((u) => u.id),
    clientes_basura_ids: junk.clientes.map((c) => c.id),
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
