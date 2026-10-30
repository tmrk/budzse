#!/usr/bin/env node
// Re-reads the main-sum clauses of every budget and final-accounts act and writes
// data/observations/central-budget.json. The verbatim clause is stored as evidence, and
// a build fails if expenditure - revenue does not equal the deficit stated in the same clause.
import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { amendments, anchors, budget, consolidated, finalAccounts } from './legal-acts-manifest.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const UA = 'Mozilla/5.0 (compatible; Budzse-data-refresh/1.0; +https://github.com/tmrk/budzse)';
const accessed = new Date().toISOString().slice(0, 10);
const cache = new Map();

async function page(host, docid) {
  const url = `https://${host}.jogtar.hu/jogszabaly?docid=${docid}.tv`;
  if (cache.has(url)) return cache.get(url);
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const html = await res.text();
  const decoded = html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&ndash;/g, '–')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/\s+/g, ' ');
  const title = (html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '').replace(/\s+/g, ' ').trim().replace(/ - (Törvények és országgyűlési határozatok|Hatályos Jogszabályok Gyűjteménye)$/, '');
  const result = { url, title, text: decoded, adopted: adopted(decoded) };
  cache.set(url, result);
  await new Promise((r) => setTimeout(r, 250));
  return result;
}

const MONTHS = ['január', 'február', 'március', 'április', 'május', 'június', 'július', 'augusztus', 'szeptember', 'október', 'november', 'december'];
// The footnote on the act's first page gives the day of adoption by Parliament.
function adopted(text) {
  const m = text.match(/Országgyűlés a (\d{4})\. (\p{L}+) (\d{1,2})[-\p{L}]* ülésnapján fogadta el/u);
  if (!m) return null;
  const month = MONTHS.indexOf(m[2].toLowerCase());
  return month < 0 ? null : `${m[1]}-${String(month + 1).padStart(2, '0')}-${m[3].padStart(2, '0')}`;
}

const NUMBER = '(\\d{1,3}(?: \\d{3})+,\\d) millió forint';

