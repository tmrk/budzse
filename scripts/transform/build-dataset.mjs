#!/usr/bin/env node
// Compiles data/raw, data/observations and data/sources into public/data/budzse.json.
// No number enters the site except through this file, and every one it emits names a source.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));

const eurostat = read('data/raw/eurostat.json');
const oecd = read('data/raw/oecd-dac1.json');
const ksh = read('data/raw/ksh-cpi.json');
const ameco = read('data/raw/ameco.json');
const mnb = read('data/raw/mnb-usd.json');
const legal = read('data/observations/central-budget.json');
const manual = read('data/observations/manual-transcriptions.json');
const gaps = read('data/methodology/gaps.json');

const FIRST = 2000;
const LAST = 2027;

/** Exact decimal string × 10^exp → whole number as BigInt; throws if a fraction would remain. */
function scaleDecimal(text, exp) {
  const negative = text.trim().startsWith('-');
  const [whole, frac = ''] = text.trim().replace('-', '').split('.');
  if (frac.length > exp) {
    const dropped = frac.slice(exp);
    if (/[1-9]/.test(dropped)) throw new Error(`Precision loss scaling ${text} by 10^${exp}`);
  }
  const digits = whole + frac.slice(0, exp).padEnd(exp, '0');
  const v = BigInt(digits);
  return negative ? -v : v;
}

const toSafe = (big, id) => {
  const n = Number(big);
  if (!Number.isSafeInteger(n)) throw new Error(`Value of ${id} exceeds safe integer range`);
  return n;
};

const obs = [];
const push = (o) => obs.push(o);
const accessedOf = {
  'eurostat-gov': eurostat.accessed,
  'eurostat-gdp': eurostat.accessed,
  'oecd-dac1': oecd.accessed,
  'ksh-cpi-annual': ksh.accessed,
  'ksh-cpi-monthly': ksh.accessed,
  'ec-ameco-2026-spring': ameco.accessed,
  'mnb-rates': mnb.accessed,
};

// Hand-verified and act-derived rows hold exact strings; only here do they become numbers.
for (const o of [...legal, ...manual]) {
  push({ ...o, value: typeof o.value === 'string' ? toSafe(BigInt(o.value), o.id) : o.value });
}

// Eurostat: general government, ESA 2010. Reported in million HUF.
for (const [item, indicator] of [['TR', 'revenue'], ['TE', 'expenditure'], ['B9', 'deficit']]) {
  for (const [y, cell] of Object.entries(eurostat.gov[item])) {
    const year = Number(y);
    if (year < FIRST) continue;
    const raw = String(cell.value);
    const huf = scaleDecimal(raw, 6);
    push({
      id: `general.${indicator}.${year}.actual`,
      year,
      indicator,
      scope: 'generalGovernment',
      status: 'actual',
      method: 'esa2010',
      value: toSafe(item === 'B9' ? -huf : huf, `general.${indicator}.${year}`),
      unit: 'HUF',
      original: { value: raw, unit: 'million HUF', currency: 'HUF' },
      institution: 'Eurostat',
      source: 'eurostat-gov',
      locator: `na_item=${item}, sector=S13, unit=MIO_NAC, geo=HU, time=${year}`,
      revision: cell.flag === 'p' ? 'preliminary' : 'final',
      ...(item === 'B9'
        ? { note: { hu: 'Az Eurostat B.9 (nettó hitelnyújtás) előjelét megfordítottuk: a pozitív érték hiány.', en: 'The sign of Eurostat B.9 (net lending) is reversed: positive means deficit.' } }
        : {}),
    });
  }
}

// Eurostat: GDP at current prices, million HUF; official real growth, percent.
for (const [y, cell] of Object.entries(eurostat.gdp)) {
  const year = Number(y);
  if (year < FIRST) continue;
  push({
    id: `gdp.${year}.actual`,
    year,
    indicator: 'gdp',
    scope: 'economy',
    status: 'actual',
    method: 'nationalAccounts',
    value: toSafe(scaleDecimal(String(cell.value), 6), `gdp.${year}`),
    unit: 'HUF',
    original: { value: String(cell.value), unit: 'million HUF', currency: 'HUF' },
    institution: 'Eurostat',
    source: 'eurostat-gdp',
    locator: `na_item=B1GQ, unit=CP_MNAC, geo=HU, time=${year}`,
    revision: cell.flag === 'p' ? 'preliminary' : 'final',
  });
}
for (const [y, cell] of Object.entries(eurostat.gdpGrowth)) {
  const year = Number(y);
  if (year < FIRST) continue;
  push({
    id: `realGdpGrowth.${year}.actual`,
    year,
    indicator: 'realGdpGrowth',
    scope: 'economy',
    status: 'actual',
    method: 'nationalAccounts',
    value: cell.value,
    unit: 'pct',
    original: { value: String(cell.value), unit: 'percentage change on previous period', currency: '' },
    institution: 'Eurostat',
    source: 'eurostat-gdp',
    locator: `na_item=B1GQ, unit=CLV_PCH_PRE, geo=HU, time=${year}`,
    revision: cell.flag === 'p' ? 'preliminary' : 'final',
  });
}

