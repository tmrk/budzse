// Plain JSON and citation text for the static data API.
// Every string an agent might quote is built from the validated dataset, not typed in by hand.
// Labels are copied from src/i18n so this file runs in Node. tests/unit/api.test.ts checks they still match.

export const ORIGIN = 'https://tmrk.github.io/budzse';
export const BASE = '/budzse';
export const API_VERSION = '1.0.0';

export const abs = (path) => `${ORIGIN}/${path}`;
export const sitePath = (path) => `${BASE}/${path}`;

const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/** Labels are the same words the interface uses, so a citation and the page never disagree. */
export const LABELS = {
  hu: {
    indicators: {
      revenue: 'Bevétel',
      expenditure: 'Kiadás',
      deficit: 'Hiány',
      gdp: 'GDP',
      gni: 'GNI',
      oda: 'ODA, nettó folyósítás',
      odaGe: 'ODA, támogatási egyenérték',
      odaBilateral: 'Kétoldalú ODA (nettó)',
      odaMultilateral: 'Többoldalú ODA (nettó)',
      odaPctGni: 'ODA a GNI arányában',
      hungaryHelpsProgram: 'Hungary Helps: program',
      hungaryHelpsAgency: 'Hungary Helps: ügynökség',
      revenuePctGdp: 'Bevétel a GDP arányában',
      expenditurePctGdp: 'Kiadás a GDP arányában',
      deficitPctGdp: 'Hiány a GDP arányában',
      realGdpGrowth: 'Hivatalos reál GDP-növekedés',
      cpi: 'Fogyasztói árindex (éves változás)',
    },
    statuses: {
      original: 'Eredeti törvény',
      revised: 'Módosított törvény',
      draft: 'Törvénytervezet',
      planned: 'Tervezéskori becslés',
      actual: 'Tény',
      ytd: 'Évközi teljesítés',
      forecast: 'Előrejelzés',
    },
    statusHelp: {
      original: 'Az Országgyűlés által elfogadott költségvetési törvény eredeti főösszege.',
      revised: 'A törvény főösszege az Országgyűlés későbbi módosítása után.',
      draft: 'Még nem törvény: a kormány tervezete.',
      planned: 'A költségvetési törvényjavaslat indokolásának becslése, nem törvényi főösszeg.',
      actual: 'A teljes évre vonatkozó teljesítési adat.',
      ytd: 'Csak az év egy részére vonatkozik, nem éves tény.',
      forecast: 'Hivatalos előrejelzés, nem tény.',
    },
    publishers: { ec: 'Európai Bizottság', gov: 'Kormány' },
    scopes: {
      centralBudget: 'Központi költségvetés',
      centralSubsystem: 'Államháztartás központi alrendszere',
      generalGovernment: 'Kormányzati szektor',
      economy: 'Teljes gazdaság',
      donor: 'Magyarország mint donor',
    },
    methods: {
      cash: 'Pénzforgalmi szemlélet',
      esa2010: 'ESA 2010, eredményszemlélet',
      dacNet: 'OECD DAC, nettó folyósítás',
      dacGrantEquivalent: 'OECD DAC, támogatási egyenérték',
      nationalAccounts: 'Nemzeti számlák',
      cpiAnnualAverage: 'Éves átlagos fogyasztói árindex',
    },
    revisions: { final: 'Végleges', preliminary: 'Előzetes', revised: 'Módosított', projection: 'Előrejelzés vagy terv' },
  },
  en: {
    indicators: {
      revenue: 'Revenue',
      expenditure: 'Expenditure',
      deficit: 'Deficit',
      gdp: 'GDP',
      gni: 'GNI',
      oda: 'ODA, net disbursements',
      odaGe: 'ODA, grant equivalent',
      odaBilateral: 'Bilateral ODA (net)',
      odaMultilateral: 'Multilateral ODA (net)',
      odaPctGni: 'ODA as a share of GNI',
      hungaryHelpsProgram: 'Hungary Helps: programme',
      hungaryHelpsAgency: 'Hungary Helps: agency',
      revenuePctGdp: 'Revenue as a share of GDP',
      expenditurePctGdp: 'Expenditure as a share of GDP',
      deficitPctGdp: 'Deficit as a share of GDP',
      realGdpGrowth: 'Official real GDP growth',
      cpi: 'Consumer price index (annual change)',
    },
    statuses: {
      original: 'Original budget act',
      revised: 'Amended budget act',
      draft: 'Draft bill',
      planned: 'Budget-time estimate',
      actual: 'Actual',
      ytd: 'Year to date',
      forecast: 'Forecast',
    },
    statusHelp: {
      original: 'The main sum of the budget act as Parliament first adopted it.',
      revised: 'The main sum after a later amendment by Parliament.',
      draft: 'Not yet law: a government draft.',
      planned: "An estimate from the budget bill's justification, not a statutory main sum.",
      actual: 'The outcome for the full year.',
      ytd: 'Covers only part of the year, so it is not an annual outcome.',
      forecast: 'An official forecast, not an outcome.',
    },
    publishers: { ec: 'European Commission', gov: 'Government' },
    scopes: {
      centralBudget: 'Central budget',
      centralSubsystem: 'Central subsystem of public finances',
      generalGovernment: 'General government',
      economy: 'Whole economy',
      donor: 'Hungary as a donor',
    },
    methods: {
      cash: 'Cash basis',
      esa2010: 'ESA 2010, accrual basis',
      dacNet: 'OECD DAC, net disbursements',
      dacGrantEquivalent: 'OECD DAC, grant equivalent',
      nationalAccounts: 'National accounts',
      cpiAnnualAverage: 'Annual average consumer price index',
    },
    revisions: { final: 'Final', preliminary: 'Preliminary', revised: 'Amended', projection: 'Forecast or plan' },
  },
};

