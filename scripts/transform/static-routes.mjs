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
  ['font', asset(/^big-shoulders-display-latin-wght-normal.*\.woff2$/), 'font/woff2'],
  ['font', asset(/^newsreader-latin-opsz-normal.*\.woff2$/), 'font/woff2'],
]
  .filter(([, f]) => f)
  .map(([as, f, type]) => `<link rel="preload" as="${as}" type="${type}" href="/budzse/assets/${f}" crossorigin />`);
preload.push('<link rel="preload" as="fetch" href="/budzse/data/budzse.json" crossorigin />');
const html = built.replace('</head>', `    ${preload.join('\n    ')}\n  </head>`);

// A static first paint: the top bar is real HTML, so people see it before any JavaScript runs.
const shell = (tagline) => `<div class="page"><header class="bar"><div class="bar-inner"><p class="wordmark">Büdzsé</p></div></header><p class="tagline">${tagline}</p><div class="status-line"></div></div>`;

const META = {
  hu: {
    title: 'Büdzsé – Magyarország közpénzügyei 2000–2027',
    description: 'Bevételek, kiadások, hiány, GDP és fejlesztési támogatás 2000-től 2027-ig. Terv és tény, inflációval korrigálva, minden szám mögött a hivatalos forrással.',
    tagline: 'Magyarország közpénzügyei, 2000–2027. Minden számra kattintva látszik a forrása.',
  },
  en: {
    title: "Büdzsé – Hungary's public finances 2000–2027",
    description: 'Government revenue, expenditure, deficits, GDP and development aid from 2000 to 2027. Budgeted and actual figures, adjusted for inflation, with the official source behind every number.',
    tagline: "Hungary's public finances, 2000 to 2027. Every number opens its source.",
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
