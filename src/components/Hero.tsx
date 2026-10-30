import { axisScale, formatNumber, formatPct, formatSigned } from '../lib/format';
import { compareMeasured, type LedgerRow, type Measured } from '../lib/measure';
import { FIRST_YEAR, LAST_YEAR } from '../lib/view';
import { useId } from 'react';
import { YEARS } from '../charts/geometry';
import { useApp } from './context';
import { Hatch } from './Timeline';
import { priceBasis, SourceButton, statusLabel } from './figures';

function Chevron({ back }: { back?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d={back ? 'M11.500 3 5.500 9l6 6' : 'M6.500 3l6 6-6 6'} fill="none" stroke="currentColor" strokeWidth="2.25" />
    </svg>
  );
}

export function YearStepper({ testId, compact }: { testId: string; compact?: boolean }) {
  const { view, setView, year, m } = useApp();
  return (
    <div className={compact ? 'year-stepper compact' : 'year-stepper'} data-testid={testId}>
      <button type="button" className="step" onClick={() => setView({ year: Math.max(FIRST_YEAR, view.year - 1) })} disabled={view.year <= FIRST_YEAR} aria-label={m.year.prev}>
        <Chevron back />
      </button>
      {compact && <span className="stepper-year">{year}</span>}
      <button type="button" className="step" onClick={() => setView({ year: Math.min(LAST_YEAR, view.year + 1) })} disabled={view.year >= LAST_YEAR} aria-label={m.year.next}>
        <Chevron />
      </button>
    </div>
  );
}

/** Big Shoulders has no tabular figures, so digits get fixed cells to keep decimals in line while scrubbing. */
function Digits({ text }: { text: string }) {
  return (
    <span className="digits">
      {[...text].map((c, i) => (
        <span key={i} className={/\d/.test(c) ? 'digit' : undefined}>{c}</span>
      ))}
    </span>
  );
}

function Delta({ current, base, points }: { current: Measured | null; base: Measured | null; points: string }) {
  const { lang } = useApp();
  if (!current || !base) return <span className="delta" />;
  const c = compareMeasured(base, current);
  if (c.compatibility !== 'ok' || c.absolute === null) return <span className="delta">–</span>;
  const text = current.unit === 'pct' ? formatSigned(`${formatNumber(Math.abs(c.absolute), lang, 1)} ${points}`, c.absolute < 0) : c.percent !== null ? formatSigned(formatPct(Math.abs(c.percent), lang), c.percent < 0) : '';
  return <span className="delta">{text}</span>;
}