export const KIND_OF = {
  original: 'budget-original',
  revised: 'budget-revised',
  draft: 'draft',
  planned: 'planned',
  actual: 'actual',
  ytd: 'year-to-date',
  forecast: 'forecast',
};

export const FIGURE_KINDS = {
  'budget-original': {
    hu: 'A kihirdetett költségvetési törvény eredeti főösszege. Terv, nem tény.',
    en: 'The main sum of the budget act as first promulgated. A budget, not an outturn.',
  },
  'budget-revised': {
    hu: 'A költségvetési törvény főösszege későbbi módosítás után. Terv, nem tény.',
    en: 'The main sum of the budget act after a later amendment. A budget, not an outturn.',
  },
  draft: {
    hu: 'Tervezet. Még nem törvény, és nem tény.',
    en: 'A draft. Not a law, and not an outturn.',
  },
  planned: {
    hu: 'Tervezéskori hivatalos becslés. Nem törvényi főösszeg, és nem tény.',
    en: 'An official estimate made when the budget was prepared. Not a statutory main sum, and not an outturn.',
  },
  actual: {
    hu: 'Teljes évre szóló teljesítés.',
    en: 'A full-year outturn.',
  },
  'year-to-date': {
    hu: 'Csak az év egy része. Nem éves tény, és nincs GDP-aránya.',
    en: 'Part of the year only. Not an annual outturn, and it has no share of GDP.',
  },
  forecast: {
    hu: 'Hivatalos előrejelzés. Nem tény. A publisher mező mondja meg, kié.',
    en: 'An official forecast. Not an outturn. The publisher field says whose.',
  },
};

export const PRICE_BASIS = {
  nominal: {
    hu: 'Nominális forint, a közzétételkori áron. Nincs fogyasztóiár-korrekció.',
    en: 'Nominal forints, at the prices of the time. Not rescaled by the consumer price index.',
  },
  percentage: {
    hu: 'Százalék. A számláló és a nevező ugyanaz az év, ezért nincs deflálva.',
    en: 'A percentage. Numerator and denominator refer to the same year, so it is not deflated.',
  },
  volume: {
    hu: 'Hivatalos reálnövekedés (volumenindex). Nem a nominális GDP fogyasztóiár-korrekciója.',
    en: 'Official real growth (a volume index). Not nominal GDP rescaled by the consumer price index.',
  },
  'price-index': {
    hu: 'Maga a fogyasztói árak változása, nem egy pénzösszeg.',
    en: 'The change in consumer prices itself, not a money amount.',
  },
};

/** Machine tokens used in mustNotBeReadAs. The id is stable; the sentences are for people. */
export const TOKENS = {
  outturn: { hu: 'Teljes éves tény.', en: 'A full-year outturn.' },
  budget: { hu: 'Költségvetési törvényi főösszeg.', en: 'A statutory budget main sum.' },
  forecast: { hu: 'Előrejelzés.', en: 'A forecast.' },
  'part-year': { hu: 'Évközi adat.', en: 'A part-year figure.' },
  'full-year': { hu: 'A teljes évet lefedő adat.', en: 'A figure that covers the whole year.' },
  'gdp-share': { hu: 'GDP-arány.', en: 'A share of GDP.' },
  law: { hu: 'Hatályos törvény.', en: 'A law in force.' },
  'inflation-adjusted': { hu: 'Fogyasztóiár-indexszel átszámított összeg.', en: 'A money amount rescaled by the consumer price index.' },
  deflated: { hu: 'Deflált százalék.', en: 'A percentage divided by a price index.' },
  'cpi-adjusted-gdp': { hu: 'A nominális GDP fogyasztóiár-korrekciója. Ez nem a hivatalos reál GDP.', en: 'Nominal GDP rescaled by the consumer price index. That is not official real GDP.' },
  'deflated-money': { hu: 'Deflált pénzösszeg.', en: 'A money amount divided by a price index.' },
  'central-subsystem': { hu: 'A 2010-től használt központi alrendszer.', en: 'The central subsystem used from 2010.' },
  'central-budget': { hu: 'A 2009-ig használt központi költségvetés.', en: 'The central budget used through 2009.' },
  esa2010: { hu: 'Az ESA 2010 kormányzati szektor.', en: 'ESA 2010 general government.' },
  'cash-central': { hu: 'A központi költségvetés vagy a központi alrendszer pénzforgalmi adata.', en: 'A cash figure of the central budget or the central subsystem.' },
  'grant-equivalent': { hu: 'Támogatási egyenértéken mért ODA.', en: 'ODA measured as a grant equivalent.' },
  'net-disbursements': { hu: 'Nettó folyósításként mért ODA.', en: 'ODA measured as net disbursements.' },
  'total-oda': { hu: 'Magyarország teljes hivatalos fejlesztési támogatása.', en: "Hungary's total official development assistance." },
  'ec-forecast': { hu: 'Az Európai Bizottság előrejelzése.', en: 'The European Commission forecast.' },
  'government-forecast': { hu: 'A magyar kormány előrejelzése.', en: 'The Hungarian government forecast.' },
};

