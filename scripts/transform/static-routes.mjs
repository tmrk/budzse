#!/usr/bin/env node
// GitHub Pages serves files, not rewrites, so each language gets a real entry point
// sharing the same hashed assets. 404.html sends unknown paths back to the application.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const dist = join(ROOT, 'dist');
const html = readFileSync(join(dist, 'index.html'), 'utf8');

const META = {
  hu: {
    title: 'Büdzsé – Magyarország közpénzügyei 2000–2027',
    description: 'Bevételek, kiadások, hiány, GDP és fejlesztési támogatás 2000-től 2027-ig. Terv és tény, inflációval korrigálva, minden szám mögött a hivatalos forrással.',
  },
  en: {
    title: "Büdzsé – Hungary's public finances 2000–2027",
    description: 'Government revenue, expenditure, deficits, GDP and development aid from 2000 to 2027. Budgeted and actual figures, adjusted for inflation, with the official source behind every number.',
  },
};

for (const lang of ['hu', 'en']) {
  const m = META[lang];
  const page = html
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

// Serving the app itself as 404.html keeps a mistyped path usable rather than a dead end.
copyFileSync(join(dist, 'index.html'), join(dist, '404.html'));
writeFileSync(join(dist, '.nojekyll'), '');
console.log('static routes: /, /hu/, /en/, 404.html');
