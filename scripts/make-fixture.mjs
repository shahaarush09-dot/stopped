#!/usr/bin/env node
// Builds a SYNTHETIC dataset in data-fixture/ so you can see and test the site before pulling real data.
// Nothing in it is real. The build refuses to deploy it.
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeStudies, startMock } from '../test/helpers/mock-api.mjs';
import { main as fetchMain } from './fetch.mjs';
import { analyzeDir } from './analyze.mjs';
import { drawSample } from './audit-sample.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'data-fixture');
await rm(dir, { recursive: true, force: true });
await mkdir(dir, { recursive: true });
const mock = await startMock(makeStudies({ seed: 3, perCohort: { rare: 900, common: 2600 }, completed: { rare: 1500, common: 7800 } }));
const log = console.log; console.log = () => {};
try {
  await fetchMain(['--base', mock.base, '--out', dir, '--delay', '0']);
  const { trials } = await analyzeDir(dir);
  await mkdir(path.join(root, 'audit'), { recursive: true });
  await writeFile(path.join(dir, 'audit-sample.json'), JSON.stringify(drawSample(trials)));
} finally { console.log = log; await mock.close(); }
console.log('Wrote synthetic data to data-fixture/. Build it with: node scripts/build.mjs --data data-fixture --out dist-fixture');
