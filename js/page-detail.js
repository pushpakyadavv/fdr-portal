// js/page-detail.js
(async function () {
  const me = await Auth.guard();
  if (!me) return;
  const id = new URLSearchParams(location.search).get('id');
  if (!id) { location.href = 'instruments.html'; return; }

  document.getElementById('sidebar').innerHTML = renderSidebar('instruments', me);
  document.getElementById('topbar').innerHTML =
    `<div><strong>Instrument Detail</strong></div><div class="muted">${esc(me.user.email)}</div>`;

  const fdr = await Store.get('fdr_with_trust', id);
  if (!fdr) { document.getElementById('detail').innerHTML = '<p class="muted">Not found.</p>'; return; }

  // Header
  document.getElementById('detail').innerHTML = `
    <div class="detail-head">
      <div>
        <h2>${esc(fdr.ref_no)}</h2>
        <p class="muted">${esc(fdr.institution_name)} · ${esc(fdr.institution_aicte_id)} · ${esc(fdr.region)}</p>
      </div>
      <div>${Trust.badge(fdr.verification_state)}</div>
    </div>
    <div class="detail-grid">
      <div><span class="muted">Bank</span><strong>${esc(fdr.bank_name)}</strong></div>
      <div><span class="muted">Amount</span><strong>${esc(fmtINR(fdr.amount))}</strong></div>
      <div><span class="muted">Issue Date</span><strong>${esc(fmtDate(fdr.issue_date))}</strong></div>
      <div><span class="muted">Maturity Date</span><strong>${esc(fmtDate(fdr.maturity_date))}</strong></div>
      <div><span class="muted">Status</span><strong>${esc(fdr.status)}</strong></div>
      <div><span class="muted">Trust Score</span><strong>${esc(fdr.trust_score)}</strong></div>
    </div>`;

  // Coverage timeline
  const instFdrs = await Store.list('fdr_with_trust', q => q.eq('institution_id', fdr.institution_id));
  Coverage.renderTimeline(document.getElementById('timeline'), instFdrs, fdr.required_coverage);

  // Action buttons for officers
  const actions = document.getElementById('actions');
  if (Auth.can('verify', me.role) && fdr.verification_state !== 'bank_verified') {
    actions.innerHTML = `
      <button class="btn btn-primary" id="btn-verify">Verify via Bank API</button>
      <button class="btn btn-ghost" id="btn-manual">Mark Manual Review</button>`;
    document.getElementById('btn-verify').addEventListener('click', async (e) => {
      e.target.disabled = true; e.target.textContent = 'Verifying…';
      try {
        const out = await Verify.run('mock_bank_api', fdr);
        toast(`Verification: ${out.result} → ${out.newState}`, out.result === 'verified' ? 'success' : 'warn');
        setTimeout(() => location.reload(), 800);
      } catch (err) { toast(safeError(err), 'error'); e.target.disabled = false; e.target.textContent = 'Verify via Bank API'; }
    });
    document.getElementById('btn-manual').addEventListener('click', async () => {
      const note = prompt('Officer note for manual review:');
      if (note === null) return;
      await Verify.run('qr_checksum', fdr);
      await Audit.log('manual_review', 'fdr_instruments', fdr.id, { note });
      toast('Routed for manual review', 'info');
      setTimeout(() => location.reload(), 600);
    });
  }

  // Documents
  const docs = await Store.list('documents', q => q.eq('fdr_id', fdr.id).order('uploaded_at', { ascending: false }));
  const docContainer = document.getElementById('docs');
  if (docs.length) {
    docContainer.innerHTML = docs.map(d => `
      <div class="doc-row">
        <div>
          <strong>${esc(d.doc_type)}</strong>
          <p class="muted">${esc(d.original_name || '')} · ${esc(fmtDate(d.uploaded_at))}</p>
        </div>
        <button class="btn btn-ghost" data-path="${esc(d.storage_path)}" data-name="${esc(d.original_name || 'file')}">Download</button>
      </div>`).join('');
    docContainer.querySelectorAll('button[data-path]').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          const url = await Store.signedUrl(btn.dataset.path);
          const a = document.createElement('a');
          a.href = url; a.download = btn.dataset.name; a.target = '_blank'; a.rel = 'noopener';
          document.body.appendChild(a); a.click(); a.remove();
        } catch (err) { toast(safeError(err), 'error'); }
      });
    });
  } else {
    docContainer.innerHTML = '<p class="muted">No documents uploaded.</p>';
  }

  // Upload
  if (Auth.can('upload', me.role)) {
    const uploadForm = document.getElementById('upload-form');
    uploadForm.style.display = 'flex';
    uploadForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fileInput = document.getElementById('doc-file');
      const typeInput = document.getElementById('doc-type');
      const file = fileInput.files[0];
      if (!file) return toast('Choose a file', 'warn');
      try {
        await UploadGuard.validate(file);
        const checksum = await UploadGuard.sha256(file);
        const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
        const path = `${fdr.institution_id}/${crypto.randomUUID()}${ext}`;
        await Store.uploadFile(file, path);
        await Store.insert('documents', {
          fdr_id: fdr.id, doc_type: typeInput.value, storage_path: path,
          original_name: file.name, mime_type: file.type,
          size_bytes: file.size, checksum_sha256: checksum
        });
        await Audit.log('doc_upload', 'documents', fdr.id, { path, type: typeInput.value });
        toast('Uploaded', 'success');
        setTimeout(() => location.reload(), 600);
      } catch (err) { toast(err.message || safeError(err), 'error'); }
    });
  }

  // Verification history
  const vrs = await Store.list('verification_records', q => q.eq('fdr_id', fdr.id).order('verified_at', { ascending: false }));
  document.getElementById('verify-history').innerHTML = vrs.length
    ? vrs.map(v => `<div class="history-row">
        <span class="badge badge-blue">${esc(v.source)}</span>
        <span>${esc(v.result)}</span>
        <span class="muted">${esc(fmtDate(v.verified_at))}</span>
      </div>`).join('')
    : '<p class="muted">No verification records.</p>';

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