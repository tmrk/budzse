import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Compare from './components/Compare';
import { AppContext, type AppContextValue } from './components/context';
import { DetailControls, QuickControls } from './components/Controls';
import ChartReadout from './components/ChartReadout';
import Coverage from './components/Coverage';
import DataTable from './components/DataTable';
import Legend from './components/Legend';
import Methodology from './components/Methodology';
import SourceDialog from './components/SourceDialog';
import YearPanel from './components/YearPanel';
import { chartHeight } from './charts/option';
import { useAppState } from './hooks/useAppState';
import { useTheme, type ThemeChoice } from './hooks/useTheme';
import { formatDate } from './lib/format';
import { buildPanels, type Measured } from './lib/measure';
import type { Dataset, Lang, Observation } from './types/data';

const ChartView = lazy(() => import('./components/ChartView'));

function Wordmark() {
  return (
    <span className="wordmark">
      <span className="sr-only">Büdzsé</span>
      <span aria-hidden="true">
        B<span className="wordmark-u">u<i className="dot dot-a" /><i className="dot dot-b" /></span>dzsé
      </span>
    </span>
  );
}

const NEXT_THEME: Record<ThemeChoice, ThemeChoice> = { auto: 'light', light: 'dark', dark: 'auto' };

function Masthead({ lang, setLang, m, theme, setTheme, data }: { lang: Lang; setLang: (l: Lang) => void; m: AppContextValue['m']; theme: ThemeChoice; setTheme: (t: ThemeChoice) => void; data: Dataset | null }) {
  const latest = data?.latestUpdate[0];
  const themeName = theme === 'auto' ? m.app.themeAuto : theme === 'light' ? m.app.themeLight : m.app.themeDark;
  return (
    <header className="masthead">
      <div className="masthead-top">
        <h1><Wordmark /></h1>
        <div className="masthead-tools">
          <div className="lang-switch" role="group" aria-label={m.app.language}>
            {(['hu', 'en'] as Lang[]).map((l) => (
              <button key={l} type="button" lang={l} aria-pressed={lang === l} onClick={() => lang !== l && setLang(l)} data-testid={`lang-${l}`}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <button type="button" className="theme-button" onClick={() => setTheme(NEXT_THEME[theme])} aria-label={`${m.app.theme}: ${themeName}`} title={`${m.app.theme}: ${themeName}`} data-testid="theme">
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
              <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
              {theme === 'auto' && <path d="M10 2a8 8 0 0 1 0 16z" fill="currentColor" />}
              {theme === 'dark' && <circle cx="10" cy="10" r="8" fill="currentColor" />}
            </svg>
          </button>
        </div>
      </div>
      <div className="masthead-body">
        <p className="tagline">{m.app.tagline}</p>
        {latest && (
          <p className="latest">
            {m.app.latest}: {latest.label}, {formatDate(latest.date, lang)}
          </p>
        )}
      </div>
    </header>
  );
}

export default function App() {
  const { lang, setLang, view, setView, messages: m } = useAppState();
  const { choice, setChoice, version } = useTheme();
  const [data, setData] = useState<Dataset | null>(null);
  const [failed, setFailed] = useState(false);
  const [target, setTarget] = useState<{ obs: Observation; measured?: Measured | null } | null>(null);
  const [shareState, setShareState] = useState<'idle' | 'ok' | 'failed'>('idle');

  useEffect(() => {
    let live = true;
    fetch(`${import.meta.env.BASE_URL}data/budzse.json`)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((d: Dataset) => live && setData(d))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, []);

  const inspect = useCallback((obs: Observation, measured?: Measured | null) => setTarget({ obs, measured }), []);
  const onShare = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      setShareState('ok');
    } catch {
      setShareState('failed');
    }
    window.setTimeout(() => setShareState('idle'), 2500);
  }, []);

  const ctx = useMemo<AppContextValue | null>(() => (data ? { data, lang, m, view, setView, inspect } : null), [data, lang, m, view, setView, inspect]);
  const panels = useMemo(() => (data ? buildPanels(data, view) : []), [data, view]);

  const hasPoints = panels.some((p) => p.series.some((s) => s.points.length));
  const gdpWarning = view.real && view.metrics.includes('gdp') && !view.relative;
  const anyEstimate = panels.some((p) => p.series.some((s) => s.points.some((pt) => pt.measured.estimated)));
  const breakVisible = view.scope === 'central' && view.metrics.some((k) => k === 'revenue' || k === 'expenditure' || k === 'deficit') && view.from <= 2010 && view.to >= 2009;

  return (
    <div className="page">
      <a className="skip" href="#data-table">{m.app.skip}</a>
      <Masthead lang={lang} setLang={setLang} m={m} theme={choice} setTheme={setChoice} data={data} />
      {!ctx && !failed && <p className="status-line" role="status">{m.app.loading}</p>}
      {failed && (
        <p className="status-line" role="alert">
          {m.app.loadError} <button type="button" className="text-button" onClick={() => location.reload()}>{m.app.retry}</button>
        </p>
      )}
      {ctx && (
        <AppContext.Provider value={ctx}>
          <main>
            <div className="workspace">
              <div className="stage">
                <QuickControls />
                <DetailControls onShare={onShare} shareState={shareState} />
                <Legend panels={panels} />
                <div className="chart-area">
                  {view.metrics.length === 0 ? (
                    <p className="empty-state">{m.chart.empty}</p>
                  ) : !hasPoints ? (
                    <p className="empty-state">{m.chart.emptyMode}</p>
                  ) : (
                    <Suspense fallback={<div className="chart-placeholder" style={{ height: chartHeight(panels.length, window.innerWidth) }} role="status">{m.app.loading}</div>}>
                      <ChartView panels={panels} themeVersion={version} />
                    </Suspense>
                  )}
                </div>
                <ChartReadout panels={panels} />
                <div className="chart-notes">
                  <p className="fine hint-touch">{m.chart.tapHint}</p>
                  <p className="fine hint-mouse">{m.chart.clickHint}</p>
                  {breakVisible && <p className="fine">{m.chart.scopeBreak}</p>}
                  {gdpWarning && <p className="fine" data-testid="gdp-real-note">{m.chart.gdpReal}</p>}
                  {anyEstimate && <p className="fine">{m.chart.estimatedNote}</p>}
                  {view.relative && view.metrics.includes('oda') && <p className="fine">{m.controls.relativeOdaNote}</p>}
                  {view.relative && view.real && <p className="fine">{m.controls.relativeRealNote}</p>}
                  {view.relative && view.metrics.includes('gdp') && <p className="fine">{m.controls.relativeGdpNote}</p>}
                  {view.scope === 'general' && view.view !== 'actual' && <p className="fine">{m.chart.missingGeneralPlan}</p>}
                  {view.metrics.includes('oda') && view.view !== 'actual' && <p className="fine">{m.chart.noOdaPlan}</p>}
                </div>
              </div>
              <aside className="side">
                <YearPanel />
              </aside>
            </div>
            <div className="analysis">
              <Compare />
              <Coverage />
            </div>
            <DataTable />
            <Methodology />
          </main>
          <SourceDialog target={target} onClose={() => setTarget(null)} />
        </AppContext.Provider>
      )}
      <footer className="footer">
        <p>{m.app.footerNeutral}</p>
        <p>{m.app.footerLicence} <a href="https://github.com/tmrk/budzse">{m.app.footerCode}</a></p>
      </footer>
    </div>
  );
}
