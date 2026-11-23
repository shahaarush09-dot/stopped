# Stopped

An audit of why Phase 2 and 3 rare cancer trials end early, tested against breast, lung, colorectal and prostate cancer.

Built by Aarush Shah for the Orphan Access Initiative. It extends the argument in "Why Rare Cancers Are Financial Orphans": if money is what fails rare cancers, it should show up in how often their trials stop and in the reasons sponsors give when they do.

Four predictions, written down before any data is pulled:

1. When a rare cancer trial stops early, it is less often because of what the trial found.
2. It is more often for money or business reasons.
3. It is more often because too few patients enrolled.
4. Rare cancer trials are stopped early more often in the first place.

The rules for judging each one are in [PREREGISTRATION.md](PREREGISTRATION.md). The result can go against the thesis. The site says so in the headline if it does.

## What is in here

| Path | What it does |
|---|---|
| `config/cohorts.mjs` | Which conditions count as rare or common, the incidence figure and source for every group, and the study filters. Frozen at pre-registration. |
| `config/site.json` | Title, author, repo URL, pre-registration commit, and the `incidenceChecked` switch. |
| `lib/` | Cohort assignment, the reason coder, the statistics, the pipeline, and the code that writes each result sentence from the numbers. |
| `scripts/` | Fetch, analyze, audit, build. |
| `src/` | The site (`template.html`) and the blind audit page (`audit.html`). |
| `test/` | 61 tests, including an end-to-end run against a fake registry with planted effects. |

No npm packages. Node 20 or newer.

## Run it, in order

```
npm test
npm run check:cohorts
```

`check:cohorts` prints every cohort group with its incidence figure and source links. The figures were gathered in November 2026 from the American Cancer Society, SEER, CBTRUS and published registry studies. Open every link and check every number against the page. Fix anything that is wrong. When you have checked them all, set `"incidenceChecked": true` in `config/site.json`. The deploy build refuses to run until you do.

Then read `PREREGISTRATION.md` start to finish. Change anything you disagree with now, not later. Commit it:

```
git init
git add PREREGISTRATION.md config lib scripts src test package.json LICENSE README.md CLAUDE.md .gitignore
git commit -m "Pre-registration: Stopped"
git rev-parse HEAD
```

Put the hash in `config/site.json` as `preregCommit`, plus `repoUrl`. Push to a public GitHub repo. For an independent timestamp, also register the text at osf.io and put the link in `osfUrl`.

Only after that:

```
npm run fetch          # completed, terminated and withdrawn records for 69 search terms. 10 to 20 minutes.
npm run analyze        # writes data/trials.json, results.json, site.json
npm run audit:sample   # draws the blind 100 reasons (the seed is fixed)
npm run build          # writes dist/index.html and dist/audit.html
```

Open `dist/audit.html` and label the 100 reasons yourself, without looking at the coder's output. Download `labels.json`, put it in `audit/`, then:

```
npm run audit:score    # writes audit/results.json
```

If agreement on the five reason groups (kappa) is under 0.6, the pre-registration allows one rule revision. Write the reason and the results under both versions in `DEVIATIONS.md`. Revise for agreement with your labels, never to move the headline.

Commit `data/trials.json`, `data/results.json` and `audit/` so anyone can check the exact records behind the page.

When everything is in place:

```
npm run build:deploy
```

That refuses to build if any of these are missing: real data, the pre-registration commit, the repo URL, a sourced incidence figure for every group, `incidenceChecked`, and the audit results. A deploy build leaves only `index.html` in `dist/`, with no audit page. Upload the `dist` folder to any static host, for example by dragging it onto Netlify Drop. The page is one self-contained file.

## Rules this project holds itself to

- Every sentence of the result is generated from the numbers. The verdict on each prediction follows the rule in the pre-registration, not whatever reads best.
- Synthetic test data is bannered in red and cannot be deployed.
- No claim on the site that you did not do. If the copy says "I", it has to be true.
- Registry text is shown as text, never as HTML, and credited to ClinicalTrials.gov with the date it was processed.

## Test data

```
node scripts/make-fixture.mjs
node scripts/build.mjs --data data-fixture --out dist-fixture
```

This builds the whole site from a fake registry with planted effects. Nothing in `data-fixture/` or `dist-fixture/` is real.

## Licence

MIT. See LICENSE. Trial records come from ClinicalTrials.gov (U.S. National Library of Medicine) and are used under its terms: credit the source, give the processing date, and say what was changed.
