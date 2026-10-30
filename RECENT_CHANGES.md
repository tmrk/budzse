# Recent changes

## 2026-10-30: calmer second pass

The page no longer moves while sweeping through the years: each section has fixed words beside it and a fixed readout above its chart. The hero has one chart with the chosen year's gap drawn solid. Removed: the comparison-year dropdown (the sum now always compares with the year before), the coverage bar, the deficit strip under the main chart, copy link, and repeated year headings. The load animation is gone too, as a full-page capture could restart it and blank the chart. "Every figure for a year" moved into the archive. Missing-data reasons moved from the sections to a tooltip and the coverage list.

## 2026-10-30: interface overhaul

One timeline and one selected year now drive the whole page. The first screen is the year's sum: revenue, expenditure, deficit. Controls went from about twenty to three, and the default view is the whole state (ESA), which has no series break. ECharts is gone in favour of hand-written SVG. New type (Big Shoulders, Newsreader) and a two-ink palette.

Fixed along the way: the share-of-GNI line joined net and grant-equivalent ODA across their 2018 method change; the two are now separate lines.

Retired URL parameters (`m`, `v`, `rev`, `f`, `x`, `from`, `to`, `ci`, `ca`, `cb`) are ignored, so old links still open. A link with no `s` now means the whole state rather than the central budget.

## 2026-10-30: first release

Dataset of central budget acts 2000-2026, final accounts 2000-2024, Treasury 2025 and Jan-Sep 2026, Eurostat 2000-2025, OECD DAC 2003-2025, KSH CPI, EC Spring 2026 forecast and the Ministry of Finance 2027-2030 programme.

## Known limitations and outstanding work

- 2027 central figures are from press reports of the Fiscal Council opinion. Replace with the official bill or the adopted act.
- Check for the 2025 final-accounts act and swap it in for the Treasury balance.
- EC Autumn 2026 forecast is due 17 November 2026; OECD detailed 2025 ODA in December 2026.
- Budget-time GDP assumptions before 2017 and ESA plans before 2021 are gaps; older bills are on parlament.hu.
- Monthly CPI chains one-decimal indices, so it carries rounding error of a few tenths of a percent.
