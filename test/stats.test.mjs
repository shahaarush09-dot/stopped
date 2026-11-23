import test from 'node:test';
import assert from 'node:assert/strict';
import { wilson, twoProportionZ, newcombeDiff, cmh, holm, cohenKappa, twoSidedP, sampleWithoutReplacement } from '../lib/stats.mjs';

const close = (a, b, tol = 1e-4) => assert.ok(Math.abs(a - b) < tol, `${a} vs ${b}`);

// Reference values computed with scipy 1.x and statsmodels (see README, "How the stats were checked").

test('wilson interval matches statsmodels', () => {
  const w = wilson(30, 100);
  close(w.lo, 0.21894885);
  close(w.hi, 0.39584855);
  const z = wilson(0, 20);
  close(z.lo, 0);
  close(z.hi, 0.16112516);
});

test('two-proportion z-test matches statsmodels', () => {
  const r = twoProportionZ(40, 120, 70, 150);
  close(r.z, -2.21564684, 1e-6);
  close(r.p, 0.0267157, 1e-6);
});

test('Newcombe difference CI matches statsmodels', () => {
  const r = newcombeDiff(40, 120, 70, 150);
  close(r.lo, -0.24484085, 1e-6);
  close(r.hi, -0.01547035, 1e-6);
});

test('CMH odds ratio, CI and p match statsmodels StratifiedTable', () => {
  const strata = [
    { a: 20, b: 30, c: 15, d: 60 },
    { a: 10, b: 40, c: 25, d: 50 },
    { a: 8, b: 12, c: 30, d: 45 },
    { a: 5, b: 25, c: 12, d: 40 },
  ];
  const r = cmh(strata);
  close(r.or, 1.04097477, 1e-6);
  close(r.lo, 0.66768014, 1e-5);
  close(r.hi, 1.62297543, 1e-5);
  close(r.chi2, 0.03174643, 1e-6);
  close(r.p, 0.85858533, 1e-5);
});

test('holm matches statsmodels', () => {
  const adj = holm([0.01, 0.04, 0.03]);
  close(adj[0], 0.03, 1e-12);
  close(adj[1], 0.06, 1e-12);
  close(adj[2], 0.06, 1e-12);
});

test('normal tail p-values are right', () => {
  close(twoSidedP(1.96), 0.04999579, 1e-6);
  close(twoSidedP(3.5), 0.00046526, 1e-6);
});

test('cohen kappa matches hand calculation', () => {
  const a = ['A', 'A', 'B', 'B', 'C', 'A', 'B', 'C', 'C', 'A'];
  const b = ['A', 'B', 'B', 'B', 'C', 'A', 'A', 'C', 'A', 'A'];
  const r = cohenKappa(a, b);
  close(r.kappa, 0.53846154, 1e-6);
  close(r.agreement, 0.7, 1e-12);
});

test('seeded sample is reproducible and has no repeats', () => {
  const arr = Array.from({ length: 200 }, (_, i) => i);
  const s1 = sampleWithoutReplacement(arr, 50, 42);
  const s2 = sampleWithoutReplacement(arr, 50, 42);
  assert.deepEqual(s1, s2);
  assert.equal(new Set(s1).size, 50);
  assert.notDeepEqual(s1, sampleWithoutReplacement(arr, 50, 43));
});
