import type { Indicator, Status } from '../types/data';

export type ChartTheme = {
  series: Record<'revenue' | 'expenditure' | 'gdp' | 'oda' | 'deficit', string>;
  ink: string;
  muted: string;
  grid: string;
  surface: string;
  accent: string;
};

export const SERIES_VAR: Record<string, keyof ChartTheme['series']> = {
  revenue: 'revenue',
  revenuePctGdp: 'revenue',
  expenditure: 'expenditure',
  expenditurePctGdp: 'expenditure',
  gdp: 'gdp',
  deficit: 'deficit',
  deficitPctGdp: 'deficit',
  oda: 'oda',
  odaGe: 'oda',
  odaPctGni: 'oda',
  odaBilateral: 'oda',
  odaMultilateral: 'oda',
};

export function readTheme(el: Element): ChartTheme {
  const css = getComputedStyle(el);
  const v = (name: string) => css.getPropertyValue(name).trim();
  return {
    series: {
      revenue: v('--c-revenue'),
      expenditure: v('--c-expenditure'),
      gdp: v('--c-gdp'),
      oda: v('--c-oda'),
      deficit: v('--c-deficit'),
    },
    ink: v('--ink'),
    muted: v('--ink-muted'),
    grid: v('--rule'),
    surface: v('--stage'),
    accent: v('--accent'),
  };
}

/** Line pattern carries the data's status, so it survives without colour. */
export const DASH: Record<Status, number[] | 'solid'> = {
  actual: 'solid',
  original: [7, 5],
  planned: [7, 5],
  revised: [2, 4],
  draft: [3, 3],
  forecast: [9, 3, 2, 3],
  ytd: 'solid',
};

/** Marker shape carries the indicator. */
export const SYMBOL: Partial<Record<Indicator, string>> = {
  revenue: 'circle',
  revenuePctGdp: 'circle',
  expenditure: 'diamond',
  expenditurePctGdp: 'diamond',
  gdp: 'rect',
  deficit: 'triangle',
  deficitPctGdp: 'triangle',
  oda: 'circle',
  odaGe: 'diamond',
  odaPctGni: 'circle',
};

export const HOLLOW: Status[] = ['original', 'planned', 'revised', 'draft', 'forecast', 'ytd'];
