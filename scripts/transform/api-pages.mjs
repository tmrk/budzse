// HTML, Markdown and llms.txt views of the API. No numbers are introduced here.
import {
  API_VERSION,
  FIGURE_KINDS,
  KIND_OF,
  LABELS,
  ORIGIN,
  PRICE_BASIS,
  RULES,
  TOKENS,
  abs,
  buildModel,
  formatValue,
  gapsForYear,
  observationSchema,
  sitePath,
  summaryOf,
} from './api-model.mjs';

const CSS = `:root { color-scheme: light; --ink: #15176b; --soft: #3e4080; --paper: #f6f6fb; --line: #d5d7ee; }
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; background: var(--paper); color: var(--ink); font: 18px/1.5 Georgia, "Times New Roman", serif; overflow-wrap: anywhere; }
main { max-width: 42rem; margin: 0 auto; padding: 2rem 1.25rem 4rem; }
body.wide main { max-width: 76rem; }
h1 { font-size: 2rem; line-height: 1.15; margin: 0.3rem 0 0.8rem; }
h2 { font-size: 1.35rem; line-height: 1.25; margin: 1.8rem 0 0.5rem; }
p, ul, ol, blockquote, pre, table { margin: 0.6rem 0; }
a { color: inherit; }
.brand { margin: 0; }
.lead { font-size: 1.15rem; }
.value { font-size: 1.55rem; font-weight: 700; }
dl { display: grid; grid-template-columns: minmax(8rem, 14rem) 1fr; gap: 0.35rem 1rem; margin: 1rem 0; }
dt { color: var(--soft); }
dd { margin: 0; }
blockquote, pre { background: #fff; border-left: 3px solid var(--ink); padding: 0.75rem 1rem; }
pre { white-space: pre-wrap; overflow-wrap: anywhere; }
code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.85em; }
table { border-collapse: collapse; width: 100%; font-size: 0.95rem; }
th, td { text-align: left; vertical-align: top; padding: 0.35rem 0.75rem 0.35rem 0; border-bottom: 1px solid var(--line); }
th { color: var(--soft); font-weight: 600; }
.table-wrap { overflow-x: auto; }
nav { display: flex; flex-wrap: wrap; gap: 0.35rem 1rem; margin: 0.4rem 0 1rem; }
footer { margin-top: 2.2rem; color: var(--soft); font-size: 0.95rem; }
:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
@media (max-width: 40rem) { dl { grid-template-columns: 1fr; } dt { margin-top: 0.55rem; } }`;

const UI = {
  hu: {
    docsTitle: 'Adatok és API',
    figuresTitle: 'Minden adat',
    homeTitle: 'Büdzsé API',
    citation: 'Hivatkozás',
    read: 'Hogyan olvasd',
    record: 'Állandó rekord (JSON)',
    catalogue: 'Géppel olvasható katalógus (JSON)',
    related: 'Kapcsolódó',
    other: 'English',
    verbatim: 'Szó szerint a forrásból',
    normalised: 'Normalizált érték',
    reported: 'A forrásban szereplő érték',
    year: 'Év',
    indicator: 'Mutató',
    status: 'Adattípus',
    scope: 'Számbavétel',
    method: 'Módszer',
    revision: 'Adat státusza',
    period: 'Időszak',
    publisher: 'Előrejelzés közzétevője',
    institution: 'Közzétevő intézmény',
    publication: 'Forrásdokumentum',
    locator: 'Hely a forráson belül',
    published: 'Közzététel',
    accessed: 'Letöltés dátuma',
    licence: 'Licenc',
    calculation: 'Számítás',
    inputs: 'Bemenetek',
    open: 'Forrás megnyitása',
    json: 'JSON',
    page: 'Rekord',
    markdown: 'Markdown',
    figures: 'Minden adat táblában',
    back: 'Vissza a grafikonhoz',
    yearJson: 'Az év JSON-ban',
    seriesJson: 'A sorozat JSON-ban',
    docs: 'Útmutató',
    more: 'Tovább',
    notPublisher: (date) => `A Büdzsé állította össze a ${date} napján készült adatkészletből. Nem ő a statisztika közzétevője.`,
    figuresIntro: 'Normalizált értékek, inflációval nem korrigálva. A hivatkozás, az eredeti megfogalmazás és a fenntartások a rekord oldalán vannak. A hiányzó adat nincs a táblában, és nem nulla.',
    caption: (n) => `${n} megfigyelés, 2000–2027.`,
    statusCaption: 'Mit jelent az adattípus',
    meaning: 'Jelentés',
  },
  en: {
    docsTitle: 'Data and API',
    figuresTitle: 'Every figure',
    homeTitle: 'Büdzsé API',
    citation: 'Citation',
    read: 'How to read this',
    record: 'Permanent record (JSON)',
    catalogue: 'Machine-readable catalog (JSON)',
    related: 'Related',
    other: 'Magyar',
    verbatim: 'Verbatim from the source',
    normalised: 'Normalised value',
    reported: 'Value as reported in the source',
    year: 'Year',
    indicator: 'Indicator',
    status: 'Data type',
    scope: 'Scope',
    method: 'Method',
    revision: 'Data status',
    period: 'Period',
    publisher: 'Forecast publisher',
    institution: 'Publishing institution',
    publication: 'Source document',
    locator: 'Location in the source',
    published: 'Published',
    accessed: 'Accessed',
    licence: 'Licence',
    calculation: 'Calculation',
    inputs: 'Inputs',
    open: 'Open source',
    json: 'JSON',
    page: 'Record',
    markdown: 'Markdown',
    figures: 'Every figure in a table',
    back: 'Back to the chart',
    yearJson: 'This year as JSON',
    seriesJson: 'This series as JSON',
    docs: 'Guide',
    more: 'More',
    notPublisher: (date) => `Compiled by Büdzsé from the dataset of ${date}. Büdzsé is not the publisher of the statistic.`,
    figuresIntro: 'Normalised values, not adjusted for inflation. The citation, the original wording and the caveats are on the record page. A missing figure is absent from the table. It is not zero.',
    caption: (n) => `${n} observations, 2000–2027.`,
    statusCaption: 'What each status means',
    meaning: 'Meaning',
  },
};

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

function otherLang(lang) {
  return lang === 'hu' ? 'en' : 'hu';
}

function shell({ lang, title, description, canonical, head = '', jsonLd, wide = false, body }) {
  const ld = jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>\n` : '';
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${escapeHtml(canonical)}">
${head}${ld}<style>${CSS}</style>
</head>
<body${wide ? ' class="wide"' : ''}>
<main>
${body}
</main>
</body>
</html>
`;
}

