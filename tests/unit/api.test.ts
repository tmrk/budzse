import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { en } from '../../src/i18n/en';
import { hu } from '../../src/i18n/hu';
import { LABELS, ORIGIN, observationDocument, observationSchema, validateObservation } from '../../scripts/transform/api-model.mjs';
import { escapeHtml, renderApi } from '../../scripts/transform/api-pages.mjs';
import { dataset, obs } from './helpers';

const files = renderApi(dataset);
const record = (id: string) => JSON.parse(files[`api/v1/observations/${id}.json`]);

const REVENUE_2000_EN = 'Central budget, Revenue, 2000, Original budget act (Cash basis). This is the budget as first promulgated, not an outturn. It is not adjusted for inflation. The today-prices view on the website is calculated and is not this observation. Scope: central budget, cash basis, the coverage used through 2009. The id prefix central is not the scope. Do not compare this figure with the central subsystem used from 2010, or with ESA 2010 general government. Normalised value: HUF 3,392,043,900,000. Reported value: 3 392 043,9 millió forint. Source: Hungarian Parliament. 1999. évi CXXV. törvény a Magyar Köztársaság 2000. évi költségvetéséről. Locator: 1. §. https://mkogy.jogtar.hu/jogszabaly?docid=99900125.tv. Accessed: 2026-10-30. Permanent record: https://tmrk.github.io/budzse/api/v1/observations/central.revenue.2000.original.json.';
const REVENUE_2000_HU = 'Központi költségvetés, Bevétel, 2000, Eredeti törvény (Pénzforgalmi szemlélet). Ez a kihirdetett költségvetési törvény terve, nem teljesítési adat. Nincs inflációval korrigálva. A honlap „mai áron” nézete számított érték, nem ez a megfigyelés. Számbavétel: központi költségvetés, pénzforgalmi szemlélet, a 2009-ig használt kör. Az azonosító central előtagja nem a számbavétel. A 2010-től használt központi alrendszerrel és az ESA 2010 kormányzati szektorral nem vethető össze. Normalizált érték: 3 392 043 900 000 Ft. A forrásban szereplő érték: 3 392 043,9 millió forint. Forrás: Országgyűlés. 1999. évi CXXV. törvény a Magyar Köztársaság 2000. évi költségvetéséről. Hely: 1. §. https://mkogy.jogtar.hu/jogszabaly?docid=99900125.tv. Letöltve: 2026-10-30. Állandó hivatkozás: https://tmrk.github.io/budzse/api/v1/observations/central.revenue.2000.original.json.';

describe('labels stay the words the interface uses', () => {
  for (const group of ['indicators', 'statuses', 'statusHelp', 'publishers', 'scopes', 'methods', 'revisions'] as const) {
    it(`${group} matches both languages`, () => {
      expect(LABELS.hu[group]).toEqual(hu[group]);
      expect(LABELS.en[group]).toEqual(en[group]);
    });
  }
});