export default function Hero({ rows }: { rows: LedgerRow[] }) {
  const { data, view, setView, year, m, lang } = useApp();
  const hatch = useId();
  const row = rows.find((r) => r.year === year);
  const versus = view.versus !== null && view.versus !== year ? view.versus : year > FIRST_YEAR ? year - 1 : null;
  const base = versus !== null ? rows.find((r) => r.year === versus) : undefined;
  const lines = row ? ([
    ['revenue', m.hero.revenue, row.revenue],
    ['expenditure', m.hero.expenditure, row.expenditure],
  ] as const) : [];
  const values = row ? [row.revenue, row.expenditure, row.deficit].flatMap((x) => (x ? [Math.abs(x.value)] : [])) : [];
  const share = row?.deficit?.unit === 'pct';
  const { divisor, name } = axisScale(Math.max(1, ...values), lang);
  const text = (x: Measured) => (share ? formatPct(Math.abs(x.value), lang) : formatNumber(Math.abs(x.value) / divisor, lang, 2));
  const unit = share ? m.hero.unitShare : m.hero.unitForint(name);
  const surplus = (row?.deficit?.value ?? 0) < 0;
  const covered = row?.revenue && row.expenditure ? (row.revenue.value / row.expenditure.value) * 100 : null;
  const warning = row?.deficit && base?.deficit ? compareMeasured(base.deficit, row.deficit).compatibility : 'ok';
  const estimated = row && [row.revenue, row.expenditure, row.deficit].some((x) => x?.estimated);

  return (
    <div className="ledger-side">
      <div className="year-line">
        <label className="year-big">
          <span className="sr-only">{m.year.select}</span>
          <span aria-hidden="true"><Digits text={String(year)} /></span>
          <select value={year} onChange={(e) => setView({ year: Number(e.target.value) })} data-testid="year-select">
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </label>
        <div className="year-side">
          <YearStepper testId="year-steps" />
          {row && (
            <span className={row.status === 'actual' ? 'stamp' : 'stamp open'} key={`${row.status}${row.publisher ?? ''}`} data-testid="stamp">
              {statusLabel(row, m)}
            </span>
          )}
          {estimated && <em className="estimate">{m.chart.estimated}</em>}
        </div>
      </div>

      {row ? (
        <div className="ledger" data-testid="ledger">
          <div className="ledger-head">
            <h2 className="ledger-scope">{view.scope === 'general' ? m.controls.scopeGeneral : m.controls.scopeCentral}</h2>
            <span className="ledger-unit">
              {unit}
              {view.real && <span className="ledger-basis" data-testid="price-basis">{priceBasis(data, view.ref, m, lang)}</span>}
            </span>
            <label className="quiet-select versus">
              <span className="sr-only">{m.hero.versusLabel}</span>
              <select value={versus ?? ''} onChange={(e) => setView({ versus: e.target.value ? Number(e.target.value) : null })} data-testid="versus">
                {versus === null && <option value="">{m.hero.versusNone}</option>}
                {YEARS.filter((y) => y !== year).map((y) => (
                  <option key={y} value={y}>{m.hero.versus(y)}</option>
                ))}
              </select>
            </label>
          </div>
          {lines.map(([key, label, x]) => (
            <div className={`ledger-row ${key}`} key={key}>
              <span className="ledger-label"><i className={`mark mark-${key}`} aria-hidden="true" />{label}</span>
              {x ? <SourceButton obs={x.obs} measured={x} what={label} value={`${text(x)} ${unit}`} testId={`ledger-${key}`} className="ledger-num"><Digits text={text(x)} /></SourceButton> : <span className="no-data">{m.year.noData}</span>}
              <Delta current={x} base={base ? base[key] : null} points={m.hero.points} />
            </div>
          ))}
          <div className="ledger-row deficit">
            <span className="ledger-label">{surplus ? m.hero.surplus : m.hero.deficit}</span>
            {row.deficit ? <SourceButton obs={row.deficit.obs} measured={row.deficit} what={surplus ? m.hero.surplus : m.hero.deficit} value={`${text(row.deficit)} ${unit}`} testId="ledger-deficit" className="ledger-num"><Digits text={text(row.deficit)} /></SourceButton> : <span className="no-data">{m.year.noData}</span>}
            <Delta current={row.deficit} base={base ? base.deficit : null} points={m.hero.points} />
          </div>
        </div>
      ) : (
        <p className="no-data">{m.year.noData}</p>
      )}

      {warning !== 'ok' && (
        <p className="warning" data-testid="compare-warning">{warning === 'scope' ? m.hero.scopeWarning : m.hero.methodWarning}</p>
      )}

      {covered !== null && (
        <figure className="cover" data-testid="cover">
          <svg width="100%" height="14" aria-hidden="true">
            <defs><Hatch id={hatch} pitch={4} /></defs>
            <rect className="cover-out" x="0" y="0" width="100%" height="14" style={{ fill: `url(#${hatch})` }} />
            <rect className="cover-in" x="0" y="0" width={`${Math.min(100, covered)}%`} height="14" />
          </svg>
          <figcaption>{m.hero.cover(formatNumber(covered, lang))}</figcaption>
        </figure>
      )}
      <p className="fine hint">{m.hero.sourceHint}</p>
    </div>
  );
}

