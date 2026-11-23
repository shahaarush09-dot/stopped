// Every sentence on the site that states a result is generated from the numbers here,
// so the page can never say something the data does not. This file is also inlined into
// the page itself by scripts/build.mjs (the `export` keywords are stripped), and unit tested.

const GROUP_LABEL = {
  SCIENCE: 'what the trial found',
  MONEY: 'money or business reasons',
  ACCRUAL: 'too few patients',
};

export const pct = (x, d = 0) => (x == null || Number.isNaN(x) ? 'n/a' : `${(x * 100).toFixed(d)}%`);
export const pts = (x) => (x == null || Number.isNaN(x) ? 'n/a' : `${x >= 0 ? '+' : '-'}${Math.abs(x * 100).toFixed(1)} points`);
export const fmtP = (p) => (p == null || Number.isNaN(p) ? 'n/a' : p < 0.001 ? '< 0.001' : p.toFixed(3));
export const pText = (p) => (p == null || Number.isNaN(p) ? 'n/a' : p < 0.001 ? '< 0.001' : `= ${p.toFixed(3)}`);
export const fmtOR = (o) => (o == null || !Number.isFinite(o) ? 'n/a' : o.toFixed(2));
export const fmtInt = (n) => (n == null ? 'n/a' : Number(n).toLocaleString('en-US'));

/**
 * Apply the pre-registered reading rule (PREREGISTRATION.md, "How I will read the result").
 * H1 (SCIENCE) predicts rare < common. H2 (MONEY), H3 (ACCRUAL) and H4 (STOPPED, stopping at all)
 * predict rare > common.
 */
export function verdictFor(key, o) {
  const adj = o?.adjusted;
  if (!adj || !Number.isFinite(adj.or)) return { key: 'inconclusive', note: 'not enough data' };
  const expectLower = key === 'SCIENCE';
  const gap = o.rare.p - o.common.p;
  const sig = adj.pHolm < 0.05;
  const lower = adj.or < 1;
  const higher = adj.or > 1;
  const big = Math.abs(gap) >= 0.05;
  if (sig && ((expectLower && higher) || (!expectLower && lower))) return { key: 'contradicted', note: '' };
  if (sig && big && ((expectLower && lower && gap < 0) || (!expectLower && higher && gap > 0))) return { key: 'supported', note: '' };
  if (sig && !big) return { key: 'inconclusive', note: 'detectable but under 5 points' };
  return { key: 'inconclusive', note: '' };
}

export const VERDICT_TEXT = {
  supported: 'Matches my prediction',
  contradicted: 'Opposite of my prediction',
  inconclusive: 'No clear difference',
};

export function headlineFor(res) {
  const s = res.primary.outcomes.SCIENCE;
  const r = pct(s.rare.p), c = pct(s.common.p);
  const v = verdictFor('SCIENCE', s).key;
  if (v === 'supported') return `Only ${r} of rare cancer trials that stopped early stopped because of what they found. For common cancers it was ${c}.`;
  if (v === 'contradicted') return `I expected rare cancer trials to stop less often because of their results. They stopped more often: ${r} against ${c} for common cancers.`;
  return `${r} of rare cancer trials that stopped early stopped because of what they found, against ${c} for common cancers. The registry does not show a clear difference.`;
}

/** The most common non-science reason among rare cancer trials, for the line under the headline. */
const REASON_PHRASE = {
  MONEY: 'money and business decisions',
  ACCRUAL: 'too few patients enrolling',
  WORLD: 'outside events such as a changed standard of care or COVID-19',
  OTHER: 'logistics and other practical problems',
};

/** The most common non-science reason among rare cancer trials, for the line under the headline. */
export function topReasonFor(res) {
  const rare = res.primary.cohorts.rare;
  const entries = Object.entries(rare.byGroup).filter(([g]) => g !== 'SCIENCE').sort((a, b) => b[1] - a[1]);
  if (!entries.length || !rare.stated) return null;
  const [g, k] = entries[0];
  return { group: g, phrase: REASON_PHRASE[g] ?? g.toLowerCase(), share: k / rare.stated };
}

const listWords = (n) => (n === 1 ? 'one' : String(n));

/** The line under the headline: what the set is, how big it is, and how often trials stop at all. */
export function deckFor(res, conditions = []) {
  const p = res.primary;
  const nRareGroups = conditions.filter((c) => c.cohort === 'rare').length;
  const what = `The set is the Phase 2 and 3 trials on ClinicalTrials.gov that started between 2000 and 2023 in ${nRareGroups ? `${listWords(nRareGroups)} rare cancer groups` : 'rare cancers'} or in breast, lung, colorectal and prostate cancer.`;
  const size = ` Of those, ${fmtInt(p.cohorts.rare.stated)} rare and ${fmtInt(p.cohorts.common.stated)} common cancer trials were stopped early and gave a reason.`;
  const st = p.stops;
  const rate = st && st.rare.n && st.common.n
    ? ` Counting every trial that reached an end, ${pct(st.rare.p)} of rare cancer trials were stopped early, against ${pct(st.common.p)} of common ones.`
    : '';
  return `${what}${size}${rate}`;
}

const statsText = (adj) => `odds ratio ${fmtOR(adj.or)}, 95% interval ${fmtOR(adj.lo)} to ${fmtOR(adj.hi)}, adjusted p ${pText(adj.pHolm)}`;

export function outcomeSentence(key, o) {
  const adj = o.adjusted;
  const label = GROUP_LABEL[key];
  const subject = key === 'STOPPED'
    ? { what: 'be stopped early at all', none: 'how often trials were stopped' }
    : { what: `have stopped for ${label}`, none: label };
  if (!adj) return `Not enough trials to compare ${subject.none}.`;
  const stats = statsText(adj);
  const lead = 'Comparing trials with the same type of sponsor and the same phase,';
  if (adj.lo <= 1 && adj.hi >= 1) {
    return `${lead} the data cannot tell rare and common cancer trials apart on this (${stats}).`;
  }
  const dir = adj.or < 1 ? 'less' : 'more';
  const who = key === 'STOPPED' ? 'a rare cancer trial that reached an end was' : 'a rare cancer trial that stopped early was';
  const caveat = adj.pHolm >= 0.05 ? ' The gap does not survive the correction for testing four predictions, so it does not count.' : '';
  return `${lead} ${who} ${dir} likely to ${subject.what} than a common cancer trial (${stats}).${caveat}`;
}

export function missingSentence(res) {
  const p = res.primary;
  const r = p.cohorts.rare.notStated, c = p.cohorts.common.notStated;
  const t = p.missingnessTest;
  const tail = t && t.p < 0.05 ? ' That difference is itself a caution about the comparison.' : ' Reasons were missing at similar rates, so missing reasons are unlikely to explain the gap.';
  return `No reason was given for ${pct(r.p)} of rare cancer trials and ${pct(c.p)} of common cancer trials that stopped early.${tail}`;
}
