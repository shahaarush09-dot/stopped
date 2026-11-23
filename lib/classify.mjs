// Reason classifier for the registry's free-text "why stopped" field.
// Rules are data so the pre-registration can quote them. FROZEN with the pre-registration.
//
// A text can match several categories. The PRIMARY label is the first match in a fixed
// priority order. Because the order can tilt the result (money vs enrollment), the analysis
// is run under two orders and both are reported.

export const GROUPS = {
  SCIENCE: 'What the trial found',
  MONEY: 'Money or business',
  ACCRUAL: 'Too few patients',
  WORLD: 'Outside events',
  OTHER: 'Logistics or other',
};

export const CATEGORY_GROUP = {
  SCIENCE: 'SCIENCE',
  FUNDING: 'MONEY',
  BUSINESS: 'MONEY',
  ACCRUAL: 'ACCRUAL',
  LANDSCAPE: 'WORLD',
  PANDEMIC: 'WORLD',
  OPERATIONAL: 'OTHER',
  OTHER: 'OTHER',
};

export const PRIORITY_MAIN = ['SCIENCE', 'PANDEMIC', 'FUNDING', 'BUSINESS', 'ACCRUAL', 'LANDSCAPE', 'OPERATIONAL'];
export const PRIORITY_ALT = ['SCIENCE', 'PANDEMIC', 'ACCRUAL', 'FUNDING', 'BUSINESS', 'LANDSCAPE', 'OPERATIONAL'];

const PLACEHOLDERS = new Set([
  '', 'n/a', 'na', 'none', 'unknown', 'not applicable', 'not available', '.', '-', '--', 'nil', 'null', 'tbd',
  'no reason given', 'not provided', 'not stated', 'not specified', 'unspecified', 'no reason', 'see above', 'other',
]);