export const RULES = [
  {
    id: 'read-fields',
    hu: 'Az azonosító nem a számbavétel. A central előtag 2009-ig a központi költségvetést, 2010-től a központi alrendszert jelenti. Mindig a scope, a status és a method mezőt olvasd.',
    en: 'The id is not the scope. A central prefix means the central budget through 2009 and the central subsystem from 2010. Always read scope, status and method.',
  },
  {
    id: 'statuses',
    hu: 'Az original és a revised terv. A draft nem törvény. A planned nem törvényi főösszeg. Az actual teljes éves tény. Az ytd csak az év egy része, GDP-arány nélkül. A forecast előrejelzés, és a publisher mondja meg, kié. Ezek nem helyettesítik egymást.',
    en: 'original and revised are budgets. draft is not a law. planned is not a statutory main sum. actual is a full-year outturn. ytd is part of the year and has no share of GDP. forecast is a projection, and publisher says whose. Do not substitute one for another.',
  },
  {
    id: 'nominal',
    hu: 'A forintértékek nominálisak. A honlap „mai áron” nézete a böngészőben, a fogyasztóiár-indexből számított érték. Nincs ilyen megfigyelés, és nem hivatkozható közzétett adatként.',
    en: 'Forint values are nominal. The website’s view in today’s prices is calculated in the browser from the consumer price index. It is not an observation and must not be cited as a published figure.',
  },
  {
    id: 'real-gdp',
    hu: 'Az inflációval korrigált GDP nem a hivatalos reál GDP. A hivatalos reálnövekedés a realGdpGrowth mutató. A százalékokat nem defláljuk.',
    en: 'CPI-adjusted GDP is not official real GDP. Official real growth is the realGdpGrowth indicator. Percentages are not deflated.',
  },
  {
    id: 'central-break',
    hu: '2009 és 2010 között a központi számbavétel kibővült. A két év nem vonható ki egymásból. A pénzforgalmi központi adat és az ESA 2010 kormányzati szektor sem.',
    en: 'Between 2009 and 2010 the central coverage widened. Do not subtract one year from the other. Do not compare cash central figures with ESA 2010 general government either.',
  },
  {
    id: 'deficit-sign',
    hu: 'A hiány pozitív, a többlet negatív. Ahol a forrás az Eurostat B.9, a value a megfordított előjel, az original.value a forrás előjele.',
    en: 'A deficit is positive and a surplus is negative. Where the source is Eurostat B.9, value has the reversed sign and original.value keeps the sign as published.',
  },
  {
    id: 'oda',
    hu: 'A nettó folyósítás (dacNet) és a támogatási egyenérték (dacGrantEquivalent) külön sorozat. A Hungary Helps egy költségvetési sor, nem a teljes ODA.',
    en: 'Net disbursements (dacNet) and grant equivalent (dacGrantEquivalent) are separate series. Hungary Helps is a budget line, not total ODA.',
  },
  {
    id: 'gaps',
    hu: 'A hiányzó adat nincs a fájlban. A nulla nem pótolja. Az ok a gaps.json megfelelő rekordjában van.',
    en: 'A missing figure is absent from the files. Zero does not stand in for it. The reason is the matching record in gaps.json.',
  },
  {
    id: 'derivation',
    hu: 'A derivation mezős érték számított. A kormány 2026–27-es forint bevételét és kiadását a közölt GDP-arány és a saját GDP-előrejelzés szorzata adja, ezért a kerekítés miatt eltérhet a közölt hiánytól.',
    en: 'A value with derivation is calculated. The government’s 2026–27 forint revenue and expenditure are its published GDP share times its own GDP forecast, so rounding can leave them short of the published deficit.',
  },
  {
    id: 'scale',
    hu: 'A value egész forint vagy sima százalék. A magyar billió 10^12, az angol billion 10^9. Ne skálázd a hivatkozásban.',
    en: 'value is whole forints or a plain percentage. Hungarian billió is 10^12 and English billion is 10^9. Do not scale the number in a citation.',
  },
  {
    id: 'cite',
    hu: 'Hivatkozáskor add meg az eredeti közzétevőt, a forrás címét, a helyet, az URL-t és az állandó rekord URL-jét. A Büdzsé összeállítja az adatot, nem ő a statisztika közzétevője.',
    en: 'Cite the original publisher, the source title, the locator, the source URL and the permanent record URL. Büdzsé compiles the figure. It is not the publisher of the statistic.',
  },
  {
    id: 'vintage',
    hu: 'Ugyanaz az id megmarad, ha a közzétevő felülvizsgálja a számot. Az érték és a generatedAt változhat. Aki rögzített másolatot akar, mentse a választ.',
    en: 'An id stays put when the publisher revises the number. The value and generatedAt can change. Store the response if you need a frozen copy.',
  },
  {
    id: 'licence',
    hu: 'A kód MIT. Az adat az eredeti közzétevő feltételei szerint használható. Az OECD CC BY 4.0. Az Eurostat és az Európai Bizottság forrásmegjelöléssel újrafelhasználható. A magyar jogszabályok hivatalos művek.',
    en: 'The code is MIT. The data may be used under the original publisher’s terms. OECD data is CC BY 4.0. Eurostat and the European Commission allow reuse with attribution. Hungarian legislation is an official public work.',
  },
];

