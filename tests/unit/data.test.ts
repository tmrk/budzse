import { describe, expect, it } from 'vitest';
import { en } from '../../src/i18n/en';
import { hu } from '../../src/i18n/hu';
import { dataset, obs } from './helpers';

// Figures read directly from the primary documents, independently of the extraction scripts.
describe('verified historical figures', () => {
  it('2000 original budget, 1999. évi CXXV. törvény 1. §', () => {
    expect(obs('central.revenue.2000.original').value).toBe(3_392_043_900_000);
    expect(obs('central.expenditure.2000.original').value).toBe(3_788_275_600_000);
    expect(obs('central.deficit.2000.original').value).toBe(396_231_700_000);
  });

  it('2000 amended main sums differ from the promulgated act', () => {
    expect(obs('central.expenditure.2000.revised').value).toBe(3_902_606_300_000);
  });

  it('the last amending act of a year wins, even one adopted at the very end of it', () => {
    expect(obs('central.deficit.2010.revised').source).toBe('act-a1000143');
    expect(obs('central.revenue.2010.revised').value).toBe(12_764_719_300_000);
    expect(obs('central.expenditure.2010.revised').value).toBe(13_629_030_400_000);
    expect(obs('central.deficit.2012.revised').source).toBe('act-a1200187');
    expect(obs('central.deficit.2012.revised').value).toBe(671_860_700_000);
    expect(obs('central.deficit.2013.revised').source).toBe('act-a1300206');
    expect(obs('central.deficit.2013.revised').value).toBe(1_125_184_400_000);
  });

  it('2000 final accounts, 2001. évi LXXV. törvény 1. §', () => {
    expect(obs('central.revenue.2000.actual').value).toBe(3_681_943_900_000);
    expect(obs('central.deficit.2000.actual').value).toBe(367_790_300_000);
  });

  it('2020 budget and outcome show the pandemic gap', () => {
    expect(obs('central.deficit.2020.original').value).toBe(367_010_100_000);
    expect(obs('central.deficit.2020.actual').value).toBe(5_311_318_000_000);
  });

  it('the Fiscal Council opinion of 29 October 2026, read from its tables', () => {
    expect(obs('central.revenue.2027.draft').value).toBe(42_483_800_000_000);
    expect(obs('central.expenditure.2027.draft').value).toBe(47_586_500_000_000);
    expect(obs('central.deficit.2027.draft').value).toBe(5_102_700_000_000);
    expect(obs('general.deficit.2027.forecast.gov').value).toBe(4_790_000_000_000);
  });

  it('government forint forecasts are the published shares times the published GDP', () => {
    expect(obs('general.revenue.2026.forecast.gov').value).toBe(40_336_411_000_000);
    expect(obs('general.expenditure.2026.forecast.gov').value).toBe(47_259_136_000_000);
    expect(obs('general.revenue.2027.forecast.gov').value).toBe(41_431_584_000_000);
    expect(obs('general.expenditure.2027.forecast.gov').value).toBe(46_219_668_000_000);
  });

  it('2026 original act and October 2026 amendment', () => {
    expect(obs('central.deficit.2026.original').value).toBe(4_218_534_600_000);
    expect(obs('central.deficit.2026.revised').value).toBe(7_110_123_100_000);
    expect(obs('central.expenditure.2026.revised').value).toBe(49_025_644_900_000);
  });

  it('2025 Treasury final-accounts balance', () => {
    expect(obs('central.revenue.2025.actual').value).toBe(39_338_844_700_000);
    expect(obs('central.expenditure.2025.actual').value).toBe(44_885_243_500_000);
  });

  it('Eurostat 2025: revenue, expenditure and sign-reversed balance', () => {
    expect(obs('general.revenue.2025.actual').value).toBe(37_447_425_000_000);
    expect(obs('general.expenditure.2025.actual').value).toBe(41_592_419_000_000);
    expect(obs('general.deficit.2025.actual').value).toBe(4_144_994_200_000);
  });

  it('GDP is in trillions of forints, not billions', () => {
    expect(obs('gdp.2025.actual').value).toBe(87_307_647_000_000);
    expect(obs('gdp.2000.actual').value).toBe(13_340_291_000_000);
  });

  it('OECD net ODA in national currency', () => {
    expect(obs('oda.2003.actual').value).toBe(4_761_830_000);
    expect(obs('oda.2024.actual').value).toBe(74_668_000_000);
    expect(obs('odaGe.2024.actual').value).toBe(69_357_040_000);
  });

  it('Hungary Helps lines from the final-accounts acts', () => {
    expect(obs('hungaryHelpsProgram.2021.actual').value).toBe(11_176_000_000);
    expect(obs('hungaryHelpsProgram.2022.actual').value).toBe(9_652_000_000);
    expect(obs('hungaryHelpsAgency.2023.actual').value).toBe(1_840_900_000);
    expect(obs('hungaryHelpsAgency.2024.actual').value).toBe(547_900_000);
    expect(obs('hungaryHelpsProgram.2026.original').value).toBe(2_149_900_000);
  });

  it('leaves a missing Hungary Helps agency line empty, never zero', () => {
    expect(dataset.observations.filter((o) => o.indicator === 'hungaryHelpsAgency' && o.year === 2021)).toEqual([]);
    expect(dataset.observations.filter((o) => o.indicator.startsWith('hungaryHelps') && o.year < 2019)).toEqual([]);
  });

  it('keeps the ODA reporting gap of 2000-2002 empty', () => {
    expect(dataset.observations.filter((o) => o.indicator === 'oda' && o.year < 2003)).toEqual([]);
  });

  it('takes preliminary 2025 ODA in forints from the OECD itself', () => {
    const o = obs('odaGe.2025.actual');
    expect(o.derivation).toBeUndefined();
    expect(o.value).toBe(107_121_420_000);
    expect(o.revision).toBe('preliminary');
    expect(obs('oda.2025.actual').value).toBe(114_286_160_000);
    expect(obs('oda.2025.actual').revision).toBe('preliminary');
  });
});

