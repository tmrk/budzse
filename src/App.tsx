import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Archive from './components/Archive';
import ConsentBanner from './components/ConsentBanner';
import { AppContext, type AppContextValue } from './components/context';
import { LensControl, ScopeControl } from './components/Controls';
import Hero, { YearStepper } from './components/Hero';
import MoneyChart from './components/MoneyChart';
import { AidSection, EconomySection, HelpsSection, PlanSection } from './components/Sections';
import SourceDialog, { type SourceTarget } from './components/SourceDialog';
import { figure } from './components/figures';
import { useAnalytics } from './hooks/useAnalytics';
import { useAppState } from './hooks/useAppState';
import { useTheme, type ThemeChoice } from './hooks/useTheme';
import { ledgerRows, type Measured } from './lib/measure';
import { formatDate } from './lib/format';
import type { Dataset, Gap, Lang, Observation } from './types/data';

const NEXT_THEME: Record<ThemeChoice, ThemeChoice> = { auto: 'light', light: 'dark', dark: 'auto' };

function TopBar({ barRef, lang, setLang, m, theme, setTheme, children }: { barRef?: React.Ref<HTMLElement>; lang: Lang; setLang: (l: Lang) => void; m: AppContextValue['m']; theme: ThemeChoice; setTheme: (t: ThemeChoice) => void; children?: React.ReactNode }) {
  const themeName = theme === 'auto' ? m.app.themeAuto : theme === 'light' ? m.app.themeLight : m.app.themeDark;
  return (
    <header ref={barRef} className="bar">
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


export default function App() {
  const { lang, setLang, view, setView, messages: m } = useAppState();
  const { choice, setChoice } = useTheme();
  const consent = useAnalytics(lang, m.meta.title);
  const [data, setData] = useState<Dataset | null>(null);
  const [failed, setFailed] = useState(false);
  const [target, setTarget] = useState<SourceTarget | null>(null);
  const [preview, setPreview] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const barRef = useRef<HTMLElement>(null);

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
  const explain = useCallback((gap: Gap) => setTarget({ gap }), []);

  const year = preview ?? view.year;
  const ctx = useMemo<AppContextValue | null>(() => (data ? { data, lang, m, view, setView, year, setPreview, inspect, explain } : null), [data, lang, m, view, setView, year, inspect, explain]);
  const rows = useMemo(() => (data ? ledgerRows(data, view.scope, view) : []), [data, view.scope, view.real, view.ref, view.relative]);

  // As soon as the big year has passed under the bar, the bar takes over showing and changing it.
  useEffect(() => {
    const year = document.querySelector('.year-big');
    const bar = barRef.current;
    if (!year || !bar) return;
    const onScroll = () => setScrolled(year.getBoundingClientRect().bottom <= bar.getBoundingClientRect().bottom);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [ctx !== null]);

  const row = rows.find((r) => r.year === year);
  const summary = row ? m.chart.aria(m.chart.summary(year, [row.revenue, row.expenditure, row.deficit].flatMap((x) => (x ? [figure(x, lang)] : [])).join(', '))) : m.year.noData;

  return (
    <div className="page">
      <a className="skip" href="#data-table" onClick={() => document.querySelector<HTMLDetailsElement>('#data-table')?.setAttribute('open', '')}>{m.app.skip}</a>
      {ctx ? (
        <AppContext.Provider value={ctx}>
          <TopBar barRef={barRef} lang={lang} setLang={setLang} m={m} theme={choice} setTheme={setChoice}>
            {scrolled ? (
              <>
                <YearStepper testId="bar-steps" compact />
                <LensControl compact />
              </>
            ) : (
              <p className="tagline">{m.app.tagline}</p>
            )}
          </TopBar>
          <p className="tagline tagline-flow">{m.app.tagline}</p>
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
                  <p className="hint" data-testid="hint">{m.app.hint}</p>
                  <p className="fine" data-testid="scope-help">{view.scope === 'general' ? m.controls.scopeHelpGeneral : m.controls.scopeHelpCentral}</p>
                  {view.real && <p className="fine">{m.chart.realNote}</p>}
                </div>
              </div>
            </section>
            <PlanSection />
            <EconomySection />
            <AidSection />
            <HelpsSection />
            <Archive />
          </main>
          <SourceDialog target={target} onClose={() => setTarget(null)} />
        </AppContext.Provider>
      ) : (
        <>
          <TopBar lang={lang} setLang={setLang} m={m} theme={choice} setTheme={setChoice}>
            <p className="tagline">{m.app.tagline}</p>
          </TopBar>
          <p className="tagline tagline-flow">{m.app.tagline}</p>
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
        <p>{m.app.footerLicence}</p>
        <p className="footer-updated" data-testid="last-updated">
          {data && <>{m.app.footerUpdated} <time dateTime={data.generatedAt}>{formatDate(data.generatedAt, lang)}</time></>}
        </p>
        <p className="footer-links">
          <a href="https://github.com/tmrk/budzse">{m.app.footerCode}</a>
          <a href={`${import.meta.env.BASE_URL}${lang}/api/`} data-testid="api-link">{m.app.footerApi}</a>
          <button type="button" className="text-button" onClick={consent.reopen} data-testid="consent-open">{m.consent.settings}</button>
        </p>
      </footer>
      {consent.asking && <ConsentBanner lang={lang} m={m} focus={consent.reopened} onChoose={consent.choose} />}
    </div>
  );
}
