#!/usr/bin/env node
// Fails the build when the compiled dataset breaks a provenance or accounting rule,
// and rewrites data/COVERAGE.md so gaps stay visible in the repository.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const d = JSON.parse(readFileSync(join(ROOT, 'public/data/budzse.json'), 'utf8'));
const ameco = JSON.parse(readFileSync(join(ROOT, 'data/raw/ameco.json'), 'utf8'));
const errors = [];
const warnings = [];
const fail = (m) => errors.push(m);

const STATUSES = new Set(['original', 'revised', 'draft', 'planned', 'actual', 'ytd', 'forecast']);
const LAST_FULL_YEAR = 2025;

const ids = new Set();
for (const o of d.observations) {
  const tag = o.id ?? JSON.stringify(o).slice(0, 80);
  if (!o.id) fail(`Observation without id: ${tag}`);
  if (ids.has(o.id)) fail(`Duplicate observation: ${o.id}`);
  ids.add(o.id);
  if (!o.source) fail(`${tag}: no source`);
  const src = d.sources[o.source];
  if (!src) fail(`${tag}: source ${o.source} is not in the registry`);
  else {
    if (!/^https:\/\/[^\s]+$/.test(src.url)) fail(`${o.source}: invalid URL ${src.url}`);
    if (!src.title || !src.institution?.hu || !src.institution?.en) fail(`${o.source}: incomplete metadata`);
    if (!src.accessed) fail(`${o.source}: no access date`);
  }
  if (!o.locator) fail(`${tag}: no locator`);
  if (!o.institution) fail(`${tag}: no institution`);
  if (!o.original?.value || !o.original?.unit) fail(`${tag}: original value or unit missing`);
  if (typeof o.value !== 'number' || !Number.isFinite(o.value)) fail(`${tag}: value is not a number`);
  if (o.year < 2000 || o.year > 2027 || !Number.isInteger(o.year)) fail(`${tag}: impossible year`);
  if (!STATUSES.has(o.status)) fail(`${tag}: unknown status ${o.status}`);
  if (o.unit === 'HUF' && !Number.isSafeInteger(o.value)) fail(`${tag}: forint value must be a whole number`);
  if (o.unit !== 'HUF' && o.unit !== 'pct') fail(`${tag}: unknown unit ${o.unit}`);

  // A zero must never stand in for missing data; no indicator here is genuinely zero.
  if (o.value === 0) fail(`${tag}: zero value`);

  // Classification rules: outcomes cannot exist for unfinished years.
  if (o.status === 'actual' && o.year > LAST_FULL_YEAR) fail(`${tag}: actual after ${LAST_FULL_YEAR}`);
  if ((o.status === 'forecast' || o.status === 'ytd' || o.status === 'draft') && o.year <= LAST_FULL_YEAR) fail(`${tag}: ${o.status} for a finished year`);
  if (o.status === 'ytd' && !o.period) fail(`${tag}: part-year figure without period`);
  if (o.status === 'forecast' && !o.publisher) fail(`${tag}: forecast without publisher`);
  if (o.status === 'draft' && o.year !== 2027) fail(`${tag}: drafts are only expected for 2027`);

  // Scope rules: the budget acts' coverage changed in 2010.
  if (o.scope === 'centralBudget' && o.year >= 2010) fail(`${tag}: central budget scope after 2009`);
  if (o.scope === 'centralSubsystem' && o.year < 2010) fail(`${tag}: central subsystem scope before 2010`);
  if (['centralBudget', 'centralSubsystem'].includes(o.scope) && o.method !== 'cash') fail(`${tag}: central scope must be cash based`);
  if (o.scope === 'generalGovernment' && o.method !== 'esa2010') fail(`${tag}: general government must be ESA 2010`);

  if (o.derivation && !o.derivation.inputs?.every((s) => d.sources[s])) fail(`${tag}: derivation input without source`);
  if (o.secondary && d.sources[o.source]?.type !== 'secondary') fail(`${tag}: secondary flag on a primary source`);
  if (!o.secondary && d.sources[o.source]?.type === 'secondary') fail(`${tag}: secondary source not flagged`);
}

// Accounting identity: deficit = expenditure - revenue within the same scope and status.
const key = (o) => `${o.scope}|${o.status}|${o.publisher ?? ''}|${o.year}`;
const groups = new Map();
for (const o of d.observations) {
  if (!['revenue', 'expenditure', 'deficit'].includes(o.indicator)) continue;
  if (!groups.has(key(o))) groups.set(key(o), {});
  groups.get(key(o))[o.indicator] = o;
}
for (const [k, g] of groups) {
  if (!(g.revenue && g.expenditure && g.deficit)) continue;
  const diff = g.expenditure.value - g.revenue.value - g.deficit.value;
  // Eurostat publishes TR and TE as whole millions but B9 to 0.1 million, leaving small residuals
  // (largest: 2.2 million HUF in 2016). Budget acts and the Treasury must reconcile almost exactly.
  // Forint figures calculated from shares published to 0.1% of GDP can miss by up to that much in all.
  const tolerance = g.revenue.derivation ? g.revenue.value * 0.0025 : g.deficit.scope === 'generalGovernment' ? 5e6 : 1000;
  if (Math.abs(diff) > tolerance) fail(`${k}: expenditure - revenue differs from deficit by ${diff} HUF`);
}
const counted = [...groups.values()].filter((g) => g.revenue && g.expenditure && g.deficit).length;

