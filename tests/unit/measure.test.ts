import { describe, expect, it } from 'vitest';
import { asPublished, bestObservation, compareMeasured, compatibility, figureRows, helpsFor, helpsRatio, ledgerFor, ledgerRows, measure, overshoot, planVersusActual, planYears, tableRows } from '../../src/lib/measure';
import { DEFAULT_VIEW, type ViewState } from '../../src/lib/view';
import { dataset, obs } from './helpers';

const v = (patch: Partial<ViewState>): ViewState => ({ ...DEFAULT_VIEW, ...patch });

describe('measure', () => {
  it('returns nominal values unchanged', () => {
    const o = obs('central.revenue.2010.actual');
    expect(measure(dataset, o, v({}))?.value).toBe(o.value);
  });

  it('applies Adjusted = nominal × CPI(ref) / CPI(year)', () => {
    const o = obs('general.revenue.2010.actual');
    const l = (y: number) => dataset.cpi.annual.find((r) => r.year === y)!.level;
    const m = measure(dataset, o, v({ real: true, ref: 2025 }))!;
    expect(m.value).toBeCloseTo((o.value * l(2025)) / l(2010), 3);
    expect(m.value).toBeGreaterThan(o.value);
    expect(m.estimated).toBe(false);
  });

  it('leaves a 2025 value unchanged at 2025 prices', () => {
    const o = obs('gdp.2025.actual');
    expect(measure(dataset, o, v({ real: true, ref: 2025 }))!.value).toBe(o.value);
  });

  it('marks 2027 adjusted values as estimates', () => {
    expect(measure(dataset, obs('general.deficit.2027.forecast.ec'), v({ real: true }))!.estimated).toBe(true);
  });

  it('computes shares of GDP and does not deflate them', () => {
    const o = obs('general.deficit.2025.actual');
    const m = measure(dataset, o, v({ relative: true, real: true }))!;
    expect(m.unit).toBe('pct');
    expect(m.value).toBeCloseTo((4144994.2 / 87307647) * 100, 8);
    expect(m.value).toBeCloseTo(4.7, 1);
  });

  it('returns null for GDP as a share of itself, not zero', () => {
    expect(measure(dataset, obs('gdp.2020.actual'), v({ relative: true }))).toBeNull();
  });

  it('keeps published percentages out of forint views', () => {
    expect(measure(dataset, obs('odaPctGni.2020.actual'), v({}))).toBeNull();
  });
});

describe('planVersusActual', () => {
  it('compares within one scope', () => {
    const d = planVersusActual(obs('central.deficit.2020.original'), obs('central.deficit.2020.actual'))!;
    expect(d.absolute).toBe(5_311_318_000_000 - 367_010_100_000);
    expect(d.percent).toBeCloseTo(1347.2, 1);
  });

  it('refuses to compare a central plan with an ESA outcome', () => {
    expect(planVersusActual(obs('central.deficit.2020.original'), obs('general.deficit.2020.actual'))).toBeNull();
  });

  it('refuses when either side is missing', () => {
    expect(planVersusActual(undefined, obs('central.deficit.2020.actual'))).toBeNull();
  });
});

describe('compatibility', () => {
  it('flags the 2009/2010 central break', () => {
    expect(compatibility(obs('central.revenue.2009.actual'), obs('central.revenue.2010.actual'))).toBe('scope');
  });

  it('allows comparison across years within a scope', () => {
    expect(compatibility(obs('central.revenue.2010.actual'), obs('central.revenue.2025.actual'))).toBe('ok');
    expect(compatibility(obs('general.revenue.2000.actual'), obs('general.revenue.2025.actual'))).toBe('ok');
  });

  it('flags net ODA against the grant-equivalent method', () => {
    const a = { ...obs('oda.2023.actual'), indicator: 'odaGe' as const };
    expect(compatibility(a, obs('odaGe.2024.actual'))).toBe('method');
  });

  it('gives no difference for incompatible figures', () => {
    const m = (id: string) => measure(dataset, obs(id), v({}))!;
    const c = compareMeasured(m('central.revenue.2009.actual'), m('central.revenue.2010.actual'));
    expect(c.absolute).toBeNull();
    expect(c.percent).toBeNull();
  });

  it('gives absolute and percentage differences for compatible figures', () => {
    const m = (id: string) => measure(dataset, obs(id), v({}))!;
    const c = compareMeasured(m('general.revenue.2000.actual'), m('general.revenue.2025.actual'));
    expect(c.absolute).toBe(37_447_425_000_000 - 5_903_305_000_000);
    expect(c.percent).toBeCloseTo(534.35, 1);
  });
});

