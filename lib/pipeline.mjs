import { assignCohort, isEligibleDesign, normalizeStudy, phaseGroup, sponsorStratum, yearOf } from './cohorts.mjs';
import { classify, GROUPS, CATEGORY_GROUP, PRIORITY_MAIN, PRIORITY_ALT } from './classify.mjs';
import { wilson, twoProportionZ, newcombeDiff, cmh, holm } from './stats.mjs';
import { COHORTS, DESIGN, SOURCES } from '../config/cohorts.mjs';

export const OUTCOMES = ['SCIENCE', 'MONEY', 'ACCRUAL'];
export const GROUP_KEYS = Object.keys(GROUPS);
export const CATEGORY_KEYS = ['SCIENCE', 'FUNDING', 'BUSINESS', 'ACCRUAL', 'LANDSCAPE', 'PANDEMIC', 'OPERATIONAL', 'OTHER', 'NOT_STATED'];

/**
 * Turn raw registry records into analysis rows plus a flow table (how many records
 * fell out at each step, in order, so nothing disappears silently).
 */
export function buildDataset(rawStudies, cfg = COHORTS, design = DESIGN) {
  const flow = {
    retrieved: rawStudies.length,
    duplicates: 0,
    unique: 0,
    excluded: { no_id: 0, status: 0, not_interventional: 0, phase: 0, no_start_date: 0, start_year: 0, no_cohort: 0 },
    kept: 0,
    keptByCohort: { rare: 0, common: 0 },
    keptByStatus: {},
  };
  const seen = new Set();
  const trials = [];
  const allowedStatus = new Set([...design.primaryStatuses, ...design.secondaryStatuses, ...(design.finishedStatuses ?? [])]);
  const borderline = new Set([...cfg.rare, ...cfg.common].filter((g) => g.borderline).map((g) => g.id));

  for (const s of rawStudies) {
    const r = normalizeStudy(s);
    if (!r.nct) { flow.excluded.no_id++; continue; }
    if (seen.has(r.nct)) { flow.duplicates++; continue; }
    seen.add(r.nct);
    flow.unique++;
    if (!allowedStatus.has(r.status)) { flow.excluded.status++; continue; }
    const design_ = isEligibleDesign(r, design);
    if (design_.length) { flow.excluded[design_[0]]++; continue; }
    const c = assignCohort(r.conditions, cfg);
    if (!c.cohort) { flow.excluded.no_cohort++; continue; }

    const main = classify(r.whyStopped, PRIORITY_MAIN);
    const alt = classify(r.whyStopped, PRIORITY_ALT);
    trials.push({
      nct: r.nct,
      title: r.title,
      status: r.status,
      reason: String(r.whyStopped ?? '').replace(/\s+/g, ' ').trim(),
      year: yearOf(r.start),
      phaseGroup: phaseGroup(r.phases),
      sponsorClass: r.sponsorClass,
      stratum: sponsorStratum(r.sponsorClass),
      cohort: c.cohort,
      conditionGroup: c.group,
      nGroups: c.groups.length,
      borderline: borderline.has(c.group),
      category: main.category,
      group: main.group,
      categoryAlt: alt.category,
      groupAlt: alt.group,
      matched: main.matched,
    });
    flow.kept++;
    flow.keptByCohort[c.cohort]++;
    flow.keptByStatus[r.status] = (flow.keptByStatus[r.status] ?? 0) + 1;
  }
  trials.sort((a, b) => (a.nct < b.nct ? -1 : 1));
  return { trials, flow };
}

const prop = (k, n) => ({ k, n, ...wilson(k, n) });

