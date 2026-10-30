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
- `parlament.hu` shows a CAPTCHA to automation and `njt.hu` resets connections from some networks. Do not try to bypass. The 2027 draft figures are `secondary: true` for this reason: replace them with the official bill or act when it can be read.
- ECharts draws on canvas, so colours come from CSS variables via `readTheme`; keep light and dark tokens in `src/styles/app.css` in step.

## Deployment

Push to `main` runs `.github/workflows/deploy.yml`: validate, test, build, e2e, deploy to Pages. A failed validation blocks publishing.
