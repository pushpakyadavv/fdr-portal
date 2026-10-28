// js/verify.js — pluggable adapters
const Verifiers = {
  mock_bank_api: {
    async verify(fdr) {
      await new Promise(r => setTimeout(r, 900));
      const seed = [...fdr.ref_no].reduce((a,c) => a + c.charCodeAt(0), 0) % 100;
      if (seed < 70) return { result:'verified', evidence:{ bank:fdr.bank_name, amount:fdr.amount } };
      if (seed < 85) return { result:'mismatch', evidence:{ expected:fdr.amount, actual:Number(fdr.amount)-5000, note:'Amount differs' } };
      return { result:'source_unavailable', evidence:{ reason:'Bank API timeout' } };
    }
  },
  qr_checksum: {
    async verify() {
      await new Promise(r => setTimeout(r, 600));
      return { result:'verified', evidence:{ checksum:'sha256:qr-valid', offline:true } };
    }
  }
};

const Verify = {
  async run(source, fdr) {
    const adapter = Verifiers[source];
    if (!adapter) throw new Error('Unknown verifier');
    const out = await adapter.verify(fdr);
    const stateMap = { verified:'bank_verified', mismatch:'mismatch', source_unavailable:'claimed', manual_review:'claimed' };
    const newState = stateMap[out.result] || 'claimed';

    await Store.update('fdr_instruments', fdr.id, { verification_state: newState });
    await Store.insert('verification_records', {
      fdr_id: fdr.id, source, result: out.result, evidence: out.evidence
    });
    await Audit.log('verify', 'fdr_instruments', fdr.id, { source, result: out.result, new_state: newState });
    return { ...out, newState };
  }
};
window.Verifiers = Verifiers;
window.Verify = Verify;