// OECD DAC1: the OECD publishes national-currency values itself, so no conversion is needed.
const dacSeries = [
  ['oda', 'oda', 'dacNet', 'MEASURE=1010, FLOW_TYPE=1140'],
  ['bilateral', 'odaBilateral', 'dacNet', 'MEASURE=1015, FLOW_TYPE=1140'],
  ['multilateral', 'odaMultilateral', 'dacNet', 'MEASURE=2000, FLOW_TYPE=1140'],
  ['odaGe', 'odaGe', 'dacGrantEquivalent', 'MEASURE=11010, FLOW_TYPE=1160'],
];
for (const [key, indicator, method, loc] of dacSeries) {
  for (const [y, cell] of Object.entries(oecd.series[key].XDC)) {
    const year = Number(y);
    const usd = oecd.series[key].USD?.[y]?.value;
    push({
      id: `${indicator}.${year}.actual`,
      year,
      indicator,
      scope: 'donor',
      status: 'actual',
      method,
      value: toSafe(scaleDecimal(cell.value, cell.mult), `${indicator}.${year}`),
      unit: 'HUF',
      original: { value: cell.value, unit: 'million HUF (national currency)', currency: 'HUF', ...(usd ? { usd: `${usd} million USD` } : {}) },
      institution: 'OECD',
      source: 'oecd-dac1',
      locator: `DONOR=HUN, ${loc}, UNIT_MEASURE=XDC, PRICE_BASE=V, TIME_PERIOD=${year}`,
      revision: 'final',
      ...(key === 'odaGe' && year < 2018
        ? { note: { hu: 'A támogatási egyenérték 2018-tól a hivatalos DAC-főszám; a korábbi évek csak tájékoztató jellegűek.', en: 'Grant equivalent became the official DAC headline in 2018; earlier years are indicative.' } }
        : {}),
    });
  }
}
for (const [y, cell] of Object.entries(oecd.series.gni.XDC)) {
  const year = Number(y);
  push({
    id: `gni.${year}.actual`,
    year,
    indicator: 'gni',
    scope: 'economy',
    status: 'actual',
    method: 'nationalAccounts',
    value: toSafe(scaleDecimal(cell.value, cell.mult), `gni.${year}`),
    unit: 'HUF',
    original: { value: cell.value, unit: 'million HUF (national currency)', currency: 'HUF' },
    institution: 'OECD',
    source: 'oecd-dac1',
    locator: `DONOR=HUN, MEASURE=1, FLOW_TYPE=1140, UNIT_MEASURE=XDC, PRICE_BASE=V, TIME_PERIOD=${year}`,
    revision: 'final',
  });
}
for (const [key, method, loc] of [['pctGniNet', 'dacNet', 'MEASURE=2, FLOW_TYPE=1140'], ['pctGniGe', 'dacGrantEquivalent', 'MEASURE=11002, FLOW_TYPE=1160']]) {
  for (const [y, cell] of Object.entries(oecd.series[key].PT_B5G)) {
    const year = Number(y);
    push({
      id: `odaPctGni.${year}.actual`,
      year,
      indicator: 'odaPctGni',
      scope: 'donor',
      status: 'actual',
      method,
      value: Number(cell.value),
      unit: 'pct',
      original: { value: cell.value, unit: 'percent of GNI', currency: '' },
      institution: 'OECD',
      source: 'oecd-dac1',
      locator: `DONOR=HUN, ${loc}, UNIT_MEASURE=PT_B5G, TIME_PERIOD=${year}`,
      revision: 'final',
    });
  }
}

