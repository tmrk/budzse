import type { Dataset, FiscalScope, Indicator, Observation, Status } from '../types/data';
import { deflator, type PriceReference } from './cpi';
import { FIRST_YEAR, LAST_YEAR, type AnalyticalScope, type ViewState } from './view';

export const SCOPES_OF: Record<AnalyticalScope, FiscalScope[]> = {
  central: ['centralBudget', 'centralSubsystem'],
  general: ['generalGovernment'],
};

const FISCAL: Indicator[] = ['revenue', 'expenditure', 'deficit'];

export function inScope(o: Observation, scope: AnalyticalScope): boolean {
  return FISCAL.includes(o.indicator) || o.indicator.endsWith('PctGdp')
    ? SCOPES_OF[scope].includes(o.scope)
    : true;
}

export function gdpDenominator(data: Dataset, o: Observation): Observation | undefined {
  const gdps = data.observations.filter((g) => g.indicator === 'gdp' && g.year === o.year);
  const actual = gdps.find((g) => g.status === 'actual');
  if (actual) return actual;
  if (o.status === 'forecast' && o.publisher === 'ec') return gdps.find((g) => g.publisher === 'ec');
  return gdps.find((g) => g.status === 'forecast' && g.publisher === 'gov');
}

export function gniDenominator(data: Dataset, year: number): Observation | undefined {
  return data.observations.find((g) => g.indicator === 'gni' && g.year === year);
}

export interface Measured {
  obs: Observation;
  /** The value as plotted in the current mode. */
  value: number;
  unit: 'HUF' | 'pct';
  /** Set when forecast CPI or forecast GDP enters the figure. */
  estimated: boolean;
  deflation?: { factor: number; reference: PriceReference };
  denominator?: Observation;
}

/** Null means the figure cannot be stated in this mode. It is never a zero. */
export function measure(data: Dataset, o: Observation, v: Pick<ViewState, 'real' | 'ref' | 'relative'>): Measured | null {
  if (v.relative) {
    if (o.unit === 'pct') return { obs: o, value: o.value, unit: 'pct', estimated: o.status === 'forecast' };
    // GDP cannot be a share of itself, and nine months of spending is not a share of a year's GDP.
    if (o.indicator === 'gdp' || o.indicator === 'gni' || o.status === 'ytd') return null;
    const gdp = gdpDenominator(data, o);
    if (!gdp) return null;
    return {
      obs: o,
      value: (o.value / gdp.value) * 100,
      unit: 'pct',
      estimated: gdp.status === 'forecast',
      denominator: gdp,
    };
  }
  if (o.unit === 'pct') return null;
  if (!v.real) return { obs: o, value: o.value, unit: 'HUF', estimated: false };
  const d = deflator(data.cpi, o.year, v.ref);
  if (!d) return null;
  return {
    obs: o,
    value: o.value * d.factor,
    unit: 'HUF',
    estimated: d.estimated,
    deflation: { factor: d.factor, reference: v.ref },
  };
}

export interface PlanActualDiff {
  plan: Observation;
  actual: Observation;
  absolute: number;
  percent: number;
}

/** Only ever compares a plan and an outcome from the same scope and accounting method. */
export function planVersusActual(plan: Observation | undefined, actual: Observation | undefined): PlanActualDiff | null {
  if (!plan || !actual) return null;
  if (plan.scope !== actual.scope || plan.method !== actual.method || plan.indicator !== actual.indicator || plan.year !== actual.year) return null;
  const absolute = actual.value - plan.value;
  return { plan, actual, absolute, percent: plan.value !== 0 ? (absolute / Math.abs(plan.value)) * 100 : NaN };
}

export type Compatibility = 'ok' | 'scope' | 'method' | 'indicator';

export function compatibility(a: Observation, b: Observation): Compatibility {
  if (a.indicator !== b.indicator) return 'indicator';
  if (a.scope !== b.scope) return 'scope';
  if (a.method !== b.method) return 'method';
  return 'ok';
}

export interface Comparison {
  a: Measured;
  b: Measured;
  compatibility: Compatibility;
  absolute: number | null;
  percent: number | null;
}

