import { indicatorName, statusName, type Messages } from '../i18n';
import { formatExactHuf, formatHuf, formatNumber, formatPct } from '../lib/format';
import type { Measured } from '../lib/measure';
import type { Dataset, Indicator, Lang, Observation, Status } from '../types/data';

export function figure(m: Measured, lang: Lang, exact: boolean): string {
  if (m.unit === 'pct') {
    const digits = m.obs.indicator === 'odaPctGni' ? 2 : 1;
    return formatPct(m.value, lang, digits);
  }
  return exact ? formatExactHuf(m.value, lang) : formatHuf(m.value, lang);
}

export function statusLabel(o: Pick<Observation, 'status' | 'publisher'>, msgs: Messages): string {
  const base = statusName(msgs, o.status);
  return o.publisher ? `${base} (${msgs.publishers[o.publisher]})` : base;
}

/** For running text: the status lowercased, an institution's name left as written. */
export function statusLower(o: Pick<Observation, 'status' | 'publisher'>, msgs: Messages): string {
  const base = statusName(msgs, o.status).toLowerCase();
  return o.publisher ? `${base} (${msgs.publishers[o.publisher]})` : base;
}

export function seriesLabel(indicator: Indicator, status: Status, publisher: 'ec' | 'gov' | undefined, msgs: Messages): string {
  return `${indicatorName(msgs, indicator)}: ${statusLower({ status, publisher }, msgs)}`;
}

export function gapFor(data: Dataset, indicator: Indicator, year: number) {
  const key = indicator.startsWith('oda') ? 'oda' : indicator;
  const inRange = (spec: string) =>
    spec.split(',').some((part) => {
      const [a, b] = part.trim().split('–').map(Number);
      return year >= a && year <= (b ?? a);
    });
  return data.gaps.find((g) => g.indicator === key && inRange(g.years));
}

export const nominal = (o: Observation, lang: Lang, exact: boolean) =>
  exact ? formatExactHuf(o.value, lang) : formatHuf(o.value, lang);

export const plainNumber = (n: number, lang: Lang) => formatNumber(n, lang);
