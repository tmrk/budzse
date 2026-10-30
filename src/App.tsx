import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Archive from './components/Archive';
import { AppContext, type AppContextValue } from './components/context';
import { LensControl, ScopeControl } from './components/Controls';
import Hero, { YearStepper } from './components/Hero';
import MoneyChart from './components/MoneyChart';
import { AidSection, EconomySection, PlanSection } from './components/Sections';
import SourceDialog from './components/SourceDialog';
import YearFigures from './components/YearFigures';
import { figure } from './components/figures';
import { useAppState } from './hooks/useAppState';
import { useTheme, type ThemeChoice } from './hooks/useTheme';
import { ledgerRows, type Measured } from './lib/measure';
import type { Dataset, Lang, Observation } from './types/data';

const NEXT_THEME: Record<ThemeChoice, ThemeChoice> = { auto: 'light', light: 'dark', dark: 'auto' };

function TopBar({ lang, setLang, m, theme, setTheme, scrolled, children }: { lang: Lang; setLang: (l: Lang) => void; m: AppContextValue['m']; theme: ThemeChoice; setTheme: (t: ThemeChoice) => void; scrolled: boolean; children?: React.ReactNode }) {
  const themeName = theme === 'auto' ? m.app.themeAuto : theme === 'light' ? m.app.themeLight : m.app.themeDark;
  return (
    <header className={scrolled ? 'bar scrolled' : 'bar'}>
      <div className="bar-inner">
        <h1 className="wordmark">Büdzsé</h1>
        <div className="bar-tools">{children}</div>
        <div className="bar-prefs">
          <div className="lang-switch" role="group" aria-label={m.app.language}>
            {(['hu', 'en'] as Lang[]).map((l) => (
              <button key={l} type="button" lang={l} aria-pressed={lang === l} onClick={() => lang !== l && setLang(l)} data-testid={`lang-${l}`}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <button type="button" className="theme-button" onClick={() => setTheme(NEXT_THEME[theme])} aria-label={`${m.app.theme}: ${themeName}`} title={`${m.app.theme}: ${themeName}`} data-testid="theme">
            <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
              <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
              {theme === 'auto' && <path d="M10 2a8 8 0 0 1 0 16z" fill="currentColor" />}
              {theme === 'dark' && <circle cx="10" cy="10" r="8" fill="currentColor" />}
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}

function Tagline({ m }: { m: AppContextValue['m'] }) {
  return <p className="tagline">{m.app.tagline}</p>;
}

export default function App() {
  const { lang, setLang, view, setView, messages: m } = useAppState();
  const { choice, setChoice } = useTheme();
  const [data, setData] = useState<Dataset | null>(null);
  const [failed, setFailed] = useState(false);
  const [target, setTarget] = useState<{ obs: Observation; measured?: Measured | null } | null>(null);
  const [preview, setPreview] = useState<number | null>(null);
  const [shareState, setShareState] = useState<'idle' | 'ok' | 'failed'>('idle');
  const [scrolled, setScrolled] = useState(false);
  const heroEnd = useRef<HTMLDivElement>(null);

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

  const year = preview ?? view.year;
  const ctx = useMemo<AppContextValue | null>(() => (data ? { data, lang, m, view, setView, year, setPreview, inspect } : null), [data, lang, m, view, setView, year, inspect]);
  const rows = useMemo(() => (data ? ledgerRows(data, view.scope, view) : []), [data, view.scope, view.real, view.ref, view.relative]);

  // Once the big year has scrolled away, the bar takes over the job of showing and changing it.
  useEffect(() => {
    const el = heroEnd.current;
    if (!el) return;
    const onScroll = () => setScrolled(el.getBoundingClientRect().top < 0);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [ctx !== null]);

  const row = rows.find((r) => r.year === year);
  const summary = row ? m.chart.aria(m.chart.summary(year, [row.revenue, row.expenditure, row.deficit].flatMap((x) => (x ? [figure(x, lang)] : [])).join(', '))) : m.year.noData;
  const anyEstimate = rows.some((r) => r.deficit?.estimated);

  return (
    <div className="page">
      <a className="skip" href="#data-table" onClick={() => document.querySelector<HTMLDetailsElement>('#data-table')?.setAttribute('open', '')}>{m.app.skip}</a>
      {ctx ? (
        <AppContext.Provider value={ctx}>
          <TopBar lang={lang} setLang={setLang} m={m} theme={choice} setTheme={setChoice} scrolled={scrolled}>
            {scrolled && (
              <>
                <YearStepper testId="bar-steps" compact />
                <LensControl compact />
              </>
            )}
          </TopBar>
          <Tagline m={m} />
          <main>
            <section className="hero" aria-label={m.hero.title}>
              <Hero rows={rows} />
              <div className="hero-chart">
                <div className="hero-controls">
                  <ScopeControl />
                  <LensControl />
                </div>
                <MoneyChart rows={rows} summary={summary} />
                <div className="hero-notes">
                  <p className="fine" data-testid="scope-help">{view.scope === 'general' ? m.controls.scopeHelpGeneral : m.controls.scopeHelpCentral}</p>
                  {view.scope === 'central' && <p className="fine">{m.chart.scopeBreak}</p>}
                  {view.real && <p className="fine">{m.chart.realNote}</p>}
                  {view.real && anyEstimate && <p className="fine">{m.chart.estimatedNote}</p>}
                  <p className="fine hint-chart">
                    {m.chart.hint}{' '}
                    <button type="button" className="text-button" onClick={onShare} data-testid="share">
                      {shareState === 'ok' ? m.controls.shared : shareState === 'failed' ? m.controls.shareFailed : m.controls.share}
                    </button>
                  </p>
                </div>
              </div>
            </section>
            <div ref={heroEnd} className="hero-end" />
            <YearFigures />
            <PlanSection />
            <EconomySection />
            <AidSection />
            <Archive />
          </main>
          <SourceDialog target={target} onClose={() => setTarget(null)} />
        </AppContext.Provider>
      ) : (
        <>
          <TopBar lang={lang} setLang={setLang} m={m} theme={choice} setTheme={setChoice} scrolled={false} />
          <Tagline m={m} />
          {failed ? (
            <p className="status-line" role="alert">
              {m.app.loadError} <button type="button" className="text-button" onClick={() => location.reload()}>{m.app.retry}</button>
            </p>
          ) : (
            <p className="status-line" role="status">{m.app.loading}</p>
          )}
        </>
      )}
      <footer className="footer">
        <p>{m.app.footerNeutral}</p>
        <p>{m.app.footerLicence} <a href="https://github.com/tmrk/budzse">{m.app.footerCode}</a></p>
      </footer>
    </div>
  );
}
