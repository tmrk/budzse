import { describe, expect, it } from 'vitest';
import { chainCpi, deflator } from '../../src/lib/cpi';
import { dataset } from './helpers';

describe('chainCpi', () => {
  it('chains previous-year indices into levels from the base year', () => {
    const levels = chainCpi([
      { year: 2000, index: 109.8 },
      { year: 2001, index: 110 },
      { year: 2002, index: 90 },
    ]);
    expect(levels.get(2000)).toBe(100);
    expect(levels.get(2001)).toBeCloseTo(110, 10);
    expect(levels.get(2002)).toBeCloseTo(99, 10);
  });

  it('ignores the index of the base year itself', () => {
    expect(chainCpi([{ year: 2000, index: 150 }]).get(2000)).toBe(100);
  });
});

describe('published CPI', () => {
  const { cpi } = dataset;

  it('reproduces KSH indices when dividing consecutive levels', () => {
    for (const r of cpi.annual.slice(1)) {
      const prev = cpi.annual.find((x) => x.year === r.year - 1)!;
      expect((r.level / prev.level) * 100).toBeCloseTo(r.index, 8);
    }
  });

  it('uses the published 2022 and 2023 indices (KSH: 114.5, 117.6)', () => {
    expect(cpi.annual.find((r) => r.year === 2022)!.index).toBe(114.5);
    expect(cpi.annual.find((r) => r.year === 2023)!.index).toBe(117.6);
  });

  it('stays close to the European Commission CPI over 2000-2025 (independent check)', () => {
    const l = (y: number) => cpi.annual.find((r) => r.year === y)!.level;
    expect(l(2025) / l(2000)).toBeCloseTo(152.77687 / 46.04788, 0);
    expect(Math.abs(l(2025) / l(2000) / (152.77687 / 46.04788) - 1)).toBeLessThan(0.01);
  });
});

describe('deflator', () => {
  const { cpi } = dataset;

  it('is 1 for a value already in reference prices', () => {
    expect(deflator(cpi, 2025, 2025)).toEqual({ factor: 1, estimated: false });
  });

  it('inverts when reference and origin swap', () => {
    const a = deflator(cpi, 2010, 2020)!.factor;
    const b = deflator(cpi, 2020, 2010)!.factor;
    expect(a * b).toBeCloseTo(1, 10);
  });

  it('marks forecast-year adjustments as estimated, never as actual', () => {
    expect(deflator(cpi, 2027, 2025)!.estimated).toBe(true);
    expect(deflator(cpi, 2026, 2020)!.estimated).toBe(true);
    expect(deflator(cpi, 2024, 2025)!.estimated).toBe(false);
  });

  it('returns null without CPI rather than assuming zero inflation', () => {
    expect(deflator(cpi, 1999, 2025)).toBeNull();
    expect(deflator(cpi, 2030, 2025)).toBeNull();
  });

  it('places the latest month relative to the 2025 annual average', () => {
    const d = deflator(cpi, 2025, 'latest')!;
    expect(d.factor).toBeCloseTo(cpi.latestMonth.factorVsBaseYear, 10);
    expect(d.factor).toBeGreaterThan(1);
    expect(d.factor).toBeLessThan(1.05);
    expect(d.estimated).toBe(false);
  });
});
