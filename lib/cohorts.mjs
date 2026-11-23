import { COHORTS, DESIGN } from '../config/cohorts.mjs';

function norm(text, cfg) {
  let t = String(text ?? '');
  for (const [re, to] of cfg.normalize ?? []) t = t.replace(re, to);
  return t;
}

function groupMatches(g, text) {
  return g.match.test(text) && !(g.exclude && g.exclude.test(text));
}

/**
 * Assign a trial to a cohort using ONLY its listed conditions.
 * Rare wins ties (conservative: it dilutes the rare cohort toward the control).
 * Returns { cohort: 'rare'|'common'|null, group, groups }.
 */
export function assignCohort(conditions, cfg = COHORTS) {
  const text = (conditions ?? []).map((c) => norm(c, cfg)).join(' | ');
  const rare = cfg.rare.filter((g) => groupMatches(g, text)).map((g) => g.id);
  const common = cfg.common.filter((g) => groupMatches(g, text)).map((g) => g.id);
  const groups = [...rare, ...common];
  if (rare.length) return { cohort: 'rare', group: rare[0], groups };
  if (common.length) return { cohort: 'common', group: common[0], groups };
  return { cohort: null, group: null, groups };
}

export function yearOf(dateStr) {
  if (!dateStr) return null;
  const y = parseInt(String(dateStr).slice(0, 4), 10);
  return Number.isFinite(y) ? y : null;
}

export function phaseGroup(phases) {
  return (phases ?? []).includes('PHASE3') ? 'P3' : 'P2';
}

export function isEligibleDesign(rec, design = DESIGN) {
  const reasons = [];
  if (rec.studyType !== design.studyType) reasons.push('not_interventional');
  const ph = rec.phases ?? [];
  if (!ph.length || !ph.every((p) => design.allowedPhases.includes(p))) reasons.push('phase');
  const y = yearOf(rec.start);
  if (y == null) reasons.push('no_start_date');
  else if (y < design.startYearMin || y > design.startYearMax) reasons.push('start_year');
  return reasons;
}

export function sponsorStratum(cls) {
  return cls === 'INDUSTRY' ? 'INDUSTRY' : 'NON_INDUSTRY';
}

/** Flatten one raw API v2 study into the fields we use. Tolerates missing modules. */
export function normalizeStudy(s) {
  const p = s?.protocolSection ?? {};
  const id = p.identificationModule ?? {};
  const st = p.statusModule ?? {};
  const sp = p.sponsorCollaboratorsModule?.leadSponsor ?? {};
  const d = p.designModule ?? {};
  return {
    nct: id.nctId ?? null,
    title: id.briefTitle ?? id.officialTitle ?? '',
    status: st.overallStatus ?? null,
    whyStopped: st.whyStopped ?? '',
    start: st.startDateStruct?.date ?? null,
    completion: st.completionDateStruct?.date ?? null,
    sponsorClass: sp.class ?? 'UNKNOWN',
    phases: d.phases ?? [],
    studyType: d.studyType ?? null,
    enrollment: d.enrollmentInfo?.count ?? null,
    conditions: p.conditionsModule?.conditions ?? [],
  };
}
