// DEPRECATED: Mobile Supabase client should not be used.
// All data operations must go through backend API with JWT authentication.
// This file is kept only for backward compatibility during migration.

// Fallback stub to prevent crashes in legacy code
export const supabase = {
  from: () => ({
    select: () => Promise.reject(new Error("Use backend API instead")),
    insert: () => Promise.reject(new Error("Use backend API instead")),
    update: () => Promise.reject(new Error("Use backend API instead")),
    delete: () => Promise.reject(new Error("Use backend API instead")),
  }),
  storage: {
    from: () => ({
      upload: () => Promise.reject(new Error("Use backend API instead")),
      download: () => Promise.reject(new Error("Use backend API instead")),
      getPublicUrl: () => ({ publicUrl: null, error: new Error("Use backend API instead") }),
    }),
  },
  channel: () => ({
    on: () => ({ subscribe: () => {}, unsubscribe: () => {} }),
  }),
  removeChannel: () => {},
};