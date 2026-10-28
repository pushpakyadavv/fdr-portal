// js/coverage.js — Coverage Gap Detector (server-agnostic, read-only input)
const Coverage = {
  buildSegments(fdrs, required) {
    const active = fdrs.filter(f =>
      f.status !== 'released' && f.issue_date && f.maturity_date
    ).sort((a,b) => new Date(a.issue_date) - new Date(b.issue_date));
    if (!active.length) return [];

    const points = new Set();
    active.forEach(f => {
      points.add(f.issue_date);
      points.add(f.maturity_date);
    });
    const sorted = [...points].sort();

    const segs = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      const start = sorted[i], end = sorted[i+1];
      const covered = active.filter(f =>
        new Date(f.issue_date) <= new Date(start) && new Date(f.maturity_date) >= new Date(end)
      ).reduce((s,f) => s + Number(f.amount), 0);

      segs.push({
        start, end, covered, required,
        ok: covered >= required,
        gap: covered < required,
        overlap: covered > required * 1.5
      });
    }
    return segs;
  },

  findGaps(fdrs, required) {
    return this.buildSegments(fdrs, required).filter(s => s.gap).map(s => ({
      ...s,
      days: Math.round((new Date(s.end) - new Date(s.start)) / 86400000),
      shortfall: required - s.covered
    }));
  },

  summarize(institutionId, fdrs, required) {
    const gaps = this.findGaps(fdrs, required);
    return {
      institutionId,
      gapCount: gaps.length,
      totalGapDays: gaps.reduce((s,g) => s + g.days, 0),
      gaps,
      worstGap: gaps.sort((a,b) => b.days - a.days)[0] || null
    };
  },

  renderTimeline(container, fdrs, required) {
    const segs = this.buildSegments(fdrs, required);
    if (!segs.length) { container.innerHTML = '<p class="muted">No instruments.</p>'; return; }
    const min = new Date(segs[0].start).getTime();
    const max = new Date(segs[segs.length-1].end).getTime();
    const span = max - min || 1;

    const bars = segs.map(s => {
      const left = ((new Date(s.start) - min) / span) * 100;
      const width = ((new Date(s.end) - new Date(s.start)) / span) * 100;
      const cls = s.gap ? 'seg-gap' : (s.overlap ? 'seg-overlap' : 'seg-ok');
      const label = s.gap ? `GAP ₹${(s.required - s.covered).toLocaleString('en-IN')}` : fmtINR(s.covered);
      return `<div class="seg ${cls}" style="left:${left}%;width:${width}%"
        title="${esc(s.start)} → ${esc(s.end)} | covered ${fmtINR(s.covered)} / required ${fmtINR(s.required)}">
        <span>${label}</span></div>`;
    }).join('');

    container.innerHTML = `
      <div class="timeline">
        <div class="timeline-track">${bars}</div>
        <div class="timeline-legend">
          <span><i class="dot seg-ok"></i> Covered</span>
          <span><i class="dot seg-gap"></i> Gap</span>
          <span><i class="dot seg-overlap"></i> Over-covered</span>
          <span class="muted">Required: ${fmtINR(required)}</span>
        </div>
      </div>`;
  }
};
window.Coverage = Coverage;