describe('the ledger', () => {
  const nominal = { real: false, ref: 2025, relative: false } as const;

  it('covers every year in both scopes', () => {
    for (const scope of ['central', 'general'] as const) expect(ledgerRows(dataset, scope, nominal).map((r) => r.year)).toHaveLength(28);
  });

  it('prefers the outcome', () => {
    const row = ledgerFor(dataset, 2020, 'central', nominal)!;
    expect(row.status).toBe('actual');
    expect(row.deficit!.value).toBe(5_311_318_000_000);
  });

  it('never lets a part-year figure stand for a year', () => {
    const row = ledgerFor(dataset, 2026, 'central', nominal)!;
    expect(row.status).toBe('revised');
    expect(row.deficit!.value).toBe(7_110_123_100_000);
  });

  it('marks 2027 central figures as the draft they are', () => {
    expect(ledgerFor(dataset, 2027, 'central', nominal)!.status).toBe('draft');
  });

  it('takes all three figures from one publisher, so the sum on screen is a sum in the source', () => {
    for (const scope of ['central', 'general'] as const) {
      for (const r of ledgerRows(dataset, scope, nominal)) {
        const [a, b, c] = [r.revenue!.obs, r.expenditure!.obs, r.deficit!.obs];
        expect([a.status, a.publisher]).toEqual([b.status, b.publisher]);
        expect([a.status, a.publisher]).toEqual([c.status, c.publisher]);
        expect(a.scope).toBe(c.scope);
      }
    }
    // The government publishes a 2026 deficit but no forint revenue, so its figure cannot join the EC's.
    expect(ledgerFor(dataset, 2026, 'general', nominal)!.publisher).toBe('ec');
  });

  it('adds up to within rounding in the source', () => {
    for (const scope of ['central', 'general'] as const) {
      for (const r of ledgerRows(dataset, scope, nominal)) {
        const gap = r.expenditure!.value - r.revenue!.value;
        expect(Math.abs(gap - r.deficit!.value) / r.expenditure!.value).toBeLessThan(0.01);
      }
    }
  });

  it('never plots a zero', () => {
    for (const relative of [false, true]) {
      for (const r of ledgerRows(dataset, 'general', { ...nominal, relative })) {
        for (const x of [r.revenue, r.expenditure, r.deficit]) expect(x?.value).not.toBe(0);
      }
    }
  });
});

describe('plan and reality', () => {
  const years = planYears(dataset);

  it('reads only the central budget, whatever the scope switch says', () => {
    for (const y of years) for (const o of y.all) expect(['centralBudget', 'centralSubsystem']).toContain(o.scope);
  });

  it('counts only completed years that have both a plan and an outcome', () => {
    const { over, total } = overshoot(years);
    expect(total).toBe(26);
    expect(over).toBe(20);
  });

  it('uses the amended act and then the draft where no outcome exists', () => {
    expect(years.find((y) => y.year === 2026)!.outcome!.status).toBe('revised');
    expect(years.find((y) => y.year === 2027)!.outcome!.status).toBe('draft');
    expect(years.find((y) => y.year === 2027)!.plan).toBeUndefined();
  });
});

