#!/usr/bin/env node
// Downloads the machine-readable official statistics into data/raw/.
// Only reviewed snapshots in data/raw/ feed the build; nothing reaches the site until
// `npm run data` validates it and a human commits the diff.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const RAW = join(ROOT, 'data', 'raw');
const UA = 'Mozilla/5.0 (compatible; Budzse-data-refresh/1.0; +https://github.com/tmrk/budzse)';
const accessed = new Date().toISOString().slice(0, 10);

async function get(url, headers = {}) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, ...headers } });
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return res.text();
}
const save = (name, data) =>
  writeFile(join(RAW, name), `${JSON.stringify(data, null, 1)}\n`);

/** Flattens an annual, single-geo Eurostat JSON-stat response into {key: {year: {value, flag}}}. */
function flattenEurostat(json, dim) {
  const time = json.dimension.time.category.index;
  const items = json.dimension[dim].category.index;
  const nTime = Object.keys(time).length;
  const out = {};
  for (const [item, i] of Object.entries(items)) {
    out[item] = {};
    for (const [year, j] of Object.entries(time)) {
      const idx = String(i * nTime + j);
      if (json.value[idx] !== undefined)
        out[item][year] = { value: json.value[idx], flag: json.status?.[idx] ?? null };
    }
  }
  return out;
}

async function eurostat() {
  const base = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data';
  const gov = `${base}/gov_10a_main?format=JSON&lang=EN&geo=HU&sector=S13&unit=MIO_NAC&na_item=TR&na_item=TE&na_item=B9`;
  const gdp = `${base}/nama_10_gdp?format=JSON&lang=EN&geo=HU&unit=CP_MNAC&na_item=B1GQ`;
  const growth = `${base}/nama_10_gdp?format=JSON&lang=EN&geo=HU&unit=CLV_PCH_PRE&na_item=B1GQ`;
  const [g, d, r] = await Promise.all([gov, gdp, growth].map((u) => get(u).then(JSON.parse)));
  await save('eurostat.json', {
    accessed,
    govUpdated: g.updated,
    gdpUpdated: d.updated,
    gov: flattenEurostat(g, 'na_item'),
    gdp: flattenEurostat(d, 'na_item').B1GQ,
    gdpGrowth: flattenEurostat(r, 'na_item').B1GQ,
    urls: { gov, gdp, growth },
  });
}

async function oecd() {
  const url =
    'https://sdmx.oecd.org/public/rest/data/OECD.DCD.FSD,DSD_DAC1@DF_DAC1,1.8/HUN.......?startPeriod=2000&dimensionAtObservation=AllDimensions&format=csvfilewithlabels';
  const csv = await get(url, { Accept: 'application/vnd.sdmx.data+csv; version=2.0.0' });
  const [header, ...lines] = csv.trim().split(/\r?\n/);
  const cols = parseCsvLine(header);
  const keep = {
    oda: ['1010', '1140'], // ODA, net disbursements
    bilateral: ['1015', '1140'],
    multilateral: ['2000', '1140'],
    odaGe: ['11010', '1160'], // ODA, grant equivalent
    bilateralGe: ['11015', '1160'],
    multilateralGe: ['12000', '1160'],
    gni: ['1', '1140'],
    pctGniNet: ['2', '1140'],
    pctGniGe: ['11002', '1160'],
  };
  const out = {};
  for (const line of lines) {
    const v = parseCsvLine(line);
    const r = Object.fromEntries(cols.map((c, i) => [c, v[i]]));
    if (r.PRICE_BASE !== 'V') continue;
    for (const [name, [m, f]] of Object.entries(keep)) {
      if (r.MEASURE === m && r.FLOW_TYPE === f) {
        out[name] ??= {};
        out[name][r.UNIT_MEASURE] ??= {};
        out[name][r.UNIT_MEASURE][r.TIME_PERIOD] = { value: r.OBS_VALUE, mult: Number(r.UNIT_MULT), status: r.OBS_STATUS };
      }
    }
  }
  await save('oecd-dac1.json', { accessed, url, series: out });
}

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

const cellText = (s) =>
  s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).trim();

function tableRows(html) {
  return [...html.matchAll(/<tr.*?<\/tr>/gs)].map((m) =>
    [...m[0].matchAll(/<t[dh][^>]*>(.*?)<\/t[dh]>/gs)].map((c) => cellText(c[1])),
  );
}

