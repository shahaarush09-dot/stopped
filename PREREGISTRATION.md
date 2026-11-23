# Pre-registration: why do rare cancer trials stop early?

Author: Aarush Shah, Orphan Access Initiative
Status: DRAFT until committed. Everything below is frozen at the commit that contains this file, before any registry data has been pulled. The hash of that commit goes in `config/site.json` afterwards.

This is a timestamped commit in a public repository. It is not an independent registry. To add an independent timestamp, post the same text as a preregistration on the Open Science Framework (osf.io, free) and put the link in `config/site.json`.

## The question

My paper on metaplastic carcinoma argued that rare cancers are underserved because of capital markets, not only because of biology. That is an argument about why drugs do not get finished. The clinical trial registry records, for every trial that ended early, what the sponsor said when it ended. That gives a direct test: when a rare cancer trial stops early, how often is it because of what the trial found, and how often is it because of money, business decisions, or too few patients? Is that different from common cancers? And do rare cancer trials stop early more often in the first place?

## What is already known

- About one in five adult Phase 2 and 3 cancer trials registered from 2005 to 2011 failed to finish for reasons other than safety or efficacy (Stensland et al., JNCI 2014, doi:10.1093/jnci/dju229).
- Of terminated trials with results on ClinicalTrials.gov, 21% stopped on the trial's own data and 68% for other reasons, most often slow accrual (Williams et al., PLOS ONE 2015, doi:10.1371/journal.pone.0127242).
- In 12,875 adult cancer trials registered 2011 to 2015, poor accrual was the top reason for stopping, and there was no association between a tumor type's incidence and its trials' termination rate (Khunger et al., The Oncologist 2018, doi:10.1634/theoncologist.2018-0003).
- Phase 2 and non-industry trials had higher odds of stopping for poor accrual (Zhang and DuBois, Cancer Medicine 2023, doi:10.1002/cam4.5385).
- Stopping trials for commercial reasons has been argued to break a pact with researchers and patients (Psaty and Rennie, JAMA 2003, doi:10.1001/jama.289.16.2128).

These look at cancer trials as a whole. This study compares rare with common cancers, and compares reasons as well as rates. The Khunger result cuts against H4. I am predicting it anyway, and either outcome gets reported.

## Hypotheses

Population for H1 to H3: Phase 2 and Phase 3 interventional cancer trials that were terminated and gave a reason. Population for H4: the same trials plus those that were completed, that is, every eligible trial that reached an end.

- **H1 (primary).** Rare cancer trials are less likely than common cancer trials to have been stopped because of their own results (efficacy, futility, safety, or early benefit).
- **H2.** Rare cancer trials are more likely to have been stopped for money or business reasons (funding, sponsor or company decisions, acquisitions, program discontinuation).
- **H3.** Rare cancer trials are more likely to have been stopped because they could not enroll enough patients.
- **H4.** Of trials that reached an end, rare cancer trials are more likely than common cancer trials to have been terminated rather than completed.

I expect all four. I am writing that down now so the result cannot be bent to fit afterward.

How I will read the result. H1 is supported if the Holm-adjusted p-value is below 0.05, the odds ratio is below 1, and the absolute gap is at least 5 percentage points. It is contradicted if the adjusted p is below 0.05 and the odds ratio is above 1. Anything else is inconclusive. H2, H3 and H4 follow the same rule in the other direction. A contradicted or inconclusive result gets published with the same prominence as a supported one.

## Data

ClinicalTrials.gov API v2, pulled once. The pull date and registry data timestamp are recorded in `data/manifest.json`. I will not re-pull after seeing results, except to fix a documented bug, and any such re-pull is logged in `DEVIATIONS.md` with both versions of the result.

Retrieval: for each search term in `config/cohorts.mjs`, every record with status COMPLETED, TERMINATED or WITHDRAWN. Retrieval is deliberately broad. The cohort a trial belongs to is decided locally, not by the search term.

## Eligibility

Frozen in `config/cohorts.mjs` (`DESIGN`).

- Interventional studies.
- Phases that are a non-empty subset of Phase 2 and Phase 3 (so Phase 2, Phase 3, and Phase 2/3; Phase 1 and Phase 1/2 are excluded because they stop for different reasons).
- Start date between January 2000 and December 2023, so every trial has had time to end.
- H1 to H3: status TERMINATED (the trial enrolled at least one participant). Secondary: WITHDRAWN (stopped before enrolling).
- H4: status COMPLETED or TERMINATED. Trials still running, suspended, or with status UNKNOWN are not counted.

## Cohorts

Frozen in `config/cohorts.mjs`.

