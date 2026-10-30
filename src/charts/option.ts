import type { Messages } from '../i18n';
import { axisScale, formatNumber, formatPct } from '../lib/format';
import type { ChartPanel, ChartSeries } from '../lib/measure';
import { FIRST_YEAR, LAST_YEAR, type MetricKey, type ViewState } from '../lib/view';
import type { Lang } from '../types/data';
import { DASH, HOLLOW, SERIES_VAR, SYMBOL, type ChartTheme } from './palette';

const YEARS = Array.from({ length: LAST_YEAR - FIRST_YEAR + 1 }, (_, i) => FIRST_YEAR + i);

interface LayoutBox {
  top: number;
  height: number;
  title: number;
}

export interface ChartInput {
  panels: ChartPanel[];
  view: ViewState;
  lang: Lang;
  messages: Messages;
  theme: ChartTheme;
  width: number;
  height: number;
  reducedMotion: boolean;
  showBreak: boolean;
  unitLabel: (p: ChartPanel) => string;
}

export function chartHeight(panels: number, width: number): number {
  const phone = width < 640;
  if (panels <= 1) return phone ? 360 : 500;
  if (panels === 2) return phone ? 470 : 580;
  return phone ? 600 : 700;
}

/** Names what is drawn and in which unit, so the price basis is always on the chart itself. */
export function panelTitle(p: ChartPanel, m: Messages, unit: string): string {
  const name =
    p.id === 'level' ? p.metrics.map((k, i) => (i && k !== 'gdp' ? m.metricChips[k as MetricKey].toLowerCase() : m.metricChips[k as MetricKey])).join(', ') : p.id === 'deficit' ? m.chart.panelDeficit : m.chart.panelOda;
  return m.chart.panelWithUnit(name, unit);
}

/** Heights are split by how much reading each panel needs: levels get the most room. */
export function panelHeights(panels: ChartPanel[], total: number): LayoutBox[] {
  const topPad = 8;
  const bottom = 58;
  const titleH = 24;
  const gap = 14;
  const usable = total - topPad - bottom - panels.length * titleH - (panels.length - 1) * gap;
  const weight = (p: ChartPanel) => (p.id === 'level' ? (panels.length > 1 ? 1.9 : 1) : 1);
  const sum = panels.reduce((s, p) => s + weight(p), 0);
  let top = topPad;
  return panels.map((p) => {
    const height = Math.max(84, (usable * weight(p)) / sum);
    const box = { title: top, top: top + titleH, height };
    top += titleH + height + gap;
    return box;
  });
}

function axisFormatter(panel: ChartPanel, lang: Lang, exact: boolean) {
  if (panel.unit === 'pct') return (v: number) => formatPct(v, lang, panel.id === 'oda' ? 2 : 0);
  const max = Math.max(1, ...panel.series.flatMap((s) => s.points.map((p) => Math.abs(p.measured.value))));
  const { divisor, name } = axisScale(max, lang);
  return (v: number) => {
    if (exact) return formatNumber(v, lang);
    if (v === 0) return '0';
    const body = formatNumber(v / divisor, lang, divisor >= 1e12 && max / divisor < 10 ? 1 : 0);
    return `${body} ${name}`;
  };
}

function seriesOption(s: ChartSeries, gridIndex: number, ctx: ChartInput) {
  const color = ctx.theme.series[SERIES_VAR[s.metric === 'odaGe' ? 'odaGe' : s.indicator] ?? 'revenue'];
  const data = YEARS.map((y) => {
    const p = s.points.find((q) => q.year === y);
    return p ? p.measured.value : null;
  });
  const hollow = HOLLOW.includes(s.status);
  const single = s.points.length === 1;
  const dense = ctx.width < 560 && !single;
  const dash = s.indicator === 'odaGe' && s.status === 'actual' ? ([4, 3] as number[]) : DASH[s.status];
  return {
    id: s.key,
    type: 'line' as const,
    xAxisIndex: gridIndex,
    yAxisIndex: gridIndex,
    data,
    connectNulls: false,
    symbol: SYMBOL[s.indicator] ?? 'circle',
    symbolSize: single ? 11 : hollow ? 7 : dense ? 4 : 5,
    showSymbol: true,
    showAllSymbol: true,
    lineStyle: {
      color,
      width: s.status === 'actual' ? 2.5 : 1.75,
      type: dash === 'solid' ? ('solid' as const) : dash,
    },
    itemStyle: {
      color: hollow ? ctx.theme.surface : color,
      borderColor: color,
      borderWidth: hollow ? 1.75 : 0,
    },
    emphasis: { focus: 'none' as const, scale: 1.4 },
    animation: !ctx.reducedMotion,
    animationDuration: 280,
    animationDurationUpdate: 280,
    z: s.status === 'actual' ? 3 : 2,
  };
}