export function compareMeasured(a: Measured, b: Measured): Comparison {
  const c = compatibility(a.obs, b.obs);
  if (c !== 'ok') return { a, b, compatibility: c, absolute: null, percent: null };
  const absolute = b.value - a.value;
  return { a, b, compatibility: c, absolute, percent: a.value !== 0 ? (absolute / Math.abs(a.value)) * 100 : null };
}

/** The best single figure a year offers for an indicator: outcome first, then plans. */
const STATUS_RANK: Status[] = ['actual', 'ytd', 'forecast', 'revised', 'draft', 'original', 'planned'];

export function bestObservation(data: Dataset, indicator: Indicator, year: number, scope: AnalyticalScope, wanted?: Status): Observation | undefined {
  const rows = data.observations.filter((o) => o.indicator === indicator && o.year === year && inScope(o, scope) && (!wanted || o.status === wanted));
  return rows.sort((a, b) => STATUS_RANK.indexOf(a.status) - STATUS_RANK.indexOf(b.status) || (a.publisher === 'gov' ? -1 : 1))[0];
}

export function observationsFor(data: Dataset, year: number, scope: AnalyticalScope, indicator: Indicator): Observation[] {
  return data.observations
    .filter((o) => o.year === year && o.indicator === indicator && inScope(o, scope))
    .sort((a, b) => STATUS_RANK.indexOf(a.status) - STATUS_RANK.indexOf(b.status));
}

/** The two Hungary Helps budget lines for one year, both of one status, or a line is left out rather than mixed. */
export function helpsFor(data: Dataset, year: number): { program?: Observation; agency?: Observation } {
  const program = bestObservation(data, 'hungaryHelpsProgram', year, 'central');
  const agency = bestObservation(data, 'hungaryHelpsAgency', year, 'central', program?.status);
  return { program, agency };
}

/** Published percentages (growth, inflation) stand as they are in every lens. */
export const asPublished = (o: Observation): Measured => ({ obs: o, value: o.value, unit: o.unit, estimated: o.status === 'forecast' });

type Mode = Pick<ViewState, 'real' | 'ref' | 'relative'>;

export interface LedgerRow {
  year: number;
  status: Status;
  publisher?: 'ec' | 'gov';
  revenue: Measured | null;
  expenditure: Measured | null;
  deficit: Measured | null;
}

/**
 * The one set of figures that stands for a year. All three come from the same status and publisher,
 * so the sum on screen is a sum in the source. A part-year figure can never stand for a year.
 */
const LEDGER_RANK: Status[] = ['actual', 'revised', 'draft', 'forecast', 'original', 'planned'];

export function ledgerFor(data: Dataset, year: number, scope: AnalyticalScope, mode: Mode): LedgerRow | null {
  const rows = data.observations.filter((o) => o.year === year && inScope(o, scope) && FISCAL.includes(o.indicator));
  for (const status of LEDGER_RANK) {
    for (const publisher of ['gov', 'ec', undefined] as const) {
      const pick = (i: Indicator) => rows.find((o) => o.indicator === i && o.status === status && o.publisher === publisher);
      const [r, e, d] = [pick('revenue'), pick('expenditure'), pick('deficit')];
      if (r && e && d) return { year, status, publisher, revenue: measure(data, r, mode), expenditure: measure(data, e, mode), deficit: measure(data, d, mode) };
    }
  }
  return null;
}

export function ledgerRows(data: Dataset, scope: AnalyticalScope, mode: Mode): LedgerRow[] {
  const rows: LedgerRow[] = [];
  for (let y = FIRST_YEAR; y <= LAST_YEAR; y++) {
    const row = ledgerFor(data, y, scope, mode);
    if (row) rows.push(row);
  }
  return rows;
}

export interface PlanYear {
  year: number;
  plan?: Observation;
  actual?: Observation;
  /** What stands in for the outcome before one exists: the amended act, then the draft bill. */
  outcome?: Observation;
  all: Observation[];
}

