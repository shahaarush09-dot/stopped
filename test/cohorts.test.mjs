import test from 'node:test';
import assert from 'node:assert/strict';
import { assignCohort, isEligibleDesign, normalizeStudy, yearOf, phaseGroup } from '../lib/cohorts.mjs';

test('rare conditions map to rare', () => {
  assert.equal(assignCohort(['Osteosarcoma']).cohort, 'rare');
  assert.equal(assignCohort(['Glioblastoma']).group, 'glioma');
  assert.equal(assignCohort(['Metaplastic Breast Carcinoma']).cohort, 'rare');
  assert.equal(assignCohort(['Acute Myeloid Leukemia']).group, 'leukemia');
  assert.equal(assignCohort(['Hodgkin Lymphoma']).group, 'lymphoma');
});

test('non-Hodgkin lymphoma is NOT rare', () => {
  assert.equal(assignCohort(['Non-Hodgkin Lymphoma']).cohort, null);
});

test('common conditions map to common', () => {
  assert.equal(assignCohort(['Breast Cancer']).group, 'breast');
  assert.equal(assignCohort(['Non-Small Cell Lung Cancer']).group, 'lung');
  assert.equal(assignCohort(['NSCLC']).group, 'lung');
  assert.equal(assignCohort(['Metastatic Colorectal Cancer']).group, 'colorectal');
  assert.equal(assignCohort(['Prostate Cancer']).group, 'prostate');
});

test('small cell lung cancer is excluded from both cohorts', () => {
  assert.equal(assignCohort(['Small Cell Lung Cancer']).cohort, null);
  assert.equal(assignCohort(['SCLC']).cohort, null);
  assert.equal(assignCohort(['Non-Small-Cell Lung Cancer']).cohort, 'common');
});

test('rare wins ties and breast subtypes are not common', () => {
  assert.equal(assignCohort(['Breast Cancer', 'Metaplastic Breast Carcinoma']).cohort, 'rare');
  assert.equal(assignCohort(['Inflammatory Breast Cancer']).cohort, 'rare');
  assert.equal(assignCohort(['Solid Tumors', 'Sarcoma', 'Breast Cancer']).cohort, 'rare');
});

test('unrelated conditions are dropped', () => {
  assert.equal(assignCohort(['Type 2 Diabetes']).cohort, null);
  assert.equal(assignCohort([]).cohort, null);
});

test('eligibility: design, phase and start year', () => {
  const ok = { studyType: 'INTERVENTIONAL', phases: ['PHASE2'], start: '2015-03' };
  assert.deepEqual(isEligibleDesign(ok), []);
  assert.deepEqual(isEligibleDesign({ ...ok, phases: ['PHASE2', 'PHASE3'] }), []);
  assert.deepEqual(isEligibleDesign({ ...ok, phases: ['PHASE1'] }), ['phase']);
  assert.deepEqual(isEligibleDesign({ ...ok, phases: ['PHASE1', 'PHASE2'] }), ['phase']);
  assert.deepEqual(isEligibleDesign({ ...ok, phases: [] }), ['phase']);
  assert.deepEqual(isEligibleDesign({ ...ok, studyType: 'OBSERVATIONAL' }), ['not_interventional']);
  assert.deepEqual(isEligibleDesign({ ...ok, start: '1998-01' }), ['start_year']);
  assert.deepEqual(isEligibleDesign({ ...ok, start: '2025-01-01' }), ['start_year']);
  assert.deepEqual(isEligibleDesign({ ...ok, start: null }), ['no_start_date']);
});

test('helpers', () => {
  assert.equal(yearOf('2019-07-15'), 2019);
  assert.equal(yearOf('2019-07'), 2019);
  assert.equal(yearOf(null), null);
  assert.equal(phaseGroup(['PHASE2', 'PHASE3']), 'P3');
  assert.equal(phaseGroup(['PHASE2']), 'P2');
});

test('normalizeStudy survives sparse records', () => {
  const n = normalizeStudy({
    protocolSection: {
      identificationModule: { nctId: 'NCT00000001', briefTitle: 'x' },
      statusModule: { overallStatus: 'TERMINATED', whyStopped: 'Slow accrual', startDateStruct: { date: '2012-05' } },
      sponsorCollaboratorsModule: { leadSponsor: { name: 'Acme', class: 'INDUSTRY' } },
      designModule: { studyType: 'INTERVENTIONAL', phases: ['PHASE2'] },
      conditionsModule: { conditions: ['Sarcoma'] },
    },
  });
  assert.equal(n.nct, 'NCT00000001');
  assert.equal(n.sponsorClass, 'INDUSTRY');
  assert.deepEqual(n.conditions, ['Sarcoma']);
  const empty = normalizeStudy({});
  assert.equal(empty.nct, null);
  assert.deepEqual(empty.phases, []);
});

test('mostly benign tumors are not in the rare cancer cohort', () => {
  assert.equal(assignCohort(['Giant Cell Tumor of Bone']).cohort, null);
  assert.equal(assignCohort(['Phyllodes Tumor']).cohort, null);
  assert.equal(assignCohort(['Chordoma']).group, 'bone');
});

test('every cohort group has an incidence figure with known sources, and borderline groups say why', async () => {
  const { RARE, COMMON, SOURCES, hasIncidence } = await import('../config/cohorts.mjs');
  for (const g of [...RARE, ...COMMON]) {
    assert.ok(hasIncidence(g), `${g.id} lacks a sourced incidence figure`);
    if (g.borderline) assert.ok(g.incidence.why, `${g.id} is borderline but does not say why`);
  }
  for (const s of Object.values(SOURCES)) assert.match(s.url, /^https:\/\//);
  assert.deepEqual(RARE.filter((g) => g.borderline).map((g) => g.id).sort(), ['glioma', 'gu', 'leukemia', 'neuroendocrine']);
});
