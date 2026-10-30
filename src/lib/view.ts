import type { Indicator, Lang } from '../types/data';
import type { PriceReference } from './cpi';

export type MetricKey = 'revenue' | 'expenditure' | 'deficit' | 'gdp' | 'oda';
export const ALL_METRICS: MetricKey[] = ['revenue', 'expenditure', 'deficit', 'gdp', 'oda'];
export type PlanView = 'both' | 'actual' | 'plan';
export type AnalyticalScope = 'central' | 'general';
export type PresetKey = 'overview' | 'plan' | 'deficit' | 'gdp' | 'oda' | 'real';

export const FIRST_YEAR = 2000;
export const LAST_YEAR = 2027;

export interface ViewState {
  scope: AnalyticalScope;
  metrics: MetricKey[];
  view: PlanView;
  revised: boolean;
  forecasts: boolean;
  real: boolean;
  ref: PriceReference;
  relative: boolean;
  exact: boolean;
  from: number;
  to: number;
  year: number;
  compare: { indicator: Indicator; a: number; b: number };
}

export const DEFAULT_REF = 2025;

export const DEFAULT_VIEW: ViewState = {
  scope: 'central',
  metrics: ['revenue', 'expenditure', 'deficit'],
  view: 'actual',
  revised: false,
  forecasts: true,
  real: false,
  ref: DEFAULT_REF,
  relative: false,
  exact: false,
  from: FIRST_YEAR,
  to: LAST_YEAR,
  year: 2025,
  compare: { indicator: 'revenue', a: 2010, b: 2025 },
};

const RESET_FOR_PRESET: Partial<ViewState> = {
  scope: 'central',
  view: 'actual',
  revised: false,
  forecasts: true,
  real: false,
  relative: false,
  from: FIRST_YEAR,
  to: LAST_YEAR,
};

export const PRESETS: Record<PresetKey, Partial<ViewState>> = {
  overview: { ...RESET_FOR_PRESET, metrics: ['revenue', 'expenditure', 'deficit'] },
  plan: { ...RESET_FOR_PRESET, metrics: ['revenue', 'expenditure', 'deficit'], view: 'both' },
  deficit: { ...RESET_FOR_PRESET, metrics: ['deficit'], view: 'both' },
  gdp: { ...RESET_FOR_PRESET, scope: 'general', metrics: ['gdp', 'revenue', 'expenditure'] },
  oda: { ...RESET_FOR_PRESET, metrics: ['oda'] },
  real: { ...RESET_FOR_PRESET, metrics: ['revenue', 'expenditure', 'deficit'], real: true },
};

export function activePreset(v: ViewState): PresetKey | null {
  for (const key of Object.keys(PRESETS) as PresetKey[]) {
    const p = PRESETS[key];
    const same = (Object.keys(p) as (keyof ViewState)[]).every((k) => {
      if (k === 'metrics') return [...v.metrics].sort().join() === [...(p.metrics as MetricKey[])].sort().join();
      return v[k] === p[k];
    });
    if (same) return key;
  }
  return null;
}

const SHORT: Record<MetricKey, string> = { revenue: 'rev', expenditure: 'exp', deficit: 'def', gdp: 'gdp', oda: 'oda' };
const FROM_SHORT = Object.fromEntries(Object.entries(SHORT).map(([k, s]) => [s, k])) as Record<string, MetricKey>;

const clampYear = (n: number) => Math.min(LAST_YEAR, Math.max(FIRST_YEAR, n));

function parseYear(value: string | null, fallback: number): number {
  const n = Number(value);
  return value !== null && Number.isInteger(n) ? clampYear(n) : fallback;
}

const COMPARABLE: Indicator[] = ['revenue', 'expenditure', 'deficit', 'gdp', 'oda', 'odaGe'];