async function ksh() {
  const annualUrl = 'https://www.ksh.hu/stadat_files/ara/en/ara0002.html';
  const monthlyUrl = 'https://www.ksh.hu/stadat_files/ara/en/ara0040.html';
  const annualHtml = await get(annualUrl);
  const monthlyHtml = await get(monthlyUrl);
  const annual = {};
  const rows = tableRows(annualHtml);
  const header = rows.find((r) => r[0] === 'Year');
  const totalCol = header.indexOf('Total');
  for (const r of rows) if (/^\d{4}$/.test(r[0]) && r[0] >= '1998') annual[r[0]] = r[totalCol];

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const mRows = tableRows(monthlyHtml);
  const mHeader = mRows.find((r) => r[0] === 'Period');
  // Rows carry a leading year cell, so "Total" sits one column to the right of its header.
  const mTotal = mHeader.indexOf('Total') + 1;
  const monthly = { previousMonth: {}, correspondingMonth: {} };
  let section = null;
  let year = null;
  for (const r of mRows) {
    if (r.length === 1) {
      if (/^Previous month/.test(r[0])) section = 'previousMonth';
      else if (/^Corresponding period/.test(r[0])) section = 'correspondingMonth';
      else section = null;
      continue;
    }
    if (!section || r.length < mTotal) continue;
    if (/^\d{4}$/.test(r[0])) year = r[0];
    const m = months.indexOf(r[1]);
    if (m >= 0 && r[mTotal]) monthly[section][`${year}-${String(m + 1).padStart(2, '0')}`] = r[mTotal];
  }
  const updated = (html) => html.match(/Last updated:\s*([^<]+)/)?.[1]?.trim() ?? null;
  await save('ksh-cpi.json', {
    accessed,
    annualUrl,
    monthlyUrl,
    annualUpdated: updated(annualHtml),
    monthlyUpdated: updated(monthlyHtml),
    annual,
    monthly,
  });
}

async function ameco() {
  // AMECO is the European Commission's macro-economic database; 2026-27 are forecast years.
  const vars = { revenue: '1.0.0.0.URTG', expenditure: '1.0.0.0.UUTG', balance: '1.0.0.0.UBLG', gdp: '1.0.0.0.UVGD', cpi: '3.0.0.0.ZCPIN' };
  const out = {};
  for (const [name, v] of Object.entries(vars)) {
    const url = `https://ec.europa.eu/economy_finance/ameco/wq/series?fullVariable=${v}&countries=HUN&years=2000,2001&Lastyear=1&Yearorder=ASC`;
    const html = await get(url);
    const th = [...html.matchAll(/<th>(.*?)<\/th>/g)].map((m) => m[1]);
    const td = [...html.matchAll(/<td[^>]*>(.*?)<\/td>/g)].map((m) => m[1]);
    const values = {};
    th.slice(3).forEach((y, i) => { if (td[i + 3]) values[y] = td[i + 3]; });
    out[name] = { variable: v, label: td[1], unit: td[2], url, values };
  }
  await save('ameco.json', { accessed, vintage: 'Spring 2026 Economic Forecast', series: out });
}

async function mnb() {
  const body = (y) => `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><GetExchangeRates xmlns="http://www.mnb.hu/webservices/"><startDate>${y}-01-01</startDate><endDate>${y}-12-31</endDate><currencyNames>USD</currencyNames></GetExchangeRates></soap:Body></soap:Envelope>`;
  const annual = {};
  for (let y = 2000; y <= new Date().getFullYear(); y++) {
    const res = await fetch('http://www.mnb.hu/arfolyamok.asmx', {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: 'http://www.mnb.hu/webservices/MNBArfolyamServiceSoap/GetExchangeRates', 'User-Agent': UA },
      body: body(y),
    });
    const text = (await res.text()).replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    const rates = [...text.matchAll(/<Day date="([\d-]+)"><Rate unit="1" curr="USD">([\d,]+)<\/Rate>/g)].map((m) => Number(m[2].replace(',', '.')));
    if (!rates.length) throw new Error(`No MNB rates for ${y}`);
    // Simple mean of the official daily fixings; no annual-average table is published via the API.
    annual[y] = { tradingDays: rates.length, usdHufAverage: Number((rates.reduce((a, b) => a + b, 0) / rates.length).toFixed(4)) };
  }
  await save('mnb-usd.json', { accessed, url: 'https://www.mnb.hu/arfolyamok.asmx', annual });
}

await mkdir(RAW, { recursive: true });
const only = process.argv[2];
const steps = { eurostat, oecd, ksh, ameco, mnb };
for (const [name, fn] of Object.entries(steps)) {
  if (only && only !== name) continue;
  console.log(`fetching ${name}`);
  await fn();
}
