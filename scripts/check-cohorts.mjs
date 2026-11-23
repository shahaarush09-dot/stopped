#!/usr/bin/env node
// Prints every cohort group with its incidence figure and sources, so the figures can be checked
// by hand. Exit code 1 if any group is missing a figure or cites an unknown source.
import { RARE, COMMON, SOURCES, hasIncidence } from '../config/cohorts.mjs';

const warnOnly = process.argv.includes('--warn');
const all = [...RARE.map((g) => ['rare', g]), ...COMMON.map((g) => ['common', g])];
const missing = all.filter(([, g]) => !hasIncidence(g));

for (const [cohort, g] of all) {
  console.log(`\n${cohort.toUpperCase()}  ${g.label}${g.borderline ? '  [borderline]' : ''}`);
  if (!g.incidence) { console.log('  MISSING incidence'); continue; }
  console.log(`  ${g.incidence.text}`);
  if (g.incidence.why) console.log(`  Near the line because: ${g.incidence.why}`);
  for (const k of g.incidence.sources ?? []) console.log(`  - ${SOURCES[k] ? `${SOURCES[k].label}\n    ${SOURCES[k].url}` : `UNKNOWN SOURCE KEY "${k}"`}`);
}
console.log(`\n${all.length - missing.length} of ${all.length} groups have an incidence figure with known sources.`);
if (missing.length) {
  console.log(`Missing or broken: ${missing.map(([, g]) => g.id).join(', ')}`);
  if (!warnOnly) process.exit(1);
}
console.log('Open every link above and confirm the figure before setting "incidenceChecked": true in config/site.json.');
