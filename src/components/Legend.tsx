import { DASH, SERIES_VAR, SYMBOL } from '../charts/palette';
import type { ChartPanel } from '../lib/measure';
import { useApp } from './context';
import { statusLabel } from './figures';
import { indicatorName } from '../i18n';

const VAR: Record<string, string> = { revenue: '--c-revenue', expenditure: '--c-expenditure', gdp: '--c-gdp', deficit: '--c-deficit', oda: '--c-oda' };

function Swatch({ indicator, status }: { indicator: keyof typeof SERIES_VAR; status: keyof typeof DASH }) {
  const colour = `var(${VAR[SERIES_VAR[indicator]]})`;
  const dash = indicator === 'odaGe' && status === 'actual' ? [4, 3] : DASH[status];
  const hollow = status !== 'actual';
  const shape = SYMBOL[indicator as keyof typeof SYMBOL] ?? 'circle';
  const fill = hollow ? 'var(--stage)' : colour;
  return (
    <svg width="30" height="12" viewBox="0 0 30 12" aria-hidden="true" className="swatch">
      <line x1="0" y1="6" x2="30" y2="6" stroke={colour} strokeWidth={status === 'actual' ? 2.5 : 1.75} strokeDasharray={dash === 'solid' ? undefined : dash.join(' ')} />
      {shape === 'circle' && <circle cx="15" cy="6" r="3.5" fill={fill} stroke={colour} strokeWidth="1.5" />}
      {shape === 'diamond' && <path d="M15 1.5 19.5 6 15 10.5 10.5 6Z" fill={fill} stroke={colour} strokeWidth="1.5" />}
      {shape === 'rect' && <rect x="11.5" y="2.5" width="7" height="7" fill={fill} stroke={colour} strokeWidth="1.5" />}
      {shape === 'triangle' && <path d="M15 1.5 19.5 10 10.5 10Z" fill={fill} stroke={colour} strokeWidth="1.5" />}
    </svg>
  );
}

function StatusSwatch({ status, grant }: { status: keyof typeof DASH; grant?: boolean }) {
  const dash = grant ? [4, 3] : DASH[status];
  const hollow = status !== 'actual' || grant;
  return (
    <svg width="30" height="12" viewBox="0 0 30 12" aria-hidden="true" className="swatch">
      <line x1="0" y1="6" x2="30" y2="6" stroke="var(--ink)" strokeWidth={status === 'actual' && !grant ? 2.5 : 1.75} strokeDasharray={dash === 'solid' ? undefined : dash.join(' ')} />
      <circle cx="15" cy="6" r="3.5" fill={hollow ? 'var(--stage)' : 'var(--ink)'} stroke="var(--ink)" strokeWidth="1.5" />
    </svg>
  );
}

/** Two keys: colour and shape name the indicator, line pattern names the data type. */
export default function Legend({ panels }: { panels: ChartPanel[] }) {
  const { m } = useApp();
  const series = panels.flatMap((p) => p.series);
  if (!series.length) return null;
  const indicators = [...new Set(series.map((s) => s.indicator))];
  const statuses = new Map<string, ChartPanel['series'][number]>();
  for (const s of series) {
    if (s.indicator === 'odaGe') continue;
    statuses.set(`${s.status}:${s.publisher ?? ''}`, s);
  }
  return (
    <div className="legend" aria-label={m.chart.legend}>
      <ul>
        {indicators.map((i) => (
          <li key={i}>
            <Swatch indicator={i} status="actual" />
            <span>{indicatorName(m, i)}</span>
          </li>
        ))}
      </ul>
      <ul>
        {[...statuses.values()].map((s) => (
          <li key={`${s.status}:${s.publisher ?? ''}`}>
            <StatusSwatch status={s.status} />
            <span>{statusLabel(s, m)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
