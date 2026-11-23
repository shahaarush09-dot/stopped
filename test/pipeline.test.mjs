import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { makeStudies, startMock, TRUTH } from './helpers/mock-api.mjs';
import { main as fetchMain } from '../scripts/fetch.mjs';
import { analyzeDir } from '../scripts/analyze.mjs';
import { drawSample } from '../scripts/audit-sample.mjs';
import { scoreAudit } from '../scripts/audit-score.mjs';

const quiet = async (fn) => {
  const { log, warn } = console;
  console.log = () => {}; console.warn = () => {};
  try { return await fn(); } finally { console.log = log; console.warn = warn; }
};

test('end to end on synthetic registry data: fetch, paginate, dedupe, classify, test', async () => {
  const studies = makeStudies({ seed: 11, perCohort: { rare: 1200, common: 2000 } });
  const mock = await startMock(studies, { rejectFields: true, flakyOnce: true });
  const dir = await mkdtemp(path.join(os.tmpdir(), 'stopped-'));
  try {
    // rejectFields exercises the fallback path, flakyOnce exercises retry on 429
    const manifest = await quiet(() => fetchMain(['--base', mock.base, '--out', dir, '--delay', '0']));
    assert.equal(manifest.isFixture, true, 'a non-registry base URL must be flagged as fixture');
    assert.equal(manifest.fieldsMode, 'full');
    assert.ok((await readdir(path.join(dir, 'raw'))).length > 40);

    const { trials, flow, results } = await analyzeDir(dir);

    // duplicates from overlapping search terms are removed, decoys are excluded
    assert.ok(flow.duplicates > 0);
    assert.equal(flow.excluded.not_interventional, 1);
    assert.equal(flow.excluded.phase, 1);
    assert.equal(flow.excluded.start_year, 1);
    assert.equal(new Set(trials.map((t) => t.nct)).size, trials.length);

    // ground truth: every real synthetic study should be present exactly once
    const wanted = studies.filter((s) => s._truth);
    assert.equal(trials.length, wanted.length);

    // classifier recovers the generating category group for stated reasons
    const truthByNct = new Map(wanted.map((s) => [s.protocolSection.identificationModule.nctId, s._truth]));
    let right = 0, total = 0;
    for (const t of trials) {
      const truth = truthByNct.get(t.nct);
      if (truth.cat === 'NOT_STATED') { assert.equal(t.category, 'NOT_STATED'); continue; }
      total++;
      const g = { SCIENCE: 'SCIENCE', MONEY: 'MONEY', ACCRUAL: 'ACCRUAL', WORLD: 'WORLD', OTHER: 'OTHER' }[truth.cat];
      if (t.group === g) right++;
      assert.equal(truth.cohort, t.cohort);
    }
    assert.ok(right / total > 0.95, `classifier recovered ${right}/${total}`);

    // the statistics find the planted effects, in the planted direction
    const p = results.primary.outcomes;
    assert.ok(p.SCIENCE.rare.p < p.SCIENCE.common.p - 0.1);
    assert.ok(p.SCIENCE.adjusted.or < 0.6 && p.SCIENCE.adjusted.p < 1e-6);
    assert.ok(p.ACCRUAL.adjusted.or > 1.8 && p.ACCRUAL.adjusted.p < 1e-6);
    assert.ok(Math.abs(p.SCIENCE.rare.p - TRUTH.rare.SCIENCE) < 0.05);
    assert.ok(Math.abs(p.SCIENCE.common.p - TRUTH.common.SCIENCE) < 0.04);
    // reasons were missing at the same rate in both cohorts, so the missingness test should be quiet
    assert.ok(results.primary.missingnessTest.p > 0.001);

    // H4: the planted stop rates are recovered (rare about 0.35, common about 0.22)
    const st = results.primary.stops;
    assert.ok(st.rare.p > st.common.p + 0.08, `stop rates ${st.rare.p} vs ${st.common.p}`);
    assert.ok(st.adjusted.or > 1.4 && st.adjusted.pHolm < 1e-6);
    assert.ok(Math.abs(st.rare.n - (trials.filter((t) => t.cohort === 'rare' && ['COMPLETED', 'TERMINATED'].includes(t.status)).length)) === 0);
    // all four primary p-values are Holm-adjusted together, so each adjusted p is at least its raw p
    for (const o of [...Object.values(p).map((x) => x.adjusted), st.adjusted]) assert.ok(o.pHolm >= o.p);

    // completed trials never leak into the reason analysis, the dot field or the audit
    assert.equal(results.primary.cohorts.rare.all + results.primary.cohorts.common.all, trials.filter((t) => t.status === 'TERMINATED').length);

    // sensitivity runs all executed, and H4 is rerun only where the filter does not depend on the reason
    assert.equal(results.sensitivity.length, 10);
    assert.equal(results.sensitivity.filter((x) => x.stops).length, 6);

    // audit sample is blind, reproducible and balanced
    const s1 = drawSample(trials), s2 = drawSample(trials);
    assert.deepEqual(s1, s2);
    assert.equal(s1.length, 100);
    assert.deepEqual(Object.keys(s1[0]).sort(), ['id', 'text']);
    const statusById = new Map(trials.map((t) => [t.nct, t.status]));
    assert.ok(s1.every((x) => statusById.get(x.id) === 'TERMINATED'));

    // a perfect auditor scores kappa 1; a worse one scores lower
    const byId = new Map(trials.map((t) => [t.nct, t]));
    const perfect = Object.fromEntries(s1.map((x) => [x.id, byId.get(x.id).category]));
    assert.equal(scoreAudit(perfect, trials).category.kappa, 1);
    const noisy = { ...perfect };
    for (const id of Object.keys(noisy).slice(0, 25)) noisy[id] = 'OTHER';
    assert.ok(scoreAudit(noisy, trials).category.kappa < 0.9);
  } finally {
    await mock.close();
    await rm(dir, { recursive: true, force: true });
  }
});
