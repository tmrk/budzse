import type { CpiYear, Dataset } from '../types/data';

/** A price reference: a year's annual average, or the latest published monthly level. */
export type PriceReference = number | 'latest';

export interface Deflation {
  factor: number;
  /** True when forecast CPI enters the factor, on either the origin or reference side. */
  estimated: boolean;
}

/**
 * Chains published annual indices (previous year = 100) into levels, 2000 = 100.
 * Years before the base are not needed: the series starts at the base year.
 */
export function chainCpi(rows: { year: number; index: number }[], baseYear = 2000): Map<number, number> {
  const sorted = [...rows].sort((a, b) => a.year - b.year);
  const levels = new Map<number, number>();
  let level = 100;
  for (const { year, index } of sorted) {
    if (year < baseYear) continue;
    if (year > baseYear) level = (level * index) / 100;
    levels.set(year, level);
  }
  return levels;
}

export function cpiYear(cpi: Dataset['cpi'], year: number): CpiYear | undefined {
  return cpi.annual.find((r) => r.year === year);
}

export function lastActualCpiYear(cpi: Dataset['cpi']): number {
  return Math.max(...cpi.annual.filter((r) => r.status === 'actual').map((r) => r.year));
}

/**
 * Adjusted value = nominal × CPI(reference) / CPI(origin).
 * Returns null when either side has no CPI: future prices are never assumed.
 */
export function deflator(cpi: Dataset['cpi'], origin: number, reference: PriceReference): Deflation | null {
  const from = cpiYear(cpi, origin);
  if (!from) return null;
  if (reference === 'latest') {
    const base = cpiYear(cpi, cpi.latestMonth.baseYear);
    if (!base) return null;
    return {
      factor: (base.level * cpi.latestMonth.factorVsBaseYear) / from.level,
      estimated: from.status === 'forecast',
    };
  }
  const to = cpiYear(cpi, reference);
  if (!to) return null;
  return { factor: to.level / from.level, estimated: from.status === 'forecast' || to.status === 'forecast' };
}
