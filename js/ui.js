// js/ui.js — safe rendering helpers (XSS-safe)
window.esc = (s) => String(s ?? '')
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;').replace(/'/g,'&#39;');

window.safeError = (e) => {
  console.error('[FDR]', e);
  return 'Something went wrong. Please try again.';
};

window.fmtINR = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
window.fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';

window.toast = (msg, type='info') => {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
};

window.renderTable = (container, columns, rows, rowLinkFn) => {
  if (!rows.length) { container.innerHTML = '<p class="muted">No records.</p>'; return; }
  const thead = `<tr>${columns.map(c => `<th>${esc(c.label)}</th>`).join('')}</tr>`;
  const tbody = rows.map(r => {
    const cells = columns.map(c => {
      const v = c.render ? c.render(r) : esc(r[c.key]);
      return `<td>${v}</td>`;
    }).join('');
    const link = rowLinkFn ? ` data-href="${esc(rowLinkFn(r))}" class="row-link"` : '';
    return `<tr${link}>${cells}</tr>`;
  }).join('');
  container.innerHTML = `<table class="data-table"><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;
  container.querySelectorAll('tr.row-link').forEach(tr => {
    tr.style.cursor = 'pointer';
    tr.addEventListener('click', () => location.href = tr.dataset.href);
  });
};
