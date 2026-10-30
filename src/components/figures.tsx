import { indicatorName, statusName, type Messages } from '../i18n';
import { axisScale, formatDate, formatHuf, formatNumber, formatPct, formatSigned } from '../lib/format';
import type { PriceReference } from '../lib/cpi';
import type { Measured } from '../lib/measure';
import type { Dataset, Gap, Indicator, Lang, Observation } from '../types/data';
import { useApp } from './context';

export function figure(m: Measured, lang: Lang): string {
  if (m.unit === 'pct') {
    const digits = m.obs.indicator === 'odaPctGni' ? 2 : 1;
    return formatPct(m.value, lang, digits);
  }
  return formatHuf(m.value, lang);
}

export function signedDifference(value: number, unit: Measured['unit'], lang: Lang, points: string): string {
  if (unit === 'HUF') return formatSigned(formatHuf(Math.abs(value), lang), value < 0);
  return formatSigned(`${formatNumber(Math.abs(value), lang, 1)} ${points}`, value < 0);
}

export function statusLabel(o: Pick<Observation, 'status' | 'publisher'>, msgs: Messages): string {
  const base = statusName(msgs, o.status);
  return o.publisher ? `${base} (${msgs.publishers[o.publisher]})` : base;
}

export function gapFor(data: Dataset, indicator: Indicator, year: number) {
  const family = indicator.startsWith('oda') ? 'oda' : indicator;
  const inRange = (spec: string) =>
    spec.split(',').some((part) => {
      const [a, b] = part.trim().split('–').map(Number);
      return year >= a && year <= (b ?? a);
    });
  // "The budget sets no ODA total" spans every year but says nothing about why a year's outcome is missing.
  const candidates = data.gaps.filter((g) => g.id !== 'oda-plan' && inRange(g.years));
  return candidates.find((g) => g.indicator === indicator) ?? candidates.find((g) => g.indicator === family);
}

/** Links to the documents behind a piece of prose. */
export function SourceList({ label, ids, sources }: { label?: string; ids: string[]; sources: Dataset['sources'] }) {
  return (
    <p className="fine refs">
      {label && `${label}: `}
      {ids.map((id, i) => (
        <span key={id}>
          {i > 0 && '; '}
          <a href={sources[id].url} target="_blank" rel="noopener noreferrer">{sources[id].title}</a>
        </span>
      ))}
    </p>
  );
}

/** Says which prices an adjusted figure is in, wherever one is shown. */
export function priceBasis(data: Dataset, ref: PriceReference, msgs: Messages, lang: Lang): string {
  return ref === 'latest' ? msgs.controls.referenceLatest(formatDate(data.cpi.latestMonth.month, lang)) : msgs.hero.prices(ref);
}

/** One scale and one precision for a whole axis, with as many decimals as the ticks really have. */
export function axisLabel(ticks: number[], lang: Lang, unit: Measured['unit']) {
  const { divisor, name } = unit === 'pct' ? { divisor: 1, name: '' } : axisScale(Math.max(1, ...ticks.map(Math.abs)), lang);
  const exact = (d: number) => ticks.every((t) => Math.abs(t / divisor - Number((t / divisor).toFixed(d))) < 1e-9);
  const digits = [0, 1, 2].find(exact) ?? 2;
  if (unit === 'pct') return (v: number) => formatPct(v, lang, digits);
  return (v: number) => (v === 0 ? '0' : `${formatNumber(v / divisor, lang, digits)} ${name}`);
}

/** A number that opens its own provenance. Every figure on the page goes through here. */
export function SourceButton({ obs, measured, what, value, testId, className, children }: { obs: Observation; measured?: Measured | null; what?: string; value?: string; testId?: string; className?: string; children: React.ReactNode }) {
  const { m, inspect } = useApp();
  return (
    <button type="button" className={`num-link${className ? ` ${className}` : ''}`} onClick={() => inspect(obs, measured)} aria-label={`${value ?? (typeof children === 'string' ? children : '')}. ${m.year.sourceFor(`${what ?? indicatorName(m, obs.indicator)}, ${obs.year}`)}`} data-testid={testId}>
      {children}
    </button>
  );
}

/**
 * The one way a figure says it is missing, on the same baseline a number would sit on.
 * A documented gap opens its reason, just as a number opens its source.
 */
export function Missing({ gap, text, title }: { gap?: Gap; text?: string; title?: string }) {
  const { m, lang, explain } = useApp();
  const label = text ?? m.year.noData;
  if (!gap) return <span className="no-data" title={title}>{label}</span>;
  return <button type="button" className="no-data has-reason" title={gap.reason[lang]} onClick={() => explain(gap)}>{label}</button>;
}

export interface ReadoutItem {
  key: string;
  label: string;
  swatch?: React.ReactNode;
  measured?: Measured | null;
  obs?: Observation;
  testId?: string;
  /** A calculated figure with no single source of its own. */
  text?: string | null;
  /** Why a figure is missing, documented in the gaps list. */
  gap?: Gap;
  /** What to say instead of "No data", when that would not be the honest reason. */
  empty?: string;
  emptyTitle?: string;
  /** What kind of figure this is, when it is not an outcome. */
  tag?: string;
}

/**
 * The numbers above a chart. The items are the same whatever the year, and a value never wraps,
 * so moving through the years can never change the height of the page.
 */
export function Readout({ items }: { items: ReadoutItem[] }) {
  const { lang, m } = useApp();
  return (
    <dl className="readout" style={{ '--n': items.length } as React.CSSProperties}>
      {items.map((i) => (
        <div key={i.key} className="readout-item">
          <dt>
            {i.swatch}
            <span>{i.label}</span>
            {(i.tag || i.measured?.estimated) && i.measured && <em className="estimate">{[i.tag, i.measured.estimated && m.chart.estimated].filter(Boolean).join(', ')}</em>}
          </dt>
          <dd>
            {i.text ? (
              <strong>{i.text}</strong>
            ) : i.measured && i.obs ? (
              <SourceButton obs={i.obs} measured={i.measured} what={i.label} testId={i.testId}>{figure(i.measured, lang)}</SourceButton>
            ) : (
              <Missing gap={i.gap} text={i.empty} title={i.emptyTitle} />
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