/** The deficit in the budget acts. Only the central figures are law, so this ignores the scope switch. */
export function planYears(data: Dataset): PlanYear[] {
  const years: PlanYear[] = [];
  for (let y = FIRST_YEAR; y <= LAST_YEAR; y++) {
    const all = observationsFor(data, y, 'central', 'deficit');
    const of = (s: Status) => all.find((o) => o.status === s);
    years.push({ year: y, plan: of('original'), actual: of('actual'), outcome: of('actual') ?? of('revised') ?? of('draft'), all });
  }
  return years;
}

/** How often the outcome exceeded the act as first adopted, counting only years that have both. */
export function overshoot(years: PlanYear[]): { over: number; total: number } {
  const diffs = years.map((y) => planVersusActual(y.plan, y.actual)).filter((d): d is PlanActualDiff => d !== null);
  return { over: diffs.filter((d) => d.absolute > 0).length, total: diffs.length };
}

const PCT_INDICATOR: Partial<Record<Indicator, Indicator>> = {
  revenue: 'revenuePctGdp',
  expenditure: 'expenditurePctGdp',
  deficit: 'deficitPctGdp',
};

export interface FigureRow {
  key: string;
  obs: Observation;
  cells: Record<'revenue' | 'expenditure' | 'deficit', { obs: Observation; measured: Measured | null } | null>;
}

/** Every figure a year has, one row per status and publisher. In the share lens a published share beats a calculated one. */
export function figureRows(data: Dataset, year: number, scope: AnalyticalScope, mode: Mode): FigureRow[] {
  const kinds = ['revenue', 'expenditure', 'deficit'] as const;
  const inYear = data.observations.filter((o) => o.year === year && inScope(o, scope) && kinds.some((k) => o.indicator === k || o.indicator === PCT_INDICATOR[k]));
  const keys = [...new Set(inYear.map((o) => `${o.status}:${o.publisher ?? ''}`))];
  const rows = keys.map((key): FigureRow => {
    const group = inYear.filter((o) => `${o.status}:${o.publisher ?? ''}` === key);
    const cell = (k: (typeof kinds)[number]) => {
      const forint = group.find((o) => o.indicator === k);
      const share = group.find((o) => o.indicator === PCT_INDICATOR[k]);
      const obs = mode.relative ? (share ?? forint) : forint;
      return obs ? { obs, measured: measure(data, obs, mode) } : null;
    };
    return { key, obs: group[0], cells: { revenue: cell('revenue'), expenditure: cell('expenditure'), deficit: cell('deficit') } };
  });
  return rows
    .filter((r) => kinds.some((k) => r.cells[k]))
    .sort((a, b) => STATUS_RANK.indexOf(a.obs.status) - STATUS_RANK.indexOf(b.obs.status) || (a.obs.publisher === 'gov' ? -1 : 1));
}

export interface TableFilter {
  indicator: Indicator | 'all';
  status: Status | 'all';
  from: number;
  to: number;
}

const TABLE_INDICATORS: Indicator[] = ['revenue', 'expenditure', 'deficit', 'gdp', 'oda', 'odaGe', 'odaBilateral', 'odaMultilateral', 'odaPctGni', 'hungaryHelpsProgram', 'hungaryHelpsAgency', 'revenuePctGdp', 'expenditurePctGdp', 'deficitPctGdp', 'realGdpGrowth', 'cpi', 'gni'];

export function tableRows(data: Dataset, v: Pick<ViewState, 'scope' | 'real' | 'ref'>, f: TableFilter): Measured[] {
  const rows: Measured[] = [];
  for (const o of data.observations) {
    if (o.year < f.from || o.year > f.to || !inScope(o, v.scope)) continue;
    if (f.indicator !== 'all' && o.indicator !== f.indicator) continue;
    if (f.status !== 'all' && o.status !== f.status) continue;
    const m = o.unit === 'pct' ? asPublished(o) : measure(data, o, { real: v.real, ref: v.ref, relative: false });
    if (m) rows.push(m);
  }
  return rows.sort(
    (a, b) =>
      a.obs.year - b.obs.year ||
      TABLE_INDICATORS.indexOf(a.obs.indicator) - TABLE_INDICATORS.indexOf(b.obs.indicator) ||
      STATUS_RANK.indexOf(a.obs.status) - STATUS_RANK.indexOf(b.obs.status),
  );
}
