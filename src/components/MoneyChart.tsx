import { useId } from 'react';
import { isPhone, linePath, makeScales, niceAxis, ribbonPath, runsOf, type Point } from '../charts/geometry';
import type { LedgerRow } from '../lib/measure';
import { useApp } from './context';
import Timeline, { Bars, Hatch, useChartWidth, useTween } from './Timeline';
import { axisLabel } from './figures';

type Filled = LedgerRow & { revenue: NonNullable<LedgerRow['revenue']>; expenditure: NonNullable<LedgerRow['expenditure']> };

const sameBook = (a: LedgerRow, b: LedgerRow) => a.year + 1 === b.year && a.revenue?.obs.scope === b.revenue?.obs.scope;

/** Money in and money out, with what is left between them hatched. Below it, that same gap on its own scale. */
export default function MoneyChart({ rows, summary }: { rows: LedgerRow[]; summary: string }) {
  const { view, year, m, lang } = useApp();
  const [hostRef, width] = useChartWidth();
  const [gapRef, gapWidth] = useChartWidth();
  const hatch = useId();
  const hatchFaint = useId();
  const phone = isPhone();

  const filled = rows.filter((r): r is Filled => Boolean(r.revenue && r.expenditure));
  const share = view.relative;
  const levels = filled.flatMap((r) => [r.revenue.value, r.expenditure.value]);
  const low = share ? Math.floor(Math.min(...levels) / 10) * 10 : 0;
  const { domain, ticks } = niceAxis(low, Math.max(...levels, 1), phone ? 3 : 4);
  const s = makeScales(width, phone ? 250 : 340, domain, { top: 24 });

  const eased = useTween([...filled.map((r) => s.y(r.revenue.value)), ...filled.map((r) => s.y(r.expenditure.value))]);
  const inY = new Map(filled.map((r, i) => [r.year, eased[i]]));
  const outY = new Map(filled.map((r, i) => [r.year, eased[i + filled.length]]));
  const point = (ys: Map<number, number>) => (r: LedgerRow): Point => [s.x(r.year), ys.get(r.year) ?? 0];

  const settled = filled.filter((r) => r.status === 'actual');
  const open = filled.filter((r) => r.status !== 'actual');
  const runs = runsOf(settled, sameBook);
  // Plans and forecasts hang off the last outcome only if the definition carries over.
  const lastSettled = settled[settled.length - 1];
  const openRun = open.length ? (lastSettled && sameBook(lastSettled, open[0]) ? [lastSettled, ...open] : open) : [];

  const showBreak = view.scope === 'central';
  const futureFrom = open[0]?.year;
  const current = filled.find((r) => r.year === year);
  const dot = (ys: Map<number, number>, cls: string) =>
    current ? <circle className={`dot ${cls}${current.status === 'actual' ? '' : ' open'}`} cx={s.x(current.year)} cy={ys.get(current.year)} r={5} /> : null;

  const labelYear = phone ? 2008 : 2006;
  const labelRow = filled.find((r) => r.year === labelYear);

  const gaps = rows.flatMap((r) => (r.deficit ? [{ year: r.year, value: r.deficit.value, settled: r.status === 'actual' }] : []));
  const gapValues = gaps.map((g) => g.value);
  const gapAxis = niceAxis(Math.min(0, ...gapValues), Math.max(...gapValues, share ? 1 : 1e9), 2);
  const g = makeScales(gapWidth, phone ? 124 : 146, gapAxis.domain, { top: 26, bottom: 24 });
  const gapTicks = gapAxis.ticks.filter((t) => t !== 0);

  return (
    <div className="money-chart">
      <Timeline
        scales={s}
        hostRef={hostRef}
        ticks={ticks}
        tickLabel={axisLabel(ticks, lang, share ? 'pct' : 'HUF')}
        label={summary}
        slider
        breakLabel={showBreak ? m.chart.scopeBreakLabel : undefined}
        futureFrom={futureFrom}
        futureLabel={m.chart.projected}
        testId="chart"
      >
        <defs>
          <Hatch id={hatch} />
          <Hatch id={hatchFaint} tone="faint" />
        </defs>
        {runs.map((run) => (
          <path key={`r${run[0].year}`} d={ribbonPath(run.map(point(outY)), run.map(point(inY)))} style={{ fill: `url(#${hatch})` }} />
        ))}
        {openRun.length > 1 && <path d={ribbonPath(openRun.map(point(outY)), openRun.map(point(inY)))} style={{ fill: `url(#${hatchFaint})` }} />}
        {runs.map((run) => (
          <g key={`l${run[0].year}`}>
            <path className="line line-out" d={linePath(run.map(point(outY)))} />
            <path className="line line-in" d={linePath(run.map(point(inY)))} />
          </g>
        ))}
        {openRun.length > 1 && (
          <g>
            <path className="line line-out open" d={linePath(openRun.map(point(outY)))} />
            <path className="line line-in open" d={linePath(openRun.map(point(inY)))} />
          </g>
        )}
        {open.map((r) => (
          <g key={r.year}>
            <circle className="tick-dot line-out" cx={s.x(r.year)} cy={outY.get(r.year)} r={3} />
            <circle className="tick-dot line-in" cx={s.x(r.year)} cy={inY.get(r.year)} r={3} />
          </g>
        ))}
        {labelRow && (
          <g>
            <text className="line-label label-out" x={s.x(labelYear)} y={(outY.get(labelYear) ?? 0) - 12} textAnchor="middle">{m.hero.expenditure}</text>
            <text className="line-label label-in" x={s.x(labelYear)} y={(inY.get(labelYear) ?? 0) + 22} textAnchor="middle">{m.hero.revenue}</text>
          </g>
        )}
        {dot(outY, 'dot-out')}
        {dot(inY, 'dot-in')}
      </Timeline>
      <Timeline scales={g} hostRef={gapRef} ticks={gapTicks} tickLabel={axisLabel(gapTicks, lang, share ? 'pct' : 'HUF')} label={m.chart.gap} axis title={m.chart.gap} breakLabel={showBreak ? '' : undefined} futureFrom={futureFrom}>
        <defs><Hatch id={`${hatch}g`} pitch={4} /></defs>
        <line className="zero" x1={0} x2={g.width} y1={g.y(0)} y2={g.y(0)} />
        <Bars scales={g} values={gaps} hatch={`${hatch}g`} tone="out" year={year} />
      </Timeline>
    </div>
  );
}
