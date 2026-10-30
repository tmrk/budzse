import { useId, useMemo } from 'react';
import { isPhone, linePath, makeScales, niceAxis, runsOf, type Point, YEARS } from '../charts/geometry';
import { asPublished, bestObservation, measure, overshoot, planVersusActual, planYears, type Measured } from '../lib/measure';
import { formatPct, formatSigned } from '../lib/format';
import type { Indicator, Method } from '../types/data';
import { useApp } from './context';
import Timeline, { Bars, Hatch, useChartWidth, useTween } from './Timeline';
import { axisLabel, FigureRow, gapFor, priceBasis, signedDifference, statusLabel } from './figures';

function Section({ id, title, intro, lead, basis, readout, notes, children }: { id: string; title: string; intro: string; lead?: string; basis?: string; readout: React.ReactNode; notes?: React.ReactNode; children: React.ReactNode }) {
  const { year } = useApp();
  return (
    <section className="chapter" aria-labelledby={`${id}-title`} data-testid={id}>
      <div className="chapter-side">
        <h2 id={`${id}-title`}>{title}</h2>
        <p className="lede">{intro}</p>
        {lead && <p className="lead">{lead}</p>}
        <div className="figures">
          <p className="figures-year">{year}{basis && <span className="figures-basis">{basis}</span>}</p>
          <dl>{readout}</dl>
        </div>
      </div>
      <div className="chapter-chart">
        {children}
        {notes}
      </div>
    </section>
  );
}

export function PlanSection() {
  const { data, view, year, m, lang } = useApp();
  const [hostRef, width] = useChartWidth();
  const hatch = useId();
  const years = useMemo(() => planYears(data), [data]);
  const stats = useMemo(() => overshoot(years), [years]);
  const mode = { real: view.real, ref: view.ref, relative: view.relative };
  const of = (o?: Parameters<typeof measure>[1]) => (o ? measure(data, o, mode) : null);
  const bars = years.flatMap((y) => {
    const value = of(y.outcome)?.value;
    return value === undefined ? [] : [{ year: y.year, value, settled: Boolean(y.actual) }];
  });
  const plans = years.flatMap((y) => {
    const value = of(y.plan)?.value;
    return value === undefined ? [] : [{ year: y.year, value }];
  });
  const { domain, ticks } = niceAxis(0, Math.max(...bars.map((b) => b.value), ...plans.map((p) => p.value), 0.1), 3);
  const s = makeScales(width, isPhone() ? 200 : 280, domain, { top: 10, bottom: 24 });
  const easedPlans = useTween(plans.map((p) => s.y(p.value)));
  const tick = Math.min(s.band + 1, s.band * 0.92 + 2);
  const shown = years.find((y) => y.year === year);
  const diff = shown ? planVersusActual(shown.plan, shown.actual) : null;
  const planM = of(shown?.plan);
  const actualM = of(shown?.actual);
  const unit = view.relative ? 'pct' : 'HUF';
  const firstOpen = years.find((y) => y.year >= 2010 && !y.actual)?.year;

  return (
    <Section
      id="plan"
      title={m.plan.title}
      intro={m.plan.intro}
      lead={m.plan.overshoot(stats.over, stats.total)}
      basis={view.real ? priceBasis(data, view.ref, m, lang) : view.relative ? m.hero.unitShare : undefined}
      readout={
        <>
          {shown?.all.map((o) => (
            <FigureRow key={o.id} label={statusLabel(o, m)} measured={of(o)} obs={o} testId={`plan-${o.status}`} estimated={m.chart.estimated} note={o.status === 'ytd' && view.relative ? m.figures.partYear : undefined} swatch={o.status === 'original' ? <i className="mark mark-plan" aria-hidden="true" /> : o.status === 'actual' ? <i className="mark mark-gap" aria-hidden="true" /> : undefined} />
          ))}
          {diff && planM && actualM && (
            <div className="figure figure-total">
              <dt>{m.plan.difference}</dt>
              <dd>
                <strong>{signedDifference(actualM.value - planM.value, actualM.unit, lang, m.hero.points)}</strong>
                <span className="delta">{formatSigned(formatPct(Math.abs(diff.percent), lang), diff.percent < 0)}</span>
              </dd>
            </div>
          )}
        </>
      }
    >
      <Timeline scales={s} hostRef={hostRef} ticks={ticks} tickLabel={axisLabel(ticks, lang, unit)} label={m.plan.chart} axis zeroLine breakLabel={m.chart.scopeBreakLabel} futureFrom={firstOpen} futureLabel={m.chart.projected} testId="plan-chart">
        <defs><Hatch id={hatch} pitch={4} /></defs>
        <Bars scales={s} values={bars} hatch={hatch} tone="out" year={year} />
        {plans.map((p, i) => (
          <line key={p.year} className="plan-tick" x1={s.x(p.year) - tick / 2} x2={s.x(p.year) + tick / 2} y1={easedPlans[i]} y2={easedPlans[i]} />
        ))}
      </Timeline>
      <ul className="key">
        <li><i className="mark mark-plan" aria-hidden="true" />{m.plan.planMark}</li>
        <li><i className="mark mark-gap" aria-hidden="true" />{m.plan.outcomeMark}</li>
      </ul>
    </Section>
  );
}

