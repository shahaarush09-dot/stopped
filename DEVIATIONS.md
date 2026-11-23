# Deviations from the pre-registration

Every departure from `PREREGISTRATION.md` as committed in d9df1efca207a885a32cfd9f018c108704403499, with the date and the reason.

## 1. The blind audit was labeled by an AI model, not by hand

Date: 23 November 2026. Logged before the audit was scored.

What the pre-registration says, under "Validation of the coding": "Before I look at any comparison between cohorts, I will label a random sample by hand, blind to what the coder said."

What happened: I did not label the sample myself. At my request, Claude Opus 5.5, an AI model made by Anthropic, labeled all 100 reasons in the pre-registered sample (seed 20261123), using the same eight categories and definitions shown on the audit page.

How blind it was: the model labeled from `audit/sample.json`, which holds only each trial's registry ID and the sponsor's stated reason. It did not see the coder's categories, the cohort of any trial, or any result before writing its labels, and the labels were saved before `npm run audit:score` was run. The model had read this repository's code and tests while setting the project up, including the coder's unit test examples, so it is less independent of the coder than a person labeling cold would be.

Why: I chose to have the model do the labeling instead of labeling the 100 reasons myself.

Effect: the agreement figures on the site measure how often the rule-based coder agrees with an AI model, not with me. The site says so. The sample, the categories, the scoring script, the coder's rules and every analysis choice are unchanged.
