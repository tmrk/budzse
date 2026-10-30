import { useEffect, useMemo, useRef, useState } from 'react';
import { type ECharts, init } from '../charts/echarts';
import { buildOption, chartHeight, panelTitle } from '../charts/option';
import { readTheme, SERIES_VAR } from '../charts/palette';
import { type ChartPanel, planVersusActual } from '../lib/measure';
import { formatDate, formatSignedHuf, formatSignedPct } from '../lib/format';
import { FIRST_YEAR, LAST_YEAR } from '../lib/view';
import { useApp } from './context';
import { figure, seriesLabel } from './figures';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export default function ChartView({ themeVersion, panels }: { themeVersion: number; panels: ChartPanel[] }) {
  const { data, view, setView, lang, m } = useApp();
  const host = useRef<HTMLDivElement>(null);
  const chart = useRef<ECharts | null>(null);
  const [width, setWidth] = useState(() => (typeof window === 'undefined' ? 1000 : window.innerWidth));
  const height = chartHeight(panels.length, width);
  const coarse = useMemo(() => window.matchMedia('(pointer: coarse)').matches, []);
  const reducedMotion = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const viewRef = useRef(view);
  viewRef.current = view;
  const panelsRef = useRef(panels);
  panelsRef.current = panels;

  useEffect(() => {
    if (!host.current) return;
    const c = init(host.current, undefined, { renderer: 'canvas' });
    chart.current = c;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width;
      setWidth(w);
      c.resize();
    });
    ro.observe(host.current);

    // A click or tap anywhere in a panel selects the nearest year.
    c.getZr().on('click', (e: { offsetX: number; offsetY: number }) => {
      const pixel = [e.offsetX, e.offsetY];
      for (let i = 0; i < panelsRef.current.length; i++) {
        if (c.containPixel({ gridIndex: i }, pixel)) {
          const idx = c.convertFromPixel({ gridIndex: i }, pixel) as unknown as number[];
          const year = FIRST_YEAR + Math.round(idx[0]);
          if (year >= FIRST_YEAR && year <= LAST_YEAR) setView({ year });
          break;
        }
      }
    });

    c.on('datazoom', () => {
      const opt = c.getOption() as unknown as { dataZoom: { startValue: number; endValue: number }[] };
      const z = opt.dataZoom[0];
      const from = FIRST_YEAR + z.startValue;
      const to = FIRST_YEAR + z.endValue;
      if (from !== viewRef.current.from || to !== viewRef.current.to) setView({ from, to }, 'replace');
    });

    return () => {
      ro.disconnect();
      c.dispose();
      chart.current = null;
    };
  }, [setView]);

  const unitLabel = (p: ChartPanel) => {
    if (view.relative) return p.id === 'oda' ? m.chart.unitPctGni : m.chart.unitPct;
    if (!view.real) return m.chart.unitNominal;
    return view.ref === 'latest' ? m.controls.referenceLatest(formatDate(data.cpi.latestMonth.month, lang)) : m.controls.referenceYear(view.ref);
  };

  useEffect(() => {
    const c = chart.current;
    if (!c || !host.current) return;
    const theme = readTheme(host.current);
    const showBreak = view.scope === 'central' && panels.some((p) => p.id !== 'oda' && p.series.some((s) => s.indicator !== 'gdp')) && view.from <= 2010 && view.to >= 2009;
    const option = buildOption({ panels, view, lang, messages: m, theme, width, height, reducedMotion, showBreak, unitLabel });

    const tooltip = {
      show: !coarse,
      trigger: 'axis' as const,
      enterable: true,
      confine: true,
      transitionDuration: 0,
      backgroundColor: theme.surface,
      borderColor: theme.grid,
      borderWidth: 1,
      padding: 0,
      extraCssText: 'box-shadow:0 6px 20px rgba(0,0,0,.14);border-radius:4px;max-width:340px;white-space:normal;',
      textStyle: { color: theme.ink },
      axisPointer: { type: 'line' as const },
      formatter: (params: { dataIndex: number }[] | { dataIndex: number }) => {
        const idx = Array.isArray(params) ? params[0]?.dataIndex : params.dataIndex;
        if (idx === undefined) return '';
        const year = FIRST_YEAR + idx;
        const rows: string[] = [];
        for (const p of panelsRef.current) {
          for (const s of p.series) {
            const pt = s.points.find((q) => q.year === year);
            if (!pt) continue;
            const src = data.sources[pt.measured.obs.source];
            const color = theme.series[SERIES_VAR[s.indicator] ?? 'revenue'];
            rows.push(
              `<div class="tt-row"><span class="tt-dot" style="background:${color}"></span><span class="tt-name">${esc(seriesLabel(s.indicator, s.status, s.publisher, m))}${pt.measured.estimated ? ` (${esc(m.chart.estimated)})` : ''}</span><strong class="tt-val">${esc(figure(pt.measured, lang, viewRef.current.exact))}</strong><a class="tt-src" href="${esc(src.url)}" target="_blank" rel="noopener noreferrer">${esc(m.chart.tooltipSource)}: ${esc(src.institution[lang])}</a></div>`,
            );
          }
          const orig = p.series.flatMap((s) => s.points).filter((q) => q.year === year && q.measured.obs.status === 'original');
          for (const plan of orig) {
            const actual = p.series.flatMap((s) => s.points).find((q) => q.year === year && q.measured.obs.status === 'actual' && q.measured.obs.indicator === plan.measured.obs.indicator);
            const d = planVersusActual(plan.measured.obs, actual?.measured.obs);
            if (d && p.unit === 'HUF') {
              rows.push(`<div class="tt-diff">${esc(m.year.difference)}: ${esc(formatSignedHuf(actual!.measured.value - plan.measured.value, lang))} (${esc(formatSignedPct(d.percent, lang))})</div>`);
            }
          }
        }
        if (!rows.length) return `<div class="tt"><div class="tt-year">${year}</div><div class="tt-empty">${esc(m.year.noData)}</div></div>`;
        return `<div class="tt"><div class="tt-year">${year}</div>${rows.join('')}</div>`;
      },
    };

    c.setOption({ ...option, tooltip }, { notMerge: true, lazyUpdate: true });
    c.resize({ height });
  }, [panels, view, lang, m, width, height, themeVersion, reducedMotion, coarse, data]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' && view.year > FIRST_YEAR) {
      setView({ year: view.year - 1 }, 'replace');
      e.preventDefault();
    } else if (e.key === 'ArrowRight' && view.year < LAST_YEAR) {
      setView({ year: view.year + 1 }, 'replace');
      e.preventDefault();
    }
  };

  const summary = m.chart.summary(panels.map((p) => panelTitle(p, m, unitLabel(p))).join(', '), view.from, view.to);

  return (
    <div
      className="chart-host"
      style={{ height }}
      ref={host}
      role="img"
      tabIndex={0}
      aria-label={m.chart.aria(summary)}
      onKeyDown={onKey}
      data-testid="chart"
    />
  );
}