describe('observation records', () => {
  it('gives every observation a permanent URL, the original source and a citation', () => {
    expect(dataset.observations.length).toBeGreaterThan(500);
    for (const observation of dataset.observations) {
      const path = `api/v1/observations/${observation.id}.json`;
      const doc = JSON.parse(files[path]);
      const source = dataset.sources[observation.source];
      expect(validateObservation(doc, observation, source), observation.id).toEqual([]);
      expect(doc.uri, observation.id).toBe(`${ORIGIN}/api/v1/observations/${observation.id}.json`);
      expect(doc.html.hu, observation.id).toBe(`${ORIGIN}/hu/obs/${observation.id}/`);
      expect(doc.html.en, observation.id).toBe(`${ORIGIN}/en/obs/${observation.id}/`);
      expect(doc.interpretation.cpiAdjusted, observation.id).toBe(false);
      expect(doc.value, observation.id).not.toBe(0);
      expect(files[`hu/obs/${observation.id}/index.html`], observation.id).toContain(escapeHtml(doc.citation.hu));
      expect(files[`en/obs/${observation.id}/index.html`], observation.id).toContain(escapeHtml(source.url));
      expect(files[`en/obs/${observation.id}/index.html`], observation.id).not.toContain('/src/main.tsx');
    }
  });

  it('keeps the 2000 original revenue citation stable', () => {
    const doc = record('central.revenue.2000.original');
    expect(doc.value).toBe(3_392_043_900_000);
    expect(doc.citation.en).toBe(REVENUE_2000_EN);
    expect(doc.citation.hu).toBe(REVENUE_2000_HU);
    expect(doc.comparison).toEqual({ key: 'centralBudget|cash|original|', breakId: 'central-2010', rule: 'same-scope-and-method' });
    expect(doc.interpretation.mustNotBeReadAs).toEqual(['central-subsystem', 'esa2010', 'forecast', 'inflation-adjusted', 'outturn']);
  });

  it('does not change the citation URL when the dataset is regenerated', () => {
    const copy = structuredClone(dataset);
    copy.generatedAt = '1999-01-01';
    const again = JSON.parse(renderApi(copy)['api/v1/observations/central.revenue.2000.original.json']);
    const first = record('central.revenue.2000.original');
    expect(again.uri).toBe(first.uri);
    expect(again.html).toEqual(first.html);
    expect(again.citation).toEqual(first.citation);
    expect(again.provenance.datasetGeneratedAt).toBe('1999-01-01');
  });

  it('keeps a central id from being read as one scope', () => {
    const before = record('central.revenue.2009.actual');
    const after = record('central.revenue.2010.actual');
    expect(before.id.startsWith('central.')).toBe(true);
    expect(after.id.startsWith('central.')).toBe(true);
    expect(before.scope).toBe('centralBudget');
    expect(after.scope).toBe('centralSubsystem');
    expect(before.interpretation.mustNotBeReadAs).toContain('central-subsystem');
    expect(after.interpretation.mustNotBeReadAs).toContain('central-budget');
    expect(before.interpretation.caveats.map((item: { id: string }) => item.id)).toContain('central-2010-break');
    expect(after.interpretation.caveats.map((item: { id: string }) => item.id)).toContain('central-2010-break');
  });

  it('separates outturn, part-year, forecast and price basis', () => {
    const actual = record('general.deficit.2025.actual');
    expect(actual.interpretation.isOutturn).toBe(true);
    expect(actual.citation.en).toContain('full-year outturn');
    expect(actual.citation.en).toContain('positive value is a deficit');
    expect(actual.citation.en).toContain('The sign of Eurostat B.9 (net lending) is reversed');
    expect(actual.citation.en).toContain('preliminary');
    expect(actual.interpretation.mustNotBeReadAs).toContain('cash-central');
    expect(actual.interpretation.mustNotBeReadAs).not.toContain('outturn');

    const ytd = record('central.deficit.2026.ytd');
    expect(ytd.interpretation.isOutturn).toBe(false);
    expect(ytd.interpretation.timeCoverage).toBe('part-year');
    expect(ytd.citation.en).toContain('2026-01/2026-09');
    expect(ytd.citation.en).toContain('not a full-year outturn');
    expect(ytd.interpretation.mustNotBeReadAs).toEqual(expect.arrayContaining(['outturn', 'full-year', 'gdp-share']));

    const forecast = record('gdp.2026.forecast.gov');
    expect(forecast.citation.en).toContain('forecast published by the Government');
    expect(forecast.citation.en).toContain('not an outturn');
    expect(forecast.interpretation.mustNotBeReadAs).toContain('ec-forecast');
    expect(forecast.citation.en).toContain('does not produce official real GDP');

    const derived = record('general.revenue.2026.forecast.gov');
    expect(derived.observation.derivation.formula).toBe('Share of GDP × nominal GDP forecast');
    expect(derived.citation.en).toContain('not printed as such');

    expect(record('oda.2024.actual').interpretation.mustNotBeReadAs).toContain('grant-equivalent');
    expect(record('odaGe.2024.actual').interpretation.mustNotBeReadAs).toContain('net-disbursements');
    expect(record('hungaryHelpsProgram.2021.actual').interpretation.mustNotBeReadAs).toContain('total-oda');
    expect(record('realGdpGrowth.2020.actual').interpretation.priceBasis).toBe('volume');
    expect(record('realGdpGrowth.2020.actual').interpretation.mustNotBeReadAs).toContain('cpi-adjusted-gdp');
    expect(record('cpi.2026.forecast.gov').interpretation.priceBasis).toBe('price-index');
  });

  it('flags a secondary citation when the source is secondary', () => {
    const copy = structuredClone(dataset);
    const observation = structuredClone(obs('central.revenue.2000.original'));
    observation.secondary = true;
    copy.sources[observation.source] = { ...copy.sources[observation.source], type: 'secondary' };
    const doc = observationDocument(copy, observation);
    expect(doc.interpretation.caveats.map((item: { id: string }) => item.id)).toContain('secondary');
    expect(doc.citation.en).toContain('Secondary citation');
  });

  it('refuses an unknown status instead of describing it as a fact', () => {
    const observation = structuredClone(obs('central.revenue.2000.original'));
    Object.assign(observation, { status: 'guessed' });
    expect(() => observationDocument(dataset, observation)).toThrow(/unknown status/);
  });
});

