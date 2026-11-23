import test from 'node:test';
import assert from 'node:assert/strict';
import { classify, isNotStated, PRIORITY_ALT } from '../lib/classify.mjs';

// These strings are written by hand to exercise the rules. They are test inputs, not registry data.
const cases = [
  // science
  ['Futility at interim analysis', 'SCIENCE'],
  ['Lack of efficacy', 'SCIENCE'],
  ['Did not meet primary endpoint', 'SCIENCE'],
  ['Unacceptable toxicity observed in the treatment arm', 'SCIENCE'],
  ['DSMB recommended stopping', 'SCIENCE'],
  ['Sponsor decision following lack of efficacy in the parent study', 'SCIENCE'],
  // negated science must not count as science
  ['Sponsor decision. No safety concerns.', 'BUSINESS'],
  ['Business decision, not related to safety or efficacy', 'BUSINESS'],
  ['Stopped for lack of funding, no efficacy or safety issues identified', 'FUNDING'],
  // money
  ['Lack of funding', 'FUNDING'],
  ['Funding withdrawn by the grant agency', 'FUNDING'],
  ['Sponsor decision', 'BUSINESS'],
  ['Company decided to reprioritize its portfolio', 'BUSINESS'],
  ['Study drug development program discontinued by the company', 'BUSINESS'],
  ['Company was acquired and the program was cancelled', 'BUSINESS'],
  // accrual
  ['Slow accrual', 'ACCRUAL'],
  ['Poor recruitment', 'ACCRUAL'],
  ['Unable to enroll enough patients', 'ACCRUAL'],
  ['No participants were enrolled', 'ACCRUAL'],
  // pandemic, landscape, operational
  ['COVID-19 pandemic impacted enrollment', 'PANDEMIC'],
  ['Standard of care changed during the study', 'LANDSCAPE'],
  ['A competing drug was approved by the FDA', 'LANDSCAPE'],
  ['Principal investigator left the institution', 'OPERATIONAL'],
  ['The PI died', 'OPERATIONAL'],
  ['Death of principal investigator', 'OPERATIONAL'],
  ['Drug supply issues', 'OPERATIONAL'],
  ['IRB approval lapsed', 'OPERATIONAL'],
  // other
  ['Study was never started as planned and was closed administratively', 'OTHER'],
];

for (const [text, expected] of cases) {
  test(`classify: "${text}" -> ${expected}`, () => {
    assert.equal(classify(text).category, expected, JSON.stringify(classify(text)));
  });
}

test('placeholders count as not stated', () => {
  for (const t of ['', '  ', 'N/A', 'none', 'Unknown', '.', '-', 'no reason given', 'ab']) {
    assert.equal(isNotStated(t), true, `"${t}"`);
    assert.equal(classify(t).category, 'NOT_STATED');
  }
  assert.equal(isNotStated('Slow accrual'), false);
});

test('priority order changes the label when money and enrollment both appear', () => {
  const t = 'Slow accrual and sponsor decision';
  assert.equal(classify(t).category, 'BUSINESS');
  assert.equal(classify(t, PRIORITY_ALT).category, 'ACCRUAL');
  assert.deepEqual(classify(t).matched.sort(), ['ACCRUAL', 'BUSINESS']);
});

test('group mapping', () => {
  assert.equal(classify('Lack of funding').group, 'MONEY');
  assert.equal(classify('Sponsor decision').group, 'MONEY');
  assert.equal(classify('Slow accrual').group, 'ACCRUAL');
  assert.equal(classify('Futility').group, 'SCIENCE');
  assert.equal(classify('COVID-19').group, 'WORLD');
  assert.equal(classify('PI left').group, 'OTHER');
});