- **Rare:** every cancer a group names has a US incidence below 6 new cases per 100,000 people per year. This is the RARECARE threshold, also used by the American Cancer Society. NCI's definition is looser (under 15 per 100,000) and every group meets it. Rates are crude where possible: American Cancer Society 2026 case estimates divided by the Census Bureau's July 2025 population (341,784,857), so 6 per 100,000 is about 20,500 cases a year. Where no count exists, a published SEER or registry rate is used and labelled. Twenty groups, each with figures and sources in `config/cohorts.mjs` (`incidence`). Four are flagged `borderline`: neuroendocrine tumors (all sites combined reach about 7.0 per 100,000), gliomas and brain tumors (all malignant brain tumors together exceed 6), acute leukemias and CML (acute myeloid leukemia is about 6.6 crude, 4.4 age-adjusted), and the penile, urethral and germ cell group (testicular cancer among men alone is close to 6).
- Mostly benign tumors (giant cell tumor of bone, phyllodes tumor) are not included.
- **Common (control):** breast, non-small cell lung, colorectal, prostate.
- Assignment uses only the trial's listed conditions. A trial that lists both a rare and a common condition counts as rare, which dilutes the rare cohort toward the control and works against my hypothesis. Small cell lung cancer is left out of both cohorts. Trials matching neither cohort are dropped, and the counts are reported in the flow table.

## How reasons are coded

The registry field is free text. The rules are in `lib/classify.mjs` and frozen at this commit. Each reason gets one primary category in a fixed priority order:

1. SCIENCE: efficacy, futility, safety, toxicity, monitoring committee, interim results, early benefit. Phrases that deny these ("no safety concerns") are removed first.
2. PANDEMIC
3. FUNDING: funding, budget, financial, resources
4. BUSINESS: sponsor, company or business decisions, portfolio, acquisition, program discontinuation
5. ACCRUAL: slow or insufficient enrollment or recruitment
6. LANDSCAPE: standard of care changed, competing drug approved
7. OPERATIONAL: investigator left, site closed, supply, regulatory
8. OTHER

Reasons are grouped for analysis: **What the trial found** (1), **Money or business** (3 and 4), **Too few patients** (5), **Outside events** (2 and 6), **Logistics or other** (7 and 8).

Blank or placeholder text ("N/A", "none", "unknown") is NOT_STATED. Trials with no stated reason are excluded from the denominators of H1 to H3, and the share missing is compared across cohorts as its own result, because unequal missingness would threaten the comparison.

Because the order could tilt money against enrollment, I also run the analysis with enrollment ranked above money and report both.

## Analysis

- **Primary test for each of H1 to H3:** Cochran-Mantel-Haenszel odds ratio comparing rare to common, stratified by sponsor type (industry or not) and phase (Phase 2 or Phase 3 and 2/3). Stratifying matters because industry and academic sponsors stop trials for different reasons and the mix differs by cohort.
- **Primary test for H4:** the same CMH comparison of terminated against completed, with the same strata.
- Multiplicity: Holm correction across the four CMH p-values (H1 to H4). Alpha 0.05, two-sided.
- Also reported: the raw percentages with Wilson 95% intervals, the crude difference with a Newcombe 95% interval, and a pooled two-proportion z-test.
- **Sensitivity analyses** (all reported, none used to choose a result): alternative priority order; trials matching exactly one cancer group; dropping borderline-incidence groups; start year 2010 or later; start year 2015 or earlier; excluding COVID-coded stops; industry sponsors only; non-industry only; withdrawn trials; terminated and withdrawn pooled. H4 is rerun in every one of these that does not depend on the reason text (one group only, no borderline groups, both start-year cuts, industry only, non-industry only).
- Breakdown by cancer group (reasons and stop rate) is descriptive only. Individual groups are small and are not tested.

## Validation of the coding

A rule-based coder can be wrong in ways that favor a hypothesis. Before I look at any comparison between cohorts, I will label a random sample by hand, blind to what the coder said.

- Sample: 50 rare and 50 common terminated trials with a stated reason, drawn with seed `20261123` (`scripts/audit-sample.mjs`), shuffled together.
- I label each reason using `dist/audit.html`, which shows only the text. Agreement and Cohen's kappa are computed afterward (`scripts/audit-score.mjs`).
- If kappa on the five reason groups is below 0.6, I may revise the rules once. The revision, the reason, and the results under both versions go in `DEVIATIONS.md`. Otherwise the rules stay as they are.

## Known limits, written down in advance

- A stated reason is what the sponsor chose to write. "Sponsor decision" can sit on top of disappointing data, so the true share stopped for scientific reasons is probably higher than measured in both cohorts. If sponsors of rare cancer trials are more or less likely to write vague reasons than sponsors of common cancer trials, the comparison is biased in a direction I cannot sign.
- The registry only contains registered trials, and registration quality varies by country and era. Trials with status UNKNOWN are excluded from H4, and if they differ by cohort that biases H4.
- Trials that stop early also end sooner, so among recent start years, terminated trials are over-represented relative to completed ones. The start-2015-or-earlier analysis checks this for H4.
- Rare and common cancer trials differ in many ways beyond cohort (drug types, sponsors, trial size). Stratification handles two of them. This study shows association, not cause.
- "Too few patients" is itself partly a consequence of small patient populations. Whether that counts as an economic cause is an interpretation, and the write-up will say so.
- The rare cohort is a list I chose from published incidence. Different defensible lists could shift the result, which is what the sensitivity analyses probe.

## What I will not do

Change cohorts, eligibility, or the primary outcome after seeing results. Drop a sensitivity analysis because it disagrees. Describe the result as proof of why drugs fail. Every departure from this document is logged in `DEVIATIONS.md` with the date and the reason.
