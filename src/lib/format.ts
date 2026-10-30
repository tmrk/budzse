import type { Lang } from '../types/data';

const locale = (lang: Lang) => (lang === 'hu' ? 'hu-HU' : 'en-GB');

/**
 * Hungarian long-scale names differ from English short-scale ones:
 * 10^9 = milliárd = billion, 10^12 = billió = trillion.
 */
const SCALES: Record<Lang, { limit: number; name: string }[]> = {
  hu: [
    { limit: 1e12, name: 'billió' },
    { limit: 1e9, name: 'milliárd' },
    { limit: 1e6, name: 'millió' },
    { limit: 1e3, name: 'ezer' },
  ],
  en: [
    { limit: 1e12, name: 'trillion' },
    { limit: 1e9, name: 'billion' },
    { limit: 1e6, name: 'million' },
    { limit: 1e3, name: 'thousand' },
  ],
};

export function formatNumber(value: number, lang: Lang, digits = 0): string {
  return new Intl.NumberFormat(locale(lang), { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}

/** Every digit, no abbreviation: "3 392 043 900 000 Ft" / "HUF 3,392,043,900,000". */
export function formatExactHuf(value: number, lang: Lang): string {
  const n = formatNumber(Math.round(value), lang);
  return lang === 'hu' ? `${n} Ft` : `HUF ${n}`;
}

function scaled(value: number, lang: Lang, digits?: number) {
  const abs = Math.abs(value);
  const scale = SCALES[lang].find((s) => abs >= s.limit);
  if (!scale) return { number: formatNumber(value, lang), name: '' };
  const v = value / scale.limit;
  const d = digits ?? (Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2);
  return { number: formatNumber(v, lang, d), name: scale.name };
}

/** Short money label: "3,39 billió Ft" / "HUF 3.39 trillion". */
export function formatHuf(value: number, lang: Lang, digits?: number): string {
  const { number, name } = scaled(value, lang, digits);
  const body = name ? `${number} ${name}` : number;
  return lang === 'hu' ? `${body} Ft` : `HUF ${body}`;
}

/** Compact axis tick with the scale shared across a whole axis. */
export function axisScale(maxAbs: number, lang: Lang): { divisor: number; name: string } {
  const scale = SCALES[lang].find((s) => maxAbs >= s.limit);
  return scale ? { divisor: scale.limit, name: scale.name } : { divisor: 1, name: '' };
}

export function formatPct(value: number, lang: Lang, digits = 1): string {
  const n = formatNumber(value, lang, digits);
  return lang === 'hu' ? `${n}%` : `${n}%`;
}

/** Signed percentage points or percent, using a true minus sign. */
export function formatSigned(value: string, negative: boolean): string {
  return negative ? `−${value}` : `+${value}`;
}

export function formatSignedHuf(value: number, lang: Lang): string {
  return formatSigned(formatHuf(Math.abs(value), lang), value < 0);
}

export function formatSignedPct(value: number, lang: Lang, digits = 1): string {
  return formatSigned(formatPct(Math.abs(value), lang, digits), value < 0);
}

export function formatDate(iso: string, lang: Lang): string {
  const parts = iso.split('-').map(Number);
  if (parts.length === 2) {
    return new Intl.DateTimeFormat(locale(lang), { year: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(parts[0], parts[1] - 1, 1)));
  }
  return new Intl.DateTimeFormat(locale(lang), { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));
}

const HU_DIGIT = ['', 'es', 'es', 'as', 'es', 'ös', 'os', 'es', 'as', 'es'];
const HU_TENS = ['es', 'es', 'as', 'as', 'es', 'es', 'as', 'es', 'as', 'es'];

/** Hungarian adjectival year with correct vowel harmony: 2020-as, 2025-ös, 2026-os, 2021-es. */
export function huYearAdjective(year: number): string {
  const last = year % 10;
  const tens = Math.floor(year / 10) % 10;
  return `${year}-${last ? HU_DIGIT[last] : HU_TENS[tens]}`;
}