describe('every blank has a documented reason', () => {
  const inRange = (spec: string, year: number) => spec.split(',').some((part) => {
    const [a, b] = part.trim().split('–').map(Number);
    return year >= a && year <= (b ?? a);
  });
  const gapCovers = (id: string, year: number) => inRange(dataset.gaps.find((g) => g.id === id)!.years, year);

  it('names every year without an amended act', () => {
    for (let y = 2000; y <= 2025; y++) {
      if (!dataset.observations.some((o) => o.id === `central.deficit.${y}.revised`)) expect(gapCovers('central-revised-gaps', y), String(y)).toBe(true);
    }
  });

  it('names every year without grant-equivalent ODA', () => {
    for (let y = 2000; y <= 2025; y++) {
      if (!dataset.observations.some((o) => o.id === `odaGe.${y}.actual`)) expect(gapCovers('oda-ge-early', y), String(y)).toBe(true);
    }
  });
});

describe('references for the prose', () => {
  it('the methodology cites only registered sources, the same in both languages', () => {
    hu.methodology.sections.forEach((section, i) => {
      expect(section.sources.length, section.id).toBeGreaterThan(0);
      expect(en.methodology.sections[i].sources).toEqual(section.sources);
      for (const id of section.sources) expect(dataset.sources[id], id).toBeDefined();
    });
  });

  it('states both published ODA shares of Hungary Helps donations', () => {
    expect((3_181_796 / 3_689_128) * 100).toBeCloseTo(86.25, 2);
    expect((5_023_796 / 5_328_240) * 100).toBeCloseTo(94.29, 2);
    for (const text of [hu.methodology.sections, en.methodology.sections].map((s) => s.find((x) => x.id === 'helps')!.body.join(' '))) {
      expect(text).toMatch(/86%/);
      expect(text).toMatch(/94%/);
    }
  });
});

describe('classification rules', () => {
  it('has no actual figure after 2025', () => {
    expect(dataset.observations.filter((o) => o.status === 'actual' && o.year > 2025)).toEqual([]);
  });

  it('labels 2027 central figures as a draft, not as a budget', () => {
    const rows = dataset.observations.filter((o) => o.year === 2027 && o.scope === 'centralSubsystem');
    expect(rows.map((o) => o.status)).toEqual(['draft', 'draft', 'draft']);
    expect(rows.every((o) => o.source === 'kt-2027' && !o.secondary)).toBe(true);
  });

  it('labels part-year execution with its period', () => {
    const ytd = dataset.observations.filter((o) => o.status === 'ytd');
    expect(ytd).toHaveLength(3);
    expect(ytd.every((o) => o.year === 2026 && o.period === '2026-01/2026-09')).toBe(true);
  });

  it('switches central scope exactly in 2010', () => {
    expect(obs('central.revenue.2009.actual').scope).toBe('centralBudget');
    expect(obs('central.revenue.2010.actual').scope).toBe('centralSubsystem');
  });
});

describe('revision state', () => {
  it('marks recent ESA years as preliminary, as the EDP report does', () => {
    expect(obs('general.deficit.2023.actual').revision).toBe('final');
    expect(obs('general.deficit.2024.actual').revision).toBe('preliminary');
    expect(obs('general.deficit.2025.actual').revision).toBe('preliminary');
  });

  it('marks the 2025 Treasury balance as preliminary until an act confirms it', () => {
    expect(obs('central.deficit.2025.actual').revision).toBe('preliminary');
    expect(obs('central.deficit.2024.actual').revision).toBe('final');
  });
});

describe('provenance', () => {
  it('gives every observation a registered source, locator and original value', () => {
    for (const o of dataset.observations) {
      expect(dataset.sources[o.source], o.id).toBeTruthy();
      expect(o.locator, o.id).toBeTruthy();
      expect(o.original.value, o.id).toBeTruthy();
      expect(dataset.sources[o.source].url, o.id).toMatch(/^https:\/\//);
    }
  });

  it('never stores zero or a non-finite value', () => {
    for (const o of dataset.observations) {
      expect(o.value, o.id).not.toBe(0);
      expect(Number.isFinite(o.value), o.id).toBe(true);
    }
  });

  it('keeps forint values as whole numbers within safe integer range', () => {
    for (const o of dataset.observations.filter((x) => x.unit === 'HUF')) {
      expect(Number.isSafeInteger(o.value), o.id).toBe(true);
    }
  });

  it('reconciles deficit = expenditure - revenue for every act', () => {
    for (let y = 2000; y <= 2025; y++) {
      const r = obs(`central.revenue.${y}.actual`).value;
      const e = obs(`central.expenditure.${y}.actual`).value;
      expect(e - r, String(y)).toBe(obs(`central.deficit.${y}.actual`).value);
    }
  });
});
