// js/store.js — thin Supabase wrapper
const Store = {
  async list(table, query) {
    let q = sb.from(table).select('*');
    if (query) q = query(q);
    const { data, error } = await q;
    if (error) throw error;
    return data;
  },
  async get(table, id) {
    const { data, error } = await sb.from(table).select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },
  async insert(table, row) {
    const { data, error } = await sb.from(table).insert(row).select().single();
    if (error) throw error;
    return data;
  },
  async update(table, id, patch) {
    const { data, error } = await sb.from(table).update(patch).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  async uploadFile(file, path) {
    const { error } = await sb.storage.from(window.APP_CONFIG.STORAGE_BUCKET)
      .upload(path, file, { upsert: false, contentType: file.type });
    if (error) throw error;
    return path;
  },
  async signedUrl(path) {
    const { data, error } = await sb.storage.from(window.APP_CONFIG.STORAGE_BUCKET)
      .createSignedUrl(path, window.APP_CONFIG.SIGNED_URL_TTL);
    if (error) throw error;
    return data.signedUrl;
  }
};
window.Store = Store;