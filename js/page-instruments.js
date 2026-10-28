// js/page-instruments.js
(async function () {
  const me = await Auth.guard();
  if (!me) return;

  document.getElementById('sidebar').innerHTML = renderSidebar('instruments', me);
  document.getElementById('topbar').innerHTML =
    `<div><strong>Instruments</strong></div><div class="muted">${esc(me.user.email)}</div>`;

  const filters = { q: '', state: '', status: '', region: '' };

  const searchEl = document.getElementById('f-q');
  const stateEl = document.getElementById('f-state');
  const statusEl = document.getElementById('f-status');
  const regionEl = document.getElementById('f-region');
  const exportBtn = document.getElementById('export-csv');

  async function load() {
    const all = await Store.list('fdr_with_trust', q => q.order('maturity_date', { ascending: true }));
    let rows = all;
    if (filters.q) {
      const q = filters.q.toLowerCase();
      rows = rows.filter(r =>
        (r.ref_no || '').toLowerCase().includes(q) ||
        (r.bank_name || '').toLowerCase().includes(q) ||
        (r.institution_name || '').toLowerCase().includes(q)
      );
    }
    if (filters.state) rows = rows.filter(r => r.verification_state === filters.state);
    if (filters.status) rows = rows.filter(r => r.status === filters.status);
    if (filters.region) rows = rows.filter(r => r.region === filters.region);
    return rows;
  }

  async function render() {
    const rows = await load();
    const cols = [
      { label: 'Ref No', key: 'ref_no' },
      { label: 'Institution', render: r => esc(r.institution_name) },
      { label: 'Bank', key: 'bank_name' },
      { label: 'Amount', render: r => esc(fmtINR(r.amount)) },
      { label: 'Issue', render: r => esc(fmtDate(r.issue_date)) },
      { label: 'Maturity', render: r => esc(fmtDate(r.maturity_date)) },
      { label: 'Days', render: r => {
          const d = Number(r.days_to_maturity);
          const cls = d < 0 ? 'badge-red' : d <= 30 ? 'badge-amber' : 'badge-green';
          return `<span class="badge ${cls}">${esc(d)}</span>`;
        } },
      { label: 'Status', render: r => `<span class="badge badge-blue">${esc(r.status)}</span>` },
      { label: 'Trust', render: r => Trust.badge(r.verification_state) }
    ];
    renderTable(document.getElementById('instruments-table'), cols, rows,
      r => `instrument-detail.html?id=${encodeURIComponent(r.id)}`);
    document.getElementById('count').textContent = `${rows.length} instrument(s)`;
    return rows;
  }

  searchEl.addEventListener('input', () => { filters.q = searchEl.value; render(); });
  stateEl.addEventListener('change', () => { filters.state = stateEl.value; render(); });
  statusEl.addEventListener('change', () => { filters.status = statusEl.value; render(); });
  regionEl.addEventListener('change', () => { filters.region = regionEl.value; render(); });

  exportBtn.addEventListener('click', async () => {
    const rows = await load();
    const header = ['Ref No','Institution','Bank','Amount','Issue','Maturity','Status','Trust'];
    const csv = [header.join(',')].concat(rows.map(r => [
      csvCell(r.ref_no), csvCell(r.institution_name), csvCell(r.bank_name),
      r.amount, r.issue_date, r.maturity_date, r.status, r.verification_state
    ].join(','))).join('\n');
    downloadBlob(csv, 'instruments.csv', 'text/csv');
  });

  function csvCell(v) { return `"${String(v ?? '').replace(/"/g, '""')}"`; }
  function downloadBlob(content, name, type) {
    const blob = new Blob([content], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
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

  await render();
})();