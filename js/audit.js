// js/audit.js — client-side log + chain verify (hash computed server-side by trigger)
const Audit = {
  async log(action, entityType, entityId, details = {}) {
    const u = await Auth.current();
    const actor = u?.user?.email || 'system';
    // hash + prev_hash are filled by the DB trigger; we send placeholders
    const { error } = await sb.from('audit_log').insert({
      actor, action, entity_type: entityType, entity_id: String(entityId),
      details, prev_hash: 'pending', hash: 'pending'
    });
    if (error) console.error('audit insert failed', error);
  },

  async verifyChain() {
    const rows = await Store.list('audit_log', q => q.order('id', { ascending: true }));
    for (let i = 0; i < rows.length; i++) {
      const expected = i === 0 ? 'GENESIS' : rows[i-1].hash;
      if (rows[i].prev_hash !== expected) {
        return { ok:false, brokenAt:i, reason:'prev_hash mismatch' };
      }
    }
    return { ok:true, count: rows.length };
  }
};
window.Audit = Audit;