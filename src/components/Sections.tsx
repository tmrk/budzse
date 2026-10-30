import { useId, useMemo } from 'react';
import { isPhone, linePath, makeScales, niceAxis, runsOf, type Point, YEARS } from '../charts/geometry';
import { statusName } from '../i18n';
import { asPublished, bestObservation, helpsFor, measure, overshoot, planVersusActual, planYears, type Measured } from '../lib/measure';
import type { Indicator, Method, Observation } from '../types/data';
import { useApp } from './context';
import Timeline, { Bars, Hatch, useChartWidth, useTween } from './Timeline';
import { axisLabel, figure, gapFor, priceBasis, Readout, signedDifference, SourceButton } from './figures';

/** A title and a sentence that never change, beside a chart that does. */
function Section({ id, title, lead, intro, basis, children }: { id: string; title: string; lead?: string; intro: string; basis?: string; children: React.ReactNode }) {
  return (
    <section className="chapter" aria-labelledby={`${id}-title`} data-testid={id}>
      <div className="chapter-side">
        <h2 id={`${id}-title`}>{title}</h2>
        {lead && <p className="lead">{lead}</p>}
        <p className="lede">{intro}</p>
        {basis && <p className="fine basis">{basis}</p>}
      </div>
      <div className="chapter-chart">{children}</div>
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
  const of = (o?: Observation) => (o ? measure(data, o, mode) : null);
  const bars = years.flatMap((y) => {
    const value = of(y.outcome)?.value;
    return value === undefined ? [] : [{ year: y.year, value, settled: Boolean(y.actual) }];
  });
  const plans = years.flatMap((y) => {
    const value = of(y.plan)?.value;
    return value === undefined ? [] : [{ year: y.year, value }];
  });
  const { domain, ticks } = niceAxis(0, Math.max(...bars.map((b) => b.value), ...plans.map((p) => p.value), 0.1), 3);
  const s = makeScales(width, isPhone() ? 220 : 300, domain, { top: 10, bottom: 26 });
  const easedPlans = useTween(plans.map((p) => s.y(p.value)));
  const tick = Math.min(s.band + 1, s.band * 0.92 + 2);
  const shown = years.find((y) => y.year === year);
  const planM = of(shown?.plan);
  const outcomeM = of(shown?.outcome);
  const diff = shown ? planVersusActual(shown.plan, shown.actual) : null;
  const actualM = of(shown?.actual);
  const outcomeLabel = shown?.outcome?.status === 'revised' ? m.plan.outcome.revised : shown?.outcome?.status === 'draft' ? m.plan.outcome.draft : m.plan.outcome.actual;

  return (
    <Section id="plan" title={m.plan.title} lead={m.plan.lead(stats.over, stats.total)} intro={m.plan.intro} basis={view.real ? priceBasis(data, view.ref, m, lang) : view.relative ? m.hero.unitShare : undefined}>
      <Readout
        items={[
          { key: 'plan', label: m.plan.planMark, swatch: <i className="mark mark-plan" aria-hidden="true" />, measured: planM, obs: shown?.plan, testId: 'plan-plan', reason: gapFor(data, 'deficit', year)?.reason[lang] },
          { key: 'outcome', label: outcomeLabel, swatch: <i className="mark mark-gap" aria-hidden="true" />, measured: outcomeM, obs: shown?.outcome, testId: 'plan-outcome' },
          { key: 'diff', label: m.plan.difference, text: diff && planM && actualM ? signedDifference(actualM.value - planM.value, actualM.unit, lang, m.hero.points) : null, accent: true },
        ]}
      />
      <Timeline scales={s} hostRef={hostRef} ticks={ticks} tickLabel={axisLabel(ticks, lang, view.relative ? 'pct' : 'HUF')} label={m.plan.chart} axis zeroLine breakLabel={m.chart.scopeBreakLabel} futureFrom={years.find((y) => y.year >= 2010 && !y.actual)?.year} futureLabel={m.chart.projected} testId="plan-chart">
        <defs><Hatch id={hatch} pitch={4} /></defs>
        <Bars scales={s} values={bars} hatch={hatch} tone="out" year={year} />
        {plans.map((p, i) => (
          <line key={p.year} className="plan-tick" x1={s.x(p.year) - tick / 2} x2={s.x(p.year) + tick / 2} y1={easedPlans[i]} y2={easedPlans[i]} />
        ))}
      </Timeline>
    </Section>
  );
}

function strip(data: ReturnType<typeof useApp>['data'], indicator: Indicator, read: (o: Observation) => Measured | null) {
  return YEARS.flatMap((y) => {
    const o = bestObservation(data, indicator, y, 'general');
    const shown = o ? read(o) : null;
    return shown ? [{ year: y, value: shown.value, settled: o!.status === 'actual' }] : [];
  });
}

function EconomyStrip({ values, title, label, height, axis, unit, obs, measured, testId }: { values: { year: number; value: number; settled: boolean }[]; title: string; label: string; height: number; axis?: boolean; unit: 'HUF' | 'pct'; obs?: Observation; measured: Measured | null; testId: string }) {
  const { lang, year, m } = useApp();
  const [hostRef, width] = useChartWidth();
  const nums = values.map((v) => v.value);
  const { domain, ticks } = niceAxis(Math.min(0, ...nums), Math.max(...nums), 2);
  const s = makeScales(width, height, domain, { top: 6, bottom: axis ? 26 : 0 });
  // A tick at the very top would crowd the label above the strip.
  const shown = ticks.filter((t) => t !== 0 && s.y(t) > s.top + 14);
  return (
    <div className="strip">
      <div className="strip-head">
        <span>{title}</span>
        <span className="strip-value">
          {obs && obs.status !== 'actual' && <em className="estimate">{statusName(m, obs.status).toLowerCase()}</em>}
          {obs && measured ? <SourceButton obs={obs} measured={measured} what={title} testId={testId}>{figure(measured, lang)}</SourceButton> : <span className="no-data">{m.year.noData}</span>}
        </span>
      </div>
      <Timeline scales={s} hostRef={hostRef} ticks={shown} tickLabel={axisLabel(shown, lang, unit)} label={label} axis={axis}>
        <line className="zero" x1={0} x2={s.width} y1={s.y(0)} y2={s.y(0)} />
        <Bars scales={s} values={values} hatch="" tone="ink" year={year} />
      </Timeline>
    </div>
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
  const phone = isPhone();
  return (
    <Section id="economy" title={m.economy.title} intro={m.economy.intro} basis={view.real ? priceBasis(data, view.ref, m, lang) : undefined}>
      <EconomyStrip values={gdp} title={m.economy.gdp} label={m.economy.chartGdp} height={phone ? 76 : 96} unit="HUF" obs={gdpObs} measured={gdpObs ? measure(data, gdpObs, forintMode) : null} testId="economy-gdp" />
      <EconomyStrip values={growth} title={m.economy.growth} label={m.economy.chartGrowth} height={phone ? 76 : 96} unit="pct" obs={growthObs} measured={growthObs ? asPublished(growthObs) : null} testId="economy-growth" />
      <EconomyStrip values={inflation} title={m.economy.inflation} label={m.economy.chartInflation} height={phone ? 102 : 122} axis unit="pct" obs={cpiObs} measured={cpiObs ? asPublished(cpiObs) : null} testId="economy-cpi" />
      {view.real && <p className="fine" data-testid="gdp-real-note">{m.chart.gdpReal}</p>}
      {view.relative && <p className="fine">{m.economy.alwaysForint}</p>}
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
  const series = (indicator: Indicator, read: (o: Observation) => Measured | null): Pt[] =>
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
  const s = makeScales(width, phone ? 220 : 280, domain, { top: 10, bottom: 26 });
  const eased = useTween(all.map((p) => s.y(p.value)));
  let cursor = 0;
  const drawn = runs.map((run) => {
    const points = run.map((p): Point => [s.x(p.year), eased[cursor++] ?? s.y(p.value)]);
    return { run, points, kind: METHOD_LABEL[run[0].method] };
  });
  const find = (i: Indicator) => data.observations.find((o) => o.indicator === i && o.year === year);
  const netObs = find('oda');
  const grantObs = find('odaGe');
  const shareObs = find('odaPctGni');
  const reason = gapFor(data, 'oda', year)?.reason[lang];
  const labelFor = (kind: 'net' | 'grant' | null) => (view.relative ? (kind === 'net' ? m.aid.shareNet : m.aid.shareGrant) : kind === 'net' ? m.aid.net : m.aid.grant);
  const chosen = drawn.flatMap((d) => d.run.flatMap((p, i) => (p.year === year ? [{ x: d.points[i][0], y: d.points[i][1], kind: d.kind }] : [])));

  return (
    <Section id="aid" title={m.aid.title} intro={m.aid.intro} basis={view.real ? priceBasis(data, view.ref, m, lang) : undefined}>
      <Readout
        items={
          view.relative
            ? [{ key: 'share', label: shareObs?.method === 'dacGrantEquivalent' ? m.aid.shareGrant : m.aid.shareNet, measured: shareObs ? asPublished(shareObs) : null, obs: shareObs, testId: 'aid-share', reason }]
            : [
                { key: 'net', label: m.aid.net, swatch: <i className="mark mark-in" aria-hidden="true" />, measured: netObs ? measure(data, netObs, mode) : null, obs: netObs, testId: 'aid-net', reason },
                { key: 'grant', label: m.aid.grant, swatch: <i className="mark mark-ink" aria-hidden="true" />, measured: grantObs ? measure(data, grantObs, mode) : null, obs: grantObs, testId: 'aid-grant', reason },
              ]
        }
      />
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

export function HelpsSection() {
  const { data, view, year, m, lang } = useApp();
  const [hostRef, width] = useChartWidth();
  const mode = { real: view.real, ref: view.ref, relative: false };
  const of = (o?: Observation) => (o ? measure(data, o, mode) : null);
  const stacks = YEARS.flatMap((y) => {
    const { program, agency } = helpsFor(data, y);
    const lower = of(program)?.value;
    if (lower === undefined) return [];
    return [{ year: y, program: lower, total: lower + (of(agency)?.value ?? 0), settled: program!.status === 'actual' }];
  });
  const { domain, ticks } = niceAxis(0, Math.max(...stacks.map((b) => b.total)), 3);
  const s = makeScales(width, isPhone() ? 200 : 260, domain, { top: 10, bottom: 26 });
  const eased = useTween(stacks.flatMap((b) => [s.y(b.program), s.y(b.total)]));
  const w = Math.max(2, s.band - Math.max(2, s.band * 0.22));
  const { program, agency } = helpsFor(data, year);
  const odaObs = data.observations.find((o) => o.indicator === 'oda' && o.year === year);
  const tagOf = (o?: Observation) => (o && o.status !== 'actual' ? m.helps.budgeted : undefined);

  return (
    <Section id="helps" title={m.helps.title} intro={m.helps.intro} basis={view.real ? priceBasis(data, view.ref, m, lang) : undefined}>
      <Readout
        items={[
          { key: 'program', label: m.helps.program, swatch: <i className="mark mark-ink" aria-hidden="true" />, measured: of(program), obs: program, tag: tagOf(program), testId: 'helps-program', reason: gapFor(data, 'hungaryHelpsProgram', year)?.reason[lang] },
          { key: 'agency', label: m.helps.agency, swatch: <i className="mark mark-in" aria-hidden="true" />, measured: of(agency), obs: agency, tag: tagOf(agency), testId: 'helps-agency', reason: gapFor(data, 'hungaryHelpsAgency', year)?.reason[lang] },
          { key: 'oda', label: m.helps.oda, measured: of(odaObs), obs: odaObs, testId: 'helps-oda', reason: gapFor(data, 'oda', year)?.reason[lang] },
        ]}
      />
      <Timeline scales={s} hostRef={hostRef} ticks={ticks} tickLabel={axisLabel(ticks, lang, 'HUF')} label={m.helps.chart} axis zeroLine futureFrom={stacks.find((b) => !b.settled)?.year} futureLabel={m.chart.projected} testId="helps-chart">
        {stacks.map((b, i) => {
          const low = eased[i * 2] ?? s.y(b.program);
          const top = eased[i * 2 + 1] ?? s.y(b.total);
          const state = `${b.year === year ? ' chosen' : ''}${b.settled ? '' : ' open'}`;
          return (
            <g key={b.year}>
              <rect className={`bar bar-ink${state}`} x={s.x(b.year) - w / 2} y={low} width={w} height={Math.max(1, s.y(0) - low)} />
              {b.total > b.program && <rect className={`bar bar-agency${state}`} x={s.x(b.year) - w / 2} y={top} width={w} height={Math.max(1.5, low - top - 1.5)} />}
            </g>
          );
        })}
      </Timeline>
      <p className="fine" data-testid="helps-note">{m.helps.note}</p>
      {view.relative && <p className="fine">{m.helps.alwaysForint}</p>}
    </Section>
  );
}
