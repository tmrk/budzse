# Instructions for coding agents

## Structure

- `src/lib/`: pure logic. `measure.ts` (values, scopes, comparisons), `cpi.ts`, `format.ts`, `view.ts` (state, URL, language routing), `csv.ts`
- `src/components/`: `Hero` (the sum), `MoneyChart`, `Sections` (plan, economy, aid), `YearFigures`, `Archive`, `Timeline` (the frame every chart uses)
- `src/charts/geometry.ts`: pure scale and path helpers. `src/hooks/`, `src/styles/app.css`, `src/i18n/{hu,en}.ts`
- `data/raw/`: snapshots from `scripts/fetch/fetch-statistics.mjs`
- `data/observations/central-budget.json`: generated from legal acts by `scripts/fetch/fetch-acts.mjs`
- `data/observations/manual-transcriptions.json`: hand-verified figures from PDFs and workbooks
- `data/sources/`: source registry. `data/methodology/gaps.json`: documented gaps. `data/COVERAGE.md`: generated
- `scripts/transform/build-dataset.mjs` compiles everything into `public/data/budzse.json`; `scripts/validate/validate-dataset.mjs` enforces the rules
- `tests/unit/`, `tests/e2e/`

## Commands

`npm ci`, `npm run dev`, `npm run build`, `npm test`, `npm run test:e2e` (after build), `npm run data:validate`.

## Data integrity

Forbidden: unsourced numbers, sample or fabricated data, interpolation, zero for missing data, silently changing accounting definitions, comparing across scopes or methods.

Every observation carries value, original value and unit, status, scope, method, institution, source ID, locator and revision state. Calculated values carry a formula and sourced inputs. Keep numeric data out of UI components.

To add data: put it in `data/raw/` or `manual-transcriptions.json`, register the source, run `npm run data && npm run data:validate`, review the diff and `data/COVERAGE.md`, update `data/methodology/gaps.json`, and pin a verified figure in `tests/unit/data.test.ts`. Do not auto-publish scraped figures. To add a year, see `data/README.md`.

## Citation rules

Prefer the original official dataset or legal document, with the deepest stable link and a locator. A press report is allowed only when the primary is unreachable, must set `secondary: true`, and needs the source type `secondary`.

## Localisation

All visible text lives in `src/i18n/`; `hu.ts` is the type source, so `en.ts` must match it. Keep Hungarian accents and suffix agreement (`huYearAdjective`). Source titles may stay in their original language. Changing language must not reload or reset state. Use `formatHuf`, never hand-built number strings.

## Testing and extending

Run unit tests, typecheck and e2e before pushing. Add tests for new calculations and controls. Check phone (375px) and desktop screenshots. Keep the page's controls to three: year, what to count, how to measure. A new question gets a section with its own chart, not a new switch. No analytics, trackers, accounts, paid services or runtime calls to statistics APIs. Keep the site fully static; do not break `/budzse/`, `/budzse/hu/`, `/budzse/en/` (see `scripts/transform/static-routes.mjs`).
