#!/usr/bin/env node
// Pull every completed, terminated or withdrawn record for each cohort search term from
// ClinicalTrials.gov (API v2). Completed trials are the denominator for "how often do trials stop".
// Free, no key. A few hundred requests; expect 10 to 20 minutes at the default pace.
//
//   node scripts/fetch.mjs                 # real registry
//   node scripts/fetch.mjs --base http://127.0.0.1:PORT/api/v2 --out data   # test server
//
// Records are slimmed to the fields the analysis uses before being written to data/raw/.

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RARE, COMMON } from '../config/cohorts.mjs';

export const OFFICIAL_BASE = 'https://clinicaltrials.gov/api/v2';
const FIELDS = ['NCTId', 'BriefTitle', 'OverallStatus', 'WhyStopped', 'StartDate', 'CompletionDate', 'LeadSponsorClass', 'Phase', 'StudyType', 'EnrollmentCount', 'Condition'];
export const STATUSES = 'COMPLETED,TERMINATED,WITHDRAWN';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const k = argv[i].slice(2);
      const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      a[k] = v;
    }
  }
  return a;
}

/** Keep only the leaves the analysis reads. Works on fielded and full records alike. */
export function slim(s) {
  const p = s?.protocolSection ?? {};
  return {
    protocolSection: {
      identificationModule: { nctId: p.identificationModule?.nctId, briefTitle: p.identificationModule?.briefTitle },
      statusModule: {
        overallStatus: p.statusModule?.overallStatus,
        whyStopped: p.statusModule?.whyStopped,
        startDateStruct: p.statusModule?.startDateStruct,
        completionDateStruct: p.statusModule?.completionDateStruct,
      },
      sponsorCollaboratorsModule: { leadSponsor: { class: p.sponsorCollaboratorsModule?.leadSponsor?.class } },
      designModule: {
        studyType: p.designModule?.studyType,
        phases: p.designModule?.phases,
        enrollmentInfo: p.designModule?.enrollmentInfo,
      },
      conditionsModule: { conditions: p.conditionsModule?.conditions },
    },
  };
}

async function getJson(url, { retries = 5, label = '' } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'stopped-audit/0.1 (open research project)' } });
      if (res.ok) return { ok: true, status: res.status, json: await res.json() };
      if (res.status === 400) return { ok: false, status: 400, text: await res.text().catch(() => '') };
      if (res.status === 429 || res.status >= 500) {
        const wait = Number(res.headers.get('retry-after')) * 1000 || 2000 * 2 ** attempt;
        console.warn(`  ${label} HTTP ${res.status}, waiting ${Math.round(wait / 1000)}s`);
        await sleep(wait);
        continue;
      }
      return { ok: false, status: res.status, text: await res.text().catch(() => '') };
    } catch (e) {
      lastErr = e;
      const wait = 2000 * 2 ** attempt;
      console.warn(`  ${label} network error (${e.message}), waiting ${Math.round(wait / 1000)}s`);
      await sleep(wait);
    }
  }
  throw new Error(`Gave up on ${url}: ${lastErr?.message ?? 'repeated failures'}`);
}

export async function fetchTerm(base, term, { delay, useFields }) {
  const studies = [];
  let token = null;
  let pages = 0;
  let fieldsOk = useFields;
  do {
    const q = new URLSearchParams({ 'query.cond': term, 'filter.overallStatus': STATUSES, pageSize: fieldsOk ? '1000' : '200' });
    if (fieldsOk) q.set('fields', FIELDS.join(','));
    if (token) q.set('pageToken', token);
    const url = `${base}/studies?${q}`;
    let r = await getJson(url, { label: term });
    if (!r.ok && r.status === 400 && fieldsOk) {
      console.warn('  the registry rejected the fields parameter; falling back to full records (slower)');
      fieldsOk = false;
      q.delete('fields'); q.set('pageSize', '200');
      r = await getJson(`${base}/studies?${q}`, { label: term });
    }
    if (!r.ok) throw new Error(`HTTP ${r.status} for "${term}": ${String(r.text).slice(0, 300)}`);
    for (const s of r.json.studies ?? []) studies.push(slim(s));
    token = r.json.nextPageToken ?? null;
    pages++;
    if (token) await sleep(delay);
  } while (token && pages < 400);
  return { studies, pages, fieldsOk };
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const base = String(args.base ?? OFFICIAL_BASE).replace(/\/$/, '');
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const out = path.resolve(root, String(args.out ?? 'data'));
  const delay = Number(args.delay ?? 1250);
  const only = args.only ? String(args.only).split(',') : null;

  await mkdir(path.join(out, 'raw'), { recursive: true });
  const jobs = [];
  for (const [cohort, list] of [['rare', RARE], ['common', COMMON]]) {
    for (const g of list) for (const term of g.api) if (!only || only.includes(g.id)) jobs.push({ cohort, group: g.id, term });
  }

  let version = null;
  try { const v = await getJson(`${base}/version`, { retries: 1, label: 'version' }); if (v.ok) version = v.json; } catch { /* optional */ }

  console.log(`Fetching ${jobs.length} search terms from ${base}`);
  const manifest = { base, isFixture: base !== OFFICIAL_BASE, fetchedAt: new Date().toISOString(), apiVersion: version?.apiVersion ?? null, dataTimestamp: version?.dataTimestamp ?? null, terms: [], fieldsMode: 'fields' };
  let useFields = true;
  let i = 0;
  for (const job of jobs) {
    i++;
    const { studies, pages, fieldsOk } = await fetchTerm(base, job.term, { delay, useFields });
    if (!fieldsOk) { useFields = false; manifest.fieldsMode = 'full'; }
    const slug = job.term.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    await writeFile(path.join(out, 'raw', `${job.cohort}__${slug}.json`), JSON.stringify({ ...job, fetchedAt: new Date().toISOString(), studies }));
    manifest.terms.push({ ...job, n: studies.length, pages });
    console.log(`[${i}/${jobs.length}] ${job.cohort.padEnd(6)} ${job.term}: ${studies.length} records`);
    await sleep(delay);
  }
  await writeFile(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`Done. Wrote ${manifest.terms.length} files to ${path.join(out, 'raw')} and manifest.json`);
  return manifest;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('fetch.mjs')) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