/** Parses the three amounts of a main-sum clause. Returns null when the clause is absent. */
function mainSums(text, anchor) {
  const plain = text.replace(/, azaz [^,;]*?forint(?:ban|tal|nyi)?(?=[,; ])/g, '');
  // Amending acts quote the replaced section, so the clause need not follow a section number.
  const at = anchor ? plain.search(anchor) : plain.search(/(?:\d\. § \*? ?(?:\(1\) )?|[„"(]?(?:\(1\) )?)Az Országgyűlés[\s\S]{0,330}?(?:főösszegét|bevétellel|kiadással)/);
  if (at < 0) return null;
  const clause = plain.slice(at, at + 900);
  const pick = (re) => clause.match(re)?.[1];
  const revenue = pick(new RegExp(`bevételi főösszegét[\\s\\S]{0,170}?${NUMBER}`)) ?? pick(new RegExp(`${NUMBER} bevétellel`));
  const expenditure = pick(new RegExp(`kiadási főösszegét[\\s\\S]{0,170}?${NUMBER}`)) ?? pick(new RegExp(`${NUMBER} kiadással`));
  const deficit = pick(new RegExp(`hiányát ${NUMBER}`)) ?? pick(new RegExp(`${NUMBER} hiánnyal`));
  if (!revenue || !expenditure || !deficit) return null;
  const end = clause.search(/állapítja meg|hagyja jóvá/);
  return { revenue, expenditure, deficit, evidence: clause.slice(0, end > 0 ? end + 13 : 500).trim() };
}

/** "3 392 043,9" million forints → exact whole forints, via integers only. */
function millionsToHuf(text) {
  const [whole, tenth] = text.replace(/ /g, '').split(',');
  return (BigInt(whole) * 10n + BigInt(tenth)) * 100000n;
}

const observations = [];
const sources = {};

function addSource(id, act, kind) {
  sources[id] = {
    id,
    institution: { hu: 'Országgyűlés', en: 'Hungarian Parliament' },
    title: act.title,
    url: act.url,
    publicationDate: null,
    adoptedDate: act.adopted,
    accessed,
    type: 'law',
    ...(kind === 'consolidated'
      ? { note: { hu: 'A törvény hatályos, egységes szerkezetű szövege (Hatályos Jogszabályok Gyűjteménye, Wolters Kluwer).', en: 'Consolidated text of the act (Hatályos Jogszabályok Gyűjteménye, Wolters Kluwer).' } }
      : { note: { hu: 'Az Országgyűlés jogszabálytára, a kihirdetett szöveg.', en: "Parliament's law collection, text as promulgated." } }),
  };
}

function emit(year, status, sums, sourceId, locator, revision) {
  const scope = year >= 2010 ? 'centralSubsystem' : 'centralBudget';
  const diff = millionsToHuf(sums.expenditure) - millionsToHuf(sums.revenue);
  if (diff !== millionsToHuf(sums.deficit)) {
    throw new Error(`${year} ${status}: ${sums.expenditure} - ${sums.revenue} != ${sums.deficit}`);
  }
  for (const indicator of ['revenue', 'expenditure', 'deficit']) {
    observations.push({
      id: `central.${indicator}.${year}.${status}`,
      year,
      indicator,
      scope,
      status,
      method: 'cash',
      value: millionsToHuf(sums[indicator]).toString(),
      unit: 'HUF',
      original: { value: sums[indicator], unit: 'millió forint', currency: 'HUF' },
      institution: 'Országgyűlés',
      source: sourceId,
      locator,
      revision,
      evidence: sums.evidence,
    });
  }
}

for (const [y, docid] of Object.entries(budget)) {
  const year = Number(y);
  const act = await page('mkogy', docid);
  const sums = mainSums(act.text, anchors[`budget:${year}`]);
  if (!sums) throw new Error(`No main sums for budget ${year}`);
  const sid = `act-${docid}`;
  addSource(sid, act, 'promulgated');
  emit(year, 'original', sums, sid, year === 2004 ? '5. §' : year === 2002 ? '1. § (2) bekezdés' : '1. §', 'final');
  console.log('budget', year, sums.revenue, sums.expenditure, sums.deficit);
}

for (const [y, docid] of Object.entries(finalAccounts)) {
  const year = Number(y);
  const act = await page('mkogy', docid);
  const sums = mainSums(act.text);
  if (!sums) throw new Error(`No main sums for final accounts ${year}`);
  const sid = `act-${docid}`;
  addSource(sid, act, 'promulgated');
  emit(year, 'actual', sums, sid, '1. §', 'final');
  console.log('final', year, sums.revenue, sums.expenditure, sums.deficit);
}

const originalOf = (year, ind) => observations.find((o) => o.id === `central.${ind}.${year}.original`).value;
const differs = (year, s) => ['revenue', 'expenditure', 'deficit'].some((i) => millionsToHuf(s[i]).toString() !== originalOf(year, i));

for (const year of consolidated) {
  const act = await page('net', budget[year]);
  const sums = mainSums(act.text, anchors[`consolidated:${year}`]);
  if (!sums) { console.log('consolidated: no clause', year); continue; }
  if (!differs(year, sums)) { console.log('consolidated: unchanged', year); continue; }
  const sid = `consolidated-${budget[year]}`;
  addSource(sid, act, 'consolidated');
  sources[sid].adoptedDate = null;
  emit(year, 'revised', sums, sid, year === 2004 ? '5. §' : year === 2002 ? '1. § (2) bekezdés' : '1. §', 'revised');
  console.log('revised', year, sums.revenue, sums.expenditure, sums.deficit);
}

for (const [y, acts] of Object.entries(amendments)) {
  const year = Number(y);
  let last = null;
  for (const docid of acts) {
    const act = await page('mkogy', docid);
    const sums = mainSums(act.text);
    if (sums && differs(year, sums)) last = { act, sums, docid };
    console.log('amendment', year, docid, sums ? `${sums.revenue} ${sums.expenditure} ${sums.deficit}` : 'no main sums');
  }
  if (last) {
    const sid = `act-${last.docid}`;
    addSource(sid, last.act, 'promulgated');
    emit(year, 'revised', last.sums, sid, 'módosító törvény, a főösszegeket megállapító szakasz', 'revised');
  }
}

observations.sort((a, b) => a.year - b.year || a.indicator.localeCompare(b.indicator) || a.status.localeCompare(b.status));
await writeFile(join(ROOT, 'data/observations/central-budget.json'), `${JSON.stringify(observations, null, 1)}\n`);
await writeFile(join(ROOT, 'data/sources/legal-sources.json'), `${JSON.stringify(sources, null, 1)}\n`);
console.log(`${observations.length} observations, ${Object.keys(sources).length} sources`);
