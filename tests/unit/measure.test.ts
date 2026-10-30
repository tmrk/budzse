import { describe, expect, it } from 'vitest';
import { buildPanels, bestObservation, compareMeasured, compatibility, measure, planVersusActual, statusVisible, tableRows } from '../../src/lib/measure';
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

describe('statusVisible', () => {
  const on = { view: 'actual' as const, revised: false, forecasts: true };

  it('hides plans in the actual view but keeps future revised and draft figures', () => {
    expect(statusVisible(obs('central.deficit.2020.original'), on, 2025)).toBe(false);
    expect(statusVisible(obs('central.deficit.2026.revised'), on, 2025)).toBe(true);
    expect(statusVisible(obs('central.deficit.2027.draft'), on, 2025)).toBe(true);
  });

  it('hides outcomes in the plan view', () => {
    expect(statusVisible(obs('central.deficit.2020.actual'), { ...on, view: 'plan' }, 2025)).toBe(false);
    expect(statusVisible(obs('central.deficit.2020.original'), { ...on, view: 'plan' }, 2025)).toBe(true);
  });

  it('hides all projections when forecasts are switched off', () => {
    const off = { ...on, forecasts: false };
    expect(statusVisible(obs('central.deficit.2027.draft'), off, 2025)).toBe(false);
    expect(statusVisible(obs('central.deficit.2026.ytd'), off, 2025)).toBe(false);
    expect(statusVisible(obs('general.deficit.2027.forecast.ec'), off, 2025)).toBe(false);
  });
});

describe('buildPanels', () => {
  it('gives ODA its own panel so it never shares a GDP-sized axis', () => {
    const panels = buildPanels(dataset, v({ metrics: ['gdp', 'oda', 'deficit'] }));
    expect(panels.map((p) => p.id)).toEqual(['level', 'deficit', 'oda']);
    expect(panels[0].series.some((s) => s.indicator.startsWith('oda'))).toBe(false);
  });

  it('splits central lines at the 2010 scope change', () => {
    const [level] = buildPanels(dataset, v({ metrics: ['revenue'], forecasts: false }));
    const actual = level.series.filter((s) => s.status === 'actual');
    expect(actual).toHaveLength(2);
    expect(actual[0].points.at(-1)!.year).toBe(2009);
    expect(actual[1].points[0].year).toBe(2010);
  });

  it('leaves the ODA gap as a gap', () => {
    const [oda] = buildPanels(dataset, v({ metrics: ['oda'] }));
    const years = oda.series.flatMap((s) => s.points.map((p) => p.year));
    expect(Math.min(...years)).toBe(2003);
  });

  it('never plots a zero', () => {
    for (const relative of [false, true]) {
      const panels = buildPanels(dataset, v({ metrics: ['revenue', 'expenditure', 'deficit', 'gdp', 'oda'], view: 'both', relative }));
      for (const p of panels) for (const s of p.series) for (const pt of s.points) expect(pt.measured.value).not.toBe(0);
    }
  });

  it('prefers a published share over a calculated one for the same year and publisher', () => {
    const panels = buildPanels(dataset, v({ scope: 'general', metrics: ['deficit'], relative: true }));
    const gov2026 = panels[0].series.filter((s) => s.publisher === 'gov').flatMap((s) => s.points).filter((p) => p.year === 2026);
    expect(gov2026).toHaveLength(1);
    expect(gov2026[0].measured.value).toBe(7.5);
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
    const rows = tableRows(dataset, v({ scope: 'general', metrics: ['deficit'] }), { indicator: 'selected', status: 'all' });
    expect(rows.length).toBeGreaterThan(20);
    expect(rows.every((r) => r.obs.scope === 'generalGovernment')).toBe(true);
  });

  it('filters table rows by period and status', () => {
    const rows = tableRows(dataset, v({ from: 2010, to: 2012, metrics: ['revenue'] }), { indicator: 'selected', status: 'actual' });
    expect(rows.map((r) => r.obs.year)).toEqual([2010, 2011, 2012]);
  });
});

describe('part-year figures', () => {
  it('are not shown as a share of annual GDP', () => {
    expect(measure(dataset, obs('central.deficit.2026.ytd'), v({ relative: true }))).toBeNull();
  });
});
