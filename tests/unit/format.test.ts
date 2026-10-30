import { describe, expect, it } from 'vitest';
import { axisScale, formatExactHuf, formatHuf, formatPct, formatSignedHuf, huYearAdjective } from '../../src/lib/format';

const nb = (s: string) => s.replace(/[  ]/g, ' ');

describe('large-number naming', () => {
  it('uses milliárd for 10^9 in Hungarian and billion in English', () => {
    expect(nb(formatHuf(5_000_000_000, 'hu'))).toBe('5,00 milliárd Ft');
    expect(nb(formatHuf(5_000_000_000, 'en'))).toBe('HUF 5.00 billion');
  });

  it('uses billió for 10^12 in Hungarian and trillion in English', () => {
    expect(nb(formatHuf(39_338_844_700_000, 'hu'))).toBe('39,3 billió Ft');
    expect(nb(formatHuf(39_338_844_700_000, 'en'))).toBe('HUF 39.3 trillion');
  });

  it('never calls 10^12 a "billion" in English or 10^9 a "billió" in Hungarian', () => {
    expect(formatHuf(2e12, 'en')).not.toContain('billion');
    expect(formatHuf(2e9, 'hu')).not.toContain('billió');
  });

  it('writes out every digit for exact values', () => {
    expect(nb(formatExactHuf(3_392_043_900_000, 'hu'))).toBe('3 392 043 900 000 Ft');
    expect(formatExactHuf(3_392_043_900_000, 'en')).toBe('HUF 3,392,043,900,000');
  });

  it('picks the scale of the largest axis value', () => {
    expect(axisScale(5e13, 'hu')).toEqual({ divisor: 1e12, name: 'billió' });
    expect(axisScale(5e11, 'en')).toEqual({ divisor: 1e9, name: 'billion' });
  });
});

describe('signs and percentages', () => {
  it('uses a true minus sign', () => {
    expect(nb(formatSignedHuf(-1e9, 'hu'))).toBe('−1,00 milliárd Ft');
    expect(nb(formatSignedHuf(1e9, 'en'))).toBe('+HUF 1.00 billion');
  });

  it('formats decimals by locale', () => {
    expect(formatPct(4.75, 'hu', 2)).toBe('4,75%');
    expect(formatPct(4.75, 'en', 2)).toBe('4.75%');
  });
});

describe('huYearAdjective', () => {
  it('follows vowel harmony', () => {
    expect(huYearAdjective(2000)).toBe('2000-es');
    expect(huYearAdjective(2010)).toBe('2010-es');
    expect(huYearAdjective(2020)).toBe('2020-as');
    expect(huYearAdjective(2021)).toBe('2021-es');
    expect(huYearAdjective(2023)).toBe('2023-as');
    expect(huYearAdjective(2025)).toBe('2025-ös');
    expect(huYearAdjective(2026)).toBe('2026-os');
    expect(huYearAdjective(2018)).toBe('2018-as');
  });
});
