(async function () {
  const me = await Auth.guard();
  if (!me) return;
  document.getElementById('sidebar').innerHTML = renderSidebar('dashboard', me);
  document.getElementById('topbar').innerHTML = renderTopbar(me);

  const insts = await Store.list('institution_trust_summary');
  const fdrs = await Store.list('fdr_with_trust');

  // KPI cards
  const active = fdrs.filter(f => f.status === 'active');
  const expiring = active.filter(f => f.days_to_maturity >= 0 && f.days_to_maturity <= 30);
  const mismatched = active.filter(f => f.verification_state === 'mismatch');
  const claimed = active.filter(f => f.verification_state === 'claimed');

  document.getElementById('kpis').innerHTML = [
    kpi('Active FDRs', active.length, ''),
    kpi('Expiring (30d)', expiring.length, 'warn'),
    kpi('Pending Verification', claimed.length, 'amber'),
    kpi('Discrepancies', mismatched.length, 'red')
  ].join('');

  // Timelines per institution
  const tGrid = document.getElementById('timelines');
  tGrid.innerHTML = '';
  for (const inst of insts) {
    const iFdrs = fdrs.filter(f => f.institution_id === inst.institution_id);
    const wrap = document.createElement('div');
    wrap.className = 'timeline-card';
    wrap.innerHTML = `
      <div class="timeline-head">
        <strong>${esc(inst.name)}</strong>
        <span class="muted">${esc(inst.aicte_id)} · ${esc(inst.region)}</span>
        ${Trust.riskBadge(Trust.computeRisk(iFdrs, Coverage.summarize(inst.institution_id, iFdrs, inst.required_coverage)))}
      </div>`;
    const tl = document.createElement('div');
    wrap.appendChild(tl);
    tGrid.appendChild(wrap);
    Coverage.renderTimeline(tl, iFdrs, inst.required_coverage);
  }

  // Alerts
  await Alerts.sweep();
  const notifs = await Store.list('notifications', q => q.eq('is_read', false).order('created_at',{ascending:false}).limit(20));
  document.getElementById('alerts').innerHTML = notifs.length
    ? notifs.map(n => `<div class="alert-row alert-${esc(n.severity)}">
        <span class="alert-badge">${esc(n.severity)}</span>
        <span>${esc(n.message)}</span>
        <span class="muted">${fmtDate(n.created_at)}</span>
      </div>`).join('')
    : '<p class="muted">No alerts.</p>';

  function kpi(label, val, tone) {
    return `<div class="kpi ${tone ? 'kpi-'+tone : ''}">
      <div class="kpi-val">${esc(val)}</div>
      <div class="kpi-label">${esc(label)}</div>
    </div>`;
  }

  function renderSidebar(active, me) {
    const items = [
      ['dashboard','Dashboard','dashboard.html'],
      ['instruments','Instruments','instruments.html'],
      ['renewal','Renewals','renewal.html'],
      ['release','Releases','release.html'],
      ['reports','Reports','reports.html'],
      ['audit','Audit Trail','audit.html']
    ];
    return `<div class="side-brand"><img src="assets/logo.svg" alt=""> <span>FDR Portal</span></div>
      <nav>${items.map(([k,l,h]) => `<a href="${h}" class="${active===k?'active':''}">${l}</a>`).join('')}</nav>
      <div class="side-foot"><span>${esc(me.role)}</span>
      <button class="btn btn-ghost" onclick="Auth.logout()">Logout</button></div>`;
  }
  function renderTopbar(me) {
    return `<div><strong>Dashboard</strong></div>
      <div class="muted">${esc(me.user.email)}</div>`;
  }
})();