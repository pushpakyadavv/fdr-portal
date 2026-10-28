// js/page-release.js
(async function () {
  const me = await Auth.guard();
  if (!me) return;

  document.getElementById('sidebar').innerHTML = renderSidebar('release', me);
  document.getElementById('topbar').innerHTML =
    `<div><strong>Release / Refund Workflow</strong></div><div class="muted">${esc(me.user.email)}</div>`;

  const tasks = await Store.list('workflow_tasks', q => q.eq('task_type','release').order('created_at',{ascending:false}));
  const fdrs = await Store.list('fdr_with_trust');

  const cols = [
    { label: 'Task', render: r => esc(r.id.slice(0,8)) },
    { label: 'FDR', render: r => {
        const f = fdrs.find(x => x.id === r.fdr_id);
        return f ? esc(f.ref_no) : '—';
      } },
    { label: 'Institution', render: r => {
        const f = fdrs.find(x => x.id === r.fdr_id);
        return f ? esc(f.institution_name) : '—';
      } },
    { label: 'State', render: r => {
        const cls = { pending:'badge-amber', in_review:'badge-blue',
                      approved:'badge-green', rejected:'badge-red', completed:'badge-green' }[r.state] || 'badge-blue';
        return `<span class="badge ${cls}">${esc(r.state)}</span>`;
      } },
    { label: 'Requested', render: r => esc(fmtDate(r.created_at)) },
    { label: 'Actions', render: r => {
        if (Auth.can('approve_release', me.role) && (r.state === 'pending' || r.state === 'in_review')) {
          return `<button class="btn btn-primary btn-sm" data-approve="${esc(r.id)}">Approve</button>
                  <button class="btn btn-danger btn-sm" data-reject="${esc(r.id)}">Reject</button>`;
        }
        return '';
      } }
  ];

  renderTable(document.getElementById('release-table'), cols, tasks);

  document.getElementById('release-table').addEventListener('click', async (e) => {
    const approve = e.target.closest('button[data-approve]');
    const reject = e.target.closest('button[data-reject]');
    if (approve) await act(approve.dataset.approve, 'approved');
    if (reject) await act(reject.dataset.reject, 'rejected');
  });

  async function act(taskId, state) {
    try {
      const task = await Store.get('workflow_tasks', taskId);
      await Store.update('workflow_tasks', taskId, { state });
      if (state === 'approved') {
        await Store.update('fdr_instruments', task.fdr_id, { status: 'released' });
      }
      await Audit.log('release_' + state, 'workflow_tasks', taskId, { fdr: task.fdr_id });
      toast(`Release ${state}`, state === 'approved' ? 'success' : 'warn');
      setTimeout(() => location.reload(), 700);
    } catch (err) { toast(safeError(err), 'error'); }
  }

  // New request form (institution role)
  if (Auth.can('release_request', me.role)) {
    document.getElementById('new-request').style.display = 'block';
    const myFdrs = await Store.list('fdr_with_trust', q => q.eq('status','active'));
    document.getElementById('req-fdr').innerHTML = myFdrs.map(f =>
      `<option value="${esc(f.id)}">${esc(f.ref_no)} — ${esc(f.institution_name)}</option>`).join('');

    document.getElementById('req-form').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const fdrId = document.getElementById('req-fdr').value;
      const note = document.getElementById('req-note').value.trim();
      if (!fdrId) return toast('Select an FDR', 'warn');
      try {
        await Store.insert('workflow_tasks', {
          fdr_id: fdrId, task_type: 'release', state: 'pending', notes: note,
          checklist: [{ item: 'No dues', done: false }, { item: 'NOC attached', done: false }]
        });
        await Audit.log('release_request', 'workflow_tasks', fdrId, { note });
        toast('Release request submitted', 'success');
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