const REQUIRED = [
  'apiVersion',
  'id',
  'uri',
  'year',
  'indicator',
  'scope',
  'status',
  'method',
  'unit',
  'value',
  'revision',
  'html.hu',
  'html.en',
  'observation.id',
  'observation.value',
  'observation.source',
  'source.id',
  'source.url',
  'source.title',
  'citation.hu',
  'citation.en',
  'interpretation.figureKind',
  'interpretation.isOutturn',
  'interpretation.cpiAdjusted',
  'interpretation.priceBasis',
  'interpretation.timeCoverage',
  'interpretation.mustNotBeReadAs',
  'interpretation.caveats',
  'comparison.key',
  'comparison.rule',
  'links.dataset',
  'links.metadata',
  'links.gaps',
  'provenance.apiVersion',
  'provenance.datasetGeneratedAt',
];

export function observationSchema(dataset) {
  const [from, to] = dataset.coverageYears;
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: abs('api/v1/schema/observation.schema.json'),
    title: 'Büdzsé observation',
    description: 'One sourced figure. Additional properties may be added inside API version 1. cpiAdjusted is always false: this record is never a CPI-rescaled copy.',
    type: 'object',
    additionalProperties: true,
    required: ['apiVersion', 'id', 'uri', 'year', 'indicator', 'scope', 'status', 'method', 'unit', 'value', 'revision', 'html', 'observation', 'source', 'citation', 'interpretation', 'comparison', 'links', 'provenance'],
    properties: {
      apiVersion: { const: API_VERSION },
      id: { type: 'string', pattern: '^[A-Za-z0-9][A-Za-z0-9._-]*$' },
      uri: { type: 'string', format: 'uri' },
      year: { type: 'integer', minimum: from, maximum: to },
      value: { type: 'number' },
      unit: { enum: ['HUF', 'pct'] },
      html: { type: 'object', required: ['hu', 'en'], additionalProperties: false },
      citation: { type: 'object', required: ['hu', 'en'], additionalProperties: false },
      observation: { type: 'object', required: ['id', 'value', 'source'] },
      source: { type: 'object', required: ['id', 'url', 'title'] },
      interpretation: {
        type: 'object',
        additionalProperties: true,
        required: ['figureKind', 'isOutturn', 'cpiAdjusted', 'priceBasis', 'timeCoverage', 'mustNotBeReadAs', 'caveats'],
        properties: {
          cpiAdjusted: { const: false },
          isOutturn: { type: 'boolean' },
          figureKind: { enum: Object.keys(FIGURE_KINDS) },
          priceBasis: { enum: Object.keys(PRICE_BASIS) },
          timeCoverage: { enum: ['full-year', 'part-year'] },
          mustNotBeReadAs: { type: 'array', items: { enum: Object.keys(TOKENS) } },
          caveats: { type: 'array', minItems: 1, items: { type: 'object', required: ['id', 'hu', 'en'] } },
        },
      },
    },
  };
}

function assertId(id) {
  if (!ID_RE.test(id)) throw new Error(`Unsafe id: ${id}`);
}

function label(lang, group, key, id) {
  const value = LABELS[lang][group][key];
  if (!value) throw new Error(`${id}: no ${lang} label for ${group}.${key}`);
  return value;
}

function groupInteger(value, sep) {
  const negative = value < 0;
  const digits = Math.trunc(Math.abs(value)).toString();
  return `${negative ? '-' : ''}${digits.replace(/\B(?=(\d{3})+(?!\d))/g, sep)}`;
}

export function formatValue(value, unit, lang) {
  if (unit === 'HUF') {
    const n = groupInteger(value, lang === 'hu' ? ' ' : ',');
    return lang === 'hu' ? `${n} Ft` : `HUF ${n}`;
  }
  const negative = value < 0;
  const [whole, frac] = Math.abs(value).toString().split('.');
  const grouped = groupInteger(Number(whole), lang === 'hu' ? ' ' : ',');
  const body = frac ? `${grouped}${lang === 'hu' ? ',' : '.'}${frac}` : grouped;
  return `${negative ? '-' : ''}${body}%`;
}