describe('collection endpoints', () => {
  it('publishes the catalog, schema, years, indicators, sources, gaps and the price index', () => {
    const catalog = JSON.parse(files['api/v1/index.json']);
    expect(catalog['@type']).toBe('DataCatalog');
    expect(catalog.apiVersion).toBe('1.0.0');
    expect(catalog.observationCount).toBe(dataset.observations.length);
    for (const url of Object.values(catalog.endpoints) as string[]) {
      if (url.includes('{')) continue;
      expect(files[url.slice(ORIGIN.length + 1)], url).toBeTruthy();
    }
    for (const url of Object.values(catalog.examples) as string[]) {
      const doc = JSON.parse(files[url.slice(ORIGIN.length + 1)]);
      expect(doc.uri).toBe(url);
    }
    expect(JSON.parse(files['api/v1/schema/observation.schema.json'])).toEqual(observationSchema(dataset));
    expect(JSON.parse(files['api/v1/cpi.json']).notAnObservation).toBe(true);
    expect(JSON.parse(files['api/v1/cpi.json']).cpi).toEqual(dataset.cpi);
    expect(JSON.parse(files['api/v1/sources.json']).count).toBe(Object.keys(dataset.sources).length);

    const early = JSON.parse(files['api/v1/years/2001.json']);
    expect(early.gaps.map((gap: { id: string }) => gap.id)).toContain('oda-2000-2002');
    const later = JSON.parse(files['api/v1/years/2004.json']);
    expect(later.gaps.map((gap: { id: string }) => gap.id)).not.toContain('oda-2000-2002');

    const index = JSON.parse(files['api/v1/observations.json']);
    expect(index.count).toBe(dataset.observations.length);
    expect(index.observations.some((row: { value: number }) => row.value === 0)).toBe(false);
  });

  it('explains the traps in llms.txt and on the guide', () => {
    const llms = files['llms.txt'];
    expect(llms.startsWith('# Büdzsé\n')).toBe(true);
    expect(llms).toContain('\n> Sourced observations');
    expect(llms).toContain(`${ORIGIN}/api/v1/index.json`);
    expect(llms).toContain('not zero');
    expect(llms).toContain('Hungarian billió is 10^12');
    expect(files['llms-full.txt'].startsWith(llms.trim())).toBe(true);
    expect(files['llms-full.txt'].length).toBeGreaterThan(llms.trim().length);
    expect(files['llms-full.txt']).toContain('Szabályok magyarul');
    expect(files['en/api/index.html']).toContain('href="/budzse/api/v1/index.json"');
    expect(files['en/api/index.html']).toContain('not an outturn');
    expect(files['hu/api/index.html']).toContain('nem teljesítési adat');
    expect(files['en/api/index.md']).toContain(`${ORIGIN}/api/v1/metadata.json`);
    expect(files['en/figures/index.html']).toContain('3,392,043,900,000');
    expect(files['api/v1/index.html']).toContain('index.json');
  });

  it('is what the site head and the build advertise', () => {
    const html = readFileSync('index.html', 'utf8');
    expect(html).toContain(`rel="describedby" href="${ORIGIN}/llms.txt"`);
    expect(html).toContain('"@type": "Dataset"');
    expect(html).toContain(`"temporalCoverage": "${dataset.coverageYears[0]}/${dataset.coverageYears[1]}"`);
    expect(html).toContain('/budzse/api/v1/index.json');
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    expect(pkg.scripts.build).toContain('npm run data:validate && npm run data:api &&');
  });
});