function strip(data: ReturnType<typeof useApp>['data'], indicator: Indicator, read: (o: NonNullable<ReturnType<typeof bestObservation>>) => Measured | null) {
  return YEARS.flatMap((y) => {
    const o = bestObservation(data, indicator, y, 'general');
    const shown = o ? read(o) : null;
    return shown ? [{ year: y, value: shown.value, settled: o!.status === 'actual' }] : [];
  });
}

function EconomyStrip({ values, title, label, height, axis, unit }: { values: { year: number; value: number; settled: boolean }[]; title: string; label: string; height: number; axis?: boolean; unit: 'HUF' | 'pct' }) {
  const { lang, year } = useApp();
  const [hostRef, width] = useChartWidth();
  const nums = values.map((v) => v.value);
  const { domain, ticks } = niceAxis(Math.min(0, ...nums), Math.max(...nums), 2);
  const s = makeScales(width, height, domain, { top: 26, bottom: axis ? 24 : 0 });
  const shown = ticks.filter((t) => t !== 0);
  return (
    <Timeline scales={s} hostRef={hostRef} ticks={shown} tickLabel={axisLabel(shown, lang, unit)} label={label} axis={axis} title={title}>
      <line className="zero" x1={0} x2={s.width} y1={s.y(0)} y2={s.y(0)} />
      <Bars scales={s} values={values} hatch="" tone="ink" year={year} />
    </Timeline>
  );
}

export function EconomySection() {
  const { data, view, year, m, lang } = useApp();
  const forintMode = { real: view.real, ref: view.ref, relative: false };
  const gdp = useMemo(() => strip(data, 'gdp', (o) => measure(data, o, forintMode)), [data, view.real, view.ref]);
  const growth = useMemo(() => strip(data, 'realGdpGrowth', asPublished), [data]);
  const inflation = useMemo(() => strip(data, 'cpi', asPublished), [data]);
  const gdpObs = bestObservation(data, 'gdp', year, 'general');
  const growthObs = bestObservation(data, 'realGdpGrowth', year, 'general');
  const cpiObs = bestObservation(data, 'cpi', year, 'general');
  const signed = (x: Measured | null) => (x ? { ...x } : null);
  return (
    <Section
      id="economy"
      title={m.economy.title}
      intro={m.economy.intro}
      basis={view.real ? priceBasis(data, view.ref, m, lang) : undefined}
      readout={
        <>
          <FigureRow label={m.economy.gdp} measured={gdpObs ? measure(data, gdpObs, forintMode) : null} obs={gdpObs} testId="economy-gdp" estimated={m.chart.estimated} note={gdpObs && gdpObs.status !== 'actual' ? statusLabel(gdpObs, m) : undefined} />
          <FigureRow label={m.economy.growth} measured={growthObs ? signed(asPublished(growthObs)) : null} obs={growthObs} testId="economy-growth" estimated={m.chart.estimated} />
          <FigureRow label={m.economy.inflation} measured={cpiObs ? signed(asPublished(cpiObs)) : null} obs={cpiObs} testId="economy-cpi" estimated={m.chart.estimated} />
        </>
      }
      notes={
        <>
          {view.real && <p className="fine" data-testid="gdp-real-note">{m.chart.gdpReal}</p>}
          {view.relative && <p className="fine">{m.economy.alwaysForint}</p>}
        </>
      }
    >
      <EconomyStrip values={gdp} title={m.economy.gdp} label={m.economy.chartGdp} height={120} unit="HUF" />
      <EconomyStrip values={growth} title={m.economy.growth} label={m.economy.chartGrowth} height={110} unit="pct" />
      <EconomyStrip values={inflation} title={m.economy.inflation} label={m.economy.chartInflation} height={134} axis unit="pct" />
    </Section>
  );
}

const METHOD_LABEL: Record<Method, 'net' | 'grant' | null> = { dacNet: 'net', dacGrantEquivalent: 'grant', cash: null, esa2010: null, nationalAccounts: null, cpiAnnualAverage: null };

/** Sits above a line's highest point, reading back along it, where nothing else is drawn. */
function SeriesLabel({ points, text }: { points: Point[]; text: string }) {
  const [x, y] = points.reduce((top, p) => (p[1] < top[1] ? p : top), points[0]);
  return <text className="line-label" x={x} y={y - 10} textAnchor="end">{text}</text>;
}

