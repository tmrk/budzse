import { useEffect, useRef } from 'react';
import type { AnalyticsChoice } from '../lib/analytics';
import type { Messages } from '../i18n';
import type { Lang } from '../types/data';

/** Fixed over the page, so asking and answering move nothing. */
export default function ConsentBanner({ lang, m, focus, onChoose }: { lang: Lang; m: Messages; focus: boolean; onChoose: (choice: AnalyticsChoice) => void }) {
  const first = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!focus) return;
    const opener = document.activeElement as HTMLElement | null;
    first.current?.focus();
    return () => opener?.focus();
  }, [focus]);

  return (
    <section className="consent" aria-label={m.consent.title} data-testid="consent">
      <p>
        {m.consent.text} <a href={`https://policies.google.com/technologies/partner-sites?hl=${lang}`}>{m.consent.more}</a>
      </p>
      <div className="consent-actions">
        <button ref={first} type="button" className="button ghost" onClick={() => onChoose('denied')} data-testid="consent-decline">{m.consent.decline}</button>
        <button type="button" className="button" onClick={() => onChoose('granted')} data-testid="consent-allow">{m.consent.allow}</button>
      </div>
    </section>
  );
}
