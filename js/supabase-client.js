// js/supabase-client.js
(function () {
  const c = window.APP_CONFIG;
  if (!window.supabase) { console.error('Supabase SDK not loaded'); return; }
  window.sb = window.supabase.createClient(c.SUPABASE_URL, c.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
})();