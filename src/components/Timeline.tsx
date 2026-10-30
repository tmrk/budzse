import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { yearAt, YEARS, type Scales } from '../charts/geometry';
import { FIRST_YEAR, LAST_YEAR } from '../lib/view';
import { useApp } from './context';

export function useChartWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    if (!ref.current) return;
    setWidth(ref.current.getBoundingClientRect().width);
    const ro = new ResizeObserver((entries) => setWidth(entries[0].contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Glides between pixel positions when the lens or scope changes, so you can see what the switch did. */
export function useTween(target: number[], ms = 420): number[] {
  const [current, setCurrent] = useState(target);
  const live = useRef(target);
  const key = target.map((v) => v.toFixed(1)).join();
  useEffect(() => {
    const from = live.current;
    if (reducedMotion() || from.length !== target.length) {
      live.current = target;
      setCurrent(target);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const k = 1 - (1 - t) ** 3;
      const next = target.map((v, i) => (Number.isFinite(v) && Number.isFinite(from[i]) ? from[i] + (v - from[i]) * k : v));
      live.current = next;
      setCurrent(next);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
    // The key stands for the target: an equal target must not restart the glide.
  }, [key, ms]);
  return current.length === target.length ? current : target;
}

/** The engraved hatch that means "the gap", wherever it appears. */
export function Hatch({ id, tone = 'out', pitch = 5 }: { id: string; tone?: 'out' | 'faint'; pitch?: number }) {
  return (
    <pattern id={id} patternUnits="userSpaceOnUse" width={pitch} height={pitch} patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2={pitch} className={tone === 'out' ? 'hatch-line' : 'hatch-line faint'} />
    </pattern>
  );
}

interface TimelineProps {
  scales: Scales;
  hostRef: React.Ref<HTMLDivElement>;
  ticks: number[];
  tickLabel: (v: number) => string;
  label: string;
  /** Marks the frame as the keyboard control for the year. Only one chart on the page has this. */
  slider?: boolean;
  axis?: boolean;
  zeroLine?: boolean;
  breakLabel?: string;
  /** The first year that is not an outcome, shaded through to the end. */
  futureFrom?: number;
  futureLabel?: string;
  testId?: string;
  children: React.ReactNode;
}

export default function Timeline({ scales: s, hostRef, ticks, tickLabel, label, slider, axis, zeroLine, breakLabel, futureFrom, futureLabel, testId, children }: TimelineProps) {
  const { view, setView, year, setPreview, m } = useApp();
  const pick = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return yearAt(e.clientX - r.left, r.width);
  };
  const onKey = (e: React.KeyboardEvent) => {
    const next = { ArrowLeft: view.year - 1, ArrowRight: view.year + 1, Home: FIRST_YEAR, End: LAST_YEAR }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    setView({ year: Math.min(LAST_YEAR, Math.max(FIRST_YEAR, next)) }, 'replace');
  };
  const a11y = slider
    ? { role: 'slider', tabIndex: 0, 'aria-label': m.year.select, 'aria-valuemin': FIRST_YEAR, 'aria-valuemax': LAST_YEAR, 'aria-valuenow': view.year, 'aria-valuetext': label, 'aria-orientation': 'horizontal' as const, onKeyDown: onKey }
    : { role: 'img', 'aria-label': label };
  const cursor = s.x(year);
  const labelled = YEARS.filter((y) => y % 5 === 0 && Math.abs(s.x(y) - cursor) > 30);
  // Steps aside rather than run through the cursor. Hiding it cannot move anything.
  const futureClear = futureLabel !== undefined && cursor < s.width - 14 - futureLabel.length * 6.5;

  return (
    <div
      ref={hostRef}
      className="timeline"
      style={{ height: s.height }}
      data-testid={testId}
      onPointerDown={(e) => e.pointerType !== 'mouse' && setPreview(pick(e))}
      onPointerMove={(e) => setPreview(pick(e))}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setPreview(null)}
      onPointerCancel={() => setPreview(null)}
      onPointerUp={(e) => {
        const y = pick(e);
        if (y !== view.year) setView({ year: y });
        setPreview(null);
      }}
      {...a11y}
    >
      {s.width > 0 && (
        <svg width={s.width} height={s.height} aria-hidden="true" focusable="false">
          {futureFrom !== undefined && (
            <g>
              <rect className="future" x={s.x(futureFrom) - s.band / 2} y={0} width={s.width - s.x(futureFrom) + s.band / 2} height={s.bottom} />
              {futureClear && s.width > 480 && <text className="future-label" x={s.width - 6} y={14} textAnchor="end">{futureLabel}</text>}
            </g>
          )}
          {ticks.map((t) => (
            <line key={t} className={zeroLine && t === 0 ? 'zero' : 'grid'} x1={0} x2={s.width} y1={s.y(t)} y2={s.y(t)} />
          ))}
          {breakLabel !== undefined && (
            <g>
              <line className="break" x1={s.x(2009) + s.band / 2} x2={s.x(2009) + s.band / 2} y1={0} y2={s.bottom} />
              {breakLabel && s.width > 480 && <text className="break-label" x={s.x(2009) + s.band / 2 - 6} y={14} textAnchor="end">{breakLabel}</text>}
            </g>
          )}
          {year !== view.year && <line className="pin" x1={s.x(view.year)} x2={s.x(view.year)} y1={0} y2={s.bottom} />}
          {children}
          <line className="cursor" x1={cursor} x2={cursor} y1={0} y2={s.bottom} />
          {ticks.map((t) => (
            <text key={t} className="tick" x={0} y={s.y(t) - 4}>{tickLabel(t)}</text>
          ))}
          {axis && (
            <g>
              {labelled.map((y) => (
                <text key={y} className="axis" x={s.x(y)} y={s.height - 7} textAnchor="middle">{y}</text>
              ))}
              <rect className="axis-tag" x={Math.max(0, Math.min(s.width - 40, cursor - 20))} y={s.height - 22} width={40} height={20} rx={2} />
              <text className="axis-now" x={Math.max(20, Math.min(s.width - 20, cursor))} y={s.height - 7} textAnchor="middle">{year}</text>
            </g>
          )}
        </svg>
      )}
    </div>
  );
}

/** Thin bars for one measure per year: hatched by default, solid for the chosen year, outlined when not an outcome. */
export function Bars({ scales: s, values, hatch, tone, year }: { scales: Scales; values: { year: number; value: number; settled: boolean }[]; hatch: string; tone: 'out' | 'ink' | 'oda'; year: number }) {
  const base = s.y(0);
  const eased = useTween(values.map((b) => s.y(b.value)));
  const w = Math.max(2, s.band - Math.max(2, s.band * 0.22));
  return (
    <g>
      {values.map((b, i) => {
        const y = eased[i] ?? s.y(b.value);
        const h = Math.max(1, Math.abs(base - y));
        const chosen = b.year === year;
        const cls = `bar bar-${tone}${chosen ? ' chosen' : ''}${b.settled ? '' : ' open'}`;
        return <rect key={b.year} className={cls} x={s.x(b.year) - w / 2} y={Math.min(base, y)} width={w} height={h} rx={Math.min(1.5, w / 3)} style={tone === 'out' && (!chosen || !b.settled) ? { fill: `url(#${hatch})` } : undefined} />;
      })}
    </g>
  );
}