function brand(lang, href) {
  return `<p class="brand"><a href="${sitePath(href)}">Büdzsé</a></p>`;
}

function row(term, value) {
  if (value == null || value === '') return '';
  return `<dt>${escapeHtml(term)}</dt><dd>${value}</dd>`;
}

function observationPage(doc, lang) {
  const t = UI[lang];
  const L = LABELS[lang];
  const other = otherLang(lang);
  const title = `${doc.year} ${L.indicators[doc.indicator]}, ${L.statuses[doc.status]} — Büdzsé`;
  const leads = doc.interpretation.caveats.slice(0, 2).map((item) => `<p class="lead">${escapeHtml(item[lang])}</p>`).join('\n');
  const caveatItems = doc.interpretation.caveats.map((item) => `<li>${escapeHtml(item[lang])}</li>`).join('');
  const evidence = doc.observation.evidence
    ? `<h2>${escapeHtml(t.verbatim)}</h2>\n<blockquote>${escapeHtml(doc.observation.evidence)}</blockquote>`
    : '';
  const derivation = doc.observation.derivation
    ? `<dt>${escapeHtml(t.calculation)}</dt><dd>${escapeHtml(doc.observation.derivation.formula)}</dd><dt>${escapeHtml(t.inputs)}</dt><dd>${escapeHtml(doc.observation.derivation.inputs.join(', '))}</dd>`
    : '';
  const head = [
    `<link rel="alternate" hreflang="${other}" href="${doc.html[other]}">`,
    `<link rel="alternate" hreflang="${lang}" href="${doc.html[lang]}">`,
    `<link rel="alternate" type="application/json" href="${doc.uri}" title="${escapeHtml(t.record)}">`,
    `<link rel="describedby" href="${abs('llms.txt')}" type="text/plain">`,
  ].join('\n');
  const sourceKind = doc.source.type === 'law' ? 'Legislation' : doc.source.type === 'dataset' ? 'Dataset' : doc.source.type === 'report' ? 'Report' : 'CreativeWork';
  const body = `${brand(lang, `${lang}/`)}
<nav aria-label="${escapeHtml(t.related)}">
<a href="${sitePath(`${other}/obs/${doc.id}/`)}" hreflang="${other}">${escapeHtml(t.other)}</a>
<a href="${doc.uri}">${escapeHtml(t.record)}</a>
<a href="${sitePath(`${lang}/api/`)}">${escapeHtml(t.docs)}</a>
</nav>
<h1>${escapeHtml(`${doc.year} · ${L.indicators[doc.indicator]} · ${L.statuses[doc.status]}`)}</h1>
${leads}
<p class="value">${escapeHtml(formatValue(doc.value, doc.unit, lang))}</p>
<h2>${escapeHtml(t.citation)}</h2>
<blockquote>${escapeHtml(doc.citation[lang])}</blockquote>
<h2>${escapeHtml(t.read)}</h2>
<ul>${caveatItems}</ul>
<dl>
${row(t.normalised, escapeHtml(formatValue(doc.value, doc.unit, lang)))}
${row(t.reported, escapeHtml(`${doc.observation.original.value} ${doc.observation.original.unit}`))}
${row(t.year, escapeHtml(doc.year))}
${row(t.indicator, escapeHtml(L.indicators[doc.indicator]))}
${row(t.status, escapeHtml(`${L.statuses[doc.status]}. ${L.statusHelp[doc.status]}`))}
${row(t.scope, escapeHtml(L.scopes[doc.scope]))}
${row(t.method, escapeHtml(L.methods[doc.method]))}
${row(t.revision, escapeHtml(L.revisions[doc.revision]))}
${row(t.period, doc.period ? escapeHtml(doc.period) : '')}
${row(t.publisher, doc.publisher ? escapeHtml(L.publishers[doc.publisher]) : '')}
${row(t.institution, escapeHtml(doc.source.institution[lang]))}
${row(t.publication, `<a rel="cite" href="${escapeHtml(doc.source.url)}">${escapeHtml(doc.source.title)}</a>`)}
${row(t.locator, escapeHtml(doc.observation.locator))}
${row(t.published, doc.source.publicationDate ? escapeHtml(doc.source.publicationDate) : '')}
${row(t.accessed, escapeHtml(doc.source.accessed))}
${row(t.licence, doc.source.licence ? escapeHtml(doc.source.licence) : '')}
${derivation}
</dl>
${evidence}
<p><a href="${escapeHtml(doc.source.url)}">${escapeHtml(t.open)}</a></p>
<nav aria-label="${escapeHtml(t.more)}">
<a href="${sitePath(`api/v1/years/${doc.year}.json`)}">${escapeHtml(t.yearJson)}</a>
<a href="${sitePath(`api/v1/indicators/${doc.indicator}.json`)}">${escapeHtml(t.seriesJson)}</a>
<a href="${sitePath(`api/v1/sources/${doc.source.id}.json`)}">${escapeHtml(t.json)}</a>
<a href="${sitePath(`${lang}/figures/`)}">${escapeHtml(t.figures)}</a>
<a href="${sitePath(`${lang}/`)}">${escapeHtml(t.back)}</a>
</nav>
<footer><p>${escapeHtml(t.notPublisher(doc.provenance.datasetGeneratedAt))}</p></footer>`;
  return shell({
    lang,
    title,
    description: doc.citation[lang].slice(0, 280),
    canonical: doc.html[lang],
    head,
    wide: false,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': doc.html[lang],
      url: doc.html[lang],
      name: title,
      inLanguage: lang,
      citation: doc.citation[lang],
      isBasedOn: { '@type': sourceKind, name: doc.source.title, url: doc.source.url },
      mainEntity: {
        '@type': 'Observation',
        '@id': doc.uri,
        identifier: doc.id,
        observationDate: String(doc.year),
        observationAbout: { '@type': 'Country', name: 'Hungary', alternateName: 'Magyarország' },
        measurementTechnique: doc.method,
        measuredProperty: {
          '@type': 'PropertyValue',
          name: L.indicators[doc.indicator],
          propertyID: doc.indicator,
          value: doc.value,
          unitText: doc.unit === 'HUF' ? 'HUF' : 'percent',
        },
      },
    },
    body,
  });
}

