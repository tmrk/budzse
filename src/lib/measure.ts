import type { Dataset, FiscalScope, Indicator, Observation, Status } from '../types/data';
import { deflator, type PriceReference } from './cpi';
import type { AnalyticalScope, MetricKey, ViewState } from './view';

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

export function lastActualYear(data: Dataset, indicator: Indicator, scope: AnalyticalScope): number {
  const years = data.observations.filter((o) => o.indicator === indicator && o.status === 'actual' && inScope(o, scope)).map((o) => o.year);
  return years.length ? Math.max(...years) : 0;
}

/** Which statuses the planned/actual switch lets through. */
export function statusVisible(o: Observation, v: Pick<ViewState, 'view' | 'revised' | 'forecasts'>, lastActual: number): boolean {
  const future = o.year > lastActual;
  const planned: Status[] = ['original', 'planned'];
  switch (o.status) {
    case 'actual':
      return v.view !== 'plan';
    case 'ytd':
      return v.view !== 'plan' && v.forecasts;
    case 'forecast':
      return v.forecasts;
    case 'draft':
      return v.forecasts;
    case 'revised':
      return v.revised || (future && v.forecasts);
    default:
      return planned.includes(o.status) && v.view !== 'actual';
  }
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

export interface ChartPoint {
  year: number;
  measured: Measured;
}

export interface ChartSeries {
  key: string;
  metric: MetricKey | 'odaGe' | 'odaBilateral' | 'odaMultilateral';
  indicator: Indicator;
  status: Status;
  publisher?: 'ec' | 'gov';
  points: ChartPoint[];
}

export interface ChartPanel {
  id: 'level' | 'deficit' | 'oda';
  metrics: MetricKey[];
  unit: 'HUF' | 'pct';
  series: ChartSeries[];
}

const PANEL_OF: Record<MetricKey, ChartPanel['id']> = {
  revenue: 'level',
  expenditure: 'level',
  gdp: 'level',
  deficit: 'deficit',
  oda: 'oda',
};

/** Consecutive years only: a gap in the data must read as a gap, and so must a change of scope. */
function splitRuns(points: ChartPoint[]): ChartPoint[][] {
  const runs: ChartPoint[][] = [];
  for (const p of [...points].sort((a, b) => a.year - b.year)) {
    const run = runs[runs.length - 1];
    const prev = run?.[run.length - 1];
    if (prev && prev.year === p.year - 1 && prev.measured.obs.scope === p.measured.obs.scope) run.push(p);
    else runs.push([p]);
  }
  return runs;
}

function seriesFor(data: Dataset, indicator: Indicator, metric: ChartSeries['metric'], v: ViewState): ChartSeries[] {
  const lastActual = lastActualYear(data, indicator, v.scope);
  const groups = new Map<string, ChartPoint[]>();
  const meta = new Map<string, Pick<ChartSeries, 'status' | 'publisher'>>();
  for (const o of data.observations) {
    if (o.indicator !== indicator || !inScope(o, v.scope) || !statusVisible(o, v, lastActual)) continue;
    const m = measure(data, o, v);
    if (!m) continue;
    const k = `${o.status}:${o.publisher ?? ''}`;
    if (!groups.has(k)) {
      groups.set(k, []);
      meta.set(k, { status: o.status, publisher: o.publisher });
    }
    groups.get(k)!.push({ year: o.year, measured: m });
  }
  const out: ChartSeries[] = [];
  for (const [k, pts] of groups) {
    splitRuns(pts).forEach((points, i) => {
      out.push({ key: `${indicator}:${k}:${i}`, metric, indicator, ...meta.get(k)!, points });
    });
  }
  return out;
}

const PCT_INDICATOR: Partial<Record<Indicator, Indicator>> = {
  revenue: 'revenuePctGdp',
  expenditure: 'expenditurePctGdp',
  deficit: 'deficitPctGdp',
};

export function buildPanels(data: Dataset, v: ViewState): ChartPanel[] {
  const panels = new Map<ChartPanel['id'], ChartPanel>();
  const add = (id: ChartPanel['id'], metric: MetricKey, series: ChartSeries[]) => {
    if (!panels.has(id)) panels.set(id, { id, metrics: [], unit: v.relative ? 'pct' : 'HUF', series: [] });
    const p = panels.get(id)!;
    p.metrics.push(metric);
    p.series.push(...series);
  };
  for (const metric of v.metrics) {
    if (metric === 'oda') {
      if (v.relative) {
        add('oda', 'oda', seriesFor(data, 'odaPctGni', 'oda', v));
      } else {
        add('oda', 'oda', [...seriesFor(data, 'oda', 'oda', v), ...seriesFor(data, 'odaGe', 'odaGe', v)]);
      }
      continue;
    }
    if (metric === 'gdp' && v.relative) continue;
    const series = seriesFor(data, metric, metric, v);
    const pct = v.relative ? PCT_INDICATOR[metric] : undefined;
    if (pct) {
      // A published share beats one we would calculate for the same year and publisher.
      const reported = seriesFor(data, pct, metric, v);
      const taken = new Set(reported.flatMap((s) => s.points.map((p) => `${s.status}:${s.publisher ?? ''}:${p.year}`)));
      const kept = series
        .map((s) => ({ ...s, points: s.points.filter((p) => !taken.has(`${s.status}:${s.publisher ?? ''}:${p.year}`)) }))
        .filter((s) => s.points.length);
      add(PANEL_OF[metric], metric, [...kept, ...reported]);
      continue;
    }
    add(PANEL_OF[metric], metric, series);
  }
  const order: ChartPanel['id'][] = ['level', 'deficit', 'oda'];
  return order.map((id) => panels.get(id)).filter((p): p is ChartPanel => Boolean(p));
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

export interface TableFilter {
  indicator: Indicator | 'selected';
  status: Status | 'all';
}

const TABLE_INDICATORS: Indicator[] = ['revenue', 'expenditure', 'deficit', 'gdp', 'oda', 'odaGe', 'odaBilateral', 'odaMultilateral', 'odaPctGni', 'revenuePctGdp', 'expenditurePctGdp', 'deficitPctGdp', 'realGdpGrowth', 'cpi', 'gni'];

export function tableRows(data: Dataset, v: ViewState, f: TableFilter): Measured[] {
  const selected = new Set<Indicator>(v.metrics.flatMap((m) => (m === 'oda' ? (['oda', 'odaGe'] as Indicator[]) : [m])));
  const rows: Measured[] = [];
  for (const o of data.observations) {
    if (o.year < v.from || o.year > v.to || !inScope(o, v.scope)) continue;
    if (f.indicator === 'selected' ? !selected.has(o.indicator) : o.indicator !== f.indicator) continue;
    if (f.status !== 'all' && o.status !== f.status) continue;
    const m = o.unit === 'pct' ? { obs: o, value: o.value, unit: 'pct' as const, estimated: o.status === 'forecast' } : measure(data, o, { real: v.real, ref: v.ref, relative: false });
    if (m) rows.push(m);
  }
  return rows.sort(
    (a, b) =>
      a.obs.year - b.obs.year ||
      TABLE_INDICATORS.indexOf(a.obs.indicator) - TABLE_INDICATORS.indexOf(b.obs.indicator) ||
      STATUS_RANK.indexOf(a.obs.status) - STATUS_RANK.indexOf(b.obs.status),
  );
}
