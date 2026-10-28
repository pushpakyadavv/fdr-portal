// js/page-renewal.js
(async function () {
  const me = await Auth.guard();
  if (!me) return;

  document.getElementById('sidebar').innerHTML = renderSidebar('renewal', me);
  document.getElementById('topbar').innerHTML =
    `<div><strong>Renewals</strong></div><div class="muted">${esc(me.user.email)}</div>`;

  const all = await Store.list('fdr_with_trust', q => q.order('maturity_date', { ascending: true }));
  const candidates = all.filter(f =>
    f.status === 'active' &&
    (f.days_to_maturity <= 30 || f.days_to_maturity < 0)
  );

  const cols = [
    { label: 'Ref No', key: 'ref_no' },
    { label: 'Institution', render: r => esc(r.institution_name) },
    { label: 'Bank', key: 'bank_name' },
    { label: 'Amount', render: r => esc(fmtINR(r.amount)) },
    { label: 'Maturity', render: r => esc(fmtDate(r.maturity_date)) },
    { label: 'Days', render: r => {
        const d = Number(r.days_to_maturity);
        const cls = d < 0 ? 'badge-red' : 'badge-amber';
        return `<span class="badge ${cls}">${esc(d)}</span>`;
      } },
    { label: '', render: r => {
        if (!Auth.can('renew_request', me.role)) return '';
        return `<button class="btn btn-primary btn-sm" data-renew="${esc(r.id)}">Start Renewal</button>`;
      } }
  ];

  renderTable(document.getElementById('renewals-table'), cols, candidates);

  document.getElementById('renewals-table').addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-renew]');
    if (!btn) return;
    const fdrId = btn.dataset.renew;
    const fdr = candidates.find(f => f.id === fdrId);
    if (!fdr) return;
    openRenewalModal(fdr);
  });

  function openRenewalModal(fdr) {
    const modal = document.getElementById('modal');
    modal.innerHTML = `
      <div class="modal-card">
        <h3>Renew FDR ${esc(fdr.ref_no)}</h3>
        <p class="muted">${esc(fdr.institution_name)} · ${esc(fmtINR(fdr.amount))}</p>
        <form id="renew-form">
          <label>New Ref No <input id="r-ref" required></label>
          <label>Bank <input id="r-bank" value="${esc(fdr.bank_name)}" required></label>
          <label>Amount <input id="r-amount" type="number" value="${esc(fdr.amount)}" required></label>
          <label>Issue Date <input id="r-issue" type="date" required></label>
          <label>Maturity Date <input id="r-maturity" type="date" required></label>
          <div class="modal-actions">
            <button type="button" class="btn btn-ghost" id="r-cancel">Cancel</button>
            <button type="submit" class="btn btn-primary">Submit Renewal</button>
          </div>
        </form>
      </div>`;
    modal.classList.add('open');

    document.getElementById('r-cancel').addEventListener('click', () => {
      modal.classList.remove('open'); modal.innerHTML = '';
    });

    document.getElementById('renew-form').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const newRef = document.getElementById('r-ref').value.trim();
      const bank = document.getElementById('r-bank').value.trim();
      const amount = Number(document.getElementById('r-amount').value);
      const issue = document.getElementById('r-issue').value;
      const maturity = document.getElementById('r-maturity').value;
      if (new Date(maturity) <= new Date(issue)) return toast('Maturity must be after issue', 'warn');

      try {
        const created = await Store.insert('fdr_instruments', {
          institution_id: fdr.institution_id,
          ref_no: newRef, bank_name: bank, amount,
          issue_date: issue, maturity_date: maturity,
          status: 'active', verification_state: 'claimed',
          parent_fdr_id: fdr.id
        });
        await Store.update('fdr_instruments', fdr.id, { status: 'renewed' });
        await Store.insert('workflow_tasks', {
          fdr_id: created.id, task_type: 'renewal', state: 'completed',
          notes: `Renewal of ${fdr.ref_no}`
        });
        await Audit.log('renewal', 'fdr_instruments', created.id, { replaced: fdr.id });
        toast('Renewal recorded', 'success');
        modal.classList.remove('open'); modal.innerHTML = '';
        setTimeout(() => location.reload(), 700);
      } catch (err) { toast(safeError(err), 'error'); }
    });
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