function figuresPage(documents, lang, generatedAt) {
  const t = UI[lang];
  const L = LABELS[lang];
  const other = otherLang(lang);
  const rows = documents.map((doc) => `<tr>
<td>${doc.year}</td>
<td>${escapeHtml(L.indicators[doc.indicator])}</td>
<td>${escapeHtml(L.statuses[doc.status])}</td>
<td>${escapeHtml(L.scopes[doc.scope])}</td>
<td>${escapeHtml(formatValue(doc.value, doc.unit, lang))}</td>
<td><a href="${sitePath(`${lang}/obs/${doc.id}/`)}">${escapeHtml(t.page)}</a></td>
<td><a href="${sitePath(`api/v1/observations/${doc.id}.json`)}">${escapeHtml(t.json)}</a></td>
</tr>`).join('\n');
  const body = `${brand(lang, `${lang}/`)}
<nav aria-label="${escapeHtml(t.related)}">
<a href="${sitePath(`${other}/figures/`)}" hreflang="${other}">${escapeHtml(t.other)}</a>
<a href="${sitePath(`${lang}/api/`)}">${escapeHtml(t.docs)}</a>
<a href="${sitePath('api/v1/index.json')}">${escapeHtml(t.catalogue)}</a>
</nav>
<h1>${escapeHtml(t.figuresTitle)}</h1>
<p>${escapeHtml(t.figuresIntro)}</p>
<div class="table-wrap" tabindex="0">
<table>
<caption>${escapeHtml(t.caption(documents.length))}</caption>
<thead><tr>
<th scope="col">${escapeHtml(t.year)}</th>
<th scope="col">${escapeHtml(t.indicator)}</th>
<th scope="col">${escapeHtml(t.status)}</th>
<th scope="col">${escapeHtml(t.scope)}</th>
<th scope="col">${escapeHtml(t.normalised)}</th>
<th scope="col">${escapeHtml(t.page)}</th>
<th scope="col">${escapeHtml(t.json)}</th>
</tr></thead>
<tbody>
${rows}
</tbody>
</table>
</div>
<footer><p>${escapeHtml(t.notPublisher(generatedAt))}</p></footer>`;
  return shell({
    lang,
    title: `${t.figuresTitle} — Büdzsé`,
    description: t.figuresIntro,
    canonical: abs(`${lang}/figures/`),
    wide: true,
    head: `<link rel="alternate" hreflang="${other}" href="${abs(`${other}/figures/`)}">\n<link rel="alternate" type="application/json" href="${abs('api/v1/observations.json')}">\n<link rel="describedby" href="${abs('llms.txt')}" type="text/plain">\n`,
    body,
  });
}

function inline(parts, mode) {
  const list = Array.isArray(parts) ? parts : [parts];
  return list.map((part) => {
    if (typeof part === 'string') return mode === 'md' ? part : escapeHtml(part);
    const url = mode === 'md' ? abs(part.href) : sitePath(part.href);
    return mode === 'md' ? `[${part.text}](${url})` : `<a href="${escapeHtml(url)}">${escapeHtml(part.text)}</a>`;
  }).join('');
}

