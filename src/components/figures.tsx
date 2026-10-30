import { indicatorName, statusName, type Messages } from '../i18n';
import { axisScale, formatDate, formatHuf, formatNumber, formatPct, formatSigned } from '../lib/format';
import type { PriceReference } from '../lib/cpi';
import type { Measured } from '../lib/measure';
import type { Dataset, Indicator, Lang, Observation } from '../types/data';
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
  const key = indicator.startsWith('oda') ? 'oda' : indicator;
  const inRange = (spec: string) =>
    spec.split(',').some((part) => {
      const [a, b] = part.trim().split('–').map(Number);
      return year >= a && year <= (b ?? a);
    });
  // "The budget sets no ODA total" spans every year but says nothing about why a year's outcome is missing.
  return data.gaps.find((g) => g.indicator === key && g.id !== 'oda-plan' && inRange(g.years));
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

/** A label, a number and whatever qualifies it: the row every section's readout is made of. */
export function FigureRow({ label, measured, obs, testId, note, swatch, estimated }: { label: string; measured: Measured | null; obs?: Observation; testId?: string; note?: React.ReactNode; swatch?: React.ReactNode; estimated: string }) {
  const { lang, m } = useApp();
  return (
    <div className="figure">
      <dt>
        {swatch}
        {label}
      </dt>
      <dd>
        {measured && obs ? (
          <>
            <SourceButton obs={obs} measured={measured} what={label} testId={testId}>{figure(measured, lang)}</SourceButton>
            {measured.estimated && <em className="estimate">{estimated}</em>}
          </>
        ) : (
          <span className="no-data">{m.year.noData}</span>
        )}
      </dd>
      {note && <dd className="figure-note">{note}</dd>}
    </div>
  );
}