// Required coverage: gaps may exist, but only the documented ones.
const has = (id) => ids.has(id);
for (let y = 2000; y <= LAST_FULL_YEAR; y++) {
  for (const i of ['revenue', 'expenditure', 'deficit']) {
    if (!has(`central.${i}.${y}.actual`)) fail(`Missing central actual ${i} ${y}`);
    if (!has(`central.${i}.${y}.original`)) fail(`Missing central original ${i} ${y}`);
    if (!has(`general.${i}.${y}.actual`)) fail(`Missing general actual ${i} ${y}`);
  }
  if (!has(`gdp.${y}.actual`)) fail(`Missing GDP ${y}`);
  if (!has(`cpi.${y}.actual`)) fail(`Missing CPI ${y}`);
}
for (let y = 2003; y <= 2025; y++) if (!has(`oda.${y}.actual`)) fail(`Missing ODA ${y}`);
for (let y = 2000; y <= 2002; y++) if (has(`oda.${y}.actual`)) fail(`ODA ${y} appeared: update the gap register`);

for (let y = 2019; y <= 2024; y++) if (!has(`hungaryHelpsProgram.${y}.actual`)) fail(`Missing Hungary Helps programme ${y}`);
for (const o of d.observations) {
  if (!o.indicator.startsWith('hungaryHelps')) continue;
  if (o.year < 2019) fail(`${o.id}: no line carries the name before 2019`);
  if (o.scope !== 'centralSubsystem' || o.method !== 'cash') fail(`${o.id}: must be a cash line of the central subsystem`);
  if (!d.sources[o.source]?.url.startsWith('https://mkogy.jogtar.hu/')) fail(`${o.id}: must come from a promulgated act`);
}

// CPI: consecutive years, plausible indices, chain equal to the product of published indices.
const cpi = d.cpi.annual;
cpi.forEach((r, i) => {
  if (i && r.year !== cpi[i - 1].year + 1) fail(`CPI not consecutive at ${r.year}`);
  if (r.index < 90 || r.index > 130) fail(`CPI index implausible in ${r.year}: ${r.index}`);
  if (!r.source || !d.sources[r.source]) fail(`CPI ${r.year} without source`);
  if (r.status === 'actual' && r.year > LAST_FULL_YEAR) fail(`CPI ${r.year} marked actual`);
  if (i && Math.abs(r.level - (cpi[i - 1].level * r.index) / 100) > 1e-9) fail(`CPI chain broken at ${r.year}`);
});
if (cpi[0].year !== 2000 || cpi[0].level !== 100) fail('CPI must start at 2000 = 100');

// Independent check: KSH one-decimal indices against the Commission's own national CPI index.
const lvl = (y) => cpi.find((r) => r.year === y).level;
const amecoRatio = Number(ameco.series.cpi.values[2025]) / Number(ameco.series.cpi.values[2000]);
const cpiGap = (lvl(2025) / lvl(2000) / amecoRatio - 1) * 100;
if (Math.abs(cpiGap) > 1.5) fail(`CPI chain differs from AMECO by ${cpiGap.toFixed(2)}%`);

// Monthly reference must sit close to the 2025 annual level.
const f = d.cpi.latestMonth.factorVsBaseYear;
if (f < 0.95 || f > 1.15) fail(`Latest-month CPI factor implausible: ${f}`);

// Independent check: Eurostat against AMECO for 2000-2024; recent years may differ by vintage.
for (const [series, id] of [['revenue', 'general.revenue'], ['expenditure', 'general.expenditure'], ['gdp', 'gdp']]) {
  for (let y = 2000; y <= 2024; y++) {
    const obs = d.observations.find((o) => o.id === `${id}.${y}.actual`);
    const other = Number(ameco.series[series].values[y]) * 1e9;
    const gap = Math.abs(obs.value / other - 1) * 100;
    if (gap > 1.5) warnings.push(`${id} ${y}: Eurostat and AMECO differ by ${gap.toFixed(2)}%`);
  }
}

// Exchange rate: the OECD's implied rate should track the MNB average.
for (const x of d.fxCheck) {
  if (Math.abs(x.differencePct) > 3) fail(`FX ${x.year}: OECD implied differs from MNB by ${x.differencePct}%`);
}