export function AidSection() {
  const { data, view, year, m, lang } = useApp();
  const [hostRef, width] = useChartWidth();
  const phone = isPhone();
  const mode = { real: view.real, ref: view.ref, relative: false };
  type Pt = { year: number; value: number; method: Method };
  const series = (indicator: Indicator, read: (o: Parameters<typeof measure>[1]) => Measured | null): Pt[] =>
    data.observations
      .filter((o) => o.indicator === indicator)
      .sort((a, b) => a.year - b.year)
      .flatMap((o) => {
        const x = read(o);
        return x ? [{ year: o.year, value: x.value, method: o.method }] : [];
      });
  const net = view.relative ? [] : series('oda', (o) => measure(data, o, mode));
  const grant = view.relative ? [] : series('odaGe', (o) => measure(data, o, mode));
  const shares = view.relative ? series('odaPctGni', asPublished) : [];
  // The share of GNI changes method in 2018. Two methods are two lines, never one.
  const runs = view.relative ? runsOf(shares, (a, b) => a.method === b.method && a.year + 1 === b.year) : [net, grant].filter((r) => r.length);
  const all = runs.flat();
  const { domain, ticks } = niceAxis(0, Math.max(...all.map((p) => p.value)), 3);
  const s = makeScales(width, phone ? 200 : 260, domain, { top: 10, bottom: 24 });
  const eased = useTween(all.map((p) => s.y(p.value)));
  let cursor = 0;
  const drawn = runs.map((run) => {
    const points = run.map((p): Point => [s.x(p.year), eased[cursor++] ?? s.y(p.value)]);
    return { run, points, kind: METHOD_LABEL[run[0].method] };
  });
  const netObs = data.observations.find((o) => o.indicator === 'oda' && o.year === year);
  const grantObs = data.observations.find((o) => o.indicator === 'odaGe' && o.year === year);
  const shareObs = data.observations.find((o) => o.indicator === 'odaPctGni' && o.year === year);
  const gap = gapFor(data, 'oda', year);
  const noNet = !netObs && gap?.reason[lang];
  const labelFor = (kind: 'net' | 'grant' | null) => (view.relative ? (kind === 'net' ? m.aid.shareNet : m.aid.shareGrant) : kind === 'net' ? m.aid.net : m.aid.grant);
  const chosen = drawn.flatMap((d) => d.run.flatMap((p, i) => (p.year === year ? [{ x: d.points[i][0], y: d.points[i][1], kind: d.kind }] : [])));

  return (
    <Section
      id="aid"
      title={m.aid.title}
      intro={m.aid.intro}
      basis={view.real ? priceBasis(data, view.ref, m, lang) : undefined}
      readout={
        view.relative ? (
          <FigureRow label={shareObs?.method === 'dacGrantEquivalent' ? m.aid.shareGrant : m.aid.shareNet} measured={shareObs ? asPublished(shareObs) : null} obs={shareObs} testId="aid-share" estimated={m.chart.estimated} note={!shareObs ? gap?.reason[lang] : undefined} />
        ) : (
          <>
            <FigureRow label={m.aid.net} measured={netObs ? measure(data, netObs, mode) : null} obs={netObs} testId="aid-net" estimated={m.chart.estimated} note={noNet || undefined} swatch={<i className="mark mark-in" aria-hidden="true" />} />
            <FigureRow label={m.aid.grant} measured={grantObs ? measure(data, grantObs, mode) : null} obs={grantObs} testId="aid-grant" estimated={m.chart.estimated} swatch={<i className="mark mark-ink" aria-hidden="true" />} />
          </>
        )
      }
      notes={<p className="fine">{m.aid.separate}</p>}
    >
      <Timeline scales={s} hostRef={hostRef} ticks={ticks} tickLabel={axisLabel(ticks, lang, view.relative ? 'pct' : 'HUF')} label={m.aid.chart} axis zeroLine testId="aid-chart">
        {drawn.map((d) => (
          <g key={`${d.kind}${d.run[0].year}`}>
            {d.points.length > 1 ? <path className={d.kind === 'net' ? 'line line-in' : 'line line-ink'} d={linePath(d.points)} /> : <circle className={d.kind === 'net' ? 'tick-dot line-in' : 'tick-dot line-ink'} cx={d.points[0][0]} cy={d.points[0][1]} r={3} />}
            {d.points.length > 4 && !phone && <SeriesLabel points={d.kind === 'net' ? d.points.slice(0, Math.ceil(d.points.length / 2)) : d.points} text={labelFor(d.kind)} />}
          </g>
        ))}
        {chosen.map((c) => (
          <circle key={c.kind} className={c.kind === 'net' ? 'dot dot-in' : 'dot dot-ink'} cx={c.x} cy={c.y} r={5} />
        ))}
      </Timeline>
    </Section>
  );
}
