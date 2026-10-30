import { useCallback, useEffect, useState } from 'react';

export type ThemeChoice = 'auto' | 'light' | 'dark';
const KEY = 'budzse-theme';

function saved(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>(saved);
  // Bumps whenever the painted colours may have changed, so the canvas chart can re-read them.
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const root = document.documentElement;
    if (choice === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', choice);
    try {
      if (choice === 'auto') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, choice);
    } catch {
      /* Storage is only a convenience here. */
    }
    setVersion((v) => v + 1);
  }, [choice]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setVersion((v) => v + 1);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return { choice, setChoice: useCallback((c: ThemeChoice) => setChoice(c), []), version };
}
