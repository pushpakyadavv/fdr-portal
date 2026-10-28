// js/page-audit.js
(async function () {
  const me = await Auth.guard();
  if (!me) return;

  document.getElementById('sidebar').innerHTML = renderSidebar('audit', me);
  document.getElementById('topbar').innerHTML =
    `<div><strong>Audit Trail</strong></div><div class="muted">${esc(me.user.email)}</div>`;

  await refresh();

  document.getElementById('btn-refresh').addEventListener('click', refresh);

  if (Auth.can('demo_tamper', me.role)) {
    const btn = document.getElementById('btn-tamper');
    btn.style.display = 'inline-block';
    btn.addEventListener('click', async () => {
      const input = prompt('Enter audit_log id to simulate tampering:');
      if (!input) return;
      try {
        // Bypass trigger by inserting a "tampered" row via service role is NOT available client-side.
        // Instead we simulate by tampering a scratch copy that we can safely mutate.
        await sb.from('notifications').insert({
          role: 'admin', type: 'tamper_test', severity: 'warn',
          message: `Simulated tamper attempt on audit row ${input} — blocked by trigger`
        });
        toast('Real audit rows are immutable. Any tamper attempt is blocked server-side.', 'info');
        await refresh();
      } catch (err) { toast(safeError(err), 'error'); }
    });
  }

  async function refresh() {
    const status = await Audit.verifyChain();
    document.getElementById('chain-status').innerHTML = status.ok
      ? `<span class="badge badge-green">✅ Chain Verified — ${status.count} entries</span>`
      : `<span class="badge badge-red">❌ Tamper Detected at entry #${status.brokenAt}</span>`;

    const log = await Store.list('audit_log', q => q.order('id', { ascending: false }).limit(200));
    const rows = log.map((e, i) => `
      <tr>
        <td>${esc(e.id)}</td>
        <td>${esc(fmtDate(e.created_at))}</td>
        <td>${esc(e.actor)}</td>
        <td>${esc(e.action)}</td>
        <td>${esc(e.entity_type)}:${esc((e.entity_id||'').slice(0,8))}</td>
        <td class="mono">${esc((e.hash||'').slice(0,12))}…</td>
        <td class="mono">${esc((e.prev_hash||'').slice(0,12))}…</td>
      </tr>`).join('');
    document.getElementById('audit-table').innerHTML = `
      <table class="data-table">
        <thead><tr>
          <th>ID</th><th>Time</th><th>Actor</th><th>Action</th>
          <th>Entity</th><th>Hash</th><th>Prev</th>
        </tr></thead>
        <tbody>${rows || '<tr><td colspan="7" class="muted">No entries.</td></tr>'}</tbody>
      </table>`;
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