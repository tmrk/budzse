import { axisScale, formatNumber, formatPct, formatSigned } from '../lib/format';
import { compareMeasured, type LedgerRow, type Measured } from '../lib/measure';
import { FIRST_YEAR, LAST_YEAR } from '../lib/view';
import { statusName } from '../i18n';
import { YEARS } from '../charts/geometry';
import { useApp } from './context';
import { gapFor, Missing, priceBasis, SourceButton } from './figures';

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

/** Change on the year before. A change of scope leaves a dash, never a false difference. */
function Delta({ current, base }: { current: Measured | null; base: Measured | null }) {
  const { lang, m } = useApp();
  if (!current || !base) return <span className="delta">–</span>;
  const c = compareMeasured(base, current);
  if (c.compatibility !== 'ok' || c.absolute === null) return <span className="delta not-comparable" title={m.hero.scopeWarning}>{m.hero.notComparable}</span>;
  const text = current.unit === 'pct' ? formatSigned(`${formatNumber(Math.abs(c.absolute), lang, 1)} ${m.hero.points}`, c.absolute < 0) : c.percent !== null ? formatSigned(formatPct(Math.abs(c.percent), lang), c.percent < 0) : '';
  return <span className="delta">{text}</span>;
}

export default function Hero({ rows }: { rows: LedgerRow[] }) {
  const { data, view, setView, year, m, lang } = useApp();
  const row = rows.find((r) => r.year === year);
  const base = rows.find((r) => r.year === year - 1);
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
  const estimated = row && [row.revenue, row.expenditure, row.deficit].some((x) => x?.estimated);
  const qualifier = [row?.publisher && m.publishers[row.publisher], estimated && m.chart.estimated].filter(Boolean).join(', ');

  return (
    <div className="ledger-side">
      <div className="year-line">
        <label className="year-big">
          <span className="sr-only">{m.year.select}</span>
          <span className="year-digits" aria-hidden="true"><Digits text={String(year)} /></span>
          <svg className="year-caret" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path d="M2 4.500 7 9.500l5-5" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
          <select value={year} onChange={(e) => setView({ year: Number(e.target.value) })} data-testid="year-select">
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </label>
        <div className="year-side">
          <YearStepper testId="year-steps" />
          {row && (
            <p className={row.status === 'actual' ? 'status' : 'status open'}>
              <i className="status-dot" aria-hidden="true" />
              <span className="status-text">
                <span className="stamp" data-testid="stamp">{statusName(m, row.status)}</span>
                {qualifier && <span className="stamp-note" data-testid="stamp-note">{qualifier}</span>}
              </span>
            </p>
          )}
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
            <span className="ledger-versus">{m.hero.previous}</span>
          </div>
          {lines.map(([key, label, x]) => (
            <div className={`ledger-row ${key}`} key={key}>
              <span className="ledger-label"><i className={`mark mark-${key}`} aria-hidden="true" />{label}</span>
              {x ? <SourceButton obs={x.obs} measured={x} what={label} value={`${text(x)} ${unit}`} testId={`ledger-${key}`} className="ledger-num"><Digits text={text(x)} /></SourceButton> : <Missing gap={gapFor(data, key, year)} />}
              <Delta current={x} base={base ? base[key] : null} />
            </div>
          ))}
          <div className="ledger-row deficit">
            <span className="ledger-label"><i className="mark mark-gap" aria-hidden="true" />{surplus ? m.hero.surplus : m.hero.deficit}</span>
            {row.deficit ? <SourceButton obs={row.deficit.obs} measured={row.deficit} what={surplus ? m.hero.surplus : m.hero.deficit} value={`${text(row.deficit)} ${unit}`} testId="ledger-deficit" className="ledger-num"><Digits text={text(row.deficit)} /></SourceButton> : <Missing gap={gapFor(data, 'deficit', year)} />}
            <Delta current={row.deficit} base={base ? base.deficit : null} />
          </div>
          {covered !== null && <p className="cover" data-testid="cover">{m.hero.cover(formatNumber(covered, lang))}</p>}
        </div>
      ) : (
        <p className="ledger-empty"><Missing /></p>
      )}
    </div>
  );
}
