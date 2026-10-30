import { useCallback, useEffect, useRef, useState } from 'react';
import { readChoice, saveChoice, startAnalytics, stopAnalytics, trackPageView, type AnalyticsChoice } from '../lib/analytics';
import type { Lang } from '../types/data';

export function useAnalytics(lang: Lang, title: string) {
  const [choice, setChoice] = useState<AnalyticsChoice | null>(readChoice);
  const [reopened, setReopened] = useState(false);
  const previousLang = useRef(lang);

  // Only production counts: a dev server is not a visit.
  useEffect(() => {
    if (!import.meta.env.PROD) return;
    if (choice === 'granted') startAnalytics();
    else stopAnalytics();
  }, [choice]);

  useEffect(() => {
    if (previousLang.current === lang) return;
    previousLang.current = lang;
    if (import.meta.env.PROD && choice === 'granted') trackPageView(title);
  }, [lang, title, choice]);

  const choose = useCallback((next: AnalyticsChoice) => {
    saveChoice(next);
    setChoice(next);
    setReopened(false);
  }, []);

  return { asking: choice === null || reopened, reopened, choose, reopen: useCallback(() => setReopened(true), []) };
}
