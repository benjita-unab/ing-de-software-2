// src/lib/supabaseClient.js
// ─────────────────────────────────────────────────────────────────────────────
// DEPRECATED: este módulo se mantiene SOLO como stub para no romper
// componentes legados que aún hacían `import { supabase } from "./supabaseClient"`.
//
// Toda la lógica crítica del frontend debe consumir el backend NestJS a través
// de `apiClient.js`. Cualquier llamada a `supabase.from(...)`, `supabase.storage`
// o `supabase.channel(...)` que sobreviva en componentes antiguos resolverá a
// `{ data: null, error }` para que la UI muestre un mensaje sin crashear.
// ─────────────────────────────────────────────────────────────────────────────

const ERR_MESSAGE = "Operación deshabilitada: usar el backend (apiClient).";

function makeQueryBuilder() {
  const result = {
    data: null,
    error: { message: ERR_MESSAGE },
  };

  const builder = {
    select: () => builder,
    insert: () => builder,
    update: () => builder,
    upsert: () => builder,
    delete: () => builder,
    eq: () => builder,
    neq: () => builder,
    in: () => builder,
    is: () => builder,
    not: () => builder,
    gt: () => builder,
    gte: () => builder,
    lt: () => builder,
    lte: () => builder,
    like: () => builder,
    ilike: () => builder,
    match: () => builder,
    or: () => builder,
    and: () => builder,
    order: () => builder,
    limit: () => builder,
    range: () => builder,
    single: () => builder,
    maybeSingle: () => builder,
    then: (onFulfilled, onRejected) =>
      Promise.resolve(result).then(onFulfilled, onRejected),
    catch: (onRejected) => Promise.resolve(result).catch(onRejected),
    finally: (cb) => Promise.resolve(result).finally(cb),
  };

  return builder;
}

const storageBucket = {
  upload: () => Promise.resolve({ data: null, error: { message: ERR_MESSAGE } }),
  download: () => Promise.resolve({ data: null, error: { message: ERR_MESSAGE } }),
  remove: () => Promise.resolve({ data: null, error: { message: ERR_MESSAGE } }),
  list: () => Promise.resolve({ data: null, error: { message: ERR_MESSAGE } }),
  getPublicUrl: () => ({ data: { publicUrl: null }, error: { message: ERR_MESSAGE } }),
};

const channelStub = {
  on: () => channelStub,
  subscribe: () => channelStub,
  unsubscribe: () => Promise.resolve("ok"),
};

export const supabase = {
  from: () => makeQueryBuilder(),
  storage: {
    from: () => storageBucket,
  },
  channel: () => channelStub,
  removeChannel: () => Promise.resolve("ok"),
  auth: {
    getSession: () =>
      Promise.resolve({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({
      data: { subscription: { unsubscribe: () => {} } },
    }),
    signOut: () => Promise.resolve({ error: null }),
  },
};
