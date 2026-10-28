// js/page-reports.js
(async function () {
  const me = await Auth.guard();
  if (!me) return;

  document.getElementById('sidebar').innerHTML = renderSidebar('reports', me);
  document.getElementById('topbar').innerHTML =
    `<div><strong>Reports</strong></div><div class="muted">${esc(me.user.email)}</div>`;

  const fdrs = await Store.list('fdr_with_trust');
  const docs = await Store.list('documents');
  const now = Date.now();

  // 1. Pending verifications
  const pendingVerify = fdrs.filter(f => f.status === 'active' && f.verification_state === 'claimed');
  // 2. Upcoming maturity (<=90 days)
  const upcoming = fdrs.filter(f => f.status === 'active' && f.days_to_maturity >= 0 && f.days_to_maturity <= 90)
    .sort((a,b) => a.days_to_maturity - b.days_to_maturity);
  // 3. Missing documents
  const fdrWithDocs = new Set(docs.map(d => d.fdr_id));
  const missingDocs = fdrs.filter(f => !fdrWithDocs.has(f.id));
  // 4. Requiring intervention (mismatch OR expired OR gap)
  const mismatchOrExpired = fdrs.filter(f =>
    f.verification_state === 'mismatch' || (f.status === 'active' && f.days_to_maturity < 0));

  renderSection('r-pending', pendingVerify, [
    { label: 'Ref No', key: 'ref_no' },
    { label: 'Institution', key: 'institution_name' },
    { label: 'Amount', render: r => esc(fmtINR(r.amount)) },
    { label: 'Maturity', render: r => esc(fmtDate(r.maturity_date)) }
  ]);

  renderSection('r-upcoming', upcoming, [
    { label: 'Ref No', key: 'ref_no' },
    { label: 'Institution', key: 'institution_name' },
    { label: 'Days', render: r => `<span class="badge badge-amber">${esc(r.days_to_maturity)}</span>` },
    { label: 'Maturity', render: r => esc(fmtDate(r.maturity_date)) }
  ]);

  renderSection('r-missing', missingDocs, [
    { label: 'Ref No', key: 'ref_no' },
    { label: 'Institution', key: 'institution_name' },
    { label: 'Bank', key: 'bank_name' },
    { label: 'Status', key: 'status' }
  ]);

  renderSection('r-intervention', mismatchOrExpired, [
    { label: 'Ref No', key: 'ref_no' },
    { label: 'Institution', key: 'institution_name' },
    { label: 'Trust', render: r => Trust.badge(r.verification_state) },
    { label: 'Days', render: r => `<span class="badge ${r.days_to_maturity < 0 ? 'badge-red' : 'badge-amber'}">${esc(r.days_to_maturity)}</span>` }
  ]);

  document.querySelectorAll('[data-export]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.export;
      const rows = { pending: pendingVerify, upcoming, missing: missingDocs, intervention: mismatchOrExpired }[key] || [];
      const header = ['Ref No','Institution','Bank','Amount','Maturity','Status','Trust'];
      const csv = [header.join(',')].concat(rows.map(r => [
        `"${r.ref_no}"`,`"${r.institution_name}"`,`"${r.bank_name}"`,
        r.amount, r.maturity_date, r.status, r.verification_state
      ].join(','))).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `report-${key}.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
  });

  function renderSection(id, rows, cols) {
    const el = document.getElementById(id);
    const counter = document.getElementById(id + '-count');
    if (counter) counter.textContent = rows.length;
    renderTable(el, cols, rows);
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
})();