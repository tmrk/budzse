import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MESSAGES, type Messages } from '../i18n';
import { DEFAULT_VIEW, parseQuery, pathForLang, resolveLang, toQuery, type ViewState } from '../lib/view';
import type { Lang } from '../types/data';

const LANG_KEY = 'budzse-lang';

export function readSavedLang(): string | null {
  try {
    return localStorage.getItem(LANG_KEY);
  } catch {
    return null;
  }
}

const deviceTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

function saveLang(lang: Lang) {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    /* Private modes can refuse storage; the URL still carries the language. */
  }
}

function applyDocumentLang(lang: Lang, m: Messages) {
  document.documentElement.lang = lang;
  document.title = m.meta.title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', m.meta.description);
  document.querySelector('link[rel="canonical"]')?.setAttribute('href', `https://tmrk.github.io/budzse/${lang}/`);
}

export function useAppState() {
  const [lang, setLangState] = useState<Lang>(() => resolveLang(location.pathname, readSavedLang(), deviceTimeZone()));
  const [view, setViewState] = useState<ViewState>(() => parseQuery(location.search, DEFAULT_VIEW));
  const messages = MESSAGES[lang];
  const latest = useRef(view);
  latest.current = view;

  useEffect(() => applyDocumentLang(lang, messages), [lang, messages]);

  useEffect(() => {
    const onPop = () => {
      const fromPath = resolveLang(location.pathname, readSavedLang(), deviceTimeZone());
      setLangState(fromPath);
      setViewState(parseQuery(location.search, DEFAULT_VIEW));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  /** Discrete choices add a history entry so Back undoes them; dragging only replaces it. */
  const setView = useCallback((patch: Partial<ViewState>, mode: 'push' | 'replace' = 'push') => {
    const next = { ...latest.current, ...patch };
    latest.current = next;
    setViewState(next);
    const url = `${location.pathname}${toQuery(next)}`;
    if (mode === 'push') history.pushState(null, '', url);
    else history.replaceState(null, '', url);
  }, []);

  const setLang = useCallback((next: Lang) => {
    saveLang(next);
    setLangState(next);
    history.pushState(null, '', `${pathForLang(location.pathname, next)}${toQuery(latest.current)}`);
  }, []);

  return useMemo(() => ({ lang, setLang, view, setView, messages }), [lang, setLang, view, setView, messages]);
}