export function buildOption(ctx: ChartInput) {
  const { panels, theme, lang, view, height } = ctx;
  const boxes = panelHeights(panels, height);
  const leftPad = view.exact ? (ctx.width < 560 ? 118 : 138) : ctx.width < 560 ? 62 : 86;
  const rightPad = ctx.width < 560 ? 10 : 18;

  const grids = boxes.map((b) => ({ left: leftPad, right: rightPad, top: b.top, height: b.height }));
  const xAxes = panels.map((_, i) => ({
    type: 'category' as const,
    gridIndex: i,
    data: YEARS.map(String),
    boundaryGap: false,
    axisLine: { lineStyle: { color: theme.grid } },
    axisTick: { show: false },
    axisLabel: {
      show: i === panels.length - 1,
      color: theme.muted,
      fontSize: 12,
      hideOverlap: true,
      margin: 10,
    },
    splitLine: { show: false },
    axisPointer: { show: true, type: 'line' as const, lineStyle: { color: theme.muted, type: 'solid' as const, width: 1 }, label: { show: false } },
  }));
  const yAxes = panels.map((p, i) => ({
    type: 'value' as const,
    gridIndex: i,
    axisLine: { show: false },
    axisTick: { show: false },
    splitNumber: boxes[i].height < 130 ? 2 : 4,
    axisLabel: {
      color: theme.muted,
      fontSize: 12,
      formatter: axisFormatter(p, lang, view.exact),
      margin: 8,
    },
    splitLine: { lineStyle: { color: theme.grid, width: 1 } },
    axisPointer: { show: false },
    scale: false,
  }));

  const series = panels.flatMap((p, i) => p.series.map((s) => seriesOption(s, i, ctx)));

  // The selected year stays marked on every panel; the deficit panel also gets a zero line.
  const selectedIndex = view.year - FIRST_YEAR;
  const marks = panels.map((p, i) => ({
    id: `marks-${p.id}`,
    type: 'line' as const,
    xAxisIndex: i,
    yAxisIndex: i,
    data: [] as null[],
    silent: true,
    showSymbol: false,
    markLine: {
      silent: true,
      symbol: 'none',
      animation: false,
      data: [
        { xAxis: selectedIndex, lineStyle: { color: theme.accent, width: 1.5, type: 'solid' as const }, label: { show: false } },
        ...(ctx.showBreak && p.id !== 'oda'
          ? [{
              xAxis: 2010 - FIRST_YEAR,
              lineStyle: { color: theme.muted, width: 1, type: [2, 3] as number[] },
              label: {
                show: i === 0 && ctx.width >= 480,
                formatter: ctx.messages.chart.scopeBreakLabel,
                position: 'insideEndTop' as const,
                color: theme.muted,
                fontSize: 11,
                distance: 2,
              },
            }]
          : []),
        ...(p.id === 'deficit' ? [{ yAxis: 0, lineStyle: { color: theme.ink, width: 1, type: 'solid' as const }, label: { show: false } }] : []),
      ],
    },
  }));

  const titles = panels.map((p, i) => ({
    left: leftPad,
    top: boxes[i].title,
    text: panelTitle(p, ctx.messages, ctx.unitLabel(p)),
    textStyle: { color: theme.ink, fontSize: 13, fontWeight: 600 as const },
  }));

  const startPct = ((view.from - FIRST_YEAR) / (LAST_YEAR - FIRST_YEAR)) * 100;
  const endPct = ((view.to - FIRST_YEAR) / (LAST_YEAR - FIRST_YEAR)) * 100;
  const xIndexes = panels.map((_, i) => i);

  return {
    animation: !ctx.reducedMotion,
    textStyle: { fontFamily: 'Public Sans Variable, system-ui, sans-serif' },
    title: titles,
    grid: grids,
    xAxis: xAxes,
    yAxis: yAxes,
    series: [...series, ...marks],
    axisPointer: { link: [{ xAxisIndex: 'all' as const }] },
    dataZoom: [
      {
        id: 'range',
        type: 'slider' as const,
        xAxisIndex: xIndexes,
        start: startPct,
        end: endPct,
        filterMode: 'none' as const,
        bottom: 6,
        height: 24,
        left: leftPad,
        right: rightPad + 2,
        showDetail: false,
        showDataShadow: false,
        brushSelect: false,
        borderColor: theme.grid,
        backgroundColor: 'transparent',
        fillerColor: `${theme.accent}22`,
        handleSize: '110%',
        handleStyle: { color: theme.surface, borderColor: theme.accent, borderWidth: 1.5 },
        moveHandleSize: 0,
        emphasis: { handleStyle: { borderColor: theme.accent } },
        realtime: true,
      },
    ],
  };
}
