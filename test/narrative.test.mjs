import test from 'node:test';
import assert from 'node:assert/strict';
import { verdictFor, headlineFor, outcomeSentence, deckFor, missingSentence, pct, pText } from '../lib/narrative.mjs';

const outcome = (rare, common, or, lo, hi, pHolm) => ({
  rare: { p: rare, lo: rare - 0.03, hi: rare + 0.03 },
  common: { p: common, lo: common - 0.03, hi: common + 0.03 },
  adjusted: { or, lo, hi, p: pHolm, pHolm },
});
const res = (sci) => ({
  primary: {
    outcomes: { SCIENCE: sci },
    cohorts: { rare: { stated: 600, byGroup: { SCIENCE: 120, MONEY: 150, ACCRUAL: 200, WORLD: 60, OTHER: 70 }, notStated: { p: 0.2 } }, common: { stated: 1800, notStated: { p: 0.1 } } },
    missingnessTest: { p: 0.0001 },
  },
});

test('pre-registered reading rule: H1 supported needs significance, direction and a 5 point gap', () => {
  assert.equal(verdictFor('SCIENCE', outcome(0.22, 0.43, 0.37, 0.3, 0.46, 0.0001)).key, 'supported');
  assert.equal(verdictFor('SCIENCE', outcome(0.40, 0.43, 0.9, 0.7, 1.1, 0.4)).key, 'inconclusive');
  // significant but small gap: inconclusive, with a note
  const small = verdictFor('SCIENCE', outcome(0.40, 0.44, 0.85, 0.78, 0.93, 0.01));
  assert.equal(small.key, 'inconclusive');
  assert.match(small.note, /under 5 points/);
  // opposite direction and significant: contradicted
  assert.equal(verdictFor('SCIENCE', outcome(0.50, 0.40, 1.5, 1.2, 1.9, 0.001)).key, 'contradicted');
});

test('H2 and H3 expect rare to be HIGHER', () => {
  assert.equal(verdictFor('ACCRUAL', outcome(0.32, 0.11, 3.7, 3, 4.7, 0.0001)).key, 'supported');
  assert.equal(verdictFor('MONEY', outcome(0.20, 0.30, 0.6, 0.5, 0.7, 0.001)).key, 'contradicted');
  assert.equal(verdictFor('MONEY', outcome(0.30, 0.31, 0.95, 0.78, 1.17, 0.66)).key, 'inconclusive');
});

test('Holm-adjusted p, not the raw p, drives the verdict', () => {
  const o = outcome(0.2, 0.4, 0.4, 0.3, 0.5, 0.2);
  o.adjusted.p = 0.001;
  assert.equal(verdictFor('SCIENCE', o).key, 'inconclusive');
});

test('headline never claims more than the data support', () => {
  assert.match(headlineFor(res(outcome(0.22, 0.43, 0.37, 0.3, 0.46, 0.0001))), /^Only 22% of rare cancer trials/);
  assert.match(headlineFor(res(outcome(0.50, 0.40, 1.5, 1.2, 1.9, 0.001))), /I expected rare cancer trials to stop less often/);
  const flat = headlineFor(res(outcome(0.41, 0.43, 0.93, 0.8, 1.1, 0.4)));
  assert.match(flat, /does not show a clear difference/);
  assert.doesNotMatch(flat, /^Only/);
});

test('outcome sentence does not claim a direction when the interval spans 1', () => {
  const flat = outcomeSentence('MONEY', outcome(0.3, 0.31, 0.95, 0.78, 1.17, 0.66));
  assert.match(flat, /cannot tell rare and common cancer trials apart/);
  assert.doesNotMatch(flat, /less likely|more likely|equally/);
  assert.match(outcomeSentence('SCIENCE', outcome(0.22, 0.43, 0.37, 0.3, 0.46, 0.0001)), /less likely/);
  assert.match(outcomeSentence('ACCRUAL', outcome(0.32, 0.11, 3.7, 3, 4.7, 0.0001)), /more likely/);
  // the method stratifies, it does not match
  assert.doesNotMatch(outcomeSentence('ACCRUAL', outcome(0.32, 0.11, 3.7, 3, 4.7, 0.0001)), /match/i);
});

test('a direction that does not survive the Holm correction is flagged as not counting', () => {
  const o = outcome(0.30, 0.25, 1.3, 1.05, 1.6, 0.09);
  o.adjusted.p = 0.02;
  assert.match(outcomeSentence('MONEY', o), /does not survive the correction/);
  assert.equal(verdictFor('MONEY', o).key, 'inconclusive');
});

test('H4 (stopped at all) expects rare to be HIGHER and reads naturally', () => {
  const o = outcome(0.34, 0.22, 1.8, 1.5, 2.1, 0.0001);
  assert.equal(verdictFor('STOPPED', o).key, 'supported');
  assert.match(outcomeSentence('STOPPED', o), /reached an end was more likely to be stopped early at all/);
});

test('deck and missingness lines', () => {
  const r = res(outcome(0.22, 0.43, 0.37, 0.3, 0.46, 0.0001));
  r.primary.stops = { rare: { p: 0.34, n: 2000 }, common: { p: 0.22, n: 9000 } };
  const conds = [...Array(20)].map(() => ({ cohort: 'rare' })).concat([{ cohort: 'common' }]);
  const d = deckFor(r, conds);
  assert.match(d, /in 20 rare cancer groups or in breast, lung, colorectal and prostate cancer/);
  assert.match(d, /600 rare and 1,800 common cancer trials were stopped early and gave a reason/);
  assert.match(d, /34% of rare cancer trials were stopped early, against 22% of common ones/);
  assert.doesNotMatch(d, /every Phase 2 and 3 cancer trial/);
  assert.match(missingSentence(res(outcome(0.22, 0.43, 0.37, 0.3, 0.46, 0.0001))), /itself a caution/);
});

test('formatting helpers', () => {
  assert.equal(pct(0.2189), '22%');
  assert.equal(pText(0.0004), '< 0.001');
  assert.equal(pText(0.0123), '= 0.012');
});