function renderBlocks(blocks, mode) {
  const out = [];
  for (const block of blocks) {
    if (block.h) {
      out.push(mode === 'md' ? `${'#'.repeat(block.h)} ${block.text}` : `<h${block.h}>${escapeHtml(block.text)}</h${block.h}>`);
    } else if (block.p) {
      const body = inline(block.p, mode);
      out.push(mode === 'md' ? body : `<p>${body}</p>`);
    } else if (block.quote) {
      out.push(mode === 'md' ? block.quote.split('\n').map((line) => `> ${line}`).join('\n') : `<blockquote>${escapeHtml(block.quote)}</blockquote>`);
    } else if (block.pre) {
      out.push(mode === 'md' ? `\`\`\`\n${block.pre}\n\`\`\`` : `<pre>${escapeHtml(block.pre)}</pre>`);
    } else if (block.links) {
      const items = block.links.map((item) => {
        const body = inline([{ href: item.href, text: item.text }], mode);
        const note = item.note ? (mode === 'md' ? `: ${item.note}` : ` — ${escapeHtml(item.note)}`) : '';
        return mode === 'md' ? `- ${body}${note}` : `<li>${body}${note}</li>`;
      });
      out.push(mode === 'md' ? items.join('\n') : `<ul>\n${items.join('\n')}\n</ul>`);
    } else if (block.table) {
      if (mode === 'md') {
        const head = `| ${block.table.headers.join(' | ')} |`;
        const rule = `| ${block.table.headers.map(() => '---').join(' | ')} |`;
        const rows = block.table.rows.map((cells) => `| ${cells.join(' | ')} |`);
        out.push([head, rule, ...rows].join('\n'));
      } else {
        const head = block.table.headers.map((cell) => `<th scope="col">${escapeHtml(cell)}</th>`).join('');
        const rows = block.table.rows.map((cells) => `<tr>${cells.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('\n');
        out.push(`<table>\n<caption>${escapeHtml(block.table.caption)}</caption>\n<thead><tr>${head}</tr></thead>\n<tbody>\n${rows}\n</tbody>\n</table>`);
      }
    }
  }
  return `${out.join(mode === 'md' ? '\n\n' : '\n')}\n`;
}

function guideBlocks(model, lang) {
  const t = UI[lang];
  const L = LABELS[lang];
  const other = otherLang(lang);
  const [from, to] = model.dataset.coverageYears;
  const example = model.documents.find((doc) => doc.id === 'central.revenue.2000.original');
  const actual = model.documents.find((doc) => doc.id === 'general.deficit.2025.actual');
  const ytd = model.documents.find((doc) => doc.id === 'central.deficit.2026.ytd');
  const forecast = model.documents.find((doc) => doc.id === 'gdp.2026.forecast.gov');
  const indicators = [...new Set(model.documents.map((doc) => doc.indicator))];
  return [
    { h: 1, text: t.docsTitle },
    { p: lang === 'hu'
      ? `A Büdzsé Magyarország közpénzügyeinek forrásolt megfigyeléseit teszi közzé, ${from}-től ${to}-ig. Ez az oldal az útmutató. A géppel olvasható katalógus statikus JSON, JavaScript nélkül is működik.`
      : `Büdzsé publishes sourced observations of Hungary's public finances from ${from} to ${to}. This page is the guide. The machine-readable catalog is static JSON, and it works without JavaScript.` },
    { links: [
      { href: 'api/v1/index.json', text: t.catalogue, note: lang === 'hu' ? 'Innen indul egy program.' : 'A program should start here.' },
      { href: 'llms.txt', text: 'llms.txt', note: lang === 'hu' ? 'Rövid térkép ügynököknek.' : 'Short map for agents.' },
      { href: 'llms-full.txt', text: 'llms-full.txt', note: lang === 'hu' ? 'Ugyanezek a szabályok egy fájlban.' : 'The same rules in one file.' },
      { href: 'data/budzse.json', text: lang === 'hu' ? 'Teljes adatkészlet' : 'Full dataset', note: lang === 'hu' ? 'Az API ebből készül.' : 'The API is generated from this file.' },
      { href: `${lang}/figures/`, text: t.figures, note: lang === 'hu' ? 'HTML-tábla, szkript nélkül.' : 'An HTML table, with no script.' },
      { href: `${other}/api/`, text: t.other, note: '' },
      { href: `${lang}/`, text: t.back, note: '' },
    ] },
    { h: 2, text: lang === 'hu' ? 'Hogyan kérdezz' : 'How to query' },
    { p: lang === 'hu'
      ? 'Minden válasz egy fájl a GitHub Pagesen. Nincs kulcs, nincs háttérszolgáltatás, és a kérés nem futtat JavaScriptet. Az azonosítót az observations.json-ból vedd, ne találd ki.'
      : 'Every response is a file on GitHub Pages. There is no key, no backend, and the request does not run JavaScript. Take the id from observations.json. Do not invent one.' },
    { links: [
      { href: 'api/v1/index.json', text: 'index.json', note: lang === 'hu' ? 'Katalógus.' : 'Catalog.' },
      { href: 'api/v1/metadata.json', text: 'metadata.json', note: lang === 'hu' ? 'Szókincs, szabályok, verzió.' : 'Vocabulary, rules, versioning.' },
      { href: 'api/v1/observations.json', text: 'observations.json', note: lang === 'hu' ? 'Minden azonosító.' : 'Every id.' },
      { href: 'api/v1/observations/central.revenue.2000.original.json', text: 'central.revenue.2000.original', note: lang === 'hu' ? 'Minta: /api/v1/observations/{id}.json. Ez terv, nem tény.' : 'Pattern: /api/v1/observations/{id}.json. This one is a budget, not an outturn.' },
      { href: 'api/v1/years.json', text: 'years.json', note: lang === 'hu' ? `Évek ${from}-től ${to}-ig.` : `Years from ${from} to ${to}.` },
      { href: 'api/v1/years/2020.json', text: '2020.json', note: lang === 'hu' ? 'Minta: /api/v1/years/{year}.json.' : 'Pattern: /api/v1/years/{year}.json.' },
      { href: 'api/v1/indicators.json', text: 'indicators.json', note: lang === 'hu' ? 'A sorozatok listája.' : 'The list of series.' },
      { href: 'api/v1/indicators/deficit.json', text: 'deficit.json', note: lang === 'hu' ? 'Minta: /api/v1/indicators/{indicator}.json.' : 'Pattern: /api/v1/indicators/{indicator}.json.' },
      { href: 'api/v1/sources.json', text: 'sources.json', note: lang === 'hu' ? 'A forrásregiszter.' : 'The source registry.' },
      { href: 'api/v1/sources/eurostat-gov.json', text: 'eurostat-gov.json', note: lang === 'hu' ? 'Minta: /api/v1/sources/{sourceId}.json.' : 'Pattern: /api/v1/sources/{sourceId}.json.' },
      { href: 'api/v1/gaps.json', text: 'gaps.json', note: lang === 'hu' ? 'A hiányzó adatok okai. A hiány nem nulla.' : 'Why figures are absent. Absence is not zero.' },
      { href: 'api/v1/cpi.json', text: 'cpi.json', note: lang === 'hu' ? 'Az árindex, amiből a honlap számol. A számított érték nem megfigyelés.' : 'The price index the website calculates from. A calculated value is not an observation.' },
      { href: 'api/v1/schema/observation.schema.json', text: 'observation.schema.json', note: 'JSON Schema 2020-12.' },
    ] },
    { pre: `GET ${abs('api/v1/observations/central.revenue.2000.original.json')}` },
    { h: 2, text: lang === 'hu' ? 'Azonosítók' : 'Identifiers' },
    { p: lang === 'hu'
      ? 'Az id állandó kulcs, amíg a besorolás változatlan. Ne bontsd fel: a central előtag nem mondja meg, hogy központi költségvetés vagy központi alrendszer. A státusz, a számbavétel és a módszer mező. Az állandó gép URL a /api/v1/observations/{id}.json, az emberi oldal a /hu/obs/{id}/ és az /en/obs/{id}/. Az 1-es verzió mezőt hozzátehet, el nem vesz és át nem nevez.'
      : 'An id is a stable key while the classification stays the same. Do not parse it: the central prefix does not say whether the scope is the central budget or the central subsystem. Read status, scope and method. The permanent machine URL is /api/v1/observations/{id}.json. The human pages are /hu/obs/{id}/ and /en/obs/{id}/. API version 1 may add a field. It will not remove or rename one.' },
    { h: 2, text: lang === 'hu' ? 'Hogyan hivatkozz' : 'How to cite' },
    { p: lang === 'hu'
      ? 'A citation mező kész mondat. Másold az eredeti közzétevővel, a forrás URL-jével és az állandó rekorddal együtt. A Büdzsé nem a statisztika közzétevője. A honlap mai áras nézetét ne idézd megfigyelésként. A value egész forint vagy sima százalék: a magyar billió 10^12, az angol billion 10^9.'
      : 'The citation field is a finished sentence. Copy it with the original publisher, the source URL and the permanent record. Büdzsé is not the publisher of the statistic. Do not cite the website’s today-prices view as an observation. value is whole forints or a plain percentage: Hungarian billió is 10^12 and English billion is 10^9.' },
    { quote: example.citation[lang] },
    { p: [{ text: lang === 'hu' ? 'Ugyanez a négy eset, hogy a terv, a tény, az évközi adat és az előrejelzés ne cserélődjön fel: ' : 'The same four cases, so a budget, an outturn, a part-year figure and a forecast are not swapped: ' }] },
    { links: [example, actual, ytd, forecast].filter(Boolean).map((doc) => ({
      href: `${lang}/obs/${doc.id}/`,
      text: doc.id,
      note: doc.interpretation.caveats[0][lang],
    })) },
    { h: 2, text: t.statusCaption },
    { table: {
      caption: t.statusCaption,
      headers: [t.status, t.meaning],
      rows: Object.entries(KIND_OF).map(([status, kind]) => [L.statuses[status], FIGURE_KINDS[kind][lang]]),
    } },
    { h: 2, text: lang === 'hu' ? 'Amit nem szabad összekeverni' : 'What not to mix up' },
    { links: RULES.map((rule) => ({ href: 'api/v1/metadata.json', text: rule.id, note: rule[lang] })) },
    { h: 2, text: lang === 'hu' ? 'Infláció' : 'Inflation' },
    { p: lang === 'hu'
      ? 'A tárolt forintösszeg nominális. A honlap így számol: korrigált = nominális × az árszint(referenciaév) / az árszint(év), a cpi.annual level mezőjével, 2000 = 100. A 2026–27-es árindex előrejelzés, ezért az erre támaszkodó korrekció becslés. A százalék nincs deflálva. Az így kapott szám nem megfigyelés.'
      : 'A stored forint amount is nominal. The website calculates adjusted = nominal × level(reference year) / level(year), using cpi.annual level, with 2000 = 100. The 2026–27 price index is a forecast, so a correction that uses it is an estimate. A percentage is not deflated. The result is not an observation.' },
    { links: [{ href: 'api/v1/cpi.json', text: 'cpi.json', note: lang === 'hu' ? 'Az árindex és a képlet. notAnObservation igaz.' : 'The price index and the formula. notAnObservation is true.' }] },
    { h: 2, text: lang === 'hu' ? 'Hiányzó adatok' : 'Missing figures' },
    { p: lang === 'hu'
      ? 'Ami nincs az observations.json-ban, az nincs az adatkészletben. Ne írj a helyére nullát, és ne interpolálj. A gaps.json megmondja, mit kerestünk.'
      : 'What is not in observations.json is not in the dataset. Do not write zero in its place, and do not interpolate. gaps.json says what was searched.' },
    { h: 2, text: lang === 'hu' ? 'Mutatók' : 'Indicators' },
    { links: indicators.map((id) => ({ href: `api/v1/indicators/${id}.json`, text: L.indicators[id], note: id })) },
    { h: 2, text: lang === 'hu' ? 'Licenc és verzió' : 'Licence and version' },
    { p: RULES.find((rule) => rule.id === 'licence')[lang] },
    { p: RULES.find((rule) => rule.id === 'vintage')[lang] },
    { p: lang === 'hu'
      ? `API-verzió: ${API_VERSION}. Az útvonal /api/v1/. A generatedAt most ${model.dataset.generatedAt}.`
      : `API version: ${API_VERSION}. The path is /api/v1/. generatedAt is ${model.dataset.generatedAt}.` },
  ];
}

function docsPage(model, lang) {
  const t = UI[lang];
  const other = otherLang(lang);
  const blocks = guideBlocks(model, lang);
  const inner = renderBlocks(blocks, 'html');
  const body = `${brand(lang, `${lang}/`)}
<nav aria-label="${escapeHtml(t.related)}">
<a href="${sitePath('api/v1/index.json')}">${escapeHtml(t.catalogue)}</a>
<a href="${sitePath('llms.txt')}">llms.txt</a>
<a href="${sitePath(`${lang}/api/index.md`)}">${escapeHtml(t.markdown)}</a>
<a href="${sitePath(`${other}/api/`)}" hreflang="${other}">${escapeHtml(t.other)}</a>
</nav>
${inner}
<footer><p>${escapeHtml(t.notPublisher(model.dataset.generatedAt))}</p></footer>`;
  return shell({
    lang,
    title: `${t.docsTitle} — Büdzsé`,
    description: lang === 'hu'
      ? 'Hogyan lehet a Büdzsé adatait lekérni, értelmezni és hivatkozni. Terv és tény, módszerek, nominális és korrigált értékek.'
      : 'How to query, read and cite Büdzsé. Budgets and outturns, methods, nominal and adjusted values.',
    canonical: abs(`${lang}/api/`),
    head: [
      `<link rel="alternate" hreflang="${other}" href="${abs(`${other}/api/`)}">`,
      `<link rel="alternate" type="application/json" href="${abs('api/v1/index.json')}" title="${escapeHtml(t.catalogue)}">`,
      `<link rel="alternate" type="text/markdown" href="${abs(`${lang}/api/index.md`)}">`,
      `<link rel="describedby" href="${abs('llms.txt')}" type="text/plain">`,
    ].join('\n') + '\n',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: t.docsTitle,
      url: abs(`${lang}/api/`),
      inLanguage: lang,
      isPartOf: { '@id': `${ORIGIN}/#dataset` },
    },
    body,
  });
}

function provenance(dataset) {
  return { compiledBy: 'Büdzsé', compiledByUrl: `${ORIGIN}/`, datasetGeneratedAt: dataset.generatedAt, apiVersion: API_VERSION };
}

function catalog(dataset, documents) {
  const indicators = [...new Set(documents.map((doc) => doc.indicator))];
  return {
    '@context': 'https://schema.org',
    '@type': 'DataCatalog',
    '@id': abs('api/v1/index.json'),
    name: 'Büdzsé API',
    description: 'Static JSON for Hungary’s public finances, 2000–2027. Each observation keeps its source, status, scope, method and a citation. Büdzsé compiles the figures and is not their publisher.',
    url: abs('api/v1/index.json'),
    isAccessibleForFree: true,
    inLanguage: ['hu', 'en'],
    isPartOf: { '@id': `${ORIGIN}/#dataset` },
    encodingFormat: 'application/json',
    apiVersion: API_VERSION,
    generatedAt: dataset.generatedAt,
    coverageYears: dataset.coverageYears,
    observationCount: documents.length,
    sourceCount: Object.keys(dataset.sources).length,
    documentation: { hu: abs('hu/api/'), en: abs('en/api/'), markdown: { hu: abs('hu/api/index.md'), en: abs('en/api/index.md') } },
    llms: abs('llms.txt'),
    llmsFull: abs('llms-full.txt'),
    dataset: abs('data/budzse.json'),
    endpoints: {
      catalog: abs('api/v1/index.json'),
      metadata: abs('api/v1/metadata.json'),
      observations: abs('api/v1/observations.json'),
      observation: abs('api/v1/observations/{id}.json'),
      years: abs('api/v1/years.json'),
      year: abs('api/v1/years/{year}.json'),
      indicators: abs('api/v1/indicators.json'),
      indicator: abs('api/v1/indicators/{indicator}.json'),
      sources: abs('api/v1/sources.json'),
      source: abs('api/v1/sources/{sourceId}.json'),
      gaps: abs('api/v1/gaps.json'),
      cpi: abs('api/v1/cpi.json'),
      schema: abs('api/v1/schema/observation.schema.json'),
    },
    examples: {
      budget: abs('api/v1/observations/central.revenue.2000.original.json'),
      outturn: abs('api/v1/observations/general.deficit.2025.actual.json'),
      partYear: abs('api/v1/observations/central.deficit.2026.ytd.json'),
      forecast: abs('api/v1/observations/gdp.2026.forecast.gov.json'),
    },
    indicators,
    updates: dataset.latestUpdate,
    readFirst: [
      'Read scope, status and method. Do not infer them from the id.',
      'original and revised are budgets. actual is a full-year outturn. ytd is part of the year. forecast is not an outturn.',
      'Forint values are nominal. The website’s today-prices view is not an observation.',
      'Do not difference the central budget through 2009 and the central subsystem from 2010, or either of them with ESA 2010.',
      'Do not join net ODA and grant-equivalent ODA. Hungary Helps is not total ODA.',
      'A missing id is missing data. It is not zero.',
      'Cite the original source and the permanent observation URL.',
    ],
    provenance: provenance(dataset),
  };
}

function metadata(dataset) {
  const vocabulary = (group) => Object.fromEntries(Object.keys(LABELS.en[group]).map((key) => [key, { hu: LABELS.hu[group][key], en: LABELS.en[group][key] }]));
  return {
    apiVersion: API_VERSION,
    uri: abs('api/v1/metadata.json'),
    generatedAt: dataset.generatedAt,
    coverageYears: dataset.coverageYears,
    inLanguage: ['hu', 'en'],
    identifiers: {
      hu: 'Az id átlátszatlan, állandó kulcs. A central előtag nem scope. A gép URL-ben nincs dátum, hogy a hivatkozás a felülvizsgálat után is ugyanoda mutasson.',
      en: 'An id is an opaque stable key. The central prefix is not a scope. The machine URL contains no date, so a citation still resolves after a revision.',
    },
    figureKinds: FIGURE_KINDS,
    priceBasis: PRICE_BASIS,
    units: {
      HUF: { hu: 'Egész forint.', en: 'Whole forints.' },
      pct: { hu: 'Sima százalék, nincs deflálva.', en: 'A plain percentage, not deflated.' },
    },
    vocabulary: {
      indicators: vocabulary('indicators'),
      statuses: vocabulary('statuses'),
      statusHelp: vocabulary('statusHelp'),
      scopes: vocabulary('scopes'),
      methods: vocabulary('methods'),
      revisions: vocabulary('revisions'),
      publishers: vocabulary('publishers'),
    },
    tokens: TOKENS,
    tokenMeaning: {
      hu: 'A mustNotBeReadAs azt mondja meg, minek nem szabad olvasni a számot. A token angol azonosító, a szöveg kétnyelvű.',
      en: 'mustNotBeReadAs says what the figure must not be treated as. The token is an English id and the text is bilingual.',
    },
    rules: RULES,
    comparison: {
      rule: 'same-scope-and-method',
      key: 'scope|method|status|publisher',
      hu: 'Csak azonos scope és method mellett vonj ki adatokat. Tervet és tényt csak így szabad összevetni. A central-2010 törés két oldalát nem. A key a státuszt is tartalmazza, hogy a különböző státusok ne essenek egy csoportba.',
      en: 'Subtract figures only when scope and method match. Compare a budget with an outturn only on that condition. Never across the central-2010 break. The key includes status so different statuses are not one group.',
    },
    citation: {
      hu: 'Használd a citation.hu vagy a citation.en mezőt. Ne idézd a honlap mai áras számát, és ne váltsd a value-t billióra vagy billionre.',
      en: 'Use citation.hu or citation.en. Do not cite the website’s today-prices number, and do not rescale value into billió or billion.',
    },
    cpiAdjustment: {
      notAnObservation: true,
      formula: 'adjusted = nominal * level(referenceYear) / level(year), using cpi.annual[].level where 2000 = 100',
      endpoint: abs('api/v1/cpi.json'),
      hu: 'A képlet a honlap számítása. Az eredmény nem megfigyelés. A 2026–27-es szint előrejelzés, ezért a korrekció becslés. A százalékot nem szabad deflálni. Az inflációval korrigált GDP nem a hivatalos reál GDP.',
      en: 'The formula is the website’s calculation. The result is not an observation. The 2026–27 level is a forecast, so the adjustment is an estimate. Do not deflate a percentage. CPI-adjusted GDP is not official real GDP.',
    },
    breaks: dataset.breaks,
    licence: RULES.find((rule) => rule.id === 'licence'),
    versioning: {
      apiVersion: API_VERSION,
      path: '/api/v1/',
      hu: 'Az 1-es verzió mezőt hozzátehet. Mezőt nem vesz el és nem nevez át, és egy id jelentését nem változtatja meg új verzió nélkül.',
      en: 'Version 1 may add a field. It will not remove or rename a field, and it will not change what an id means, without a new version.',
    },
    provenance: provenance(dataset),
  };
}

function llmsTxt(dataset) {
  const [from, to] = dataset.coverageYears;
  return `# Büdzsé

> Sourced observations of Hungary's public finances, ${from}–${to}. Every figure has a status: original budget, amended budget, draft, budget-time estimate, full-year outturn, part-year execution or forecast. A positive value is a deficit and a negative value is a surplus. Stored money values are nominal.

Read scope, status and method on each record. Do not infer them from the id. Ids that start with central are the central budget through 2009 and the central subsystem from 2010, and those two must not be subtracted. Do not compare either with ESA 2010 general government. Do not join net ODA to grant-equivalent ODA, and do not treat Hungary Helps as total ODA. A missing figure is absent, not zero. The website's view in today's prices is calculated in the browser and is not an observation. Hungarian billió is 10^12; value is whole forints. Cite the original publisher and the permanent observation URL. Büdzsé compiles the figures and is not their publisher.

## Data

- [API catalog](${abs('api/v1/index.json')}): Start here. Endpoints, examples and the reading rules.
- [Metadata](${abs('api/v1/metadata.json')}): Vocabulary, comparability, citation, licence and versioning.
- [Observation index](${abs('api/v1/observations.json')}): Every id. Do not invent an id.
- [Example observation, 2000 original central revenue](${abs('api/v1/observations/central.revenue.2000.original.json')}): Pattern /api/v1/observations/{id}.json. This example is a budget, not an outturn.
- [Example outturn, 2025 general-government deficit](${abs('api/v1/observations/general.deficit.2025.actual.json')}): Full-year ESA 2010 outturn. Positive means a deficit.
- [Example part-year figure](${abs('api/v1/observations/central.deficit.2026.ytd.json')}): Not an annual outturn and not a share of GDP.
- [Example forecast](${abs('api/v1/observations/gdp.2026.forecast.gov.json')}): A government forecast, not an outturn.
- [Years](${abs('api/v1/years.json')}): One file per year at /api/v1/years/{year}.json, ${from}–${to}.
- [Year 2020](${abs('api/v1/years/2020.json')}): Every observation for that year.
- [Indicators](${abs('api/v1/indicators.json')}): One series per indicator at /api/v1/indicators/{indicator}.json.
- [Deficit series](${abs('api/v1/indicators/deficit.json')}): All deficit observations. Statuses are not interchangeable.
- [Sources](${abs('api/v1/sources.json')}): The source registry. One source is /api/v1/sources/{sourceId}.json.
- [Eurostat government source](${abs('api/v1/sources/eurostat-gov.json')}): Example source record.
- [Gaps](${abs('api/v1/gaps.json')}): Documented absences. Absence is not zero.
- [Price index](${abs('api/v1/cpi.json')}): Used only to reproduce the website's inflation view. notAnObservation is true.
- [Observation schema](${abs('api/v1/schema/observation.schema.json')}): JSON Schema 2020-12. cpiAdjusted is always false.
- [Full dataset](${abs('data/budzse.json')}): The validated file this API is generated from.

## Documentation

- [Data and API, English](${abs('en/api/')}): How to query, read and cite.
- [Adatok és API, magyar](${abs('hu/api/')}): Ugyanez magyarul.
- [English guide in Markdown](${abs('en/api/index.md')}): The English guide without HTML.
- [Magyar útmutató Markdownban](${abs('hu/api/index.md')}): A magyar útmutató HTML nélkül.
- [Every figure, English HTML](${abs('en/figures/')}): All observations in a table, no JavaScript.
- [Minden adat, magyar HTML](${abs('hu/figures/')}): Az összes megfigyelés táblában, JavaScript nélkül.

## Optional

- [Full agent brief](${abs('llms-full.txt')}): The short map plus the rules in English and Hungarian.
- [Interactive chart, Hungarian](${abs('hu/')}): Needs JavaScript. Its today-prices numbers are not observations.
- [Interactive chart, English](${abs('en/')}): Needs JavaScript. Its today-prices numbers are not observations.
`;
}

function llmsFull(dataset) {
  const rules = (lang, title) => [`## ${title}`, '', ...RULES.map((rule) => `- ${rule.id}: ${rule[lang]}`)].join('\n');
  const vocab = (group, title) => [`## ${title}`, '', ...Object.entries(LABELS.en[group]).map(([key, en]) => `- ${key}: ${en} / ${LABELS.hu[group][key]}`)].join('\n');
  return `${llmsTxt(dataset).trim()}

${rules('en', 'Rules in English')}

${rules('hu', 'Szabályok magyarul')}

${vocab('statuses', 'Statuses')}

${vocab('scopes', 'Scopes')}

${vocab('methods', 'Methods')}

${vocab('indicators', 'Indicators')}

## Citation shape

Use the citation field on the observation. It names the scope, the indicator, the year, the status, the method, whether it is an outturn, the price basis, the normalised value, the value as reported, the publisher, the locator, the source URL, the access date and the permanent record URL.

## Version

API ${API_VERSION} at /api/v1/. Adding a field stays inside this version. Removing a field, renaming a field, or changing what an id means requires a new version. Dataset date: ${dataset.generatedAt}.
`;
}

function apiHome() {
  const body = `${brand('en', '')}
<nav aria-label="Related">
<a href="${sitePath('api/v1/index.json')}">index.json</a>
<a href="${sitePath('llms.txt')}">llms.txt</a>
<a href="${sitePath('hu/api/')}">Adatok és API</a>
<a href="${sitePath('en/api/')}">Data and API</a>
</nav>
<h1>Büdzsé API v1</h1>
<p>Static JSON for sourced observations of Hungary's public finances. Start with the <a href="${sitePath('api/v1/index.json')}">machine-readable catalog</a>. Human guides: <a href="${sitePath('hu/api/')}">magyar</a>, <a href="${sitePath('en/api/')}">English</a>.</p>
<ul>
<li><a href="${sitePath('api/v1/metadata.json')}">metadata.json</a></li>
<li><a href="${sitePath('api/v1/observations.json')}">observations.json</a></li>
<li><a href="${sitePath('api/v1/years.json')}">years.json</a></li>
<li><a href="${sitePath('api/v1/indicators.json')}">indicators.json</a></li>
<li><a href="${sitePath('api/v1/sources.json')}">sources.json</a></li>
<li><a href="${sitePath('api/v1/gaps.json')}">gaps.json</a></li>
<li><a href="${sitePath('api/v1/cpi.json')}">cpi.json</a></li>
</ul>
<footer><p>Büdzsé compiles these figures. It is not the publisher of the underlying statistics.</p></footer>`;
  return shell({
    lang: 'en',
    title: 'Büdzsé API v1',
    description: 'Machine-readable catalog of sourced Hungarian public-finance observations.',
    canonical: abs('api/v1/'),
    head: `<link rel="alternate" type="application/json" href="${abs('api/v1/index.json')}">\n<link rel="describedby" href="${abs('llms.txt')}" type="text/plain">\n<link rel="help" href="${abs('en/api/')}" hreflang="en">\n<link rel="help" href="${abs('hu/api/')}" hreflang="hu">\n`,
    body,
  });
}

function assertLinked(files, text, label) {
  const urls = [...text.matchAll(/\]\((https:\/\/[^)\s]+)\)/g)].map((match) => match[1]);
  for (const url of urls) {
    if (!url.startsWith(`${ORIGIN}/`)) throw new Error(`${label} links off site: ${url}`);
    const rel = url.slice(ORIGIN.length + 1);
    const ok = rel === 'data/budzse.json' || rel === 'hu/' || rel === 'en/' || files.has(rel) || files.has(`${rel}index.html`);
    if (!ok) throw new Error(`${label} links to a missing file: ${rel}`);
  }
}

