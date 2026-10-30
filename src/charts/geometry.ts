import { FIRST_YEAR, LAST_YEAR } from '../lib/view';

export const YEARS = Array.from({ length: LAST_YEAR - FIRST_YEAR + 1 }, (_, i) => FIRST_YEAR + i);

export interface Scales {
  width: number;
  height: number;
  band: number;
  top: number;
  bottom: number;
  x: (year: number) => number;
  y: (value: number) => number;
}

/** Every chart shares one x scale, so a year sits at the same place all the way down the page. */
export function makeScales(width: number, height: number, domain: [number, number], pad: { top?: number; bottom?: number } = {}): Scales {
  const top = pad.top ?? 8;
  const bottom = height - (pad.bottom ?? 0);
  const band = width / YEARS.length;
  const span = domain[1] - domain[0] || 1;
  return {
    width,
    height,
    band,
    top,
    bottom,
    x: (year) => (year - FIRST_YEAR + 0.5) * band,
    y: (value) => bottom - ((value - domain[0]) / span) * (bottom - top),
  };
}

export const isPhone = () => window.innerWidth < 640;

export function yearAt(px: number, width: number): number {
  const i = Math.floor((px / width) * YEARS.length);
  return Math.min(LAST_YEAR, Math.max(FIRST_YEAR, FIRST_YEAR + i));
}

/** Round steps that stay inside the data's own range, so the marks fill the chart rather than the ticks. */
export function niceAxis(min: number, max: number, count = 4): { domain: [number, number]; ticks: number[] } {
  const span = max - min || 1;
  const high = max + span * 0.04;
  const raw = span / count;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = ([1, 2, 2.5, 5, 10].find((s) => s * power >= raw) ?? 10) * power;
  const ticks: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= high; v += step) ticks.push(Number(v.toPrecision(12)));
  return { domain: [min, high], ticks };
}

export type Point = [number, number];

export const linePath = (points: Point[]) => points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join('');

/** The closed shape between two lines drawn over the same years. */
export const ribbonPath = (upper: Point[], lower: Point[]) => `${linePath(upper)}L${linePath([...lower].reverse()).slice(1)}Z`;

/** Consecutive items only: a gap in the data must read as a gap, and so must a change of definition. */
export function runsOf<T>(items: T[], joins: (a: T, b: T) => boolean): T[][] {
  const runs: T[][] = [];
  for (const item of items) {
    const run = runs[runs.length - 1];
    if (run && joins(run[run.length - 1], item)) run.push(item);
    else runs.push([item]);
  }
  return runs;
}
