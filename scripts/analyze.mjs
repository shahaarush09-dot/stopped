#!/usr/bin/env node
// Raw registry records -> analysis rows -> pre-registered statistics -> site data.
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDataset, runAll, toSiteRows } from '../lib/pipeline.mjs';
import { COHORTS, DESIGN } from '../config/cohorts.mjs';

export async function analyzeDir(dataDir) {
  const rawDir = path.join(dataDir, 'raw');
  const files = (await readdir(rawDir)).filter((f) => f.endsWith('.json')).sort();
  if (!files.length) throw new Error(`No raw files in ${rawDir}. Run "npm run fetch" first.`);
  const manifest = JSON.parse(await readFile(path.join(dataDir, 'manifest.json'), 'utf8'));
  const raw = [];
  for (const f of files) raw.push(...JSON.parse(await readFile(path.join(rawDir, f), 'utf8')).studies);

  const { trials, flow } = buildDataset(raw, COHORTS, DESIGN);
  const results = runAll(trials, COHORTS);

  const site = {
    meta: {
      isFixture: !!manifest.isFixture,
      source: manifest.base,
      fetchedAt: manifest.fetchedAt,
      analyzedAt: new Date().toISOString(),
      registryDataTimestamp: manifest.dataTimestamp,
      design: DESIGN,
      searchTerms: manifest.terms.length,
    },
    flow,
    results,
    ...toSiteRows(trials, COHORTS),
  };
  await writeFile(path.join(dataDir, 'trials.json'), JSON.stringify(trials));
  await writeFile(path.join(dataDir, 'results.json'), JSON.stringify({ meta: site.meta, flow, results }, null, 2));
  await writeFile(path.join(dataDir, 'site.json'), JSON.stringify(site));
  return { trials, flow, results, site };
}

const pct = (x) => (x == null || Number.isNaN(x) ? 'n/a' : `${(x * 100).toFixed(1)}%`);

if (process.argv[1]?.endsWith('analyze.mjs')) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const dataDir = path.resolve(root, process.argv[2] ?? 'data');
  await mkdir(dataDir, { recursive: true });
  analyzeDir(dataDir).then(({ flow, results }) => {
    console.log('Flow:', JSON.stringify(flow));
    const p = results.primary;
    console.log(`Terminated, reason stated: rare n=${p.cohorts.rare.stated}, common n=${p.cohorts.common.stated}`);
    for (const [k, o] of Object.entries(p.outcomes)) {
      console.log(`${k.padEnd(8)} rare ${pct(o.rare.p)}  common ${pct(o.common.p)}  adjusted OR ${o.adjusted?.or?.toFixed(2)} (p=${o.adjusted?.p?.toExponential(2)}, Holm ${o.adjusted?.pHolm?.toExponential(2)})`);
    }
  }).catch((e) => { console.error(e.message); process.exit(1); });
}