/** One full pass of the pre-registered analysis on a slice of the data. */
export function analyze(trials, { statuses = ['TERMINATED'], priority = 'main', filter = () => true } = {}) {
  const pick = trials.filter((t) => statuses.includes(t.status) && filter(t));
  const gOf = (t) => (priority === 'alt' ? t.groupAlt : t.group);
  const cohorts = {};
  for (const c of ['rare', 'common']) {
    const all = pick.filter((t) => t.cohort === c);
    const stated = all.filter((t) => gOf(t) !== null);
    const byGroup = Object.fromEntries(GROUP_KEYS.map((g) => [g, stated.filter((t) => gOf(t) === g).length]));
    const byCategory = Object.fromEntries(CATEGORY_KEYS.map((k) => [k, all.filter((t) => (priority === 'alt' ? t.categoryAlt : t.category) === k).length]));
    cohorts[c] = { all: all.length, stated: stated.length, notStated: prop(all.length - stated.length, all.length), byGroup, byCategory, _stated: stated };
  }

  const outcomes = {};
  const pvals = [];
  for (const o of OUTCOMES) {
    const R = cohorts.rare._stated, C = cohorts.common._stated;
    const kR = R.filter((t) => gOf(t) === o).length, kC = C.filter((t) => gOf(t) === o).length;
    const nR = R.length, nC = C.length;
    const strata = [];
    for (const sp of ['INDUSTRY', 'NON_INDUSTRY']) {
      for (const ph of ['P2', 'P3']) {
        const r = R.filter((t) => t.stratum === sp && t.phaseGroup === ph);
        const c = C.filter((t) => t.stratum === sp && t.phaseGroup === ph);
        const a = r.filter((t) => gOf(t) === o).length;
        const cc = c.filter((t) => gOf(t) === o).length;
        strata.push({ stratum: sp, phase: ph, a, b: r.length - a, c: cc, d: c.length - cc });
      }
    }
    const enough = nR > 0 && nC > 0;
    const crude = enough ? { ...newcombeDiff(kR, nR, kC, nC), ...twoProportionZ(kR, nR, kC, nC) } : null;
    const adj = enough ? cmh(strata) : null;
    outcomes[o] = { rare: prop(kR, nR), common: prop(kC, nC), crude, adjusted: adj, strata };
    pvals.push(adj ? adj.p : 1);
  }
  const adjP = holm(pvals);
  OUTCOMES.forEach((o, i) => { if (outcomes[o].adjusted) outcomes[o].adjusted.pHolm = adjP[i]; });

  const missing = cohorts.rare.all && cohorts.common.all
    ? twoProportionZ(cohorts.rare.all - cohorts.rare.stated, cohorts.rare.all, cohorts.common.all - cohorts.common.stated, cohorts.common.all)
    : null;

  for (const c of ['rare', 'common']) delete cohorts[c]._stated;
  return { n: pick.length, cohorts, outcomes, missingnessTest: missing };
}

const STRATA = [['INDUSTRY', 'P2'], ['INDUSTRY', 'P3'], ['NON_INDUSTRY', 'P2'], ['NON_INDUSTRY', 'P3']];

/**
 * H4: of trials that reached an end (completed or terminated), what share were terminated?
 * Same stratified comparison as H1 to H3, on a different population.
 */
export function analyzeStops(trials, { filter = () => true } = {}) {
  const fin = trials.filter((t) => (t.status === 'COMPLETED' || t.status === 'TERMINATED') && filter(t));
  const R = fin.filter((t) => t.cohort === 'rare'), C = fin.filter((t) => t.cohort === 'common');
  const stop = (t) => t.status === 'TERMINATED';
  const kR = R.filter(stop).length, kC = C.filter(stop).length;
  const strata = STRATA.map(([sp, ph]) => {
    const r = R.filter((t) => t.stratum === sp && t.phaseGroup === ph), c = C.filter((t) => t.stratum === sp && t.phaseGroup === ph);
    const a = r.filter(stop).length, cc = c.filter(stop).length;
    return { stratum: sp, phase: ph, a, b: r.length - a, c: cc, d: c.length - cc };
  });
  const enough = R.length > 0 && C.length > 0;
  return {
    n: fin.length,
    rare: prop(kR, R.length), common: prop(kC, C.length),
    crude: enough ? { ...newcombeDiff(kR, R.length, kC, C.length), ...twoProportionZ(kR, R.length, kC, C.length) } : null,
    adjusted: enough ? cmh(strata) : null,
    strata,
  };
}

/** Per condition-group breakdown for the explorer and the rare-cancer table. */
export function breakdownByConditionGroup(trials, cfg = COHORTS) {
  const rows = [];
  for (const [cohort, list] of [['rare', cfg.rare], ['common', cfg.common]]) {
    for (const g of list) {
      const all = trials.filter((t) => t.status === 'TERMINATED' && t.cohort === cohort && t.conditionGroup === g.id);
      const stated = all.filter((t) => t.group !== null);
      const share = (k) => prop(stated.filter((t) => t.group === k).length, stated.length);
      const fin = trials.filter((t) => (t.status === 'COMPLETED' || t.status === 'TERMINATED') && t.cohort === cohort && t.conditionGroup === g.id);
      rows.push({
        id: g.id, label: g.label, cohort, borderline: !!g.borderline,
        terminated: all.length, stated: stated.length,
        science: share('SCIENCE'), money: share('MONEY'), accrual: share('ACCRUAL'),
        finished: fin.length, stopped: prop(all.length, fin.length),
      });
    }
  }
  return rows;
}