export const RULES = {
  SCIENCE: [
    /\bfutil(e|ity)\b/,
    /\b(lack|absence) of (clinical )?(efficacy|benefit|activity|response|effect)/,
    /\b(insufficient|inadequate|poor|limited|minimal|modest|low|little|negative) (clinical )?(efficacy|benefit|activity|effect)\b/,
    /\b(did not|didn'?t|failed to|unable to|not) (meet|reach|achieve|show|demonstrate|improve|met)\b[^.;]{0,50}\b(endpoint|efficacy|benefit|survival|response|superior\w*|non-?inferior\w*|significan\w*)/,
    /\b(ineffective|not effective|ineffectiveness)\b/,
    /\bno (clinical |objective |survival |meaningful )?(benefit|improvement|advantage|responses|responders|efficacy|activity)\b/,
    /\b(safety|toxicit(y|ies)|adverse (events?|reactions?|effects?|drug)|serious adverse|unacceptable|side effects?|hepatotox\w*|cardiotox\w*|neurotox\w*|nephrotox\w*)\b/,
    /\b(treatment[- ]related|excess|unexpected|increased) (death|mortality|deaths)\b/,
    /\b(dsmb|dmc|idmc|data (and safety )?monitoring (committee|board))\b/,
    /\binterim (analysis|analyses|results?|data|review)\b/,
    /\b(negative|unfavou?rable|disappointing|inconclusive) (results?|data|findings|outcomes?)\b/,
    /\b(risk[- ]benefit|benefit[- ]risk)\b/,
    /\b(overwhelming|early|demonstrated|clear) (efficacy|benefit)\b/,
  ],
  PANDEMIC: [/\b(covid\W?19|covid|sars-?cov-?2|coronavirus|pandemic|lockdown)\b/],
  FUNDING: [
    /\b(fund(s|ing|ed)?|financ\w*|budget\w*|grants?|monetary|money|costs?|expens\w*|afford\w*|resources?)\b/,
    /\b(lack|loss|withdrawal|expiration|expiry|end|insufficient) of (\w+ )?(support|funding|funds)\b/,
  ],
  BUSINESS: [
    /\b(sponsor|company|business|corporate|commercial|strategic|portfolio|management|manufacturer|pharma\w*)(s|'s)?\b[^.;]{0,30}\b(decision|decided|decide|choice|reasons?|priorit\w*|strateg\w*|request|discretion|direction|determination)\b/,
    /\b(decision|decided) (by|of|from) (the )?(sponsor|company|management|manufacturer)\b/,
    /\b(business|commercial|strategic|corporate|portfolio) (reasons?|decision|priorit\w*|strateg\w*|considerations?)\b/,
    /\b(acquir\w*|acquisition|merger|merged|bankrupt\w*|insolven\w*|liquidat\w*|ceased operations?|out of business|reorgani[sz]\w*|restructur\w*)\b/,
    /\b(re-?prioriti[sz]\w*|deprioriti[sz]\w*|priorities|prioritization)\b/,
    /\b(development|program(me)?|compound|drug|product) (was |has been |is |being )?(discontinued|terminated|cancel(l)?ed|halted|stopped|abandoned|suspended)\b/,
    /\b(discontinu\w+|terminat\w+|cancel\w+|halt\w+) (of )?(the )?(clinical )?(development|program|programme|compound)\b/,
    /\bno longer (developing|pursu\w+|a priority|commercially)\b/,
    /\b(licen[cs]\w+|partner\w*|collaborat\w*) (agreement|terminated|ended|returned|withdr\w+)\b/,
  ],
  ACCRUAL: [
    /\b(accru\w*|enrol+ment|enroll\w*|enrol+ed|recruit\w*)\b/,
    /\bnot enough (eligible )?(patients|participants|subjects)\b/,
    /\b(few|insufficient|low|limited|inadequate|lack of) (eligible )?(patients|participants|subjects|number of (patients|participants|subjects))\b/,
    /\bunable to (find|identify|accrue|enrol+|recruit)\b/,
    /\b(no|zero) (patients|participants|subjects) (were )?(enrol+ed|accrued|recruited|consented)\b/,
    /\b(low|slow|poor) (patient )?(participation|uptake|interest)\b/,
  ],
  LANDSCAPE: [
    /\bstandard of care\b/,
    /\b(competing|competitive|similar|concurrent|other) (trials?|studies|study|drugs?|agents?|therapy|therapies|treatments?|products?)\b/,
    /\b(drug|agent|therapy|treatment|product|indication|compound) (was |has been |became )?(approved|available|licen[cs]ed|marketed)\b/,
    /\bfda approv\w*/,
    /\bnew (data|evidence|guidelines?|information|standards?|treatments?|therapy|therapies|findings|literature|publications?)\b/,
    /\bno longer (relevant|needed|necessary|applicable|appropriate|ethical|clinically relevant)\b/,
    /\bequipoise\b/,
    /\b(superseded|replaced by|obsolete|outdated|overtaken)\b/,
    /\bchange in (practice|treatment|standard|guidelines|landscape|paradigm)\b/,
    /\b(treatment|therapeutic|clinical) landscape\b/,
  ],
  OPERATIONAL: [
    /\b(pi|p\.i\.|principal investigator|investigator|physician|doctor|staff|coordinator|study team|research team)\b[^.;]{0,40}\b(left|leave|leaving|leaves|moved|move|moving|relocat\w*|retired|retire\w*|resign\w*|depart\w*|unavailable|passed away|died|deceased|no longer|transferred)\b/,
    /\b(site|center|centre|institution|hospital|clinic)s?\b[^.;]{0,30}\b(clos\w*|withdr\w*|discontinu\w*|left|stopp\w*|terminat\w*)\b/,
    /\b(logistic\w*|administrative|paperwork|contract\w*|regulatory|irb|iec|ethics|ethic committee|clinical hold|fda (hold|request)|compliance|gcp|audit\w*|protocol (violation|deviation|amend\w*))\b/,
    /\b(drug|study drug|product|supply|supplies|manufactur\w*|formulation|shortage|stability|device|equipment|assay|technical)\b[^.;]{0,25}\b(issue|issues|problem|problems|unavailab\w*|shortage|supply|difficult\w*|failure|discontinu\w*)/,
    /\b(study|trial|protocol) (design|redesign|revis\w*|chang\w*|amend\w*|replaced|rewritten|restructur\w*)\b/,
    /\b(death|passing|illness|loss) of (the |our )?(pi|p\.i\.|principal investigator|investigator)\b/,
  ],
};

// Phrases that deny a scientific reason ("no safety concerns") must not trigger SCIENCE.
const NEGATION = /\b(no|not|without|never|unrelated to|independent of|nothing to do with|neither|nor)\b\s+(?:(?:due|related|attributed|because|owing|secondary|to|of|any|the|a|an|with|by|or|and|nor|safety|efficacy|toxicit\w*|adverse|events?|effects?|concerns?|issues?|problems?|findings?|signals?|reasons?|futility|results?|data|identified|observed|new|major|significant|serious|unexpected|stopp\w+|halt\w+|terminat\w+|clinical|drug)\b[\s,]*)+/g;

// A death of the investigator is not a mortality signal.
const PI_DEATH = /\b(death|passing|illness|loss) of (the |our )?(pi|p\.i\.|principal investigator|investigator|sponsor)\b|\b(pi|principal investigator|investigator) (died|death|passed away|deceased)\b/g;

export function cleanText(raw) {
  return String(raw ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
}

export function isNotStated(raw) {
  const t = cleanText(raw).replace(/[.\s]+$/, '');
  return t.length < 4 || PLACEHOLDERS.has(t);
}

function matchedCategories(raw) {
  const text = cleanText(raw);
  // Only the science rules need the investigator's death and negated phrases removed.
  const scienceText = text.replace(PI_DEATH, ' ').replace(NEGATION, ' ');
  const hit = [];
  for (const [cat, rules] of Object.entries(RULES)) {
    const subject = cat === 'SCIENCE' ? scienceText : text;
    if (rules.some((re) => re.test(subject))) hit.push(cat);
  }
  return hit;
}

/** Classify one "why stopped" string. */
export function classify(raw, priority = PRIORITY_MAIN) {
  if (isNotStated(raw)) return { category: 'NOT_STATED', group: null, matched: [] };
  const matched = matchedCategories(raw);
  const category = priority.find((c) => matched.includes(c)) ?? 'OTHER';
  return { category, group: CATEGORY_GROUP[category], matched };
}
