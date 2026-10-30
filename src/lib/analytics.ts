// Google Analytics. Nothing reaches Google, and no cookie is set, until the visitor says yes.
// Page views: the tag sends the first one, and language changes send their own. A year or a measure
// is a state of the same page, so the stream's "page changes based on browser history events"
// setting must stay off in the Analytics admin, or sweeping a chart counts as dozens of page views.
const MEASUREMENT_ID = 'G-WBEQ0R14Q5';
const CHOICE_KEY = 'budzse-analytics';
const DISABLE_FLAG = `ga-disable-${MEASUREMENT_ID}` as const;

export type AnalyticsChoice = 'granted' | 'denied';

declare global {
  interface Window {
    dataLayer?: unknown[];
    [DISABLE_FLAG: `ga-disable-${string}`]: boolean | undefined;
  }
}

let tagAdded = false;

// The tag reads the arguments object itself, not an array, so this cannot be an arrow function.
function gtag(..._args: unknown[]) {
  (window.dataLayer ??= []).push(arguments);
}

export function readChoice(): AnalyticsChoice | null {
  try {
    const v = localStorage.getItem(CHOICE_KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    return null;
  }
}

export function saveChoice(choice: AnalyticsChoice) {
  try {
    localStorage.setItem(CHOICE_KEY, choice);
  } catch {
    /* Private modes can refuse storage; the question then comes back on the next visit. */
  }
}

export function startAnalytics() {
  window[DISABLE_FLAG] = false;
  if (tagAdded) {
    gtag('consent', 'update', { analytics_storage: 'granted' });
    gtag('event', 'page_view');
    return;
  }
  tagAdded = true;
  gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'granted' });
  gtag('js', new Date());
  // tmrk.github.io hosts other projects too, so the cookies stay on this one's path.
  gtag('config', MEASUREMENT_ID, { cookie_path: import.meta.env.BASE_URL, allow_google_signals: false, allow_ad_personalization_signals: false });
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.append(script);
}

/** Withdrawing consent stops collection at once and removes what the tag stored. */
export function stopAnalytics() {
  window[DISABLE_FLAG] = true;
  if (tagAdded) gtag('consent', 'update', { analytics_storage: 'denied' });
  for (const entry of document.cookie.split('; ')) {
    const name = entry.split('=')[0];
    if (name !== '_ga' && !name.startsWith('_ga_')) continue;
    document.cookie = `${name}=; path=${import.meta.env.BASE_URL}; max-age=0`;
    document.cookie = `${name}=; path=${import.meta.env.BASE_URL}; domain=${location.hostname}; max-age=0`;
  }
}

export function trackPageView(title: string) {
  gtag('event', 'page_view', { page_location: location.href, page_title: title });
}
