import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const ID = 'G-WBEQ0R14Q5';

test.use({ storageState: { cookies: [], origins: [] } });

const ready = (page: Page) => expect(page.getByTestId('ledger')).toBeVisible();

// The real tag is never fetched here: tests must not count as visits, nor depend on Google being up.
const watchGoogle = async (page: Page) => {
  const requests: string[] = [];
  await page.route(/google|doubleclick/, (route) => {
    requests.push(route.request().url());
    return route.fulfill({ contentType: 'text/javascript', body: '' });
  });
  return requests;
};

const commands = (page: Page) => page.evaluate(() => (window.dataLayer ?? []).map((entry) => Array.from(entry as ArrayLike<unknown>).map((x) => (x instanceof Date ? 'date' : x))));
const pageViews = async (page: Page) => (await commands(page)).filter((c) => c[0] === 'event' && c[1] === 'page_view');
const flag = (page: Page) => page.evaluate((id) => window[`ga-disable-${id}`], ID);

test.describe('the cookie question', () => {
  test('nothing reaches Google before an answer', async ({ page }) => {
    const requests = await watchGoogle(page);
    await page.goto('/budzse/hu/');
    await ready(page);
    await expect(page.getByTestId('consent')).toBeVisible();
    expect(requests).toEqual([]);
    expect(await page.evaluate(() => window.dataLayer)).toBeUndefined();
    expect(await page.context().cookies()).toEqual([]);
  });

  test('declining loads nothing, and the answer lasts', async ({ page }) => {
    const requests = await watchGoogle(page);
    await page.goto('/budzse/en/');
    await ready(page);
    await page.getByTestId('consent-decline').click();
    await expect(page.getByTestId('consent')).toHaveCount(0);
    await page.reload();
    await ready(page);
    await expect(page.getByTestId('consent')).toHaveCount(0);
    expect(requests).toEqual([]);
  });

  test('allowing loads the tag once, with advertising off and cookies on this path', async ({ page }) => {
    const requests = await watchGoogle(page);
    await page.goto('/budzse/en/');
    await ready(page);
    await page.getByTestId('consent-allow').click();
    await expect(page.getByTestId('consent')).toHaveCount(0);
    await expect.poll(() => requests).toEqual([`https://www.googletagmanager.com/gtag/js?id=${ID}`]);
    expect(await commands(page)).toEqual([
      ['consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'granted' }],
      ['js', 'date'],
      ['config', ID, { cookie_path: '/budzse/', allow_google_signals: false, allow_ad_personalization_signals: false }],
    ]);
    await page.reload();
    await ready(page);
    await expect(page.getByTestId('consent')).toHaveCount(0);
    await expect.poll(() => requests.length).toBe(2);
  });

  test('a language change is a page view, and a year or a measure is not', async ({ page, isMobile }) => {
    await watchGoogle(page);
    await page.goto('/budzse/en/');
    await ready(page);
    await page.getByTestId('consent-allow').click();
    await page.getByTestId('year-select').selectOption('2010');
    await page.getByTestId('lens-share').first().click();
    if (!isMobile) await page.getByTestId('chart').hover();
    expect(await pageViews(page)).toEqual([]);
    await page.getByTestId('lang-hu').click();
    await expect.poll(() => pageViews(page)).toHaveLength(1);
    const [view] = await pageViews(page);
    expect(view[2]).toEqual({ page_location: expect.stringContaining('/budzse/hu/?'), page_title: expect.stringContaining('Magyarország') });
  });

  test('consent can be withdrawn from the footer, which stops collection and removes the cookies', async ({ page, context }) => {
    await watchGoogle(page);
    await page.goto('/budzse/en/');
    await ready(page);
    await page.getByTestId('consent-allow').click();
    await context.addCookies(['_ga', `_ga_${ID.slice(2)}`].map((name) => ({ name, value: 'x', domain: 'localhost', path: '/budzse/' })));
    await context.addCookies([{ name: 'other', value: 'kept', domain: 'localhost', path: '/budzse/' }]);

    await page.getByTestId('consent-open').click();
    await expect(page.getByTestId('consent-decline')).toBeFocused();
    await page.getByTestId('consent-decline').click();
    await expect(page.getByTestId('consent-open')).toBeFocused();

    expect(await flag(page)).toBe(true);
    expect((await commands(page)).at(-1)).toEqual(['consent', 'update', { analytics_storage: 'denied' }]);
    expect((await context.cookies()).map((c) => c.name)).toEqual(['other']);
    await page.getByTestId('lang-hu').click();
    expect(await pageViews(page)).toEqual([]);

    await page.getByTestId('consent-open').click();
    await page.getByTestId('consent-allow').click();
    expect(await flag(page)).toBe(false);
    await expect.poll(() => pageViews(page)).toHaveLength(1);
  });

  test('the question and its answer move nothing', async ({ page }) => {
    await watchGoogle(page);
    await page.goto('/budzse/hu/?y=2010');
    await ready(page);
    // In page coordinates, because reaching the footer button scrolls the window.
    const layout = () => page.evaluate(() => [document.documentElement.scrollHeight, document.documentElement.scrollWidth, document.querySelector('[data-testid="chart"]')!.getBoundingClientRect().top + scrollY]);
    const asked = await layout();
    await page.getByTestId('consent-decline').click();
    expect(await layout()).toEqual(asked);
    await page.getByTestId('consent-open').click();
    expect(await layout()).toEqual(asked);
  });

  for (const [lang, colorScheme] of [['hu', 'light'], ['en', 'dark']] as const) {
    test(`the question fits a phone and passes axe in ${colorScheme}`, async ({ browser }) => {
      const ctx = await browser.newContext({ colorScheme, viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true, storageState: { cookies: [], origins: [] } });
      const page = await ctx.newPage();
      await page.goto(`/budzse/${lang}/`);
      await ready(page);
      const banner = page.getByTestId('consent');
      const box = (await banner.boundingBox())!;
      expect(box.x).toBe(0);
      expect(box.width).toBe(375);
      expect(box.height).toBeLessThan(667 / 2);
      expect(box.y + box.height).toBe(667);
      const allow = (await page.getByTestId('consent-allow').boundingBox())!;
      const decline = (await page.getByTestId('consent-decline').boundingBox())!;
      expect(allow.height).toBeGreaterThanOrEqual(38);
      expect(decline.height).toBe(allow.height);
      expect(decline.width).toBe(allow.width);
      expect(allow.x).toBeGreaterThan(decline.x);
      await expect(page.getByTestId('consent-allow')).not.toHaveClass(/ghost/);
      await expect(page.getByTestId('consent-decline')).toHaveClass(/ghost/);
      const results = await new AxeBuilder({ page }).include('[data-testid="consent"]').analyze();
      expect(results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([]);
      await ctx.close();
    });
  }
});