const compactOutcome = (o) => ({
  rare: o.rare.p, common: o.common.p,
  diff: o.crude?.diff ?? null,
  or: o.adjusted?.or ?? null, orLo: o.adjusted?.lo ?? null, orHi: o.adjusted?.hi ?? null, p: o.adjusted?.p ?? null,
});

/**
 * The full set of pre-registered analyses: primary plus every sensitivity run.
 * The four primary p-values (H1 to H3 on reasons, H4 on stopping at all) are Holm-adjusted together.
 */
export function runAll(trials, cfg = COHORTS) {
  const primary = analyze(trials);
  primary.stops = analyzeStops(trials);
  const pv = [...OUTCOMES.map((o) => primary.outcomes[o].adjusted?.p ?? 1), primary.stops.adjusted?.p ?? 1];
  const adj = holm(pv);
  OUTCOMES.forEach((o, i) => { if (primary.outcomes[o].adjusted) primary.outcomes[o].adjusted.pHolm = adj[i]; });
  if (primary.stops.adjusted) primary.stops.adjusted.pHolm = adj[3];

  // `stops: true` means the filter also makes sense for H4 (it does not depend on the reason text).
  const sens = [
    ['Alternative label priority (enrollment before money)', { priority: 'alt' }],
    ['Trials matching exactly one cancer group', { filter: (t) => t.nGroups === 1, stops: true }],
    ['Without borderline-incidence groups', { filter: (t) => !t.borderline, stops: true }],
    ['Started 2010 or later', { filter: (t) => t.year >= 2010, stops: true }],
    ['Started 2015 or earlier (all had years to finish)', { filter: (t) => t.year <= 2015, stops: true }],
    ['Without COVID-labelled stops', { filter: (t) => t.category !== 'PANDEMIC' }],
    ['Industry-sponsored only', { filter: (t) => t.stratum === 'INDUSTRY', stops: true }],
    ['Non-industry sponsors only', { filter: (t) => t.stratum === 'NON_INDUSTRY', stops: true }],
    ['Withdrawn before enrolling (secondary)', { statuses: ['WITHDRAWN'] }],
    ['Terminated and withdrawn pooled', { statuses: ['TERMINATED', 'WITHDRAWN'] }],
  ].map(([name, opts]) => {
    const r = analyze(trials, opts);
    const st = opts.stops ? analyzeStops(trials, { filter: opts.filter }) : null;
    return {
      name, n: r.n,
      nRare: r.cohorts.rare.stated, nCommon: r.cohorts.common.stated,
      outcomes: Object.fromEntries(OUTCOMES.map((o) => [o, compactOutcome(r.outcomes[o])])),
      stops: st ? { ...compactOutcome(st), nRare: st.rare.n, nCommon: st.common.n } : null,
    };
  });
  return { primary, sensitivity: sens, byConditionGroup: breakdownByConditionGroup(trials, cfg) };
}

// ---- compact encoding for the site ---------------------------------------------------------

export function toSiteRows(trials, cfg = COHORTS) {
  const groupIds = [...cfg.rare, ...cfg.common].map((g) => g.id);
  const rows = trials
    .filter((t) => t.status === 'TERMINATED')
    .sort((a, b) => (a.cohort === b.cohort ? 0 : a.cohort === 'rare' ? -1 : 1) || groupIds.indexOf(a.conditionGroup) - groupIds.indexOf(b.conditionGroup) || (a.nct < b.nct ? -1 : 1))
    .map((t) => [
      t.nct,
      t.cohort === 'rare' ? 0 : 1,
      groupIds.indexOf(t.conditionGroup),
      t.year,
      t.phaseGroup === 'P3' ? 1 : 0,
      t.stratum === 'INDUSTRY' ? 0 : 1,
      CATEGORY_KEYS.indexOf(t.category),
      t.title.length > 120 ? `${t.title.slice(0, 117)}...` : t.title,
      t.reason.length > 280 ? `${t.reason.slice(0, 277)}...` : t.reason,
    ]);
  return {
    columns: ['nct', 'cohort', 'condition', 'year', 'phase', 'sponsor', 'category', 'title', 'reason'],
    cohorts: ['rare', 'common'],
    conditions: [...cfg.rare, ...cfg.common].map((g) => ({
      id: g.id, label: g.label, cohort: cfg.rare.includes(g) ? 'rare' : 'common', borderline: !!g.borderline,
      incidence: g.incidence ? { text: g.incidence.text, why: g.incidence.why ?? null, sources: g.incidence.sources } : null,
    })),
    sources: SOURCES,
    categories: CATEGORY_KEYS,
    categoryGroup: CATEGORY_GROUP,
    groups: GROUPS,
    rows,
  };
}
