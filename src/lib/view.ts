import type { Lang } from '../types/data';
import type { PriceReference } from './cpi';

export type AnalyticalScope = 'central' | 'general';
/** The three ways to read a figure. They exclude one another, so they are one control. */
export type Lens = 'forint' | 'real' | 'share';

export const FIRST_YEAR = 2000;
export const LAST_YEAR = 2027;
export const DEFAULT_REF = 2025;

export interface ViewState {
  scope: AnalyticalScope;
  real: boolean;
  ref: PriceReference;
  relative: boolean;
  year: number;
  /** The year the ledger compares with. Null means the year before. */
  versus: number | null;
}

export const DEFAULT_VIEW: ViewState = {
  scope: 'general',
  real: false,
  ref: DEFAULT_REF,
  relative: false,
  year: 2025,
  versus: null,
};

export const lensOf = (v: Pick<ViewState, 'real' | 'relative'>): Lens => (v.relative ? 'share' : v.real ? 'real' : 'forint');
export const lensPatch = (lens: Lens): Pick<ViewState, 'real' | 'relative'> => ({ real: lens === 'real', relative: lens === 'share' });

const clampYear = (n: number) => Math.min(LAST_YEAR, Math.max(FIRST_YEAR, n));

function parseYear(value: string | null, fallback: number): number {
  const n = Number(value);
  return value !== null && value !== '' && Number.isInteger(n) ? clampYear(n) : fallback;
}

/** Reads only what the URL states; anything malformed falls back to the default. */
export function parseQuery(search: string, base: ViewState = DEFAULT_VIEW): ViewState {
  const q = new URLSearchParams(search);
  const ref = q.get('ref');
  const relative = q.has('pct') ? q.get('pct') === '1' : base.relative;
  const real = q.has('real') ? q.get('real') === '1' : base.real;
  return {
    scope: q.get('s') === 'g' ? 'general' : q.get('s') === 'c' ? 'central' : base.scope,
    real: real && !relative,
    ref: ref === 'latest' ? 'latest' : ref ? parseYear(ref, base.ref === 'latest' ? DEFAULT_REF : base.ref) : base.ref,
    relative,
    year: parseYear(q.get('y'), base.year),
    versus: q.has('vs') ? parseYear(q.get('vs'), base.versus ?? FIRST_YEAR) : base.versus,
  };
}

/** Writes only what differs from the default, so links stay short. */
export function toQuery(v: ViewState): string {
  const d = DEFAULT_VIEW;
  const q = new URLSearchParams();
  if (v.scope !== d.scope) q.set('s', v.scope === 'general' ? 'g' : 'c');
  if (v.real !== d.real) q.set('real', v.real ? '1' : '0');
  if (v.ref !== d.ref) q.set('ref', String(v.ref));
  if (v.relative !== d.relative) q.set('pct', v.relative ? '1' : '0');
  if (v.year !== d.year) q.set('y', String(v.year));
  if (v.versus !== d.versus && v.versus !== null) q.set('vs', String(v.versus));
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
