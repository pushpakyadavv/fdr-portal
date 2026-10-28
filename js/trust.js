// js/trust.js — display only; scores come from Postgres view
const Trust = {
  STATES: {
    bank_verified: { label:'Bank-Confirmed', badge:'badge-green', icon:'🟢' },
    doc_verified:  { label:'Doc-Verified',   badge:'badge-blue',  icon:'🟡' },
    claimed:       { label:'Institution-Claimed', badge:'badge-amber', icon:'🟠' },
    mismatch:      { label:'Discrepancy Flagged', badge:'badge-red', icon:'🔴' }
  },
  badge(state) {
    const s = this.STATES[state] || this.STATES.claimed;
    return `<span class="badge ${s.badge}">${s.icon} ${s.label}</span>`;
  },
  riskBadge(score) {
    if (score >= 60) return `<span class="badge badge-red">⚠️ At Risk (${score})</span>`;
    if (score >= 30) return `<span class="badge badge-amber">Watch (${score})</span>`;
    return `<span class="badge badge-green">Healthy (${score})</span>`;
  },
  computeRisk(fdrs, gaps) {
    let r = 0;
    const now = Date.now();
    fdrs.forEach(f => {
      const d = (new Date(f.maturity_date) - now) / 86400000;
      if (d >= 0 && d < 30) r += 20;
      if (f.verification_state === 'claimed') r += 15;
      if (f.verification_state === 'mismatch') r += 30;
    });
    r += Math.min((gaps?.totalGapDays || 0) / 2, 40);
    return Math.min(100, Math.round(r));
  }
};
window.Trust = Trust;