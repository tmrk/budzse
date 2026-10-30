import { describe, expect, it } from 'vitest';
import { linePath, makeScales, niceAxis, ribbonPath, runsOf, yearAt } from '../../src/charts/geometry';
import { axisLabel } from '../../src/components/figures';

describe('the shared x scale', () => {
  it('puts each year in the same place on every chart of a width', () => {
    const a = makeScales(280, 100, [0, 10]);
    const b = makeScales(280, 300, [-5, 50]);
    expect(a.x(2010)).toBe(b.x(2010));
    expect(a.x(2000)).toBe(5);
  });

  it('turns a pixel back into its year and stays inside the range', () => {
    expect(yearAt(0, 280)).toBe(2000);
    expect(yearAt(279, 280)).toBe(2027);
    expect(yearAt(105, 280)).toBe(2010);
    expect(yearAt(-30, 280)).toBe(2000);
    expect(yearAt(900, 280)).toBe(2027);
  });
});

describe('niceAxis', () => {
  it('keeps every tick inside the domain', () => {
    for (const [lo, hi] of [[0, 45.9e12], [40, 51.2], [-6.7, 7.2], [-0.2, 17.6], [0, 0.28]]) {
      const { domain, ticks } = niceAxis(lo, hi, 3);
      expect(domain[0]).toBe(lo);
      expect(domain[1]).toBeGreaterThan(hi);
      expect(ticks.length).toBeGreaterThan(0);
      for (const t of ticks) {
        expect(t).toBeGreaterThanOrEqual(lo);
        expect(t).toBeLessThanOrEqual(domain[1]);
      }
    }
  });
});

describe('axisLabel', () => {
  it('never rounds a tick into a different number', () => {
    const fmt = axisLabel([0, 2.5e12, 5e12, 7.5e12], 'hu', 'HUF');
    expect(fmt(2.5e12)).toBe('2,5 billió');
    expect(fmt(5e12)).toBe('5,0 billió');
    expect(fmt(0)).toBe('0');
  });

  it('names the scale in each language', () => {
    expect(axisLabel([20e12, 40e12], 'hu', 'HUF')(20e12)).toBe('20 billió');
    expect(axisLabel([20e12, 40e12], 'en', 'HUF')(20e12)).toBe('20 trillion');
    expect(axisLabel([50e9, 100e9], 'hu', 'HUF')(50e9)).toBe('50 milliárd');
    expect(axisLabel([50e9, 100e9], 'en', 'HUF')(50e9)).toBe('50 billion');
  });

  it('shows small shares with their decimals', () => {
    expect(axisLabel([0.1, 0.2], 'en', 'pct')(0.1)).toBe('0.1%');
  });
});

describe('paths and runs', () => {
  it('closes a ribbon by coming back along the lower line', () => {
    expect(linePath([[0, 1], [2, 3]])).toBe('M0.00 1.00L2.00 3.00');
    expect(ribbonPath([[0, 1], [2, 1]], [[0, 5], [2, 5]])).toBe('M0.00 1.00L2.00 1.00L2.00 5.00L0.00 5.00Z');
  });

  it('breaks a run wherever the items do not join', () => {
    expect(runsOf([1, 2, 3, 7, 8], (a, b) => a + 1 === b)).toEqual([[1, 2, 3], [7, 8]]);
    expect(runsOf([] as number[], () => true)).toEqual([]);
  });
});
