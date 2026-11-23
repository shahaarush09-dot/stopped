// Small statistics toolkit with no dependencies. Cross-checked against scipy/statsmodels
// (see test/stats.test.mjs for the reference values).

// Complementary error function, Numerical Recipes erfc (fractional error < 1.2e-7).
export function erfc(x) {
  const z = Math.abs(x);
  const t = 1 / (1 + 0.5 * z);
  const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 +
    t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? r : 2 - r;
}

export const normalCdf = (x) => 0.5 * erfc(-x / Math.SQRT2);
export const twoSidedP = (z) => erfc(Math.abs(z) / Math.SQRT2);
export const chi2P1 = (x2) => erfc(Math.sqrt(Math.max(x2, 0) / 2));

/** Wilson score interval for a proportion. */
export function wilson(k, n, z = 1.959963984540054) {
  if (n === 0) return { p: NaN, lo: NaN, hi: NaN };
  const p = k / n;
  const d = 1 + (z * z) / n;
  const c = (p + (z * z) / (2 * n)) / d;
  const h = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return { p, lo: Math.max(0, c - h), hi: Math.min(1, c + h) };
}

/** Pooled two-proportion z-test, group 1 minus group 2. */
export function twoProportionZ(k1, n1, k2, n2) {
  const p1 = k1 / n1, p2 = k2 / n2;
  const pool = (k1 + k2) / (n1 + n2);
  const se = Math.sqrt(pool * (1 - pool) * (1 / n1 + 1 / n2));
  const z = se === 0 ? 0 : (p1 - p2) / se;
  return { diff: p1 - p2, z, p: twoSidedP(z) };
}

/** Newcombe hybrid-score CI for the difference of two independent proportions (method 10). */
export function newcombeDiff(k1, n1, k2, n2) {
  const a = wilson(k1, n1), b = wilson(k2, n2);
  const d = a.p - b.p;
  return {
    diff: d,
    lo: d - Math.sqrt((a.p - a.lo) ** 2 + (b.hi - b.p) ** 2),
    hi: d + Math.sqrt((a.hi - a.p) ** 2 + (b.p - b.lo) ** 2),
  };
}

/**
 * Cochran-Mantel-Haenszel across strata. Each stratum is {a,b,c,d} with
 * a = group1 with outcome, b = group1 without, c = group2 with outcome, d = group2 without.
 * Returns the Mantel-Haenszel odds ratio, its Robins-Breslow-Greenland 95% CI, and the CMH chi-square p.
 */
export function cmh(strata) {
  let R = 0, S = 0, sumPR = 0, sumPSQR = 0, sumQS = 0;
  let sumA = 0, sumE = 0, sumV = 0;
  for (const { a, b, c, d } of strata) {
    const n = a + b + c + d;
    if (n < 2) continue;
    const r = (a * d) / n, s = (b * c) / n;
    const P = (a + d) / n, Q = (b + c) / n;
    R += r; S += s;
    sumPR += P * r; sumPSQR += P * s + Q * r; sumQS += Q * s;
    sumA += a;
    sumE += ((a + b) * (a + c)) / n;
    sumV += ((a + b) * (c + d) * (a + c) * (b + d)) / (n * n * (n - 1));
  }
  const or = S === 0 ? Infinity : R / S;
  const varLn = R > 0 && S > 0 ? sumPR / (2 * R * R) + sumPSQR / (2 * R * S) + sumQS / (2 * S * S) : NaN;
  const se = Math.sqrt(varLn);
  const chi2 = sumV > 0 ? (sumA - sumE) ** 2 / sumV : 0;
  return {
    or,
    lo: Math.exp(Math.log(or) - 1.959963984540054 * se),
    hi: Math.exp(Math.log(or) + 1.959963984540054 * se),
    chi2,
    p: chi2P1(chi2),
  };
}

/** Holm-Bonferroni adjusted p-values, returned in the input order. */
export function holm(ps) {
  const idx = ps.map((p, i) => [p, i]).sort((x, y) => x[0] - y[0]);
  const out = new Array(ps.length);
  let running = 0;
  idx.forEach(([p, i], rank) => {
    running = Math.max(running, Math.min(1, (ps.length - rank) * p));
    out[i] = running;
  });
  return out;
}

/** Cohen's kappa for two equal-length label arrays. */
export function cohenKappa(a, b) {
  const n = a.length;
  if (n === 0) return { kappa: NaN, agreement: NaN };
  let agree = 0;
  const ca = {}, cb = {};
  for (let i = 0; i < n; i++) {
    if (a[i] === b[i]) agree++;
    ca[a[i]] = (ca[a[i]] ?? 0) + 1;
    cb[b[i]] = (cb[b[i]] ?? 0) + 1;
  }
  const po = agree / n;
  let pe = 0;
  for (const k of Object.keys(ca)) pe += (ca[k] / n) * ((cb[k] ?? 0) / n);
  return { kappa: pe === 1 ? 1 : (po - pe) / (1 - pe), agreement: po };
}

/** Deterministic RNG so the audit sample is reproducible from its seed. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function sampleWithoutReplacement(arr, k, seed) {
  const rng = mulberry32(seed);
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, Math.min(k, a.length));
}