export function renderApi(dataset) {
  const model = buildModel(dataset);
  const { documents } = model;
  const files = new Map();
  const put = (path, body) => {
    if (path.split('/').some((part) => part === '' || part === '.' || part === '..')) throw new Error(`Bad API path ${path}`);
    if (files.has(path)) throw new Error(`Duplicate API path ${path}`);
    files.set(path, body.endsWith('\n') ? body : `${body}\n`);
  };

  const byIndicator = new Map();
  const bySource = new Map();
  for (const doc of documents) {
    if (!byIndicator.has(doc.indicator)) byIndicator.set(doc.indicator, []);
    byIndicator.get(doc.indicator).push(doc);
    if (!bySource.has(doc.source.id)) bySource.set(doc.source.id, []);
    bySource.get(doc.source.id).push(doc);
  }

  put('api/v1/schema/observation.schema.json', json(observationSchema(dataset)));
  put('api/v1/metadata.json', json(metadata(dataset)));
  put('api/v1/gaps.json', json({
    apiVersion: API_VERSION,
    uri: abs('api/v1/gaps.json'),
    warning: {
      hu: 'A hiányzó adat nincs rögzítve. A nulla nem helyettesíti. A years mező szöveg, az ok a reason mező.',
      en: 'A missing figure is not stored. Zero does not stand in for it. years is prose and the reason is the reason field.',
    },
    gaps: dataset.gaps,
    provenance: provenance(dataset),
  }));
  put('api/v1/cpi.json', json({
    apiVersion: API_VERSION,
    uri: abs('api/v1/cpi.json'),
    notAnObservation: true,
    formula: 'adjusted = nominal * level(referenceYear) / level(year), using annual[].level where 2000 = 100',
    warning: {
      hu: 'Ez az árindex, amelyből a honlap a mai áras nézetet számolja. A számított eredmény nem megfigyelés. A százalékot nem szabad deflálni. Az inflációval korrigált GDP nem a hivatalos reál GDP. A 2026–27-es szint előrejelzés, ezért az ilyen korrekció becslés.',
      en: 'This is the price index the website uses for its today-prices view. A calculated result is not an observation. Do not deflate a percentage. CPI-adjusted GDP is not official real GDP. The 2026–27 level is a forecast, so such an adjustment is an estimate.',
    },
    cpi: dataset.cpi,
    provenance: provenance(dataset),
  }));
  put('api/v1/observations.json', json({
    apiVersion: API_VERSION,
    uri: abs('api/v1/observations.json'),
    count: documents.length,
    observations: documents.map(summaryOf),
    provenance: provenance(dataset),
  }));

  for (const doc of documents) {
    put(`api/v1/observations/${doc.id}.json`, json(doc));
    for (const lang of ['hu', 'en']) {
      const page = observationPage(doc, lang);
      if (!page.includes(escapeHtml(doc.citation[lang]))) throw new Error(`${doc.id}: ${lang} page dropped the citation`);
      if (!page.includes(escapeHtml(doc.source.url))) throw new Error(`${doc.id}: ${lang} page dropped the source`);
      put(`${lang}/obs/${doc.id}/index.html`, page);
    }
  }

  const [from, to] = dataset.coverageYears;
  const yearList = [];
  for (let year = from; year <= to; year += 1) {
    const rows = documents.filter((doc) => doc.year === year);
    yearList.push({ year, count: rows.length, uri: abs(`api/v1/years/${year}.json`) });
    put(`api/v1/years/${year}.json`, json({
      apiVersion: API_VERSION,
      year,
      uri: abs(`api/v1/years/${year}.json`),
      breaks: dataset.breaks.filter((item) => item.year === year || item.year === year + 1),
      gaps: gapsForYear(dataset, year),
      count: rows.length,
      observations: rows,
      provenance: provenance(dataset),
    }));
  }
  put('api/v1/years.json', json({ apiVersion: API_VERSION, uri: abs('api/v1/years.json'), years: yearList, provenance: provenance(dataset) }));

  const indicatorList = [];
  for (const [indicator, rows] of [...byIndicator.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    indicatorList.push({
      id: indicator,
      label: { hu: LABELS.hu.indicators[indicator], en: LABELS.en.indicators[indicator] },
      count: rows.length,
      uri: abs(`api/v1/indicators/${indicator}.json`),
    });
    put(`api/v1/indicators/${indicator}.json`, json({
      apiVersion: API_VERSION,
      indicator,
      label: { hu: LABELS.hu.indicators[indicator], en: LABELS.en.indicators[indicator] },
      uri: abs(`api/v1/indicators/${indicator}.json`),
      gaps: dataset.gaps.filter((gap) => gap.indicator === indicator),
      count: rows.length,
      observations: rows,
      priceBasis: PRICE_BASIS,
      provenance: provenance(dataset),
    }));
  }
  put('api/v1/indicators.json', json({ apiVersion: API_VERSION, uri: abs('api/v1/indicators.json'), indicators: indicatorList, provenance: provenance(dataset) }));

  const sourceList = [];
  for (const [id, source] of Object.entries(dataset.sources).sort((a, b) => a[0].localeCompare(b[0]))) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(id)) throw new Error(`Unsafe source id ${id}`);
    const rows = bySource.get(id) ?? [];
    sourceList.push({ id, title: source.title, url: source.url, type: source.type, observationCount: rows.length, uri: abs(`api/v1/sources/${id}.json`) });
    put(`api/v1/sources/${id}.json`, json({
      apiVersion: API_VERSION,
      uri: abs(`api/v1/sources/${id}.json`),
      source,
      observationCount: rows.length,
      observations: rows.map(summaryOf),
      provenance: provenance(dataset),
    }));
  }
  put('api/v1/sources.json', json({ apiVersion: API_VERSION, uri: abs('api/v1/sources.json'), count: sourceList.length, sources: sourceList, provenance: provenance(dataset) }));

  for (const lang of ['hu', 'en']) {
    put(`${lang}/api/index.html`, docsPage(model, lang));
    put(`${lang}/api/index.md`, renderBlocks(guideBlocks(model, lang), 'md'));
    put(`${lang}/figures/index.html`, figuresPage(documents, lang, dataset.generatedAt));
  }
  put('api/v1/index.html', apiHome());
  put('api/v1/index.json', json(catalog(dataset, documents)));
  const short = llmsTxt(dataset);
  const full = llmsFull(dataset);
  put('llms.txt', short);
  put('llms-full.txt', full);
  assertLinked(files, short, 'llms.txt');
  assertLinked(files, full, 'llms-full.txt');
  if (!short.startsWith('# Büdzsé\n')) throw new Error('llms.txt must open with an H1');
  if (!short.includes('\n> ')) throw new Error('llms.txt is missing its summary');
  return Object.fromEntries(files);
}
