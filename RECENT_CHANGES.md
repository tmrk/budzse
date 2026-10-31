# Recent changes

## 2026-10-31: last updated note

The footer now says when the site was last updated, under the project statement and on the same line as the links. The date is the dataset's `generatedAt`, which every deploy sets, so it also moves when only the code changed.

## 2026-10-31: the 2027 budget bill

The 2027 figures now come from the bill itself, T/950, filed on 30 October 2026 (https://www.parlament.hu/irom43/00950/00950.pdf), rather than the Fiscal Council's opinion of an earlier version. Revenue is HUF 42,484,933.0 million and expenditure HUF 47,587,633.0 million, each HUF 1,133 million above that version. The deficit, HUF 5,102,700.0 million, and the ESA target, HUF 4,790.0 billion, did not change.

New from the bill: the 2027 Hungary Helps lines (programme HUF 100.7 million, agency HUF 411.4 million, against 2,149.9 and 1,643.0 in the 2026 act under the same names), and the budget-time GDP assumption (HUF 97,716 billion) and ESA estimate. The bill's GDP, CPI and shares of GDP match the Ministry of Finance programme already in use.

A filed bill is no longer called a draft in the text: the label is now "Budget bill" and "Törvényjavaslat". The methodology also said no scholarship line had been listed separately since 2021; the 2026 act and the bill list one, which is still not counted.

## 2026-10-30: full data check

Every served figure was checked again against its source: all statistics re-fetched, every act re-read, each transcribed figure found on its page, and all acts of 2010-2026 listed by title to look for amendments. Corrected:

- Amended main sums for three years stopped at an earlier amendment. 2010 now follows Act CXLIII of 2010 (revenue 12,764,719.3, expenditure 13,629,030.4 million), 2012 Act CLXXXVII of 2012 (deficit 671,860.7 million, was 576,160.7) and 2013 Act CCVI of 2013 (deficit 1,125,184.4 million, was 1,050,834.8). Originals and outcomes were not affected.
- Hungary Helps: the page said only 2020 had a published ODA share. The agency's 2019 report has one too, 86%, beside 94% for 2020, and the text no longer says "most" for years with no figure. Two statements about the OECD's project data were narrowed to what its 2018-2019 file and the 2023 peer review show. The 2025 ODA caveat now says what the OECD says: incomplete data for ODA to Ukraine.
- Gaps: 2020 was missing from the list of years without an amended act, grant-equivalent ODA before 2016 had no documented reason, and the plan readout for 2027 gave the reason for a missing outcome.
- Each methodology section and the Hungary Helps share gap now link the documents behind them. Four sources were added. Percent figures from the State Audit Office no longer carry a stray currency.

## 2026-10-30: language follows the visitor's time zone

The address without a language now opens in Hungarian on a device set to Hungary's time zone, and moves to `/en/` elsewhere, without a reload. A language link and a saved choice still win. The source sheet slides in and out, and open dropdown lists keep to the theme's colours.

## 2026-10-30: Google Analytics, with consent

The app now asks whether it may use Google Analytics. Nothing is sent to Google and no analytics cookie is set before a yes, and advertising features stay off. The Cookie settings button in the footer changes the answer, and withdrawing removes the cookies. A page load or a language change counts as a page view. The API and citation pages carry no analytics.

## 2026-10-30: typography and clarity pass

Text is now set in Source Sans 3, replacing Newsreader, because its tabular figures keep numbers still through the years. Big Shoulders stays for the name, the year, the sum and section titles. The descriptor under the name is now one line beside it, and a plain instruction sits under the main chart.

The two main controls now say what they do ("What to count", "How to measure") and look like choices. The year has a visible dropdown mark, and the rotated stamp became a filled or hollow dot matching the chart's outcome and non-outcome dots. The sum is one size, so decimal points line up and the subtraction can be read, and it closes with an accounting double rule. The year lines up with the controls, and the sum with the chart.

Placeholders are one system: "No data" sits where the number would, and a documented gap opens its reason in the source sheet. A bare dash gave way to "not comparable" across the 2010 break, "No outcome yet" and "Not calculated". Orange left the plan difference and the not-final labels, where it broke its own rule.

Nothing moves on hover or on choosing an option now, and notes moved beside the charts so switching a measure leaves the page where it was.

## 2026-10-30: data API

The dataset now also publishes a static JSON API, a permanent page for every observation, and `llms.txt`. An agent can start from the public site, without JavaScript, and cite a figure with its original source. The chart is unchanged apart from a footer link to the guide.

## 2026-10-30: newest figures for 2026 and 2027

The whole-state figures for 2026 and 2027 now show the government's October forecast instead of the Commission's spring one, which predates the change of government: the 2026 deficit is HUF 6,902 billion rather than 5,671, and the 2027 deficit HUF 4,790 billion rather than 5,581. Revenue and expenditure are calculated from the government's shares of GDP and marked as such. The Commission's forecast stays listed under every figure for the year.

The 2027 central figures now cite the Fiscal Council's opinion of 29 October 2026 rather than press reports. Its tables also confirm the 2025 Treasury balance and the amended 2026 act.

The bar now takes over the year as soon as the big year has scrolled away, not after the whole first section. On phones the language and theme controls stay in the bar. The column of changes in the sum is now labelled "change on prior year", because a bare "+34.5%" beside the deficit could be read as the deficit itself.

## 2026-10-30: Hungary Helps

A new section shows the two budget lines that carry the Hungary Helps name, the programme's grants and the agency's running costs, from the budget and final-accounts acts. Hungary Helps is drawn inside the net ODA bars, with a second chart for the split between the lines and a calculated ratio marked as a guide: no official yearly share exists, because OECD data do not separate Hungary Helps. Net ODA for 2025 now comes from the OECD in forints, along with a small revision of the 2024 bilateral and multilateral split.

## 2026-10-30: calmer second pass

The page no longer moves while sweeping through the years: each section has fixed words beside it and a fixed readout above its chart. The hero has one chart with the chosen year's gap drawn solid. Removed: the comparison-year dropdown (the sum now always compares with the year before), the coverage bar, the deficit strip under the main chart, copy link, and repeated year headings. The load animation is gone too, as a full-page capture could restart it and blank the chart. "Every figure for a year" moved into the archive. Missing-data reasons moved from the sections to a tooltip and the coverage list.

## 2026-10-30: interface overhaul

One timeline and one selected year now drive the whole page. The first screen is the year's sum: revenue, expenditure, deficit. Controls went from about twenty to three, and the default view is the whole state (ESA), which has no series break. ECharts is gone in favour of hand-written SVG. New type (Big Shoulders, Newsreader) and a two-ink palette.

Fixed along the way: the share-of-GNI line joined net and grant-equivalent ODA across their 2018 method change; the two are now separate lines.

Retired URL parameters (`m`, `v`, `rev`, `f`, `x`, `from`, `to`, `ci`, `ca`, `cb`) are ignored, so old links still open. A link with no `s` now means the whole state rather than the central budget.

## 2026-10-30: first release

Dataset of central budget acts 2000-2026, final accounts 2000-2024, Treasury 2025 and Jan-Sep 2026, Eurostat 2000-2025, OECD DAC 2003-2025, KSH CPI, EC Spring 2026 forecast and the Ministry of Finance 2027-2030 programme.

## Known limitations and outstanding work

- 2027 central figures and Hungary Helps lines are from the bill T/950, which Parliament can still change. Replace them with the promulgated act.
- Check for the 2025 final-accounts act and swap it in for the Treasury balance.
- EC Autumn 2026 forecast is due 17 November 2026; OECD detailed 2025 ODA in December 2026.
- Budget-time GDP assumptions before 2017 and ESA plans before 2021 are gaps; older bills are on parlament.hu.
- The OECD's public activity-level file for Hungary covers only 2018-2019, so the agency's operating costs are confirmed as ODA for 2019 only. Later years need the CRS bulk files.
- Monthly CPI chains one-decimal indices, so it carries rounding error of a few tenths of a percent.
