// Cohort definitions. FROZEN when PREREGISTRATION.md is committed.
//
// RARE: every cancer a group names has a US incidence below 6 new cases per 100,000 people
// per year. That is the RARECARE threshold, also used by the American Cancer Society.
// (NCI's own definition is looser, under 15 per 100,000, and every group here meets it.)
// Rates are crude: ACS 2026 estimated new cases divided by the Census Vintage 2025
// population (341,784,857). Where ACS gives no count, a published SEER or registry rate is
// used instead and labelled as such. At that population, 6 per 100,000 is about 20,500 cases a year.
//
// `borderline: true` marks groups where any named cancer sits at or near the threshold, or
// where the answer depends on how the rate is computed. They are dropped in a pre-registered
// sensitivity analysis. `incidence.why` says what puts each one near the line.
//
// COMMON: the four most common cancers in the US, as a control.
//
// `api` terms are only used to RETRIEVE records. Cohort assignment is done locally from the
// trial's own `conditions` list using `match` and `exclude`. Rare wins ties.
//
// The figures below were gathered from the linked sources in November 2026. Open each link
// and confirm the number before setting "incidenceChecked": true in config/site.json.

export const SOURCES = {
  acs2026: { label: 'American Cancer Society, Cancer Facts & Figures 2026, Table 1', url: 'https://www.cancer.org/content/dam/cancer-org/research/cancer-facts-and-statistics/annual-cancer-facts-and-figures/2026/2026-cancer-facts-and-figures.pdf' },
  census2025: { label: 'U.S. Census Bureau, QuickFacts, population estimate July 1, 2025 (Vintage 2025)', url: 'https://www.census.gov/quickfacts/fact/table/US' },
  acs2017rare: { label: 'American Cancer Society, Cancer Facts & Figures 2017, Special Section: Rare Cancers in Adults (Table S1, ages 20+, 2009 to 2013)', url: 'https://www.cancer.org/content/dam/cancer-org/research/cancer-facts-and-statistics/annual-cancer-facts-and-figures/2017/cancer-facts-and-figures-2017-special-section-rare-cancers-in-adults.pdf' },
  nciRare: { label: 'NCI Dictionary of Cancer Terms, "rare cancer"', url: 'https://www.cancer.gov/publications/dictionaries/cancer-terms/def/rare-cancer' },
  acsGist: { label: 'American Cancer Society, Key Statistics for GIST', url: 'https://www.cancer.org/cancer/types/gastrointestinal-stromal-tumor/about/key-statistics.html' },
  acsMeso: { label: 'American Cancer Society, Key Statistics About Mesothelioma', url: 'https://www.cancer.org/cancer/types/malignant-mesothelioma/about/key-statistics.html' },
  acsBile: { label: 'American Cancer Society, Key Statistics for Bile Duct Cancer', url: 'https://www.cancer.org/cancer/types/bile-duct-cancer/about/key-statistics.html' },
  acsAdrenal: { label: 'American Cancer Society, Key Statistics for Adrenal Cancer', url: 'https://www.cancer.org/cancer/types/adrenal-cancer/about/key-statistics.html' },
  nciPheo: { label: 'NCI PDQ, Pheochromocytoma and Paraganglioma Treatment (Health Professional)', url: 'https://www.cancer.gov/types/pheochromocytoma/hp/pheochromocytoma-treatment-pdq' },
  dasari2017: { label: 'Dasari et al., JAMA Oncology 2017;3(10):1335-1342 (SEER, neuroendocrine tumors)', url: 'https://pubmed.ncbi.nlm.nih.gov/28448665/' },
  acsGiNet: { label: 'American Cancer Society, Key Statistics for Gastrointestinal Neuroendocrine Tumors', url: 'https://www.cancer.org/cancer/types/gastrointestinal-carcinoid-tumor/about/key-statistics.html' },
  acsThymus: { label: 'American Cancer Society, Key Statistics for Thymus Cancer', url: 'https://www.cancer.org/cancer/types/thymus-cancer/about/key-statistics.html' },
  acsEye: { label: 'American Cancer Society, Key Statistics for Eye Cancer', url: 'https://www.cancer.org/cancer/types/eye-cancer/about/key-statistics.html' },
  acsRetino: { label: 'American Cancer Society, Key Statistics for Retinoblastoma', url: 'https://www.cancer.org/cancer/types/retinoblastoma/about/key-statistics.html' },
  acsMerkel: { label: 'American Cancer Society, Key Statistics for Merkel Cell Carcinoma', url: 'https://www.cancer.org/cancer/types/merkel-cell-skin-cancer/about/key-statistics.html' },
  cbtrus2024: { label: 'Price et al., CBTRUS Statistical Report, 2017 to 2021. Neuro-Oncology 2024;26(Suppl 6)', url: 'https://doi.org/10.1093/neuonc/noae145' },
  cbtrus2025: { label: 'CBTRUS Statistical Report, 2018 to 2022. Neuro-Oncology 2025;27(Suppl 4)', url: 'https://doi.org/10.1093/neuonc/noaf194' },
  acsNeuroblastoma: { label: 'American Cancer Society, Key Statistics for Neuroblastoma', url: 'https://www.cancer.org/cancer/types/neuroblastoma/about/key-statistics.html' },
  acsWilms: { label: 'American Cancer Society, Key Statistics for Wilms Tumor', url: 'https://www.cancer.org/cancer/types/wilms-tumor/about/key-statistics.html' },
  kahla: { label: 'Kahla et al., Incidence and 5-year survival of children and adolescents with hepatoblastoma in the United States (USCS 2003 to 2017)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9658228/' },
  mcmaster2001: { label: 'McMaster et al., Chordoma: incidence and survival patterns in the United States, 1973-1995. Cancer Causes Control 2001;12:1-11', url: 'https://pubmed.ncbi.nlm.nih.gov/11227920/' },
  acsThyroidTypes: { label: 'American Cancer Society, What Is Thyroid Cancer?', url: 'https://www.cancer.org/cancer/types/thyroid-cancer/about/what-is-thyroid-cancer.html' },
  appendix2015: { label: 'The Rise in Appendiceal Cancer Incidence: 2000-2009 (SEER), J Gastrointest Surg', url: 'https://doi.org/10.1007/s11605-014-2726-7' },
  nciGtd: { label: 'NCI PDQ, Gestational Trophoblastic Disease Treatment (Health Professional)', url: 'https://www.cancer.gov/types/gestational-trophoblastic/hp/gtd-treatment-pdq' },
  urethra2021: { label: 'Incidence rates and contemporary trends in primary urethral cancer (SEER 2004 to 2016). Cancer Causes Control 2021;32:627-634', url: 'https://doi.org/10.1007/s10552-021-01416-2' },
  cai2022: { label: 'Cai et al., cutaneous T-cell lymphoma incidence in the US, 2000 to 2018 (SEER), JAMA Oncology research letter', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9437821/' },
  seerAml: { label: 'SEER Cancer Stat Facts: Acute Myeloid Leukemia (2019 to 2023)', url: 'https://seer.cancer.gov/statfacts/html/amyl.html' },
  acsBcell: { label: 'American Cancer Society, B-cell Non-Hodgkin Lymphoma', url: 'https://www.cancer.org/cancer/types/non-hodgkin-lymphoma/about/b-cell-lymphoma.html' },
  acsWm: { label: 'American Cancer Society, Key Statistics for Waldenstrom Macroglobulinemia', url: 'https://www.cancer.org/cancer/types/waldenstrom-macroglobulinemia/about/key-statistics.html' },
  pcnsl: { label: 'Racial differences in primary CNS lymphoma incidence and survival rates (SEER 1992 to 2002). Neuro-Oncology 2009;11:318-322', url: 'https://doi.org/10.1215/15228517-2008-103' },
  verstovsek2022: { label: 'Verstovsek et al., MPN incidence in the US, 2002 to 2016 (SEER). Leukemia & Lymphoma 2022', url: 'https://doi.org/10.1080/10428194.2021.1992756' },
  acsIbc: { label: 'American Cancer Society, Inflammatory Breast Cancer', url: 'https://www.cancer.org/cancer/types/breast-cancer/about/types-of-breast-cancer/inflammatory-breast-cancer.html' },
  mbc2010: { label: 'Metaplastic breast cancer and radiation therapy (SEER 1988 to 2006). Ann Surg Oncol 2010 (0.25 to 1% of breast cancers)', url: 'https://doi.org/10.1245/s10434-010-1198-6' },
};

export const NORMALIZE = [[/non[\s-]*small[\s-]*cell/gi, 'nsclc']];

// Rates are per 100,000 people per year. "crude" = ACS 2026 cases / Census 2025 population.
export const RARE = [
  { id: 'sarcoma', label: 'Sarcoma and GIST',
    api: ['sarcoma', 'gastrointestinal stromal tumor', 'osteosarcoma', 'Ewing sarcoma', 'rhabdomyosarcoma'],
    match: /sarcoma|\bgist\b|gastrointestinal stromal|\bewing/i,
    incidence: { text: 'Soft tissue (all types) 4.1, crude (13,910 cases). Bones and joints 1.2, crude (4,110). GIST about 1.8 (about 6,000 a year).', sources: ['acs2026', 'acsGist'] } },
  { id: 'mesothelioma', label: 'Mesothelioma',
    api: ['mesothelioma'], match: /mesothelioma/i,
    incidence: { text: 'About 0.9 (about 3,000 a year). 1.4 among adults 20+ in 2009 to 2013.', sources: ['acsMeso', 'acs2017rare'] } },
  { id: 'biliary', label: 'Bile duct and gallbladder',
    api: ['cholangiocarcinoma', 'biliary tract cancer', 'gallbladder cancer'],
    match: /cholangiocarcinoma|bile duct|biliary tract|gallbladder/i,
    incidence: { text: 'Bile duct about 2.3 (about 8,000 a year). Gallbladder and other biliary 3.7, crude (12,640).', sources: ['acsBile', 'acs2026'] } },
  { id: 'adrenal', label: 'Adrenal and paraganglioma',
    api: ['adrenocortical carcinoma', 'pheochromocytoma', 'paraganglioma'],
    match: /adrenocortical|adrenal (cortex )?carcinoma|pheochromocytoma|paraganglioma/i,
    incidence: { text: 'Adrenocortical carcinoma about 0.06 (about 200 a year). Pheochromocytoma 0.2 to 0.8 (2 to 8 per million).', sources: ['acsAdrenal', 'nciPheo'] } },
  { id: 'neuroendocrine', label: 'Neuroendocrine tumors', borderline: true,
    api: ['neuroendocrine tumor', 'neuroendocrine carcinoma', 'carcinoid'],
    match: /neuroendocrine|carcinoid|islet cell/i,
    incidence: { text: 'By site, each is under 6: gastroenteropancreatic 3.56, lung 1.49 (age-adjusted, SEER 2000 to 2012). GI tract about 8,000 a year.', why: 'All sites combined reached 6.98 (age-adjusted, 2012), above the line.', sources: ['dasari2017', 'acsGiNet'] } },
  { id: 'thymic', label: 'Thymoma and thymic carcinoma',
    api: ['thymoma', 'thymic carcinoma'], match: /thymoma|thymic/i,
    incidence: { text: 'About 0.17 (1.7 per million, about 600 a year).', sources: ['acsThymus'] } },
  { id: 'ocular', label: 'Uveal melanoma and retinoblastoma',
    api: ['uveal melanoma', 'retinoblastoma'], match: /uveal|ocular melanoma|choroidal melanoma|retinoblastoma/i,
    incidence: { text: 'All eye and orbit cancers 0.94, crude (3,200 cases, mostly melanoma). Retinoblastoma about 0.1 (300 to 350 a year).', sources: ['acsEye', 'acsRetino'] } },
  { id: 'merkel', label: 'Merkel cell carcinoma',
    api: ['Merkel cell carcinoma'], match: /merkel/i,
    incidence: { text: 'About 0.9 (about 3,000 a year).', sources: ['acsMerkel'] } },
  { id: 'glioma', label: 'Glioma and brain tumors', borderline: true,
    api: ['glioblastoma', 'glioma', 'astrocytoma', 'medulloblastoma', 'ependymoma', 'diffuse intrinsic pontine glioma'],
    match: /glioblastoma|glioma|astrocytoma|medulloblastoma|ependymoma|oligodendroglioma|diffuse intrinsic pontine|\bdipg\b|diffuse midline/i,
    incidence: { text: 'Glioblastoma, the most common, is 52% of malignant brain and CNS tumors, so roughly 3.6. The other named types are smaller.', why: 'All malignant brain and CNS tumors together are 6.89 (age-adjusted, 2017 to 2021) and 7.2 crude (24,740 cases), above the line.', sources: ['cbtrus2024', 'cbtrus2025', 'acs2026'] } },
  { id: 'pedsolid', label: 'Neuroblastoma, Wilms, hepatoblastoma',
    api: ['neuroblastoma', 'Wilms tumor', 'hepatoblastoma'], match: /neuroblastoma|wilms|nephroblastoma|hepatoblastoma/i,
    incidence: { text: 'Neuroblastoma about 0.2 (600 to 800 a year). Wilms about 0.2 (about 600). Hepatoblastoma about 0.18 (1.76 per million).', sources: ['acsNeuroblastoma', 'acsWilms', 'kahla'] } },
  { id: 'bone', label: 'Chordoma',
    api: ['chordoma'], match: /chordoma/i,
    incidence: { text: '0.08 (age-adjusted, SEER).', sources: ['mcmaster2001'] } },
  { id: 'headneck', label: 'Salivary, nasopharyngeal, rare thyroid',
    api: ['salivary gland cancer', 'nasopharyngeal carcinoma', 'anaplastic thyroid cancer', 'medullary thyroid cancer'],
    match: /salivary|adenoid cystic|nasopharyn|anaplastic thyroid|medullary thyroid/i,
    incidence: { text: 'Salivary 1.7 and nasopharynx 0.7 (adults 20+, 2009 to 2013). Medullary thyroid under 0.7 (under 5% of 45,240 thyroid cancers). Anaplastic thyroid about 0.3 (about 2%).', sources: ['acs2017rare', 'acs2026', 'acsThyroidTypes'] } },
  { id: 'gi', label: 'Anal, small bowel, appendiceal',
    api: ['anal cancer', 'small bowel adenocarcinoma', 'appendiceal cancer', 'pseudomyxoma peritonei'],
    match: /anal (cancer|carcinoma|canal)|small (bowel|intestin\w*) (adeno)?carcinoma|appendiceal|appendix cancer|pseudomyxoma/i,
    incidence: { text: 'Anus 3.3, crude (11,270 cases). Small intestine, all types, 4.2, crude (14,450). Appendix 0.97 (SEER, 2009).', sources: ['acs2026', 'appendix2015'] } },
  { id: 'gyn', label: 'Vulvar, vaginal, trophoblastic',
    api: ['vulvar cancer', 'vaginal cancer', 'gestational trophoblastic'],
    match: /vulvar|vaginal (cancer|carcinoma)|gestational trophoblastic/i,
    incidence: { text: 'Vulva 2.1, crude (7,130 cases). Vagina and other female genital 2.3, crude (7,760). Gestational trophoblastic disease 110 to 120 per 100,000 pregnancies, a much lower rate per 100,000 people.', sources: ['acs2026', 'nciGtd'] } },
  { id: 'gu', label: 'Penile, urethral, germ cell', borderline: true,
    api: ['penile cancer', 'urethral cancer', 'testicular cancer', 'germ cell tumor'],
    match: /penile|urethral (cancer|carcinoma)|testicular|germ cell/i,
    incidence: { text: 'Penis and other male genital 0.66, crude (2,260 cases). Testis 2.9, crude (9,810). Urethra 0.17 (1.69 per million, age-adjusted).', why: 'Testicular cancer counted among men only is about twice the whole-population rate, close to 6.', sources: ['acs2026', 'urethra2021'] } },
  { id: 'ctcl', label: 'Cutaneous T-cell lymphoma',
    api: ['cutaneous T-cell lymphoma', 'mycosis fungoides'], match: /cutaneous t[\s-]*cell|mycosis fungoides|s[eé]zary/i,
    incidence: { text: 'About 0.86 (8.55 per million, age-adjusted, SEER 2000 to 2018).', sources: ['cai2022'] } },
  { id: 'leukemia', label: 'Acute leukemias and CML', borderline: true,
    api: ['acute myeloid leukemia', 'acute lymphoblastic leukemia', 'chronic myeloid leukemia'],
    match: /acute myel\w+ leuk|acute lymph\w+ leuk|lymphoblastic leuk|chronic myel\w+ leuk|\baml\b|\bcml\b/i,
    incidence: { text: 'Acute lymphocytic 1.8, crude (6,250 cases). Chronic myeloid 2.8, crude (9,650). Acute myeloid 4.4 age-adjusted (SEER 2019 to 2023).', why: 'Acute myeloid leukemia is 6.6 by the crude count (22,720 cases), above the line, because it mostly strikes older people.', sources: ['acs2026', 'seerAml'] } },
  { id: 'lymphoma', label: 'Rare lymphomas',
    api: ['Hodgkin lymphoma', 'mantle cell lymphoma', 'Burkitt lymphoma', 'Waldenstrom macroglobulinemia', 'hairy cell leukemia', 'primary CNS lymphoma'],
    match: /(?<!non[\s-])hodgkin|mantle cell|burkitt|waldenstr|hairy cell|primary (cns|central nervous system) lymphoma/i,
    incidence: { text: 'Hodgkin 2.6, crude (8,920 cases). Mantle cell about 1.3 (about 5% of 88,240 lymphomas). Burkitt under 0.6. Waldenstrom under 0.5 (1,000 to 1,500 a year). Hairy cell about 0.2 (about 700). Primary CNS lymphoma 0.48 (age-adjusted).', sources: ['acs2026', 'acsBcell', 'acsWm', 'pcnsl'] } },
  { id: 'mpn', label: 'Myeloproliferative neoplasms',
    api: ['myelofibrosis', 'polycythemia vera', 'essential thrombocythemia'],
    match: /myelofibrosis|polycythemia vera|essential thrombocyth|myeloproliferative/i,
    incidence: { text: 'Polycythemia vera 1.57, essential thrombocythemia 1.55, primary myelofibrosis 0.44 (SEER 2002 to 2016).', sources: ['verstovsek2022'] } },
  { id: 'breastrare', label: 'Metaplastic, inflammatory, male breast',
    api: ['metaplastic breast cancer', 'metaplastic breast carcinoma', 'inflammatory breast cancer', 'male breast cancer'],
    match: /metaplastic|inflammatory breast|male breast/i,
    incidence: { text: 'Male breast 0.78, crude (2,670 cases). Inflammatory at most 4.7 (1 to 5% of 321,910 female breast cancers). Metaplastic under 1 (under 1%).', sources: ['acs2026', 'acsIbc', 'mbc2010'] } },
];

export const COMMON = [
  { id: 'breast', label: 'Breast cancer',
    api: ['breast cancer'], match: /breast (cancer|carcinoma|neoplasm|tumou?r)|mammary carcinoma/i,
    incidence: { text: '95, crude (324,580 cases).', sources: ['acs2026'] } },
  { id: 'lung', label: 'Non-small cell lung cancer',
    api: ['non-small cell lung cancer'], match: /nsclc|lung (cancer|carcinoma|adenocarcinoma)/i,
    // generic "lung cancer" that mentions small cell (and not NSCLC) is left out of both cohorts
    exclude: /(?<!n)sclc|small[\s-]*cell lung/i,
    incidence: { text: 'All lung and bronchus 67, crude (229,410 cases). Non-small cell is most of it.', sources: ['acs2026'] } },
  { id: 'colorectal', label: 'Colorectal cancer',
    api: ['colorectal cancer', 'colon cancer', 'rectal cancer'],
    match: /colorectal|colon (cancer|carcinoma|adenocarcinoma)|rectal (cancer|carcinoma|adenocarcinoma)|colon and rectal/i,
    incidence: { text: '46, crude (158,850 cases).', sources: ['acs2026'] } },
  { id: 'prostate', label: 'Prostate cancer',
    api: ['prostate cancer'], match: /prostat\w* (cancer|carcinoma|adenocarcinoma|neoplasm)/i,
    incidence: { text: '98, crude (333,830 cases).', sources: ['acs2026'] } },
];

export const COHORTS = { rare: RARE, common: COMMON, normalize: NORMALIZE };

// Eligibility, frozen with the pre-registration.
export const DESIGN = {
  studyType: 'INTERVENTIONAL',
  allowedPhases: ['PHASE2', 'PHASE3'], // a trial qualifies if its phases are a non-empty subset of these
  startYearMin: 2000,
  startYearMax: 2023,
  primaryStatuses: ['TERMINATED'],
  secondaryStatuses: ['WITHDRAWN'],
  // Denominator for "how often do trials stop at all": trials that reached an end, either way.
  finishedStatuses: ['COMPLETED', 'TERMINATED'],
};

/** A group has a usable incidence record when it has text and at least one known source. */
export const hasIncidence = (g) => !!(g.incidence?.text?.trim() && g.incidence.sources?.length && g.incidence.sources.every((k) => SOURCES[k]));
