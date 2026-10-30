#!/usr/bin/env node
// GitHub Pages serves files, not rewrites, so each language gets a real entry point
// sharing the same hashed assets. 404.html sends unknown paths back to the application.
import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const dist = join(ROOT, 'dist');
const built = readFileSync(join(dist, 'index.html'), 'utf8');

// Preloads for what the first screen needs, resolved to this build's hashed file names.
const assets = readdirSync(join(dist, 'assets'));
const asset = (re) => assets.find((f) => re.test(f));
const preload = [
  ['font', asset(/^public-sans-latin-wght-normal.*\.woff2$/), 'font/woff2'],
  ['font', asset(/^bricolage-grotesque-latin-wght-normal.*\.woff2$/), 'font/woff2'],
]
  .filter(([, f]) => f)
  .map(([as, f, type]) => `<link rel="preload" as="${as}" type="${type}" href="/budzse/assets/${f}" crossorigin />`);
preload.push('<link rel="preload" as="fetch" href="/budzse/data/budzse.json" crossorigin />');
for (const f of [asset(/^ChartView.*\.js$/), asset(/^echarts.*\.js$/)]) {
  if (f) preload.push(`<link rel="modulepreload" href="/budzse/assets/${f}" />`);
}
const html = built.replace('</head>', `    ${preload.join('\n    ')}\n  </head>`);

// A static first paint: the masthead is real HTML, so people see it before any JavaScript runs.
const shell = (tagline) => `<div class="page"><header class="masthead"><div class="masthead-top"><p class="wordmark" style="margin:0"><span aria-hidden="true">B<span class="wordmark-u">u<i class="dot dot-a"></i><i class="dot dot-b"></i></span>dzsé</span></p></div><div class="masthead-body"><p class="tagline">${tagline}</p></div></header><div class="status-line"></div></div>`;

const META = {
  hu: {
    title: 'Büdzsé – Magyarország közpénzügyei 2000–2027',
    description: 'Bevételek, kiadások, hiány, GDP és fejlesztési támogatás 2000-től 2027-ig. Terv és tény, inflációval korrigálva, minden szám mögött a hivatalos forrással.',
    tagline: 'Mennyi pénze volt az államnak, és mire volt elég? Magyarország közpénzügyei 2000-től 2027-ig, minden szám mögött a hivatalos forrással.',
  },
  en: {
    title: "Büdzsé – Hungary's public finances 2000–2027",
    description: 'Government revenue, expenditure, deficits, GDP and development aid from 2000 to 2027. Budgeted and actual figures, adjusted for inflation, with the official source behind every number.',
    tagline: "How much money did the Hungarian state have, and what did it cover? Hungary's public finances from 2000 to 2027, with the official source behind every number.",
  },
};

for (const lang of ['hu', 'en']) {
  const m = META[lang];
  const page = html
    .replace('<!--shell-->', shell(m.tagline))
    .replace('<html lang="hu">', `<html lang="${lang}">`)
    .replace(/<title>.*?<\/title>/, `<title>${m.title}</title>`)
    .replace(/(<meta name="description" content=").*?(")/, `$1${m.description}$2`)
    .replace(/(<meta property="og:title" content=").*?(")/, `$1${m.title}$2`)
    .replace(/(<meta property="og:description" content=").*?(")/, `$1${m.description}$2`)
    .replace(/(<meta property="og:url" content=").*?(")/, `$1https://tmrk.github.io/budzse/${lang}/$2`)
    .replace(/(<link rel="canonical" href=").*?(")/, `$1https://tmrk.github.io/budzse/${lang}/$2`);
  mkdirSync(join(dist, lang), { recursive: true });
  writeFileSync(join(dist, lang, 'index.html'), page);
}

// The root may resolve to either language, so it paints only the language-neutral wordmark.
const root = html.replace('<!--shell-->', shell(''));
writeFileSync(join(dist, 'index.html'), root);

// Serving the app itself as 404.html keeps a mistyped path usable rather than a dead end.
copyFileSync(join(dist, 'index.html'), join(dist, '404.html'));
writeFileSync(join(dist, '.nojekyll'), '');
console.log('static routes: /, /hu/, /en/, 404.html');
