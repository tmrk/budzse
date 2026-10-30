#!/usr/bin/env node
// Writes the static data API from public/data/budzse.json. Run after validation.
// public/api, public/llms.txt, public/llms-full.txt, public/hu and public/en are generated.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderApi } from './api-pages.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const WIPED = ['api', 'hu/api', 'hu/obs', 'hu/figures', 'en/api', 'en/obs', 'en/figures'];
const WIPED_FILES = ['llms.txt', 'llms-full.txt'];

export function writeApi(dataset, outDir) {
  for (const rel of WIPED) rmSync(join(outDir, ...rel.split('/')), { recursive: true, force: true });
  for (const rel of WIPED_FILES) rmSync(join(outDir, rel), { force: true });
  const files = renderApi(dataset);
  for (const [rel, body] of Object.entries(files)) {
    const file = join(outDir, ...rel.split('/'));
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, body);
  }
  return Object.keys(files).length;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const dataset = JSON.parse(readFileSync(join(ROOT, 'public/data/budzse.json'), 'utf8'));
  const count = writeApi(dataset, join(ROOT, 'public'));
  console.log(`api: ${count} files`);
}
