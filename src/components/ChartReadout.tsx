import { indicatorName, scopeName } from '../i18n';
import { formatSignedHuf, formatSignedPct } from '../lib/format';
import { planVersusActual, type ChartPanel } from '../lib/measure';
import { FIRST_YEAR, LAST_YEAR } from '../lib/view';
import { useApp } from './context';
import { figure, statusLower } from './figures';

const COLOUR: Record<string, string> = {
  revenue: '--c-revenue', revenuePctGdp: '--c-revenue', expenditure: '--c-expenditure', expenditurePctGdp: '--c-expenditure',
  deficit: '--c-deficit', deficitPctGdp: '--c-deficit', gdp: '--c-gdp', oda: '--c-oda', odaGe: '--c-oda', odaPctGni: '--c-oda',
};

/** What a hover tooltip shows on desktop, written out for touch screens. */
export default function ChartReadout({ panels }: { panels: ChartPanel[] }) {
  const { view, setView, m, lang, inspect } = useApp();
  const y = view.year;
  const rows = panels.flatMap((p) => p.series).flatMap((s) => {
    const pt = s.points.find((q) => q.year === y);
    return pt ? [{ s, pt }] : [];
  });
  return (
    <section className="readout" aria-live="polite" data-testid="readout">
      <div className="readout-head">
        <button type="button" className="year-step" onClick={() => setView({ year: Math.max(FIRST_YEAR, y - 1) })} disabled={y <= FIRST_YEAR} aria-label={m.year.prev}>‹</button>
        <span className="readout-year">{y}</span>
        <button type="button" className="year-step" onClick={() => setView({ year: Math.min(LAST_YEAR, y + 1) })} disabled={y >= LAST_YEAR} aria-label={m.year.next}>›</button>
      </div>
      {rows.length === 0 && <p className="no-data">{m.year.noData}</p>}
      {rows.map(({ s, pt }) => {
        const o = pt.measured.obs;
        const plan = rows.find((r) => r.s.indicator === s.indicator && (r.s.status === 'original' || r.s.status === 'planned'))?.pt.measured;
        const diff = s.status === 'actual' && pt.measured.unit === 'HUF' && plan ? planVersusActual(plan.obs, o) : null;
        return (
          <div className="readout-row" key={s.key}>
            <svg width="30" height="12" viewBox="0 0 30 12" aria-hidden="true" className="swatch">
              <rect x="0" y="4.500" width="30" height="3" fill={`var(${COLOUR[s.indicator] ?? '--ink'})`} />
            </svg>
            <span className="readout-name">
              {indicatorName(m, s.indicator)}, {statusLower(o, m)}
              {pt.measured.estimated && `, ${m.chart.estimated}`}
            </span>
            <span />
            <strong className="readout-value">{figure(pt.measured, lang, view.exact)}</strong>
            <button type="button" className="source-link readout-source" onClick={() => inspect(o, pt.measured)}>{m.year.source}</button>
            {diff && <span className="readout-diff">{m.year.difference}: {formatSignedHuf(pt.measured.value - plan!.value, lang)} ({formatSignedPct(diff.percent, lang)})</span>}
          </div>
        );
      })}
      {rows.length > 0 && <p className="readout-scope">{scopeName(m, rows[0].pt.measured.obs.scope)}</p>}
    </section>
  );
}
