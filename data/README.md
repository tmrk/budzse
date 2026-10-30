# Data

Pipeline: official sources → `raw/` and `observations/` → `scripts/transform/build-dataset.mjs` → `public/data/budzse.json`, checked by `scripts/validate/validate-dataset.mjs`.

## Sources and how they are collected

| Data | Source | Method | Update |
| --- | --- | --- | --- |
| Central budget, original | Budget acts, `mkogy.jogtar.hu` (promulgated text) | `npm run data:acts` | Yearly |
| Central budget, amended | `net.jogtar.hu` consolidated text, or amending acts | `npm run data:acts` | When amended |
| Central budget, actual | Final-accounts acts; Treasury balance for the latest year | `npm run data:acts`, manual | Yearly |
| Year to date | Treasury monthly workbook, sheet `MERLEG` | Manual | Monthly |
| General government | Eurostat `gov_10a_main` | `npm run data:fetch eurostat` | April, October |
| GDP, real growth | Eurostat `nama_10_gdp` | same | Quarterly |
| ODA | OECD DAC1 SDMX | `npm run data:fetch oecd` | December, April |
| CPI | KSH STADAT ara0002, ara0040 | `npm run data:fetch ksh` | Monthly |
| USD rates | MNB `arfolyamok.asmx` | `npm run data:fetch mnb` | As needed |
| Commission forecast | AMECO | `npm run data:fetch ameco` | May, November |
| 2027 draft main sums and ESA target | Fiscal Council opinion (PDF, parlament.hu) | Manual, in Chrome after a person passes the CAPTCHA | Until the bill is filed |
| Budget-time GDP and ESA plans | State Audit Office opinions (PDF) | Manual | Yearly |
| Government forecast | Ministry of Finance programme (PDF) | Manual | When published |

## Manual transcription

Open the document, read the figure in context (render PDF tables visually when text extraction is ambiguous), and add it to `observations/manual-transcriptions.json` with the reported text, unit and page or row. Normalised values are exact strings of whole forints. A second check against another document is recorded in a test where possible.

`fetch-acts.mjs` stops with an error if expenditure minus revenue differs from the deficit stated in the same clause.

## Refreshing

Run the fetch script, then `npm run data && npm run data:validate`, then read the diff. Revisions are normal; investigate anything unexpected before committing. Nothing is published without a commit.

## Adding a year

Add acts to `scripts/fetch/legal-acts-manifest.mjs`, run `npm run data:acts`, move the last-full-year constant in the validator, extend the CPI rows in `build-dataset.mjs`, update `LAST_YEAR` in `src/lib/view.ts` if the timeline grows, and revise `methodology/gaps.json`.

## Reuse

The MIT licence covers the code only. Each source's terms apply to its data: OECD data is CC BY 4.0, Eurostat and the European Commission allow reuse with attribution, Hungarian acts are official documents. Attribute the original publisher named in each observation's source.