/** Reads only what the URL states; anything malformed falls back to the default. */
export function parseQuery(search: string, base: ViewState = DEFAULT_VIEW): ViewState {
  const q = new URLSearchParams(search);
  const metrics = q.get('m')?.split(',').map((s) => FROM_SHORT[s]).filter(Boolean);
  const ref = q.get('ref');
  let from = parseYear(q.get('from'), base.from);
  let to = parseYear(q.get('to'), base.to);
  if (from > to) [from, to] = [to, from];
  const ci = q.get('ci') as Indicator | null;
  return {
    scope: q.get('s') === 'g' ? 'general' : q.get('s') === 'c' ? 'central' : base.scope,
    metrics: metrics?.length ? [...new Set(metrics)] : base.metrics,
    view: q.get('v') === 'both' || q.get('v') === 'plan' || q.get('v') === 'actual' ? (q.get('v') as PlanView) : base.view,
    revised: q.has('rev') ? q.get('rev') === '1' : base.revised,
    forecasts: q.has('f') ? q.get('f') === '1' : base.forecasts,
    real: q.has('real') ? q.get('real') === '1' : base.real,
    ref: ref === 'latest' ? 'latest' : ref ? parseYear(ref, base.ref === 'latest' ? DEFAULT_REF : base.ref) : base.ref,
    relative: q.has('pct') ? q.get('pct') === '1' : base.relative,
    exact: q.has('x') ? q.get('x') === '1' : base.exact,
    from,
    to,
    year: parseYear(q.get('y'), base.year),
    compare: {
      indicator: ci && COMPARABLE.includes(ci) ? ci : base.compare.indicator,
      a: parseYear(q.get('ca'), base.compare.a),
      b: parseYear(q.get('cb'), base.compare.b),
    },
  };
}

/** Writes only what differs from the default, so links stay short. */
export function toQuery(v: ViewState): string {
  const d = DEFAULT_VIEW;
  const q = new URLSearchParams();
  if (v.scope !== d.scope) q.set('s', v.scope === 'general' ? 'g' : 'c');
  if ([...v.metrics].sort().join() !== [...d.metrics].sort().join()) q.set('m', v.metrics.map((m) => SHORT[m]).join(','));
  if (v.view !== d.view) q.set('v', v.view);
  if (v.revised !== d.revised) q.set('rev', v.revised ? '1' : '0');
  if (v.forecasts !== d.forecasts) q.set('f', v.forecasts ? '1' : '0');
  if (v.real !== d.real) q.set('real', v.real ? '1' : '0');
  if (v.ref !== d.ref) q.set('ref', String(v.ref));
  if (v.relative !== d.relative) q.set('pct', v.relative ? '1' : '0');
  if (v.exact !== d.exact) q.set('x', v.exact ? '1' : '0');
  if (v.from !== d.from) q.set('from', String(v.from));
  if (v.to !== d.to) q.set('to', String(v.to));
  if (v.year !== d.year) q.set('y', String(v.year));
  if (v.compare.indicator !== d.compare.indicator) q.set('ci', v.compare.indicator);
  if (v.compare.a !== d.compare.a) q.set('ca', String(v.compare.a));
  if (v.compare.b !== d.compare.b) q.set('cb', String(v.compare.b));
  const s = q.toString();
  return s ? `?${s}` : '';
}

const LANG_RE = /\/(hu|en)\/?$/;

export function langFromPath(pathname: string): Lang | null {
  const m = LANG_RE.exec(pathname);
  return m ? (m[1] as Lang) : null;
}

/** /budzse/hu/ → /budzse/en/ and /budzse/ → /budzse/en/ */
export function pathForLang(pathname: string, lang: Lang): string {
  const dir = pathname.replace(LANG_RE, '/');
  return `${dir.endsWith('/') ? dir : `${dir}/`}${lang}/`;
}

/** An explicit /hu or /en wins, then the saved preference, then Hungarian. */
export function resolveLang(pathname: string, saved: string | null): Lang {
  return langFromPath(pathname) ?? (saved === 'en' || saved === 'hu' ? saved : 'hu');
}