function sentence(text) {
  const trimmed = String(text).trim();
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function kindCaveat(o) {
  if (o.status === 'ytd') {
    if (!o.period) throw new Error(`${o.id}: part-year figure without period`);
    return {
      id: 'status-ytd',
      hu: `Ez csak a ${o.period} időszak teljesítése, nem éves tény, és nincs GDP-aránya.`,
      en: `This covers only ${o.period}, so it is not a full-year outturn and it has no share of GDP.`,
    };
  }
  if (o.status === 'forecast') {
    if (!o.publisher) throw new Error(`${o.id}: forecast without publisher`);
    const huName = label('hu', 'publishers', o.publisher, o.id);
    const enName = label('en', 'publishers', o.publisher, o.id);
    return {
      id: 'status-forecast',
      hu: `Ez előrejelzés (közzétevő: ${huName}), nem tényadat.`,
      en: `This is a forecast published by the ${enName}, not an outturn.`,
    };
  }
  const text = {
    original: {
      hu: 'Ez a kihirdetett költségvetési törvény terve, nem teljesítési adat.',
      en: 'This is the budget as first promulgated, not an outturn.',
    },
    revised: {
      hu: 'Ez a módosított költségvetési törvény terve, nem teljesítési adat.',
      en: 'This is the amended budget, not an outturn.',
    },
    draft: {
      hu: 'Ez tervezet, még nem törvény, és nem teljesítési adat.',
      en: 'This is a draft, not a law and not an outturn.',
    },
    planned: {
      hu: 'Ez tervezéskori becslés, nem törvényi főösszeg és nem teljesítési adat.',
      en: 'This is a budget-time estimate, not a statutory main sum and not an outturn.',
    },
    actual: {
      hu: 'Ez teljes éves tényadat.',
      en: 'This is a full-year outturn.',
    },
  }[o.status];
  if (!text) throw new Error(`${o.id}: unknown status ${o.status}`);
  return { id: `status-${o.status}`, ...text };
}

function priceCaveat(o) {
  if (o.indicator === 'realGdpGrowth') {
    return {
      id: 'price-volume',
      hu: 'Ez a hivatalos reál (volumen-) növekedés, nem a nominális GDP fogyasztóiár-indexszel korrigált értéke.',
      en: 'This is official real (volume) growth, not nominal GDP adjusted by the consumer price index.',
    };
  }
  if (o.indicator === 'cpi') {
    return {
      id: 'price-cpi',
      hu: 'Ez maga a fogyasztói árak változása, nem egy deflált pénzösszeg.',
      en: 'This is the change in consumer prices itself, not a deflated money amount.',
    };
  }
  if (o.unit === 'HUF') {
    return {
      id: 'price-nominal',
      hu: 'Nincs inflációval korrigálva. A honlap „mai áron” nézete számított érték, nem ez a megfigyelés.',
      en: 'It is not adjusted for inflation. The today-prices view on the website is calculated and is not this observation.',
    };
  }
  return {
    id: 'price-percentage',
    hu: 'Százalék, nincs deflálva.',
    en: 'It is a percentage, and it is not deflated.',
  };
}

function scopeCaveat(o) {
  const text = {
    centralBudget: {
      hu: 'Számbavétel: központi költségvetés, pénzforgalmi szemlélet, a 2009-ig használt kör. Az azonosító central előtagja nem a számbavétel. A 2010-től használt központi alrendszerrel és az ESA 2010 kormányzati szektorral nem vethető össze.',
      en: 'Scope: central budget, cash basis, the coverage used through 2009. The id prefix central is not the scope. Do not compare this figure with the central subsystem used from 2010, or with ESA 2010 general government.',
    },
    centralSubsystem: {
      hu: 'Számbavétel: a központi alrendszer, pénzforgalmi szemlélet, a 2010-től használt kör. Az azonosító central előtagja nem a számbavétel. A 2009-ig használt központi költségvetéssel és az ESA 2010 kormányzati szektorral nem vethető össze.',
      en: 'Scope: central subsystem, cash basis, the coverage used from 2010. The id prefix central is not the scope. Do not compare this figure with the central budget used through 2009, or with ESA 2010 general government.',
    },
    generalGovernment: {
      hu: 'Számbavétel: kormányzati szektor, ESA 2010, eredményszemlélet. A központi költségvetés és a központi alrendszer pénzforgalmi adataival nem vethető össze.',
      en: 'Scope: general government, ESA 2010, accrual basis. Do not compare this figure with the cash figures of the central budget or the central subsystem.',
    },
    economy: {
      hu: 'Számbavétel: a teljes gazdaság, nemzeti számlák. Ez nem költségvetési főösszeg.',
      en: 'Scope: the whole economy, national accounts. This is not a budget main sum.',
    },
    donor: {
      hu: 'Számbavétel: Magyarország mint donor, az OECD DAC-nak a method mezőben megnevezett szabálya szerint. Ez nem a központi költségvetés egy sora.',
      en: 'Scope: Hungary as a donor, under the OECD DAC rule named in method. This is not a line of the central budget.',
    },
  }[o.scope];
  if (!text) throw new Error(`${o.id}: unknown scope ${o.scope}`);
  return { id: 'scope', ...text };
}

function breakCaveat(o, dataset) {
  if (o.scope !== 'centralBudget' && o.scope !== 'centralSubsystem') return null;
  if (o.year !== 2009 && o.year !== 2010) return null;
  const found = dataset.breaks.find((item) => item.year === 2010 && item.scope === 'central');
  if (!found) throw new Error('Dataset is missing the 2010 central break');
  return {
    id: 'central-2010-break',
    hu: `${sentence(found.note.hu)} A 2009-es és a 2010-es központi adat nem vonható ki egymásból.`,
    en: `${sentence(found.note.en)} The 2009 and 2010 central figures must not be subtracted.`,
  };
}

function seriesCaveat(o) {
  if (o.indicator === 'gdp') {
    return {
      id: 'nominal-gdp',
      hu: 'Ez folyó áras GDP. A fogyasztóiár-indexszel osztva nem a hivatalos reál GDP-t adja. A hivatalos reálnövekedés a realGdpGrowth mutató.',
      en: 'This is GDP at current prices. Dividing it by the consumer price index does not produce official real GDP. Official real growth is the realGdpGrowth indicator.',
    };
  }
  if (o.method === 'dacNet') {
    return {
      id: 'oda-net',
      hu: 'Módszer: OECD DAC nettó folyósítás. A támogatási egyenérték sorozattal nem vonható össze.',
      en: 'Method: OECD DAC net disbursements. Do not join this series to grant-equivalent ODA.',
    };
  }
  if (o.method === 'dacGrantEquivalent') {
    return {
      id: 'oda-grant-equivalent',
      hu: 'Módszer: OECD DAC támogatási egyenérték. A nettó folyósítás sorozattal nem vonható össze.',
      en: 'Method: OECD DAC grant equivalent. Do not join this series to net disbursements.',
    };
  }
  if (String(o.indicator).startsWith('hungaryHelps')) {
    return {
      id: 'hungary-helps',
      hu: 'Ez egy Hungary Helps nevet viselő költségvetési sor. Nem a teljes hivatalos fejlesztési támogatás.',
      en: 'This is a budget line that carries the Hungary Helps name. It is not total official development assistance.',
    };
  }
  return null;
}

function deficitCaveat(o) {
  if (o.indicator !== 'deficit' && o.indicator !== 'deficitPctGdp') return null;
  return {
    id: 'deficit-sign',
    hu: 'Előjel: a pozitív érték hiány (kiadás mínusz bevétel), a negatív többlet.',
    en: 'Sign: a positive value is a deficit (expenditure minus revenue), and a negative value is a surplus.',
  };
}

function noteCaveat(o) {
  if (!o.note?.hu || !o.note?.en) return null;
  return { id: 'source-note', hu: sentence(o.note.hu), en: sentence(o.note.en) };
}

function derivationCaveat(o) {
  if (!o.derivation) return null;
  const inputs = o.derivation.inputs.join(', ');
  return {
    id: 'derivation',
    hu: `Számított érték, képlete: ${o.derivation.formula}. Bemenetek: ${inputs}. A forintösszeget nem így nyomtatták ki a forrásban.`,
    en: `Calculated value. Formula: ${o.derivation.formula}. Inputs: ${inputs}. The forint total was not printed as such in the source.`,
  };
}

function preliminaryCaveat(o) {
  if (o.revision !== 'preliminary') return null;
  return {
    id: 'preliminary',
    hu: 'Az adat előzetes: a közzétevő még módosíthatja.',
    en: 'The figure is preliminary: the publisher may still revise it.',
  };
}

function secondaryCaveat(o) {
  if (!o.secondary) return null;
  return {
    id: 'secondary',
    hu: 'Másodlagos hivatkozás, mert az elsődleges dokumentum nem volt elérhető.',
    en: 'Secondary citation, because the primary document could not be reached.',
  };
}

function caveatsFor(o, dataset) {
  return [
    kindCaveat(o),
    priceCaveat(o),
    scopeCaveat(o),
    breakCaveat(o, dataset),
    seriesCaveat(o),
    deficitCaveat(o),
    noteCaveat(o),
    derivationCaveat(o),
    preliminaryCaveat(o),
    secondaryCaveat(o),
  ].filter(Boolean);
}

function mustNot(o) {
  const out = [];
  if (o.status !== 'actual') out.push('outturn');
  if (o.status === 'actual') out.push('budget', 'forecast', 'part-year');
  if (o.status === 'ytd') out.push('full-year', 'gdp-share', 'budget', 'forecast');
  if (o.status === 'forecast') out.push('budget', 'law', o.publisher === 'gov' ? 'ec-forecast' : 'government-forecast');
  if (o.status === 'draft' || o.status === 'planned') out.push('law', 'forecast');
  if (o.status === 'original' || o.status === 'revised') out.push('forecast');
  if (o.unit === 'HUF') out.push('inflation-adjusted');
  if (o.indicator === 'realGdpGrowth') out.push('cpi-adjusted-gdp');
  else if (o.indicator === 'cpi') out.push('deflated-money');
  else if (o.unit === 'pct') out.push('deflated');
  if (o.scope === 'centralBudget') out.push('central-subsystem', 'esa2010');
  if (o.scope === 'centralSubsystem') out.push('central-budget', 'esa2010');
  if (o.scope === 'generalGovernment') out.push('cash-central');
  if (o.method === 'dacNet') out.push('grant-equivalent');
  if (o.method === 'dacGrantEquivalent') out.push('net-disbursements');
  if (String(o.indicator).startsWith('hungaryHelps')) out.push('total-oda');
  return [...new Set(out)].sort();
}

function priceBasisOf(o) {
  if (o.indicator === 'realGdpGrowth') return 'volume';
  if (o.indicator === 'cpi') return 'price-index';
  if (o.unit === 'pct') return 'percentage';
  if (o.unit === 'HUF') return 'nominal';
  throw new Error(`${o.id}: unknown unit ${o.unit}`);
}

function identitySentence(o, lang) {
  return `${label(lang, 'scopes', o.scope, o.id)}, ${label(lang, 'indicators', o.indicator, o.id)}, ${o.year}, ${label(lang, 'statuses', o.status, o.id)} (${label(lang, 'methods', o.method, o.id)}).`;
}

function citation(o, source, caveats, lang) {
  const parts = [
    identitySentence(o, lang),
    ...caveats.map((item) => item[lang]),
    lang === 'hu' ? `Normalizált érték: ${formatValue(o.value, o.unit, 'hu')}.` : `Normalised value: ${formatValue(o.value, o.unit, 'en')}.`,
    lang === 'hu' ? `A forrásban szereplő érték: ${o.original.value} ${o.original.unit}.` : `Reported value: ${o.original.value} ${o.original.unit}.`,
  ];
  if (o.original.usd) parts.push(lang === 'hu' ? `A forrás dollárban is közli: ${o.original.usd}.` : `The source also reports ${o.original.usd}.`);
  const published = source.publicationDate ? (lang === 'hu' ? ` Közzététel: ${source.publicationDate}.` : ` Published: ${source.publicationDate}.`) : '';
  const licence = source.licence ? (lang === 'hu' ? ` Licenc: ${source.licence}.` : ` Licence: ${source.licence}.`) : '';
  const inst = source.institution[lang];
  parts.push(
    lang === 'hu'
      ? `Forrás: ${inst}. ${source.title}. Hely: ${o.locator}. ${source.url}. Letöltve: ${source.accessed}.${published}${licence}`
      : `Source: ${inst}. ${source.title}. Locator: ${o.locator}. ${source.url}. Accessed: ${source.accessed}.${published}${licence}`,
  );
  const uri = abs(`api/v1/observations/${o.id}.json`);
  parts.push(lang === 'hu' ? `Állandó hivatkozás: ${uri}.` : `Permanent record: ${uri}.`);
  return parts.join(' ');
}

function at(obj, path) {
  return path.split('.').reduce((cur, key) => (cur == null ? undefined : cur[key]), obj);
}

export function validateObservation(doc, observation, source) {
  const errors = [];
  for (const path of REQUIRED) {
    if (at(doc, path) == null || at(doc, path) === '') errors.push(`${doc.id ?? observation?.id}: missing ${path}`);
  }
  if (!doc) return errors;
  if (JSON.stringify(doc.observation) !== JSON.stringify(observation)) errors.push(`${doc.id}: observation record differs from the dataset`);
  if (JSON.stringify(doc.source) !== JSON.stringify(source)) errors.push(`${doc.id}: source record differs from the registry`);
  if (doc.value !== observation.value || doc.observation.value !== observation.value) errors.push(`${doc.id}: value was rewritten`);
  if (doc.uri !== abs(`api/v1/observations/${observation.id}.json`)) errors.push(`${doc.id}: uri is not the permanent record`);
  if (doc.html?.hu !== abs(`hu/obs/${observation.id}/`)) errors.push(`${doc.id}: Hungarian page url changed`);
  if (doc.html?.en !== abs(`en/obs/${observation.id}/`)) errors.push(`${doc.id}: English page url changed`);
  if (doc.interpretation?.cpiAdjusted !== false) errors.push(`${doc.id}: cpiAdjusted must be false`);
  if (doc.interpretation?.isOutturn !== (observation.status === 'actual')) errors.push(`${doc.id}: isOutturn disagrees with status`);
  if (doc.apiVersion !== API_VERSION || doc.provenance?.apiVersion !== API_VERSION) errors.push(`${doc.id}: api version drifted`);
  if (!/^https:\/\/[^\s]+$/.test(source.url)) errors.push(`${doc.id}: source url is not https`);
  for (const lang of ['hu', 'en']) {
    const text = doc.citation?.[lang] ?? '';
    if (!text.includes(source.url)) errors.push(`${doc.id}: ${lang} citation omits the source url`);
    if (!text.includes(doc.uri)) errors.push(`${doc.id}: ${lang} citation omits the permanent url`);
    if (!text.includes(String(observation.original.value))) errors.push(`${doc.id}: ${lang} citation omits the reported value`);
  }
  const huNegation = { original: 'nem teljesítési adat', revised: 'nem teljesítési adat', draft: 'nem teljesítési adat', planned: 'nem teljesítési adat', ytd: 'nem éves tény', forecast: 'nem tényadat' };
  if (huNegation[observation.status] && !doc.citation.hu.includes(huNegation[observation.status])) errors.push(`${doc.id}: Hungarian citation does not keep it apart from an outturn`);
  if (observation.status === 'ytd' && !doc.citation.en.includes('not a full-year outturn')) errors.push(`${doc.id}: English citation does not keep the part-year figure apart from an outturn`);
  if (!['actual', 'ytd'].includes(observation.status) && !doc.citation.en.includes('not an outturn')) errors.push(`${doc.id}: English citation does not say it is not an outturn`);
  if (observation.unit === 'HUF' && !doc.citation.en.includes('not adjusted for inflation')) errors.push(`${doc.id}: inflation warning missing`);
  for (const token of doc.interpretation?.mustNotBeReadAs ?? []) {
    if (!TOKENS[token]) errors.push(`${doc.id}: unknown token ${token}`);
  }
  if ('adjustedValue' in doc || 'realValue' in doc) errors.push(`${doc.id}: stores a rescaled value`);
  return errors;
}

export function observationDocument(dataset, observation) {
  assertId(observation.id);
  const source = dataset.sources[observation.source];
  if (!source) throw new Error(`${observation.id}: source ${observation.source} is not in the registry`);
  if (!ID_RE.test(observation.source)) throw new Error(`${observation.id}: unsafe source id ${observation.source}`);
  if (!ID_RE.test(observation.indicator)) throw new Error(`${observation.id}: unsafe indicator ${observation.indicator}`);
  label('en', 'methods', observation.method, observation.id);
  label('en', 'revisions', observation.revision, observation.id);
  const record = JSON.parse(JSON.stringify(observation));
  const sourceRecord = JSON.parse(JSON.stringify(source));
  const caveats = caveatsFor(record, dataset);
  const uri = abs(`api/v1/observations/${record.id}.json`);
  const doc = {
    apiVersion: API_VERSION,
    id: record.id,
    uri,
    year: record.year,
    indicator: record.indicator,
    scope: record.scope,
    status: record.status,
    method: record.method,
    unit: record.unit,
    value: record.value,
    revision: record.revision,
    ...(record.publisher ? { publisher: record.publisher } : {}),
    ...(record.period ? { period: record.period } : {}),
    html: { hu: abs(`hu/obs/${record.id}/`), en: abs(`en/obs/${record.id}/`) },
    observation: record,
    source: sourceRecord,
    citation: { hu: citation(record, sourceRecord, caveats, 'hu'), en: citation(record, sourceRecord, caveats, 'en') },
    interpretation: {
      figureKind: KIND_OF[record.status],
      isOutturn: record.status === 'actual',
      cpiAdjusted: false,
      priceBasis: priceBasisOf(record),
      timeCoverage: record.status === 'ytd' ? 'part-year' : 'full-year',
      mustNotBeReadAs: mustNot(record),
      caveats,
    },
    comparison: {
      key: [record.scope, record.method, record.status, record.publisher ?? ''].join('|'),
      ...(record.scope === 'centralBudget' || record.scope === 'centralSubsystem' ? { breakId: 'central-2010' } : {}),
      rule: 'same-scope-and-method',
    },
    links: {
      self: uri,
      year: abs(`api/v1/years/${record.year}.json`),
      indicator: abs(`api/v1/indicators/${record.indicator}.json`),
      source: abs(`api/v1/sources/${sourceRecord.id}.json`),
      dataset: abs('data/budzse.json'),
      metadata: abs('api/v1/metadata.json'),
      gaps: abs('api/v1/gaps.json'),
      catalog: abs('api/v1/index.json'),
    },
    provenance: {
      compiledBy: 'Büdzsé',
      compiledByUrl: `${ORIGIN}/`,
      role: 'Büdzsé compiles the figure from the named publisher. It is not the publisher of the underlying statistic.',
      datasetGeneratedAt: dataset.generatedAt,
      apiVersion: API_VERSION,
      ...(sourceRecord.licence ? { sourceLicence: sourceRecord.licence } : {}),
    },
  };
  const errors = validateObservation(doc, observation, source);
  if (errors.length) throw new Error(errors.join('\n'));
  return doc;
}

export function summaryOf(doc) {
  return {
    id: doc.id,
    year: doc.year,
    indicator: doc.indicator,
    scope: doc.scope,
    status: doc.status,
    method: doc.method,
    unit: doc.unit,
    value: doc.value,
    revision: doc.revision,
    ...(doc.publisher ? { publisher: doc.publisher } : {}),
    ...(doc.period ? { period: doc.period } : {}),
    source: doc.source.id,
    uri: doc.uri,
    html: doc.html,
    mustNotBeReadAs: doc.interpretation.mustNotBeReadAs,
  };
}

export function yearsInText(text) {
  const years = new Set();
  const ranges = [...String(text).matchAll(/(\d{4})\s*[–-]\s*(\d{4})/g)];
  let rest = String(text);
  for (const match of ranges) {
    const start = Math.min(Number(match[1]), Number(match[2]));
    const end = Math.max(Number(match[1]), Number(match[2]));
    for (let year = start; year <= end; year += 1) years.add(year);
    rest = rest.replace(match[0], ' ');
  }
  for (const match of rest.matchAll(/\d{4}/g)) years.add(Number(match[0]));
  return years;
}

export function gapsForYear(dataset, year) {
  return dataset.gaps.filter((gap) => yearsInText(gap.years).has(year));
}

export function buildModel(dataset) {
  const seen = new Set();
  const documents = dataset.observations.map((observation) => {
    if (seen.has(observation.id)) throw new Error(`Duplicate observation ${observation.id}`);
    seen.add(observation.id);
    return observationDocument(dataset, observation);
  });
  return { dataset, documents };
}
