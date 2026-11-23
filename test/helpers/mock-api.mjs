// A mock of the ClinicalTrials.gov v2 /studies endpoint plus SYNTHETIC studies.
// Everything generated here is fake. It exists to test the pipeline end to end
// and is marked as a fixture so the site refuses to deploy on it.
import http from 'node:http';
import { RARE, COMMON } from '../../config/cohorts.mjs';
import { mulberry32 } from '../../lib/stats.mjs';

// Invented phrasings, one pool per intended category.
const PHRASES = {
  SCIENCE: ['Futility at interim analysis', 'Lack of efficacy', 'Unacceptable toxicity', 'Did not meet primary endpoint', 'DSMB recommended stopping'],
  MONEY: ['Lack of funding', 'Sponsor decision', 'Business decision', 'Funding withdrawn', 'Company reprioritized its portfolio'],
  ACCRUAL: ['Slow accrual', 'Poor recruitment', 'Low enrollment', 'Unable to enroll enough patients'],
  WORLD: ['Standard of care changed', 'COVID-19 pandemic', 'A competing drug was approved'],
  OTHER: ['Principal investigator left the institution', 'Drug supply issues', 'IRB approval lapsed'],
};
const NOT_STATED_TEXT = ['', 'N/A', 'none'];

// Intended generating probabilities by cohort (science, money, accrual, world, other).
export const TRUTH = {
  rare: { SCIENCE: 0.22, MONEY: 0.28, ACCRUAL: 0.32, WORLD: 0.08, OTHER: 0.10 },
  common: { SCIENCE: 0.42, MONEY: 0.30, ACCRUAL: 0.12, WORLD: 0.08, OTHER: 0.08 },
};

function draw(rng, probs) {
  let u = rng(), acc = 0;
  for (const [k, p] of Object.entries(probs)) { acc += p; if (u < acc) return k; }
  return Object.keys(probs)[0];
}