// OECD preliminary 2025: USD only, grant-equivalent headline; converted at the MNB annual average.
const USD_2025 = '303.4';
const rate2025 = mnb.annual['2025'].usdHufAverage;
push({
  id: 'odaGe.2025.actual',
  year: 2025,
  indicator: 'odaGe',
  scope: 'donor',
  status: 'actual',
  method: 'dacGrantEquivalent',
  value: Math.round(303.4e6 * rate2025),
  unit: 'HUF',
  original: { value: USD_2025, unit: 'million USD', currency: 'USD', usd: `${USD_2025} million USD` },
  institution: 'OECD',
  source: 'oecd-profile-2026',
  locator: 'ODA allocation overview, first sentence',
  revision: 'preliminary',
  derivation: { formula: 'USD × MNB annual average rate (2025)', inputs: ['mnb-rates'], rate: rate2025 },
  note: {
    hu: 'Előzetes adat. Az OECD csak dollárban közli, a forintérték számított: 303,4 millió USD × az MNB 2025-ös éves átlagárfolyama.',
    en: 'Preliminary. The OECD publishes this in dollars only, so the forint value is calculated: USD 303.4 million × the MNB 2025 annual average rate.',
  },
});
push({
  id: 'odaPctGni.2025.actual',
  year: 2025,
  indicator: 'odaPctGni',
  scope: 'donor',
  status: 'actual',
  method: 'dacGrantEquivalent',
  value: 0.14,
  unit: 'pct',
  original: { value: '0.14', unit: 'percent of GNI', currency: '' },
  institution: 'OECD',
  source: 'oecd-profile-2026',
  locator: 'Performance against commitments table, 2025, preliminary',
  revision: 'preliminary',
});

// European Commission forecast years. Eurostat stays authoritative for every year it covers.
for (const [series, indicator, scope, method] of [
  ['revenue', 'revenue', 'generalGovernment', 'esa2010'],
  ['expenditure', 'expenditure', 'generalGovernment', 'esa2010'],
  ['balance', 'deficit', 'generalGovernment', 'esa2010'],
  ['gdp', 'gdp', 'economy', 'nationalAccounts'],
]) {
  for (const year of [2026, 2027]) {
    const raw = ameco.series[series].values[year];
    const huf = scaleDecimal(raw, 9);
    push({
      id: `${scope === 'economy' ? 'gdp' : `general.${indicator}`}.${year}.forecast.ec`,
      year,
      indicator,
      scope,
      status: 'forecast',
      method,
      value: toSafe(series === 'balance' ? -huf : huf, `ameco.${series}.${year}`),
      unit: 'HUF',
      original: { value: raw, unit: 'Mrd HUF', currency: 'HUF' },
      institution: 'Európai Bizottság',
      source: 'ec-ameco-2026-spring',
      locator: `AMECO ${ameco.series[series].variable}, HUN, ${year}`,
      revision: 'projection',
      publisher: 'ec',
      note: {
        hu: 'A 2026. tavaszi előrejelzés a kormányváltás előtti adatokon alapul.',
        en: 'The Spring 2026 forecast predates the change of government.',
      },
    });
  }
}

// CPI. The published annual index (previous year = 100) is the only input; levels are chained.
const annualCpi = [];
let level = 100;
for (let year = FIRST; year <= 2025; year++) {
  const text = ksh.annual[year];
  if (!text) throw new Error(`Missing KSH CPI for ${year}`);
  const index = Number(text);
  if (year > FIRST) level = (level * index) / 100;
  annualCpi.push({ year, index, level, status: 'actual', source: 'ksh-cpi-annual', locator: `Total, ${year}` });
  push({
    id: `cpi.${year}.actual`,
    year,
    indicator: 'cpi',
    scope: 'economy',
    status: 'actual',
    method: 'cpiAnnualAverage',
    value: Number((index - 100).toFixed(1)),
    unit: 'pct',
    original: { value: text, unit: 'previous year = 100.0%', currency: '' },
    institution: 'KSH',
    source: 'ksh-cpi-annual',
    locator: `Total column, ${year}`,
    revision: 'final',
  });
}
for (const [year, change, row] of [[2026, '1.7', 4], [2027, '3.0', 4]]) {
  const index = 100 + Number(change);
  level = (level * index) / 100;
  annualCpi.push({ year, index, level, status: 'forecast', source: 'pm-mtp-2027', locator: `Annex, Macroeconomic Outlook, row ${row} (PDF p. 34)` });
  push({
    id: `cpi.${year}.forecast.gov`,
    year,
    indicator: 'cpi',
    scope: 'economy',
    status: 'forecast',
    method: 'cpiAnnualAverage',
    value: Number(change),
    unit: 'pct',
    original: { value: change, unit: 'change in consumer prices, annual average, %', currency: '' },
    institution: 'Pénzügyminisztérium',
    source: 'pm-mtp-2027',
    locator: `Annex, Macroeconomic Outlook, row ${row} (PDF p. 34)`,
    revision: 'projection',
    publisher: 'gov',
  });
}
const ecCpi = ameco.series.cpi.values;
for (const year of [2026, 2027]) {
  const change = ((Number(ecCpi[year]) / Number(ecCpi[year - 1]) - 1) * 100);
  push({
    id: `cpi.${year}.forecast.ec`,
    year,
    indicator: 'cpi',
    scope: 'economy',
    status: 'forecast',
    method: 'cpiAnnualAverage',
    value: Number(change.toFixed(2)),
    unit: 'pct',
    original: { value: ecCpi[year], unit: 'National CPI, 2020 = 100', currency: '' },
    institution: 'Európai Bizottság',
    source: 'ec-ameco-2026-spring',
    locator: `AMECO ${ameco.series.cpi.variable}, HUN, ${year}`,
    revision: 'projection',
    publisher: 'ec',
    derivation: { formula: 'CPI(year) / CPI(year − 1) − 1', inputs: ['ec-ameco-2026-spring'] },
  });
}

