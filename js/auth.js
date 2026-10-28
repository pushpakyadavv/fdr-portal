// js/auth.js — Supabase magic-link auth + role from profiles
const Auth = {
  async sendMagicLink(email) {
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: location.origin + '/dashboard.html' }
    });
    if (error) throw error;
  },

  async current() {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;
    const { data: profile } = await sb.from('profiles').select('*').eq('id', user.id).single();
    return { user, profile, role: profile?.role || 'institution' };
  },

  async guard(requiredRoles = null) {
    const u = await this.current();
    if (!u) { location.href = 'index.html'; return null; }
    if (requiredRoles && !requiredRoles.includes(u.role)) {
      alert('Access denied for your role.');
      location.href = 'dashboard.html';
      return null;
    }
    return u;
  },

  async logout() {
    await sb.auth.signOut();
    location.href = 'index.html';
  },

  can(action, role) {
    const map = {
      upload:        ['institution'],
      renew_request: ['institution'],
      release_request:['institution'],
      verify:        ['officer','admin'],
      approve_release:['officer','admin'],
      view_audit:    ['officer','admin'],
      demo_tamper:   ['admin']
    };
    return (map[action] || []).includes(role);
  }
};
window.Auth = Auth;