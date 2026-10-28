// js/alerts.js — client sweep (also runs nightly via Edge Function)
const Alerts = {
  async sweep() {
    const fdrs = await Store.list('fdr_with_trust', q => q.eq('status','active'));
    const now = Date.now();
    const created = [];
    for (const f of fdrs) {
      const d = Math.round((new Date(f.maturity_date) - now) / 86400000);
      let severity = null;
      if (d < 0) severity = 'critical';
      else if (d <= 7) severity = 'critical';
      else if (d <= 30) severity = 'warn';
      else if (d <= 90) severity = 'info';
      if (severity) {
        created.push(await Store.insert('notifications', {
          role:'officer', institution_id:f.institution_id, type:'maturity',
          severity, message:`FDR ${f.ref_no} (${f.bank_name}) ${d<0?'expired':`matures in ${d}d`}`,
          entity_id: f.id
        }));
      }
      if (f.verification_state === 'mismatch') {
        created.push(await Store.insert('notifications', {
          role:'officer', institution_id:f.institution_id, type:'discrepancy',
          severity:'critical', message:`Discrepancy on FDR ${f.ref_no}`,
          entity_id: f.id
        }));
      }
    }
    return created;
  }
};
window.Alerts = Alerts;