// Latest monthly price level against the 2025 annual average: chain month-on-month indices
// from December 2024, then divide the latest level by the mean of the twelve 2025 levels.
const months = Object.keys(ksh.monthly.previousMonth).filter((m) => m >= '2025-01').sort();
let lvl = 1;
const levels = {};
for (const m of months) {
  lvl *= Number(ksh.monthly.previousMonth[m]) / 100;
  levels[m] = lvl;
}
const months2025 = months.filter((m) => m.startsWith('2025-'));
if (months2025.length !== 12) throw new Error('Need all twelve 2025 months for the monthly price level');
const avg2025 = months2025.reduce((s, m) => s + levels[m], 0) / 12;
const latestMonth = months[months.length - 1];

const fxCheck = Object.entries(oecd.series.oda.XDC).map(([y, cell]) => {
  const year = Number(y);
  const implied = Number(cell.value) / Number(oecd.series.oda.USD[y].value);
  const avg = mnb.annual[y].usdHufAverage;
  return { year, oecdImplied: Number(implied.toFixed(2)), mnbAverage: avg, differencePct: Number(((implied / avg - 1) * 100).toFixed(2)) };
});

const sourceFiles = [read('data/sources/sources.json'), read('data/sources/legal-sources.json')];
const sources = {};
for (const file of sourceFiles) {
  for (const [id, s] of Object.entries(file)) {
    sources[id] = { accessed: accessedOf[id] ?? s.accessed ?? '2026-10-30', ...s };
  }
}

const dataset = {
  generatedAt: new Date().toISOString().slice(0, 10),
  coverageYears: [FIRST, LAST],
  observations: obs.sort((a, b) => a.year - b.year || a.id.localeCompare(b.id)),
  sources,
  cpi: {
    annual: annualCpi,
    latestMonth: { month: latestMonth, factorVsBaseYear: levels[latestMonth] / avg2025, baseYear: 2025, source: 'ksh-cpi-monthly' },
  },
  gaps,
  breaks: [
    {
      year: 2010,
      scope: 'central',
      note: {
        hu: '2010-től a költségvetési törvény főösszegei a központi alrendszerre vonatkoznak (központi költségvetés, TB-alapok, elkülönített alapok).',
        en: 'From 2010 the main sums of the budget act refer to the central subsystem (central budget, social security funds, separate state funds).',
      },
    },
  ],
  fxCheck,
  latestUpdate: [
    { label: 'Eurostat', date: eurostat.govUpdated.slice(0, 10) },
    { label: 'KSH CPI', date: '2026-10-07' },
    { label: 'Pénzügyminisztérium', date: '2026-10-28' },
  ],
};

mkdirSync(join(ROOT, 'public/data'), { recursive: true });
writeFileSync(join(ROOT, 'public/data/budzse.json'), JSON.stringify(dataset));
console.log(`dataset: ${dataset.observations.length} observations, ${Object.keys(sources).length} sources, latest month ${latestMonth} factor ${dataset.cpi.latestMonth.factorVsBaseYear.toFixed(4)}`);