describe('every figure of a year', () => {
  const mode = { real: false, ref: 2025, relative: false } as const;

  it('lists the act, the amendment and the part-year figure for 2026', () => {
    const rows = figureRows(dataset, 2026, 'central', mode);
    expect(rows.map((r) => r.obs.status).sort()).toEqual(['original', 'revised', 'ytd']);
  });

  it('gives a part-year figure no share of GDP', () => {
    const ytd = figureRows(dataset, 2026, 'central', { ...mode, relative: true }).find((r) => r.obs.status === 'ytd')!;
    expect(ytd.cells.deficit!.measured).toBeNull();
  });

  it('prefers a published share over a calculated one', () => {
    const gov = figureRows(dataset, 2026, 'general', { ...mode, relative: true }).find((r) => r.obs.publisher === 'gov')!;
    expect(gov.cells.deficit!.measured!.value).toBe(7.5);
    expect(gov.cells.revenue!.measured!.value).toBe(43.7);
  });

  it('leaves a figure missing rather than filling it', () => {
    const gov = figureRows(dataset, 2026, 'general', mode).find((r) => r.obs.publisher === 'gov')!;
    expect(gov.cells.revenue).toBeNull();
    expect(gov.cells.deficit!.measured!.value).toBe(obs('general.deficit.2026.forecast.gov').value);
  });
});

describe('published percentages', () => {
  it('stand as published and flag forecasts', () => {
    expect(asPublished(obs('odaPctGni.2020.actual')).estimated).toBe(false);
    expect(asPublished(obs('odaPctGni.2020.actual')).value).toBe(obs('odaPctGni.2020.actual').value);
  });

  it('change method in 2018, so they must never be drawn as one line', () => {
    expect(obs('odaPctGni.2017.actual').method).toBe('dacNet');
    expect(obs('odaPctGni.2018.actual').method).toBe('dacGrantEquivalent');
  });
});

describe('scope switching', () => {
  it('gives different figures for the same year in the two scopes', () => {
    const c = bestObservation(dataset, 'deficit', 2020, 'central')!;
    const g = bestObservation(dataset, 'deficit', 2020, 'general')!;
    expect(c.scope).toBe('centralSubsystem');
    expect(g.scope).toBe('generalGovernment');
    expect(c.value).not.toBe(g.value);
  });

  it('keeps table rows within the chosen scope', () => {
    const rows = tableRows(dataset, v({ scope: 'general' }), { indicator: 'deficit', status: 'all', from: 2000, to: 2027 });
    expect(rows.length).toBeGreaterThan(20);
    expect(rows.every((r) => r.obs.scope === 'generalGovernment')).toBe(true);
  });

  it('filters table rows by period and status', () => {
    const rows = tableRows(dataset, v({}), { indicator: 'revenue', status: 'actual', from: 2010, to: 2012 });
    expect(rows.map((r) => r.obs.year)).toEqual([2010, 2011, 2012]);
  });
});

describe('part-year figures', () => {
  it('are not shown as a share of annual GDP', () => {
    expect(measure(dataset, obs('central.deficit.2026.ytd'), v({ relative: true }))).toBeNull();
  });
});

describe('helpsRatio', () => {
  it('sets both lines against net ODA for a closed year', () => {
    expect(helpsRatio(dataset, 2023)).toBeCloseTo(((6_983_800_000 + 1_840_900_000) / 90_622_130_000) * 100, 6);
  });

  it('uses the programme alone when the agency has no line', () => {
    expect(helpsRatio(dataset, 2021)).toBeCloseTo((11_176_000_000 / 131_891_610_000) * 100, 6);
  });

  it('never sets a plan against a reported figure', () => {
    expect(helpsRatio(dataset, 2025)).toBeNull();
    expect(helpsRatio(dataset, 2018)).toBeNull();
  });
});

describe('helpsFor', () => {
  it('prefers the outcome and reads both lines at one status', () => {
    const { program, agency } = helpsFor(dataset, 2023);
    expect(program?.id).toBe('hungaryHelpsProgram.2023.actual');
    expect(agency?.id).toBe('hungaryHelpsAgency.2023.actual');
  });

  it('falls back to the original act when no outcome exists yet', () => {
    const { program, agency } = helpsFor(dataset, 2025);
    expect(program?.status).toBe('original');
    expect(agency?.status).toBe('original');
  });

  it('leaves out a line the act does not have', () => {
    const { program, agency } = helpsFor(dataset, 2021);
    expect(program?.status).toBe('actual');
    expect(agency).toBeUndefined();
  });

  it('has nothing before the name appears in a budget', () => {
    expect(helpsFor(dataset, 2018)).toEqual({ program: undefined, agency: undefined });
  });
});
