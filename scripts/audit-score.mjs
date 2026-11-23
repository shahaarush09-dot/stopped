#!/usr/bin/env node
// Compare your blind labels (audit/labels.json, downloaded from dist/audit.html) with the classifier.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cohenKappa } from '../lib/stats.mjs';
import { CATEGORY_GROUP } from '../lib/classify.mjs';

export function scoreAudit(labels, trials) {
  const byId = new Map(trials.map((t) => [t.nct, t]));
  const ids = Object.keys(labels).filter((id) => byId.has(id));
  const human = ids.map((id) => labels[id]);
  const machine = ids.map((id) => byId.get(id).category);
  const humanGroup = human.map((c) => CATEGORY_GROUP[c]);
  const machineGroup = machine.map((c) => CATEGORY_GROUP[c]);
  const cat = cohenKappa(human, machine);
  const grp = cohenKappa(humanGroup, machineGroup);
  const disagreements = ids
    .filter((id, i) => human[i] !== machine[i])
    .map((id) => ({ id, human: labels[id], classifier: byId.get(id).category, text: byId.get(id).reason }));
  return {
    n: ids.length,
    category: { agreement: cat.agreement, kappa: cat.kappa },
    group: { agreement: grp.agreement, kappa: grp.kappa },
    disagreements,
  };
}

if (process.argv[1]?.endsWith('audit-score.mjs')) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const labelsFile = JSON.parse(await readFile(path.join(root, 'audit', 'labels.json'), 'utf8'));
  const trials = JSON.parse(await readFile(path.join(root, 'data', 'trials.json'), 'utf8'));
  const r = scoreAudit(labelsFile.labels, trials);
  r.auditor = labelsFile.auditor ?? null;
  r.completedAt = labelsFile.completedAt ?? null;
  await writeFile(path.join(root, 'audit', 'results.json'), JSON.stringify(r, null, 2));
  console.log(`n=${r.n}  category agreement ${(r.category.agreement * 100).toFixed(1)}% (kappa ${r.category.kappa.toFixed(2)})  group agreement ${(r.group.agreement * 100).toFixed(1)}% (kappa ${r.group.kappa.toFixed(2)})`);
  console.log(`${r.disagreements.length} disagreements listed in audit/results.json`);
  if (r.group.kappa < 0.6) console.log('Kappa is under 0.6. The pre-registration allows ONE documented revision of the rules; log it in DEVIATIONS.md.');
}
