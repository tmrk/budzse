# Büdzsé

Static, bilingual (hu default, en) one-page app on Hungary's public finances, 2000-2027. Live at https://tmrk.github.io/budzse/. See AGENTS.md for repository structure and rules; this file covers what Claude Code most needs.

## Non-negotiable

Every displayed number needs a traceable source or a documented calculation from sourced inputs. Never invent, interpolate or extrapolate. Missing data stays missing: never zero, never silently filled. If a figure cannot be verified, add it to `data/methodology/gaps.json`.

## Commands

- `npm run dev`: compile dataset, start Vite (`/budzse/hu/`)
- `npm run build`: dataset, validation, typecheck, build, static routes
- `npm test`: Vitest. `npm run test:e2e`: Playwright against `dist/` (build first)
- `npm run data:fetch [eurostat|oecd|ksh|ameco|mnb]`, `npm run data:acts`: refresh sources

## Pitfalls

- 10^9 is milliárd/billion; 10^12 is billió/trillion. Hungarian billió is not English billion. Use `src/lib/format.ts`.
- Central scope breaks in 2010: `centralBudget` to 2009, `centralSubsystem` after. Never difference across it. Central (cash) and general government (ESA 2010) are not comparable.
- Deficit is positive. Eurostat B.9 and AMECO balance are sign-reversed at build time.
- `original` must come from `mkogy.jogtar.hu` (promulgated text). `net.jogtar.hu` shows amended text, used only for `revised`.
- Net ODA and grant-equivalent ODA are separate series. Do not join them. Hungary Helps or ministry lines are not total ODA.
- CPI-adjusted GDP is not real GDP. Percentages are not deflated. Part-year figures have no GDP share.
- Forecast-year CPI makes adjusted values estimates; `measure()` flags them.
- `parlament.hu` shows a CAPTCHA to automation and `njt.hu` resets connections from some networks. Do not try to bypass. A person can pass the CAPTCHA in Chrome, and the site then reads normally there, including `/irom43/NNNNN/NNNNN.pdf`. The 2027 draft figures come from the Fiscal Council opinion (`kt-2027`): replace them with the official bill or act once it is filed.
- The government forecast states revenue and expenditure only as shares of GDP, so its forint figures for 2026-27 are calculated (`derivation`) and can miss the published deficit by a few tens of billions. It outranks the Commission in the ledger because it is newer.
- Charts are hand-written SVG (`src/components/Timeline.tsx`, `src/charts/geometry.ts`), and every chart shares one x scale. Colours are CSS variables; keep light and dark tokens in `src/styles/app.css` in step, and run the palette through a CVD check when changing them.
- Orange means one thing: the gap between money in and money out. The hatch is its mark. Do not reuse either for anything else.
- The ledger shows one figure set per year (`ledgerFor`), all from one status and publisher. A part-year figure never stands for a year.
- Nothing may change height when the year changes. Sweeping a chart must not move the page or the chart under a finger, so readouts have fixed items and values never wrap. A test sweeps all 28 years and fails on any movement.
- Two typefaces with fixed jobs. Big Shoulders: the name, the year, the sum, section titles. It has no tabular figures, so hero numbers use fixed digit cells (`Digits`). Source Sans 3: everything else, tabular by default, so readouts hold still through the years. Any new face must render ő and ű correctly: check, because some do not.
- Hover may change colour, never geometry. Selected options keep the weight of unselected ones, and folds, notes and readouts reserve their space. Tests cover this: hover every control, switch every option, sweep every year.
- A missing figure always goes through `Missing`: same place and baseline as the number, and a documented gap opens its reason in the source sheet. Do not add a new placeholder style or a bare dash.
- `container-type` turns off subgrid on the same element. The hero's columns share rows through subgrid, so the containers are their children.

## Deployment

Push to `main` runs `.github/workflows/deploy.yml`: validate, test, build, e2e, deploy to Pages. A failed validation blocks publishing.
