#!/usr/bin/env node
// Builds dist/index.html (and dist/audit.html, except in deploy builds) as self-contained files: data, fonts and code inline.
//
//   node scripts/build.mjs                  development build, any data
//   node scripts/build.mjs --deploy         refuses unless the data is real and the paperwork is in place
//   node scripts/build.mjs --data data-fixture --out dist-fixture
import { readFile, writeFile, mkdir, access, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { headlineFor, deckFor } from '../lib/narrative.mjs';
import { RARE, COMMON, hasIncidence } from '../config/cohorts.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const exists = (p) => access(p).then(() => true, () => false);
const readJson = async (p, fallback = null) => ((await exists(p)) ? JSON.parse(await readFile(p, 'utf8')) : fallback);

// Registry text is untrusted. Keep it from closing the script tag or breaking the parser.
const embed = (x) => JSON.stringify(x).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const attr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function fontCss() {
  const d = path.join(root, 'src', 'fonts');
  const faces = [
    ['Literata', 400, 'normal', 'literata-latin-400-normal.woff2'],
    ['Literata', 400, 'italic', 'literata-latin-400-italic.woff2'],
    ['Literata', 600, 'normal', 'literata-latin-600-normal.woff2'],
    ['Public Sans', 400, 'normal', 'public-sans-latin-400-normal.woff2'],
    ['Public Sans', 600, 'normal', 'public-sans-latin-600-normal.woff2'],
  ];
  let css = '';
  for (const [fam, w, style, file] of faces) {
    const b64 = (await readFile(path.join(d, file))).toString('base64');
    css += `@font-face{font-family:'${fam}';font-weight:${w};font-style:${style};font-display:swap;src:url(data:font/woff2;base64,${b64}) format('woff2');}\n`;
  }
  return css;
}

async function main() {
  const dataDir = path.resolve(root, opt('data', 'data'));
  const outDir = path.resolve(root, opt('out', 'dist'));
  const deploy = flag('deploy');

  const site = await readJson(path.join(dataDir, 'site.json'));
  if (!site) { console.error(`No ${path.join(dataDir, 'site.json')}. Run "npm run fetch" then "npm run analyze".`); process.exit(1); }
  const cfg = await readJson(path.join(root, 'config', 'site.json'), {});
  const audit = await readJson(path.join(root, 'audit', 'results.json'));
  // Fixture builds use their own sample so synthetic reasons never land in audit/.
  const sample = await readJson(site.meta.isFixture ? path.join(dataDir, 'audit-sample.json') : path.join(root, 'audit', 'sample.json'));

  if (deploy) {
    const problems = [];
    if (site.meta.isFixture) problems.push('The data is synthetic test data (fetched from a non-registry address).');
    if (!cfg.preregCommit) problems.push('config/site.json has no preregCommit. Commit PREREGISTRATION.md first, then record that commit hash.');
    const noSource = [...RARE, ...COMMON].filter((g) => !hasIncidence(g));
    if (noSource.length) problems.push(`${noSource.length} cohort groups have no incidence figure with a known source (run "npm run check:cohorts").`);
    if (cfg.incidenceChecked !== true) problems.push('config/site.json: incidenceChecked is not true. Run "npm run check:cohorts", open every source link, confirm each figure, then set it.');
    if (!cfg.repoUrl) problems.push('config/site.json has no repoUrl.');
    if (!audit) problems.push('No hand audit yet (audit/results.json). Label the blind sample in dist/audit.html, then run "npm run audit:score".');
    if (problems.length) {
      console.error('Refusing to build a deployable site:\n' + problems.map((p) => `  - ${p}`).join('\n'));
      process.exit(1);
    }
  }

  let tpl = await readFile(path.join(root, 'src', 'template.html'), 'utf8');
  const narrative = (await readFile(path.join(root, 'lib', 'narrative.mjs'), 'utf8')).replace(/^export /gm, '');
  const headline = headlineFor(site.results);
  const deck = deckFor(site.results, site.conditions);
  const title = `${cfg.title ?? 'Stopped'}: ${headline.split('.')[0]}.`;
  const css = await fontCss();

  const fill = (s, map) => { for (const [k, v] of Object.entries(map)) s = s.split(k).join(v); return s; };
  // function replacers are used for anything that may contain "$" patterns
  tpl = fill(tpl, { __TITLE__: attr(title), __DESCRIPTION__: attr(`${headline} ${deck}`) });
  tpl = tpl.replace('/*__FONTS__*/', () => css);
  tpl = tpl.replace('/*__NARRATIVE__*/', () => narrative);
  tpl = tpl.replace('__DATA__', () => embed(site));
  tpl = tpl.replace('__CONFIG__', () => embed(cfg));
  tpl = tpl.replace('__AUDIT__', () => embed(audit));
  tpl = tpl.replace('__DEPLOY__', () => String(deploy));

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'index.html'), tpl);
  console.log(`Wrote ${path.join(outDir, 'index.html')} (${(tpl.length / 1024).toFixed(0)} KB)${deploy ? ' [deploy build]' : site.meta.isFixture ? ' [SYNTHETIC DATA]' : ' [dev build]'}`);

  if (deploy) {
    // The deploy folder is exactly what goes online. The blind audit page is a private tool, so it stays out.
    await rm(path.join(outDir, 'audit.html'), { force: true });
    console.log(`Upload the ${path.relative(root, outDir) || '.'} folder. It holds only index.html.`);
  } else if (sample) {
    let a = await readFile(path.join(root, 'src', 'audit.html'), 'utf8');
    a = a.replace('/*__FONTS__*/', () => css).replace('__SAMPLE__', () => embed(sample));
    await writeFile(path.join(outDir, 'audit.html'), a);
    console.log(`Wrote ${path.join(outDir, 'audit.html')} (${sample.length} reasons)`);
  } else {
    console.log('No audit/sample.json yet. Run "npm run audit:sample" to create the blind audit page.');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