// Magnitude guard against million/billion slips.
const range = { revenue: [2e12, 6e13], expenditure: [3e12, 6e13], gdp: [1e13, 1.2e14], oda: [1e9, 5e11], odaGe: [1e9, 5e11], hungaryHelpsProgram: [1e8, 5e10], hungaryHelpsAgency: [1e7, 1e10] };
for (const o of d.observations) {
  const r = range[o.indicator];
  if (r && (o.value < r[0] || o.value > r[1])) fail(`${o.id}: ${o.value} outside plausible range`);
}

// Implausible changes must be known ones.
const KNOWN_JUMPS = new Set(['central.2010', 'central.2002', 'central.2020']);
for (const [ind, label] of [['revenue', 'Revenue'], ['expenditure', 'Expenditure']]) {
  for (let y = 2001; y <= LAST_FULL_YEAR; y++) {
    const a = d.observations.find((o) => o.id === `central.${ind}.${y - 1}.actual`);
    const b = d.observations.find((o) => o.id === `central.${ind}.${y}.actual`);
    const change = b.value / a.value - 1;
    if (Math.abs(change) > 0.2 && !KNOWN_JUMPS.has(`central.${y}`)) warnings.push(`${label} ${y}: ${(change * 100).toFixed(1)}% year on year`);
  }
}

if (!d.gaps.length) fail('Gap register is empty');
for (const g of d.gaps) {
  if (!g.reason?.hu || !g.reason?.en || !g.searched?.hu || !g.searched?.en) fail(`Gap ${g.id}: incomplete`);
  for (const s of g.sources ?? []) if (!d.sources[s]) fail(`Gap ${g.id}: source ${s} is not in the registry`);
}

// Coverage report.
const years = Array.from({ length: 28 }, (_, i) => 2000 + i);
const rows = [
  ['Central: original act', (y) => has(`central.deficit.${y}.original`)],
  ['Central: amended act', (y) => has(`central.deficit.${y}.revised`)],
  ['Central: actual', (y) => has(`central.deficit.${y}.actual`)],
  ['Central: year to date', (y) => has(`central.deficit.${y}.ytd`)],
  ['Central: draft', (y) => has(`central.deficit.${y}.draft`)],
  ['General gov: actual', (y) => has(`general.deficit.${y}.actual`)],
  ['General gov: budget-time estimate (HUF)', (y) => has(`general.deficit.${y}.planned`)],
  ['General gov: forecast', (y) => has(`general.deficit.${y}.forecast.ec`) || has(`general.deficit.${y}.forecast.gov`)],
  ['GDP: actual', (y) => has(`gdp.${y}.actual`)],
  ['GDP: budget-time assumption', (y) => has(`gdp.${y}.planned`)],
  ['GDP: forecast', (y) => has(`gdp.${y}.forecast.gov`)],
  ['ODA: net disbursements', (y) => has(`oda.${y}.actual`)],
  ['ODA: grant equivalent', (y) => has(`odaGe.${y}.actual`)],
  ['Hungary Helps: programme', (y) => has(`hungaryHelpsProgram.${y}.actual`) || has(`hungaryHelpsProgram.${y}.original`)],
  ['Hungary Helps: agency', (y) => has(`hungaryHelpsAgency.${y}.actual`) || has(`hungaryHelpsAgency.${y}.original`)],
  ['CPI: KSH', (y) => has(`cpi.${y}.actual`)],
  ['CPI: forecast', (y) => has(`cpi.${y}.forecast.gov`)],
];
const short = (y) => `'${String(y).slice(2)}`;
const md = [
  '# Data coverage',
  '',
  'Generated by `npm run data:validate`. `x` means verified data exists; a blank is a documented gap (see `data/methodology/gaps.json`).',
  '',
  `| Series | ${years.map(short).join(' | ')} |`,
  `|---|${years.map(() => '--').join('|')}|`,
  ...rows.map(([name, test]) => `| ${name} | ${years.map((y) => (test(y) ? 'x' : ' ')).join(' | ')} |`),
  '',
  `Observations: ${d.observations.length}. Sources: ${Object.keys(d.sources).length}.`,
  `Accounting identity checked on ${counted} year/scope/status groups.`,
  `CPI chain against AMECO over 2000-2025: ${cpiGap.toFixed(2)}%.`,
  '',
].join('\n');
writeFileSync(join(ROOT, 'data/COVERAGE.md'), md);

for (const w of warnings) console.warn(`warning: ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`error: ${e}`);
  console.error(`\nValidation failed with ${errors.length} error(s).`);
  process.exit(1);
}
console.log(`Validation passed: ${d.observations.length} observations, ${counted} identity groups, ${warnings.length} warning(s).`);
