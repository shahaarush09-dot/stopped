# CLAUDE.md

Project: Stopped, an OAI audit of why rare cancer trials end early. Read README.md and PREREGISTRATION.md first.

## Hard rules

- Zero dependencies. Node 20+, ESM, `node --test`. Do not add npm packages.
- Never edit `config/cohorts.mjs`, the classifier rules in `lib/classify.mjs`, or the analysis plan after `preregCommit` is set in `config/site.json`. If a change is unavoidable, log it in `DEVIATIONS.md` with the reason and the date, and say so on the site.
- Never write result numbers or verdicts by hand. Everything on the page comes from `lib/narrative.mjs` and the analysis output.
- Never remove the fixture guard in `scripts/build.mjs`. Synthetic data must not be deployable.
- Registry text goes into the page with `textContent`, never `innerHTML`.
- Do not invent incidence figures or citations. Every `incidence` entry in `config/cohorts.mjs` points to a source in `SOURCES`, and the author confirms each one by hand before setting `incidenceChecked`.

## Voice (site copy and docs)

Direct, plain, slight edge. No em dashes. No filler, no "delve", no triplet lists for rhythm. If a sentence does not carry a fact or a decision, cut it.

## Commands

- `npm test` runs everything, including the end to end run on a fake registry.
- `node scripts/make-fixture.mjs` then `node scripts/build.mjs --data data-fixture --out dist-fixture` for a safe preview.
- `npm run fetch` needs real internet access to clinicaltrials.gov. It will not work from some sandboxes.

## Windows notes

Run commands from PowerShell or Git Bash in the project folder. Open `dist\index.html` by double clicking it. If `npm run fetch` is interrupted, rerun it from the start. It overwrites each term's file and does not resume. `--only <group id>[,<group id>]` refetches just those cohort groups.
