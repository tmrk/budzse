import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

const ready = async (page: Page) => {
  await expect(page.getByTestId('ledger')).toBeVisible();
  await expect(page.locator('[data-testid="chart"] svg')).toBeVisible();
};
const openFold = async (page: Page, testId: string) => {
  const fold = page.getByTestId(testId);
  if (!(await fold.evaluate((d: HTMLDetailsElement) => d.open))) await fold.locator('summary').first().click();
};
// Setting the attribute, because emulated mobile pans the visual viewport during a scripted scroll
// and Playwright's hit check then misreads a click. A real tap works: see the tap test below.
const openEverything = (page: Page) => page.locator('details').evaluateAll((all) => all.forEach((d) => ((d as HTMLDetailsElement).open = true)));
const lens = (page: Page, name: 'forint' | 'real' | 'share') => page.getByTestId(`lens-${name}`).first();

test.describe('routing on the production build', () => {
  test('root defaults to Hungarian', async ({ page }) => {
    await page.goto('/budzse/');
    await ready(page);
    await expect(page.locator('html')).toHaveAttribute('lang', 'hu');
    await expect(lens(page, 'forint')).toHaveText('Forintban');
  });

  test('/hu/ serves Hungarian directly', async ({ page }) => {
    const res = await page.goto('/budzse/hu/');
    expect(res?.status()).toBe(200);
    await ready(page);
    await expect(page.locator('html')).toHaveAttribute('lang', 'hu');
  });

  test('/en/ serves English directly', async ({ page }) => {
    const res = await page.goto('/budzse/en/');
    expect(res?.status()).toBe(200);
    await ready(page);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(lens(page, 'forint')).toHaveText('Forints');
    await expect(page).toHaveTitle(/Hungary/);
  });

  test('a refresh of a language URL keeps working', async ({ page }) => {
    await page.goto('/budzse/en/');
    await ready(page);
    await page.reload();
    await ready(page);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('deep links restore the configuration', async ({ page }) => {
    await page.goto('/budzse/en/?s=c&real=1&ref=2020&y=2012');
    await ready(page);
    await expect(page.getByTestId('year-select')).toHaveValue('2012');
    await expect(lens(page, 'real')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('reference')).toHaveValue('2020');
    await expect(page.getByTestId('scope-central')).toHaveAttribute('aria-pressed', 'true');
  });

  test('links from the earlier version still open', async ({ page }) => {
    await page.goto('/budzse/en/?m=def,oda&v=both&from=2005&to=2020&x=1&y=2012');
    await ready(page);
    await expect(page.getByTestId('year-select')).toHaveValue('2012');
  });

  test('unknown paths still load the app', async ({ page }) => {
    await page.goto('/budzse/nincs-ilyen');
    await ready(page);
  });
});

test.describe('language', () => {
  test('switching does not reload and preserves state', async ({ page }) => {
    await page.goto('/budzse/hu/?y=2015&real=1&ref=2020&s=c');
    await ready(page);
    await page.evaluate(() => ((window as unknown as { __marker: number }).__marker = 42));
    await page.getByTestId('lang-en').click();
    await expect(page).toHaveURL(/\/budzse\/en\/\?/);
    await expect(lens(page, 'forint')).toHaveText('Forints');
    expect(await page.evaluate(() => (window as unknown as { __marker: number }).__marker)).toBe(42);
    await expect(page.getByTestId('year-select')).toHaveValue('2015');
    await expect(lens(page, 'real')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('reference')).toHaveValue('2020');
    await expect(page.getByTestId('scope-central')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('saved preference applies at the root but not over an explicit URL', async ({ page }) => {
    await page.goto('/budzse/hu/');
    await ready(page);
    await page.getByTestId('lang-en').click();
    await expect(lens(page, 'forint')).toHaveText('Forints');
    await page.goto('/budzse/');
    await ready(page);
    await expect(lens(page, 'forint')).toHaveText('Forints');
    await page.goto('/budzse/hu/');
    await ready(page);
    await expect(lens(page, 'forint')).toHaveText('Forintban');
  });

  test('back and forward move between languages', async ({ page }) => {
    await page.goto('/budzse/hu/');
    await ready(page);
    await page.getByTestId('lang-en').click();
    await expect(lens(page, 'forint')).toHaveText('Forints');
    await page.goBack();
    await expect(lens(page, 'forint')).toHaveText('Forintban');
    await expect(page).toHaveURL(/\/budzse\/hu\//);
    await page.goForward();
    await expect(lens(page, 'forint')).toHaveText('Forints');
  });

  test.describe('outside Hungary', () => {
    test.use({ timezoneId: 'Europe/Vienna' });

    test('the root becomes the English page without a reload, and keeps the link', async ({ page }) => {
      const documents: string[] = [];
      page.on('request', (r) => {
        if (r.resourceType() === 'document') documents.push(r.url());
      });
      await page.goto('/budzse/?y=2012');
      await ready(page);
      await expect(page).toHaveURL(/\/budzse\/en\/\?y=2012$/);
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://tmrk.github.io/budzse/en/');
      await expect(lens(page, 'forint')).toHaveText('Forints');
      await expect(page.getByTestId('year-select')).toHaveValue('2012');
      expect(documents).toHaveLength(1);
    });

    test('a link to the Hungarian page stays Hungarian', async ({ page }) => {
      await page.goto('/budzse/hu/');
      await ready(page);
      await expect(page).toHaveURL(/\/budzse\/hu\/$/);
      await expect(lens(page, 'forint')).toHaveText('Forintban');
    });

    test('choosing Hungarian lasts, at the root too', async ({ page }) => {
      await page.goto('/budzse/');
      await ready(page);
      await page.getByTestId('lang-hu').click();
      await page.goto('/budzse/');
      await ready(page);
      await expect(page).toHaveURL(/\/budzse\/$/);
      await expect(lens(page, 'forint')).toHaveText('Forintban');
    });

    test('an unknown path still loads the app, in English', async ({ page }) => {
      await page.goto('/budzse/nincs-ilyen');
      await ready(page);
      await expect(lens(page, 'forint')).toHaveText('Forints');
    });
  });

  test('in Hungary the root stays the Hungarian page', async ({ page }) => {
    await page.goto('/budzse/?y=2012');
    await ready(page);
    await expect(page).toHaveURL(/\/budzse\/\?y=2012$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'hu');
    await expect(lens(page, 'forint')).toHaveText('Forintban');
  });

  test('switching language moves the canonical address too', async ({ page }) => {
    await page.goto('/budzse/hu/');
    await ready(page);
    await page.getByTestId('lang-en').click();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://tmrk.github.io/budzse/en/');
  });

  test('Hungarian keeps its accents and suffix agreement', async ({ page }) => {
    await page.goto('/budzse/hu/?y=2026&real=1');
    await ready(page);
    await expect(page.getByTestId('price-basis')).toHaveText('2025-ös áron');
    await expect(page.getByTestId('methodology')).toContainText('Módszertan');
  });
});

test.describe('the year', () => {
  test('the sum shows the outcome and adds up on the screen', async ({ page }) => {
    await page.goto('/budzse/en/?y=2020&s=c');
    await ready(page);
    await expect(page.getByTestId('ledger-revenue')).toHaveText('23.02');
    await expect(page.getByTestId('ledger-expenditure')).toHaveText('28.33');
    await expect(page.getByTestId('ledger-deficit')).toHaveText('5.31');
    await expect(page.getByTestId('ledger')).toContainText('HUF trillion');
    await expect(page.getByTestId('stamp')).toHaveText('Actual');
  });

  test('a year without an outcome says what it shows instead', async ({ page }) => {
    await page.goto('/budzse/en/?y=2026&s=c');
    await ready(page);
    await expect(page.getByTestId('stamp')).toHaveText('Amended budget act');
    await expect(page.getByTestId('ledger-deficit')).toHaveText('7.11');
    await page.goto('/budzse/en/?y=2027&s=c');
    await ready(page);
    await expect(page.getByTestId('stamp')).toHaveText('Budget bill');
    await page.goto('/budzse/en/?y=2026');
    await ready(page);
    await expect(page.getByTestId('stamp')).toHaveText('Forecast');
    await expect(page.getByTestId('stamp-note')).toHaveText('Government');
    await expect(page.getByTestId('ledger-deficit')).toHaveText('6.90');
  });

  test('revenue covered per 100 forints follows the year', async ({ page }) => {
    await page.goto('/budzse/en/?y=2020&s=c');
    await ready(page);
    await expect(page.getByTestId('cover')).toContainText('81 forints');
  });

  test('year selection works through the select and the steppers', async ({ page }) => {
    await page.goto('/budzse/en/');
    await ready(page);
    await page.getByTestId('year-select').selectOption('2008');
    await expect(page).toHaveURL(/y=2008/);
    await page.getByTestId('year-steps').getByRole('button', { name: 'Next year' }).click();
    await expect(page.getByTestId('year-select')).toHaveValue('2009');
  });

  test('pointing previews a year, leaving returns, clicking keeps it', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Covered by the tap test');
    await page.goto('/budzse/en/?y=2025');
    await ready(page);
    const box = (await page.getByTestId('chart').boundingBox())!;
    const at = (year: number) => box.x + box.width * ((year - 2000 + 0.5) / 28);
    await page.mouse.move(at(2010), box.y + 100);
    await expect(page.getByTestId('year-select')).toHaveValue('2010');
    await expect(page).toHaveURL(/y=2025/);
    await page.mouse.move(box.x + 50, box.y - 300);
    await expect(page.getByTestId('year-select')).toHaveValue('2025');
    await page.mouse.click(at(2012), box.y + 100);
    await expect(page).toHaveURL(/y=2012/);
    await page.mouse.move(box.x + 50, box.y - 300);
    await expect(page.getByTestId('year-select')).toHaveValue('2012');
  });

  test('every chart on the page follows the same year', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Pointer behaviour');
    await page.goto('/budzse/en/?y=2025');
    await ready(page);
    const chart = page.getByTestId('plan-chart');
    await chart.scrollIntoViewIfNeeded();
    const box = (await chart.boundingBox())!;
    await page.mouse.click(box.x + box.width * ((2020 - 2000 + 0.5) / 28), box.y + 40);
    await expect(page).toHaveURL(/y=2020/);
    await expect(page.getByTestId('plan')).toContainText('HUF 5.31 trillion');
    await expect(page.getByTestId('economy-growth')).toContainText('4.3%');
  });

  test('tapping the chart updates the sum', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 700 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    await page.goto('/budzse/hu/');
    await ready(page);
    const box = (await page.getByTestId('chart').boundingBox())!;
    await page.touchscreen.tap(box.x + box.width * 0.45, box.y + 150);
    await expect(page).toHaveURL(/y=\d{4}/);
    const year = new URL(page.url()).searchParams.get('y');
    await expect(page.getByTestId('year-select')).toHaveValue(year!);
    await ctx.close();
  });

  test('the bar takes over the year as soon as it has scrolled away, and keeps language and theme', async ({ page }) => {
    await page.goto('/budzse/en/?y=2020');
    await ready(page);
    await expect(page.getByTestId('bar-steps')).toHaveCount(0);
    const year = (await page.locator('.year-big').boundingBox())!;
    const bar = (await page.locator('header.bar').boundingBox())!;
    // Just short of the year clearing the bar, then just past it.
    await page.evaluate((y) => window.scrollTo(0, y), year.y + year.height - bar.height - 8);
    await expect(page.getByTestId('bar-steps')).toHaveCount(0);
    await page.evaluate((y) => window.scrollTo(0, y), year.y + year.height - bar.height + 8);
    await expect(page.getByTestId('bar-steps')).toBeVisible();
    await expect(page.getByTestId('lang-hu')).toBeVisible();
    await expect(page.getByTestId('theme')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect((await page.locator('header.bar').boundingBox())!.height).toBe(bar.height);
    await page.getByTestId('bar-steps').getByRole('button', { name: 'Previous year' }).click();
    await expect(page).toHaveURL(/y=2019/);
    await expect(page.getByTestId('bar-steps')).toContainText('2019');
  });

  test('history can undo a choice', async ({ page }) => {
    await page.goto('/budzse/en/');
    await ready(page);
    await lens(page, 'share').click();
    await expect(page).toHaveURL(/pct=1/);
    await page.goBack();
    await expect(lens(page, 'forint')).toHaveAttribute('aria-pressed', 'true');
    await page.goForward();
    await expect(lens(page, 'share')).toHaveAttribute('aria-pressed', 'true');
  });
});

test.describe('lens and scope', () => {
  test('today\'s prices change the figures, and the price level is named', async ({ page }) => {
    await page.goto('/budzse/en/?y=2010&s=c');
    await ready(page);
    const revenue = page.getByTestId('ledger-revenue');
    await expect(revenue).toHaveText('13.17');
    await lens(page, 'real').click();
    await expect(page).toHaveURL(/real=1/);
    await expect(revenue).not.toHaveText('13.17');
    await expect(page.getByTestId('price-basis')).toHaveText('at 2025 prices');
    await page.getByTestId('reference').selectOption('2010');
    await expect(revenue).toHaveText('13.17');
    await expect(page).toHaveURL(/ref=2010/);
  });

  test('the lens is one choice, so inflation and shares cannot both be on', async ({ page }) => {
    await page.goto('/budzse/en/?real=1');
    await ready(page);
    await lens(page, 'share').click();
    await expect(page).toHaveURL(/pct=1/);
    await expect(page).not.toHaveURL(/real=1/);
    await expect(page.getByTestId('reference')).toHaveCount(0);
    await expect(page.getByTestId('ledger')).toContainText('% of GDP');
    await expect(page.getByTestId('ledger-deficit')).toHaveText('4.7%');
  });

  test('latest month is available as a price level', async ({ page }) => {
    await page.goto('/budzse/en/?real=1');
    await ready(page);
    await page.getByTestId('reference').selectOption('latest');
    await expect(page).toHaveURL(/ref=latest/);
    await expect(page.getByTestId('reference')).toContainText('September 2026');
    await expect(page.getByTestId('price-basis')).toContainText('September 2026');
  });

  test('forecast-year values are marked as estimates when adjusted', async ({ page }) => {
    await page.goto('/budzse/en/?real=1&y=2027');
    await ready(page);
    await expect(page.getByTestId('stamp-note')).toContainText('estimate');
  });

  test('CPI-adjusted GDP carries the real-GDP warning', async ({ page }) => {
    await page.goto('/budzse/en/?real=1');
    await ready(page);
    await expect(page.getByTestId('gdp-real-note')).toContainText('not official real GDP');
  });

  test('scope switch changes the figures for one year and explains itself', async ({ page }) => {
    await page.goto('/budzse/en/?y=2020');
    await ready(page);
    await expect(page.getByTestId('ledger-deficit')).toHaveText('3.65');
    await expect(page.getByTestId('scope-help')).toContainText('ESA 2010');
    await page.getByTestId('scope-central').click();
    await expect(page.getByTestId('ledger-deficit')).toHaveText('5.31');
    await expect(page.getByTestId('scope-help')).toContainText('cash totals');
    await expect(page).toHaveURL(/s=c/);
  });

  test('the central view breaks at 2010 and says why', async ({ page }) => {
    await page.goto('/budzse/en/?s=c');
    await ready(page);
    await expect(page.getByTestId('scope-help')).toContainText('the jump between 2009 and 2010 is not real growth');
    await expect(page.locator('[data-testid="chart"] path.line-in')).toHaveCount(3);
  });

  test('the plan section stays on the budget acts whatever the scope', async ({ page }) => {
    await page.goto('/budzse/en/?y=2020');
    await ready(page);
    const plan = page.getByTestId('plan');
    await expect(plan).toContainText('20 of 26');
    await expect(plan).toContainText('HUF 5.31 trillion');
    await expect(plan).toContainText('HUF 367 billion');
    await expect(plan).toContainText('+HUF 4.94 trillion');
    await page.getByTestId('year-select').selectOption('2026');
    await expect(plan).toContainText('Amended plan');
    await expect(plan).toContainText('HUF 7.11 trillion');
    await page.getByTestId('year-select').selectOption('2027');
    await expect(plan).toContainText('Bill');
  });
});

test.describe('sources, comparisons and exports', () => {
  test('every figure opens its provenance', async ({ page }) => {
    await page.goto('/budzse/en/?y=2020&s=c');
    await ready(page);
    await page.getByTestId('ledger-deficit').click();
    const dialog = page.getByTestId('source-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('HUF 5,311,318,000,000');
    await expect(dialog).toContainText('5 311 318,0 millió forint');
    await expect(dialog).toContainText('2021. évi CXVI. törvény');
    await expect(dialog.getByRole('link').first()).toHaveAttribute('href', /mkogy\.jogtar\.hu/);
    await expect(dialog).toContainText('hiánnyal hagyja jóvá');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('the sheet slides in, and slides out with its content however it is dismissed', async ({ page, isMobile }) => {
    await page.goto('/budzse/en/?y=2020');
    await ready(page);
    const dialog = page.getByTestId('source-dialog');
    // Recorded as it happens, because the slide is over before a later check could see it.
    await dialog.evaluate((d: HTMLDialogElement) => {
      const sliding = () => String(d.getAnimations().some((a) => (a as CSSTransition).transitionProperty === 'transform'));
      new MutationObserver(() => {
        if (d.open) d.dataset.slideIn = sliding();
      }).observe(d, { attributes: true, attributeFilter: ['open'] });
      d.addEventListener('close', () => {
        d.dataset.slideOut = sliding();
        d.dataset.contentLeaving = String(d.textContent!.length > 100);
      });
    });
    const dismissals: [string, () => Promise<void>][] = [
      ['the close button', () => dialog.locator('.close').click()],
      ['Escape', () => page.keyboard.press('Escape')],
    ];
    // On a phone the sheet fills the screen, so there is no outside to tap.
    if (!isMobile) dismissals.push(['a click outside', () => page.mouse.click(5, 300)]);
    for (const [how, dismiss] of dismissals) {
      await page.getByTestId('ledger-deficit').click();
      await expect(dialog, how).toHaveAttribute('data-slide-in', 'true');
      await dialog.evaluate((d) => Promise.all(d.getAnimations().map((a) => a.finished)));
      expect(await dialog.evaluate((d) => getComputedStyle(d).transform), how).toBe('none');
      await dialog.evaluate((d) => {
        delete d.dataset.slideOut;
        delete d.dataset.slideIn;
      });
      await dismiss();
      await expect(dialog, how).toHaveAttribute('data-slide-out', 'true');
      await expect(dialog, how).toHaveAttribute('data-content-leaving', 'true');
      await expect(dialog, how).toBeHidden();
    }
  });

  test('reduced motion opens and closes the sheet without the slide', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto('/budzse/en/?y=2020');
    await ready(page);
    const dialog = page.getByTestId('source-dialog');
    await page.getByTestId('ledger-deficit').click();
    await expect(dialog).toBeVisible();
    expect(await dialog.evaluate((d) => parseFloat(getComputedStyle(d).transitionDuration))).toBeLessThan(0.01);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await ctx.close();
  });

  test('section figures open their provenance too', async ({ page }) => {
    await page.goto('/budzse/en/?y=2020');
    await ready(page);
    for (const id of ['plan-outcome', 'plan-plan', 'economy-gdp', 'economy-growth', 'economy-cpi', 'aid-net']) {
      await page.getByTestId(id).click();
      await expect(page.getByTestId('source-dialog')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('source-dialog')).toBeHidden();
    }
  });

  test('all versions of a year are listed and traceable', async ({ page }) => {
    await page.goto('/budzse/en/?y=2026&s=c');
    await ready(page);
    await openFold(page, 'year-figures');
    const table = page.getByTestId('year-figures');
    await expect(table).toContainText('Original budget act');
    await expect(table).toContainText('Amended budget act');
    await expect(table).toContainText('Year to date');
    await page.getByTestId('source-central.deficit.2026.ytd').click();
    await expect(page.getByTestId('source-dialog')).toContainText('Treasury');
  });

  test('adjusted figures explain the CPI factor', async ({ page }) => {
    await page.goto('/budzse/en/?y=2010&real=1&s=c');
    await ready(page);
    await page.getByTestId('ledger-revenue').click();
    const dialog = page.getByTestId('source-dialog');
    await expect(dialog).toContainText('CPI(2025) / CPI(year)');
    await expect(dialog.getByRole('link', { name: /Consumer price index/ })).toHaveAttribute('href', /ksh\.hu/);
  });

  test('the 2027 figures cite the bill itself', async ({ page }) => {
    await page.goto('/budzse/en/?y=2027&s=c');
    await ready(page);
    await page.getByTestId('ledger-deficit').click();
    const dialog = page.getByTestId('source-dialog');
    await expect(dialog).toContainText('T/950');
    await expect(dialog.getByRole('link', { name: /T\/950/ })).toHaveAttribute('href', 'https://www.parlament.hu/irom43/00950/00950.pdf');
    await expect(dialog).not.toContainText('Secondary citation');
  });

  test('a calculated forecast says how it was calculated', async ({ page }) => {
    await page.goto('/budzse/en/?y=2027');
    await ready(page);
    await page.getByTestId('ledger-revenue').click();
    await expect(page.getByTestId('source-dialog')).toContainText('Share of GDP × nominal GDP forecast');
  });

  test('the 2027 Hungary Helps lines are marked as a bill', async ({ page }) => {
    await page.goto('/budzse/en/?y=2027');
    await ready(page);
    await expect(page.getByTestId('helps-program')).toHaveText('HUF 101 million');
    await expect(page.getByTestId('helps-agency')).toHaveText('HUF 411 million');
    await expect(page.getByTestId('helps').locator('.readout-item').first()).toContainText('bill');
  });

  test('Hungary Helps shows both budget lines beside net ODA, and a missing line stays missing', async ({ page }) => {
    await page.goto('/budzse/en/?y=2023');
    await ready(page);
    await expect(page.getByTestId('helps-program')).toHaveText('HUF 6.98 billion');
    await expect(page.getByTestId('helps-agency')).toHaveText('HUF 1.84 billion');
    await expect(page.getByTestId('helps-oda')).toHaveText('HUF 90.6 billion');
    await expect(page.getByTestId('helps').locator('.readout-item').nth(3)).toContainText('9.7%');
    await expect(page.getByTestId('helps-oda-chart').locator('.bar-oda')).toHaveCount(23);
    await page.getByTestId('year-select').selectOption('2021');
    await expect(page.getByTestId('helps-program')).toHaveText('HUF 11.2 billion');
    await expect(page.getByTestId('helps').locator('.no-data')).toHaveAttribute('title', /no separate line/);
    await page.getByTestId('year-select').selectOption('2025');
    await expect(page.getByTestId('helps').locator('.readout-item').first()).toContainText('plan');
    await expect(page.getByTestId('helps-oda')).toHaveText('HUF 114 billion');
    await expect(page.getByTestId('helps').locator('.readout-item').nth(3)).toContainText('Not calculated');
  });

  test('a missing figure opens its reason, as a number opens its source', async ({ page }) => {
    await page.goto('/budzse/en/?y=2001');
    await ready(page);
    await page.getByTestId('aid').locator('.no-data').first().click();
    const dialog = page.getByTestId('source-dialog');
    await expect(dialog).toContainText('Why this figure is missing');
    await expect(dialog).toContainText('OECD DAC1 reports ODA for Hungary from 2003');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('a year with no outcome says so rather than leaving a dash', async ({ page }) => {
    await page.goto('/budzse/en/?y=2027');
    await ready(page);
    await expect(page.getByTestId('plan').locator('.readout-item').nth(2)).toContainText('No outcome yet');
  });

  test('missing data says so instead of showing zero', async ({ page }) => {
    await page.goto('/budzse/en/?y=2001');
    await ready(page);
    const aid = page.getByTestId('aid');
    await expect(aid).toContainText('No data');
    await expect(aid.locator('.no-data').first()).toHaveAttribute('title', /OECD DAC1 reports ODA for Hungary from 2003/);
    await expect(page.getByTestId('coverage')).toContainText('OECD DAC1 reports ODA for Hungary from 2003');
  });

  test('net aid and grant-equivalent aid are never joined', async ({ page }) => {
    await page.goto('/budzse/en/?pct=1');
    await ready(page);
    await expect(page.locator('[data-testid="aid-chart"] path.line')).toHaveCount(2);
    await page.goto('/budzse/en/');
    await ready(page);
    await expect(page.locator('[data-testid="aid-chart"] path.line')).toHaveCount(2);
  });

  test('the sum compares with the year before', async ({ page }) => {
    await page.goto('/budzse/en/?y=2020');
    await ready(page);
    await expect(page.getByTestId('ledger')).toContainText('change on prior year');
    await expect(page.locator('.ledger-row .delta').first()).toHaveText('+1.1%');
  });

  test('comparison refuses to subtract across the 2010 break', async ({ page }) => {
    await page.goto('/budzse/en/?y=2010&s=c');
    await ready(page);
    await expect(page.locator('.ledger-row .delta').first()).toHaveText('not comparable');
    await expect(page.locator('.ledger-row .delta').first()).toHaveAttribute('title', /cannot be compared/);
    await page.getByTestId('scope-general').click();
    await expect(page.locator('.ledger-row .delta').first()).toContainText('%');
  });

  test('table filters work', async ({ page }) => {
    await page.goto('/budzse/en/');
    await ready(page);
    await openFold(page, 'table-section');
    await page.getByTestId('table-indicator').selectOption('oda');
    await page.getByTestId('table-status').selectOption('actual');
    await expect(page.getByTestId('table-count')).toHaveText('23 figures');
  });

  test('range selects constrain the table', async ({ page }) => {
    await page.goto('/budzse/en/');
    await ready(page);
    await openFold(page, 'table-section');
    await page.getByTestId('from').selectOption('2010');
    await page.getByTestId('to').selectOption('2012');
    await expect(page.getByTestId('table-section').locator('tbody th').first()).toHaveText('2010');
    await expect(page.getByTestId('table-section').locator('tbody th').last()).toHaveText('2012');
  });

  test('the skip link reaches the table', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Keyboard on desktop');
    await page.goto('/budzse/en/');
    await ready(page);
    await page.keyboard.press('Tab');
    await expect(page.locator('.skip')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('table-section').locator('tbody th').first()).toBeVisible();
  });

  test('CSV export carries the filtered rows and citations', async ({ page }) => {
    await page.goto('/budzse/en/?s=c');
    await ready(page);
    await openFold(page, 'table-section');
    await page.getByTestId('table-indicator').selectOption('deficit');
    await page.getByTestId('from').selectOption('2020');
    await page.getByTestId('to').selectOption('2021');
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('csv').click()]);
    expect(download.suggestedFilename()).toContain('budzse-central-2020-2021');
    const text = readFileSync(await download.path(), 'utf8');
    expect(text).toContain('source_url');
    expect(text).toContain('5311318000000');
    expect(text).toContain('https://mkogy.jogtar.hu');
    expect(text).not.toContain('2019,');
  });

  test('the complete dataset is downloadable', async ({ request }) => {
    const res = await request.get('/budzse/data/budzse.json');
    expect(res.ok()).toBe(true);
    const d = await res.json();
    expect(d.observations.length).toBeGreaterThan(500);
    expect(Object.keys(d.sources).length).toBeGreaterThan(50);
  });

  test('coverage and methodology are present in both languages', async ({ page }) => {
    for (const [path, word] of [['/budzse/hu/', 'Módszertan'], ['/budzse/en/', 'Methodology']] as const) {
      await page.goto(path);
      await ready(page);
      await expect(page.getByTestId('methodology')).toContainText(word);
      await expect(page.getByTestId('coverage').locator('td.off').first()).toBeAttached();
    }
  });
});

test.describe('layout and accessibility', () => {
  // Sweeping across the years must never move anything: not the page, and not the chart under a finger.
  for (const width of [320, 375, 768, 1100, 1440]) {
    test(`nothing moves through all 28 years at ${width}px`, async ({ browser }) => {
      test.setTimeout(60_000);
      const ctx = await browser.newContext({ viewport: { width, height: 800 } });
      const page = await ctx.newPage();
      for (const q of ['hu/', 'en/', 'en/?s=c', 'hu/?s=c&real=1', 'en/?pct=1']) {
        await page.goto(`/budzse/${q}`);
        await ready(page);
        const measure = () =>
          page.evaluate(() => {
            const top = (s: string) => Math.round((document.querySelector(s)!.getBoundingClientRect().top + window.scrollY) * 10) / 10;
            return [document.documentElement.scrollHeight, top('[data-testid="chart"]'), top('[data-testid="plan-chart"]'), top('[data-testid="economy"]'), top('[data-testid="aid-chart"]'), top('[data-testid="helps-chart"]'), top('.archive')].join();
          });
        const seen = new Map<string, string>();
        for (let y = 2000; y <= 2027; y++) {
          await page.getByTestId('year-select').selectOption(String(y));
          seen.set(await measure(), String(y));
        }
        expect([...seen.entries()], q).toHaveLength(1);
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), q).toBeLessThanOrEqual(0);
      }
      await ctx.close();
    });
  }

  // Pointing at something may colour it. It may never move it or anything else.
  test('hovering any control moves nothing', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Pointer behaviour');
    await page.goto('/budzse/en/?s=c&y=2010');
    await ready(page);
    await page.locator('details').evaluateAll((all) => all.forEach((d) => ((d as HTMLDetailsElement).open = true)));
    // Hungarian source titles in the open folds pull in the accented font subset. That load is not a hover.
    await page.evaluate(async () => {
      void document.body.offsetHeight;
      await document.fonts.ready;
    });
    const layout = () =>
      page.evaluate(() =>
        [document.documentElement.scrollHeight, ...[...document.querySelectorAll('main button:not(.table-scroll *), main a, main summary, main select, .timeline, .chapter, .ledger-row > *, .readout-item > *')].map((el) => {
          const r = el.getBoundingClientRect();
          return `${Math.round((r.left + scrollX) * 10)},${Math.round((r.top + scrollY) * 10)},${Math.round(r.width * 10)},${Math.round(r.height * 10)}`;
        })].join('|'),
      );
    const before = await layout();
    const targets = page.locator('main button:not(.table-scroll *):visible, main summary:visible, main select:visible, header button:visible');
    const count = await targets.count();
    expect(count).toBeGreaterThan(40);
    for (let i = 0; i < count; i++) {
      await targets.nth(i).hover({ force: true });
      expect(await layout(), `hovering target ${i}`).toBe(before);
    }
  });

  test('choosing an option does not move the options beside it', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop layout');
    await page.goto('/budzse/en/');
    await ready(page);
    const edges = () => page.locator('[data-testid^="lens-"], [data-testid^="scope-"]').evaluateAll((all) => all.map((el) => { const r = el.getBoundingClientRect(); return [r.left, r.width]; }));
    const before = await edges();
    await lens(page, 'share').click();
    expect(await edges()).toEqual(before);
    await page.getByTestId('scope-central').click();
    expect(await edges()).toEqual(before);
  });

  test('switching scope or measure leaves the page below where it was', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop layout');
    await page.goto('/budzse/en/');
    await ready(page);
    const tops = () => page.evaluate(() => ['[data-testid="chart"]', '[data-testid="plan"]', '[data-testid="plan-chart"]', '[data-testid="economy"]', '[data-testid="aid"]', '[data-testid="helps"]', '.archive'].map((s) => document.querySelector(s)!.getBoundingClientRect().top + scrollY));
    const before = await tops();
    await lens(page, 'real').click();
    await expect(page.getByTestId('reference')).toBeVisible();
    expect(await tops()).toEqual(before);
    await page.getByTestId('scope-central').click();
    expect(await tops()).toEqual(before);
    await lens(page, 'share').click();
    expect(await tops()).toEqual(before);
  });

  test('the descriptor sits on one line in the bar, beside the name', async ({ page, isMobile }) => {
    test.skip(isMobile, 'On phones it has its own line below the bar');
    for (const path of ['/budzse/hu/', '/budzse/en/']) {
      await page.goto(path);
      await ready(page);
      const tagline = page.locator('header.bar .tagline');
      await expect(tagline).toBeVisible();
      const box = (await tagline.boundingBox())!;
      const bar = (await page.locator('header.bar').boundingBox())!;
      expect(box.height).toBeLessThan(24);
      expect(box.y).toBeGreaterThanOrEqual(bar.y);
      expect(box.y + box.height).toBeLessThanOrEqual(bar.y + bar.height);
      await expect(page.locator('.tagline-flow')).toBeHidden();
    }
  });

  test('the year and the controls share a row, and the sum starts level with the chart', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop layout');
    await page.goto('/budzse/en/');
    await ready(page);
    const ledger = (await page.getByTestId('ledger').boundingBox())!;
    const chart = (await page.getByTestId('chart').boundingBox())!;
    expect(Math.abs(ledger.y - chart.y)).toBeLessThanOrEqual(1);
  });

  test('pointing across a chart lower down leaves the scroll position alone', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Pointer behaviour');
    await page.goto('/budzse/en/');
    await ready(page);
    const chart = page.getByTestId('aid-chart');
    await chart.scrollIntoViewIfNeeded();
    const before = await page.evaluate(() => window.scrollY);
    const box = (await chart.boundingBox())!;
    for (let i = 0; i < 28; i++) await page.mouse.move(box.x + (box.width * (i + 0.5)) / 28, box.y + 40);
    await expect(page.getByTestId('bar-steps')).toContainText('2027');
    expect(await page.evaluate(() => window.scrollY)).toBe(before);
    const after = (await chart.boundingBox())!;
    expect(after.y).toBe(box.y);
  });

  test('an open list of a year\'s figures does not move the page either', async ({ page }) => {
    await page.goto('/budzse/en/?s=c');
    await ready(page);
    await openFold(page, 'year-figures');
    const heights = new Set<number>();
    for (const y of [2000, 2008, 2018, 2020, 2026, 2027]) {
      await page.getByTestId('year-select').selectOption(String(y));
      heights.add(await page.evaluate(() => document.documentElement.scrollHeight));
    }
    expect([...heights]).toHaveLength(1);
  });

  for (const width of [320, 375, 390, 768, 1100, 1440]) {
    test(`no horizontal page overflow at ${width}px`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width, height: 800 } });
      const page = await ctx.newPage();
      for (const q of ['', '?s=c&y=2026', '?pct=1&y=2027', '?real=1&ref=latest&y=2000']) {
        await page.goto(`/budzse/hu/${q}`);
        await ready(page);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, q).toBeLessThanOrEqual(0);
      }
      await ctx.close();
    });
  }

  for (const width of [320, 375, 1100, 1440]) {
    test(`the sum never overlaps itself at ${width}px`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width, height: 800 } });
      const page = await ctx.newPage();
      for (const path of ['/budzse/en/?y=2023&s=c', '/budzse/hu/?y=2023&real=1']) {
        await page.goto(path);
        await ready(page);
        const clashes = await page.evaluate(() =>
          [...document.querySelectorAll('.ledger-row')].flatMap((row) => {
            const parts = [...row.children].map((c) => c.getBoundingClientRect()).filter((r) => r.width > 0);
            return parts.slice(1).flatMap((r, i) => (r.left < parts[i].right - 0.5 ? [row.className] : []));
          }),
        );
        expect(clashes, path).toEqual([]);
      }
      await ctx.close();
    });
  }

  test('a fold below open folds still opens with a real tap', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    await page.goto('/budzse/hu/');
    await ready(page);
    for (const id of ['year-figures', 'table-section', 'coverage']) await page.getByTestId(id).evaluate((d: HTMLDetailsElement) => (d.open = true));
    const at = await page.getByTestId('methodology').locator('summary').first().evaluate((s) => {
      window.scrollTo(0, s.getBoundingClientRect().top + window.scrollY - 300);
      const r = s.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    await page.touchscreen.tap(at.x, at.y);
    await expect(page.getByTestId('methodology')).toHaveJSProperty('open', true);
    await ctx.close();
  });

  test('the chart appears on the first phone screen', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    await page.goto('/budzse/hu/');
    await ready(page);
    const box = (await page.getByTestId('chart').boundingBox())!;
    expect(box.y).toBeLessThan(480);
    await ctx.close();
  });

  test('touch targets are large enough on phones', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 700 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    await page.goto('/budzse/hu/');
    await ready(page);
    const small = await page.evaluate(() =>
      [...document.querySelectorAll('.segmented button, .lang-switch button, .theme-button, .step')]
        .map((el) => [el.className || el.textContent, el.getBoundingClientRect().height] as const)
        .filter(([, h]) => h < 38),
    );
    expect(small).toEqual([]);
    await ctx.close();
  });

  test('axe finds no serious violations', async ({ page }) => {
    await page.goto('/budzse/hu/?y=2020&s=c');
    await ready(page);
    await openEverything(page);
    await expect(page.getByTestId('table-section').locator('tbody th').first()).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' | ')}`)).toEqual([]);
  });

  test('axe finds no serious violations in dark mode', async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: 'dark', viewport: { width: 390, height: 800 } });
    const page = await ctx.newPage();
    await page.goto('/budzse/en/?real=1&y=2027');
    await ready(page);
    await openEverything(page);
    await expect(page.getByTestId('table-section').locator('tbody th').first()).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' | ')}`)).toEqual([]);
    await ctx.close();
  });

  test('the source sheet passes axe in both themes', async ({ browser }) => {
    for (const colorScheme of ['light', 'dark'] as const) {
      const ctx = await browser.newContext({ colorScheme, viewport: { width: 1200, height: 800 } });
      const page = await ctx.newPage();
      await page.goto('/budzse/en/?y=2027&s=c');
      await ready(page);
      await page.getByTestId('ledger-deficit').click();
      await expect(page.getByTestId('source-dialog')).toBeVisible();
      const results = await new AxeBuilder({ page }).include('[data-testid="source-dialog"]').analyze();
      const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(serious.map((v) => v.id), colorScheme).toEqual([]);
      await ctx.close();
    }
  });

  test('the chart is a keyboard slider with visible focus', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Keyboard on desktop');
    await page.goto('/budzse/en/');
    await ready(page);
    const chart = page.getByTestId('chart');
    await expect(chart).toHaveAttribute('role', 'slider');
    await expect(chart).toHaveAttribute('aria-valuenow', '2025');
    await chart.focus();
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByTestId('year-select')).toHaveValue('2024');
    await expect(chart).toHaveAttribute('aria-valuenow', '2024');
    await page.keyboard.press('Home');
    await expect(page.getByTestId('year-select')).toHaveValue('2000');
    await page.keyboard.press('End');
    await expect(page.getByTestId('year-select')).toHaveValue('2027');
    await page.getByTestId('lens-real').focus();
    const outline = await page.getByTestId('lens-real').evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(outline).not.toBe('none');
  });

  test('reduced motion stops the stamp', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto('/budzse/en/');
    await ready(page);
    const duration = await page.locator('.stamp').evaluate((el) => parseFloat(getComputedStyle(el).animationDuration));
    expect(duration).toBeLessThan(0.01);
    await ctx.close();
  });

  test('the main chart is not hidden by any animation, so captures and prints show it', async ({ page }) => {
    await page.goto('/budzse/en/');
    await ready(page);
    expect(await page.locator('[data-testid="chart"] svg').evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
  });

  // An open list is drawn by the browser, so its colours are checked where the page sets them.
  for (const [name, colorScheme, theme] of [['system dark', 'dark', null], ['dark chosen on a light system', 'light', 'dark'], ['light', 'light', null]] as const) {
    test(`every dropdown list is readable in ${name}`, async ({ browser }) => {
      const ctx = await browser.newContext({ colorScheme });
      const page = await ctx.newPage();
      if (theme) await page.addInitScript((t) => localStorage.setItem('budzse-theme', t), theme);
      await page.goto('/budzse/en/?real=1');
      await ready(page);
      await openEverything(page);
      await expect(page.getByTestId('reference')).toBeVisible();
      const lists = await page.evaluate(() => {
        const token = (name: string) => {
          const probe = document.createElement('i');
          probe.style.color = `var(${name})`;
          document.body.append(probe);
          const value = getComputedStyle(probe).color;
          probe.remove();
          return value;
        };
        const expected = `${token('--paper')} on ${token('--ink')}`;
        return { expected, found: [...new Set([...document.querySelectorAll('option')].map((o) => `${getComputedStyle(o).backgroundColor} on ${getComputedStyle(o).color}`))] };
      });
      expect(lists.found).toEqual([lists.expected]);
      await ctx.close();
    });
  }

  test('the theme button cycles and persists', async ({ page }) => {
    await page.goto('/budzse/en/');
    await ready(page);
    await page.getByTestId('theme').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.getByTestId('theme').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await ready(page);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
});