// Planted stop rates: completed trials are added so that roughly a third of finished rare
// cancer trials and a fifth of finished common cancer trials were terminated.
export function makeStudies({ seed = 7, perCohort = { rare: 1500, common: 2500 }, completed = null } = {}) {
  const done = completed ?? { rare: Math.round(perCohort.rare * 1.6), common: Math.round(perCohort.common * 3.0) };
  const rng = mulberry32(seed);
  const studies = [];
  let n = 1;
  const nctId = () => `NCT${String(10000000 + n++).padStart(8, '0')}`;
  const names = {
    sarcoma: ['Osteosarcoma', 'Soft Tissue Sarcoma', 'Ewing Sarcoma'], mesothelioma: ['Mesothelioma'], biliary: ['Cholangiocarcinoma'],
    adrenal: ['Adrenocortical Carcinoma'], neuroendocrine: ['Neuroendocrine Tumors'], thymic: ['Thymoma'], ocular: ['Uveal Melanoma'],
    merkel: ['Merkel Cell Carcinoma'], glioma: ['Glioblastoma', 'Glioma'], pedsolid: ['Neuroblastoma'], bone: ['Chordoma'], headneck: ['Salivary Gland Cancer'],
    gi: ['Anal Cancer'], gyn: ['Vulvar Cancer'], gu: ['Penile Cancer'], ctcl: ['Cutaneous T-Cell Lymphoma'], leukemia: ['Acute Myeloid Leukemia'],
    lymphoma: ['Hodgkin Lymphoma', 'Mantle Cell Lymphoma'], mpn: ['Myelofibrosis'], breastrare: ['Metaplastic Breast Carcinoma'],
    breast: ['Breast Cancer'], lung: ['Non-Small Cell Lung Cancer'], colorectal: ['Colorectal Cancer'], prostate: ['Prostate Cancer'],
  };
  const groupsOf = { rare: RARE.map((g) => g.id), common: COMMON.map((g) => g.id) };

  for (const cohort of ['rare', 'common']) {
    for (let i = 0; i < perCohort[cohort]; i++) {
      const g = groupsOf[cohort][Math.floor(rng() * groupsOf[cohort].length)];
      const cond = names[g][Math.floor(rng() * names[g].length)];
      const industry = rng() < (cohort === 'rare' ? 0.35 : 0.6);
      const phase = rng() < 0.6 ? ['PHASE2'] : rng() < 0.9 ? ['PHASE3'] : ['PHASE2', 'PHASE3'];
      const year = 2000 + Math.floor(rng() * 24);
      const status = rng() < 0.85 ? 'TERMINATED' : 'WITHDRAWN';
      const stated = rng() > 0.2;
      const cat = draw(rng, TRUTH[cohort]);
      const why = stated ? PHRASES[cat][Math.floor(rng() * PHRASES[cat].length)] : NOT_STATED_TEXT[Math.floor(rng() * NOT_STATED_TEXT.length)];
      studies.push({
        _truth: { cohort, group: g, cat: stated ? cat : 'NOT_STATED', status },
        protocolSection: {
          identificationModule: { nctId: nctId(), briefTitle: `SYNTHETIC ${cond} study ${n}` },
          statusModule: { overallStatus: status, whyStopped: why, startDateStruct: { date: `${year}-0${1 + Math.floor(rng() * 9)}` } },
          sponsorCollaboratorsModule: { leadSponsor: { name: 'Synthetic Sponsor', class: industry ? 'INDUSTRY' : 'OTHER' } },
          designModule: { studyType: 'INTERVENTIONAL', phases: phase },
          conditionsModule: { conditions: [cond] },
        },
      });
    }
  }
  // Completed trials: no reason, used only as the denominator for the stop rate.
  for (const cohort of ['rare', 'common']) {
    for (let i = 0; i < done[cohort]; i++) {
      const g = groupsOf[cohort][Math.floor(rng() * groupsOf[cohort].length)];
      const cond = names[g][Math.floor(rng() * names[g].length)];
      const industry = rng() < (cohort === 'rare' ? 0.35 : 0.6);
      const phase = rng() < 0.6 ? ['PHASE2'] : rng() < 0.9 ? ['PHASE3'] : ['PHASE2', 'PHASE3'];
      const year = 2000 + Math.floor(rng() * 24);
      studies.push({
        _truth: { cohort, group: g, cat: 'NOT_STATED', status: 'COMPLETED' },
        protocolSection: {
          identificationModule: { nctId: nctId(), briefTitle: `SYNTHETIC ${cond} completed study ${n}` },
          statusModule: { overallStatus: 'COMPLETED', startDateStruct: { date: `${year}-0${1 + Math.floor(rng() * 9)}` } },
          sponsorCollaboratorsModule: { leadSponsor: { name: 'Synthetic Sponsor', class: industry ? 'INDUSTRY' : 'OTHER' } },
          designModule: { studyType: 'INTERVENTIONAL', phases: phase },
          conditionsModule: { conditions: [cond] },
        },
      });
    }
  }
  // Decoys the pipeline must exclude.
  const decoy = (over) => studies.push({ protocolSection: { identificationModule: { nctId: nctId(), briefTitle: 'SYNTHETIC decoy' }, statusModule: { overallStatus: 'TERMINATED', whyStopped: 'Slow accrual', startDateStruct: { date: '2012-01' } }, sponsorCollaboratorsModule: { leadSponsor: { class: 'OTHER' } }, designModule: { studyType: 'INTERVENTIONAL', phases: ['PHASE2'] }, conditionsModule: { conditions: ['Osteosarcoma'] }, ...over } });
  decoy({ designModule: { studyType: 'OBSERVATIONAL', phases: [] } });
  decoy({ designModule: { studyType: 'INTERVENTIONAL', phases: ['PHASE1'] } });
  decoy({ statusModule: { overallStatus: 'TERMINATED', whyStopped: 'x', startDateStruct: { date: '1995-01' } } });
  return studies;
}

export function startMock(studies, { rejectFields = false, flakyOnce = false } = {}) {
  let flaked = false;
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    const send = (code, body, headers = {}) => { res.writeHead(code, { 'Content-Type': 'application/json', ...headers }); res.end(JSON.stringify(body)); };
    if (url.pathname === '/api/v2/version') return send(200, { apiVersion: '2.0.0-mock', dataTimestamp: '2026-11-23T00:00:00' });
    if (url.pathname !== '/api/v2/studies') return send(404, { error: 'not found' });
    if (flakyOnce && !flaked) { flaked = true; return send(429, { error: 'slow down' }, { 'Retry-After': '0' }); }
    if (rejectFields && url.searchParams.has('fields')) return send(400, { error: 'bad fields' });
    const term = (url.searchParams.get('query.cond') ?? '').toLowerCase();
    const statuses = (url.searchParams.get('filter.overallStatus') ?? '').split(',').filter(Boolean);
    const size = Math.min(Number(url.searchParams.get('pageSize') ?? 10), 1000);
    const offset = url.searchParams.get('pageToken') ? Number(Buffer.from(url.searchParams.get('pageToken'), 'base64').toString()) : 0;
    const hits = studies.filter((s) => {
      const p = s.protocolSection;
      const conds = (p.conditionsModule?.conditions ?? []).join(' ').toLowerCase();
      return conds.includes(term) && (!statuses.length || statuses.includes(p.statusModule.overallStatus));
    });
    const page = hits.slice(offset, offset + size).map(({ _truth, ...s }) => s);
    const next = offset + size < hits.length ? Buffer.from(String(offset + size)).toString('base64') : undefined;
    send(200, { studies: page, ...(next ? { nextPageToken: next } : {}) });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, base: `http://127.0.0.1:${server.address().port}/api/v2`, close: () => new Promise((r) => server.close(r)) })));
}
