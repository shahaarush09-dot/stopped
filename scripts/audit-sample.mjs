#!/usr/bin/env node
// Draw the blind audit sample: 50 rare + 50 common, terminated, reason stated.
// The sample file contains NO classifier labels, so labelling is blind.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sampleWithoutReplacement } from '../lib/stats.mjs';

export const AUDIT_SEED = 20261123; // fixed in the pre-registration
export const AUDIT_PER_COHORT = 50;

export function drawSample(trials) {
  const pool = (c) => trials.filter((t) => t.status === 'TERMINATED' && t.cohort === c && t.category !== 'NOT_STATED').sort((a, b) => (a.nct < b.nct ? -1 : 1));
  const picked = [...sampleWithoutReplacement(pool('rare'), AUDIT_PER_COHORT, AUDIT_SEED), ...sampleWithoutReplacement(pool('common'), AUDIT_PER_COHORT, AUDIT_SEED + 1)];
  // shuffle together so the auditor cannot tell cohorts apart by position
  return sampleWithoutReplacement(picked, picked.length, AUDIT_SEED + 2).map((t) => ({ id: t.nct, text: t.reason }));
}

if (process.argv[1]?.endsWith('audit-sample.mjs')) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const trials = JSON.parse(await readFile(path.join(root, 'data', 'trials.json'), 'utf8'));
  const sample = drawSample(trials);
  await mkdir(path.join(root, 'audit'), { recursive: true });
  await writeFile(path.join(root, 'audit', 'sample.json'), JSON.stringify(sample, null, 1));
  console.log(`Wrote audit/sample.json with ${sample.length} trials (seed ${AUDIT_SEED}). Now run "npm run build" and open dist/audit.html.`);
}
