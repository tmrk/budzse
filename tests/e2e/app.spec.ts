import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

const ready = async (page: Page) => {
  await expect(page.getByTestId('year-panel')).toBeVisible();
  await expect(page.getByTestId('chart')).toBeVisible();
};
const openMore = async (page: Page) => {
  const more = page.locator('details.more');
  if (!(await more.evaluate((d: HTMLDetailsElement) => d.open))) await more.locator('summary').click();
};
const yearPanel = (page: Page) => page.getByTestId('year-panel');

test.describe('routing on the production build', () => {
  test('root defaults to Hungarian', async ({ page }) => {
    await page.goto('/budzse/');
    await ready(page);
    await expect(page.locator('html')).toHaveAttribute('lang', 'hu');
    await expect(page.getByTestId('preset-overview')).toHaveText('Áttekintés');
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
    await expect(page.getByTestId('preset-overview')).toHaveText('Overview');
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
    await page.goto('/budzse/en/?s=g&m=def,oda&real=1&ref=2020&y=2012&from=2005&to=2020');
    await ready(page);
    await expect(page.getByTestId('year-select')).toHaveValue('2012');
    await expect(page.getByTestId('inflation')).toBeChecked();
    await expect(page.getByTestId('reference')).toHaveValue('2020');
    await expect(page.getByTestId('metric-deficit')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('metric-revenue')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByTestId('scope').getByRole('button', { name: /General government/ })).toHaveAttribute('aria-pressed', 'true');
  });

  test('unknown paths still load the app', async ({ page }) => {
    await page.goto('/budzse/nincs-ilyen');
    await ready(page);
  });
});

test.describe('language', () => {
  test('switching does not reload and preserves state', async ({ page }) => {
    await page.goto('/budzse/hu/?y=2015&real=1&ref=2020&m=def,oda');
    await ready(page);
    await page.evaluate(() => ((window as unknown as { __marker: number }).__marker = 42));
    await page.getByTestId('lang-en').click();
    await expect(page).toHaveURL(/\/budzse\/en\/\?/);
    await expect(page.getByTestId('preset-overview')).toHaveText('Overview');
    expect(await page.evaluate(() => (window as unknown as { __marker: number }).__marker)).toBe(42);
    await expect(page.getByTestId('year-select')).toHaveValue('2015');
    await expect(page.getByTestId('inflation')).toBeChecked();
    await expect(page.getByTestId('reference')).toHaveValue('2020');
    await expect(page.getByTestId('metric-oda')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('saved preference applies at the root but not over an explicit URL', async ({ page }) => {
    await page.goto('/budzse/hu/');
    await ready(page);
    await page.getByTestId('lang-en').click();
    await expect(page.getByTestId('preset-overview')).toHaveText('Overview');
    await page.goto('/budzse/');
    await ready(page);
    await expect(page.getByTestId('preset-overview')).toHaveText('Overview');
    await page.goto('/budzse/hu/');
    await ready(page);
    await expect(page.getByTestId('preset-overview')).toHaveText('Áttekintés');
  });

  test('back and forward move between languages', async ({ page }) => {
    await page.goto('/budzse/hu/');
    await ready(page);
    await page.getByTestId('lang-en').click();
    await expect(page.getByTestId('preset-overview')).toHaveText('Overview');
    await page.goBack();
    await expect(page.getByTestId('preset-overview')).toHaveText('Áttekintés');
    await expect(page).toHaveURL(/\/budzse\/hu\//);
    await page.goForward();
    await expect(page.getByTestId('preset-overview')).toHaveText('Overview');
  });
});

test.describe('chart controls', () => {
  test('metric chips toggle and reach the URL', async ({ page }) => {
    await page.goto('/budzse/en/');
    await ready(page);
    await page.getByTestId('metric-gdp').click();
    await expect(page.getByTestId('metric-gdp')).toHaveAttribute('aria-pressed', 'true');
    await expect(page).toHaveURL(/m=[^&]*gdp/);
    await page.getByTestId('metric-gdp').click();
    await expect(page).not.toHaveURL(/gdp/);
  });

  test('removing every metric shows an instruction instead of an empty chart', async ({ page }) => {
    await page.goto('/budzse/en/?m=def');
    await ready(page);
    await page.getByTestId('metric-deficit').click();
    await expect(page.getByText('Choose at least one indicator')).toBeVisible();
  });

  test('planned, actual and both views change the legend', async ({ page }) => {
    await page.goto('/budzse/en/');
    await ready(page);
    const legend = page.locator('.legend');
    await expect(legend).toContainText('Actual');
    await expect(legend).not.toContainText('Original budget act');
    await page.getByTestId('planview').getByRole('button', { name: 'Budgeted and actual' }).click();
    await expect(legend).toContainText('Original budget act');
    await page.getByTestId('planview').getByRole('button', { name: 'Budgeted', exact: true }).click();
    await expect(legend).not.toContainText(/^Actual/);
    await expect(legend).toContainText('Original budget act');
  });

  test('inflation switch changes figures immediately and keeps nominal visible', async ({ page }) => {
    await page.goto('/budzse/en/?y=2010');
    await ready(page);
    const panel = yearPanel(page);
    await expect(panel).toContainText('HUF 13.2 trillion');
    await page.getByTestId('inflation').check({ force: true });
    await expect(page).toHaveURL(/real=1/);
    await expect(panel).toContainText('(nominal)');
    await expect(panel.locator('.value-num').first()).not.toHaveText('HUF 13.2 trillion');
    await page.getByTestId('reference').selectOption('2010');
    await expect(panel.locator('.value-num').first()).toHaveText('HUF 13.2 trillion');
    await expect(page).toHaveURL(/ref=2010/);
  });

  test('latest month is available as a price level', async ({ page }) => {
    await page.goto('/budzse/en/?real=1');
    await ready(page);
    await page.getByTestId('reference').selectOption('latest');
    await expect(page).toHaveURL(/ref=latest/);
    await expect(page.getByTestId('reference')).toContainText('September 2026');
  });

  test('forecast-year values are marked as estimates when adjusted', async ({ page }) => {
    await page.goto('/budzse/en/?real=1&y=2027&s=g');
    await ready(page);
    await expect(yearPanel(page).locator('.estimate').first()).toHaveText('estimate');
  });

  test('CPI-adjusted GDP carries the real-GDP warning', async ({ page }) => {
    await page.goto('/budzse/en/?real=1&m=gdp');
    await ready(page);
    await expect(page.getByTestId('gdp-real-note')).toContainText('not official real GDP');
  });

  test('scope switch changes the figures for one year', async ({ page }) => {
    await page.goto('/budzse/en/?y=2020');
    await ready(page);
    await expect(yearPanel(page)).toContainText('Central subsystem');
    await expect(yearPanel(page)).toContainText('HUF 5.31 trillion');
    await page.getByTestId('scope').getByRole('button', { name: /General government/ }).click();
    await expect(yearPanel(page)).toContainText('General government');
    await expect(yearPanel(page)).toContainText('HUF 3.65 trillion');
    await expect(page).toHaveURL(/s=g/);
  });

  test('year selection works through the select and the steppers', async ({ page }) => {
    await page.goto('/budzse/en/');
    await ready(page);
    await page.getByTestId('year-select').selectOption('2008');
    await expect(page).toHaveURL(/y=2008/);
    await yearPanel(page).getByRole('button', { name: 'Next year' }).click();
    await expect(page.getByTestId('year-select')).toHaveValue('2009');
  });

  test('clicking the chart selects a year', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Covered by the tap test');
    await page.goto('/budzse/en/?m=rev');
    await ready(page);
    const box = (await page.getByTestId('chart').boundingBox())!;
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await expect(page).toHaveURL(/y=\d{4}/);
  });

  test('tapping the chart updates the readout', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 700 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    await page.goto('/budzse/hu/');
    await ready(page);
    const box = (await page.getByTestId('chart').boundingBox())!;
    await page.touchscreen.tap(box.x + box.width * 0.45, box.y + 150);
    await expect(page).toHaveURL(/y=\d{4}/);
    const year = new URL(page.url()).searchParams.get('y');
    await expect(page.getByTestId('readout')).toContainText(year!);
    await ctx.close();
  });

  test('range selects constrain the table and the URL', async ({ page }) => {
    await page.goto('/budzse/en/');
    await ready(page);
    await openMore(page);
    await page.getByTestId('from').selectOption('2010');
    await page.getByTestId('to').selectOption('2012');
    await expect(page).toHaveURL(/from=2010&to=2012/);
    await expect(page.getByTestId('table-section').locator('tbody th').first()).toHaveText('2010');
    await expect(page.getByTestId('table-section').locator('tbody th').last()).toHaveText('2012');
  });

  test('reset restores the defaults', async ({ page }) => {
    await page.goto('/budzse/en/?s=g&real=1&y=2010&m=oda');
    await ready(page);
    await openMore(page);
    await page.getByTestId('reset').click();
    await expect(page).toHaveURL(/\/budzse\/en\/$/);
    await expect(page.getByTestId('metric-revenue')).toHaveAttribute('aria-pressed', 'true');
  });

  test('exact mode writes out all digits', async ({ page }) => {
    await page.goto('/budzse/en/?y=2020&x=1');
    await ready(page);
    await expect(yearPanel(page)).toContainText('HUF 5,311,318,000,000');
  });

  test('presets apply and history can undo them', async ({ page }) => {
    await page.goto('/budzse/en/');
    await ready(page);
    await page.getByTestId('preset-oda').click();
    await expect(page.getByTestId('metric-oda')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('metric-revenue')).toHaveAttribute('aria-pressed', 'false');
    await page.goBack();
    await expect(page.getByTestId('metric-revenue')).toHaveAttribute('aria-pressed', 'true');
    await page.goForward();
    await expect(page.getByTestId('metric-oda')).toHaveAttribute('aria-pressed', 'true');
  });
});

test.describe('sources, comparisons and exports', () => {
  test('every figure opens its provenance', async ({ page }) => {
    await page.goto('/budzse/en/?y=2020');
    await ready(page);
    await page.getByTestId('source-central.deficit.2020.actual').click();
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

  test('adjusted figures explain the CPI factor', async ({ page }) => {
    await page.goto('/budzse/en/?y=2010&real=1');
    await ready(page);
    await page.getByTestId('source-central.revenue.2010.actual').click();
    const dialog = page.getByTestId('source-dialog');
    await expect(dialog).toContainText('CPI(2025) / CPI(year)');
    await expect(dialog.getByRole('link', { name: /Consumer price index/ })).toHaveAttribute('href', /ksh\.hu/);
  });

  test('secondary citations are disclosed', async ({ page }) => {
    await page.goto('/budzse/en/?y=2027');
    await ready(page);
    await page.getByTestId('source-central.deficit.2027.draft').click();
    await expect(page.getByTestId('source-dialog')).toContainText('Secondary citation');
  });

  test('missing data says so instead of showing zero', async ({ page }) => {
    await page.goto('/budzse/en/?y=2001&m=oda');
    await ready(page);
    const panel = yearPanel(page);
    await expect(panel).toContainText('No verified data');
    await expect(panel).toContainText('OECD DAC1 reports ODA for Hungary from 2003');
  });

  test('comparison shows differences across compatible years', async ({ page }) => {
    await page.goto('/budzse/en/?ca=2010&cb=2025');
    await ready(page);
    const c = page.getByTestId('compare-result');
    await expect(c).toContainText('Difference');
    await expect(c).toContainText('Change');
    await expect(page.getByTestId('compare-warning')).toHaveCount(0);
  });

  test('comparison refuses to subtract across the 2010 break', async ({ page }) => {
    await page.goto('/budzse/en/?ca=2009&cb=2010');
    await ready(page);
    await expect(page.getByTestId('compare-warning')).toContainText('different scopes');
    await expect(page.getByTestId('compare-result')).not.toContainText('Difference');
  });

  test('comparison selections stay in the URL', async ({ page }) => {
    await page.goto('/budzse/en/');
    await ready(page);
    await page.getByTestId('compare-indicator').selectOption('oda');
    await page.getByTestId('compare-a-year').selectOption('2015');
    await page.getByTestId('compare-b-year').selectOption('2024');
    await expect(page).toHaveURL(/ci=oda/);
    await expect(page).toHaveURL(/ca=2015/);
    await expect(page).toHaveURL(/cb=2024/);
  });

  test('table filters work', async ({ page }) => {
    await page.goto('/budzse/en/');
    await ready(page);
    await page.getByTestId('table-indicator').selectOption('oda');
    await page.getByTestId('table-status').selectOption('actual');
    await expect(page.getByTestId('table-count')).toHaveText('22 figures');
  });

  test('CSV export carries the filtered rows and citations', async ({ page }) => {
    await page.goto('/budzse/en/?from=2020&to=2021&m=def');
    await ready(page);
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
  for (const width of [375, 390, 768, 1440]) {
    test(`no horizontal page overflow at ${width}px`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width, height: 800 } });
      const page = await ctx.newPage();
      for (const q of ['', '?m=rev,exp,def,gdp,oda&v=both&rev=1', '?x=1&y=2020', '?real=1&s=g']) {
        await page.goto(`/budzse/hu/${q}`);
        await ready(page);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, q).toBeLessThanOrEqual(0);
      }
      await ctx.close();
    });
  }

  test('the chart appears on the first phone screen', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    await page.goto('/budzse/hu/');
    await ready(page);
    const box = (await page.getByTestId('chart').boundingBox())!;
    expect(box.y).toBeLessThan(420);
    await ctx.close();
  });

  test('touch targets are large enough on phones', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 700 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    await page.goto('/budzse/hu/');
    await ready(page);
    const small = await page.evaluate(() =>
      [...document.querySelectorAll('.presets button, .chip, .segmented-row button, .lang-switch button, .theme-button, .year-step')]
        .map((el) => [el.className || el.textContent, el.getBoundingClientRect().height] as const)
        .filter(([, h]) => h < 38),
    );
    expect(small).toEqual([]);
    await ctx.close();
  });

  test('axe finds no serious violations', async ({ page }) => {
    await page.goto('/budzse/hu/?y=2020&v=both');
    await ready(page);
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' | ')}`)).toEqual([]);
  });

  test('axe finds no serious violations in dark mode', async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: 'dark', viewport: { width: 390, height: 800 } });
    const page = await ctx.newPage();
    await page.goto('/budzse/en/?real=1&s=g');
    await ready(page);
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' | ')}`)).toEqual([]);
    await ctx.close();
  });

  test('controls are keyboard reachable with visible focus', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Keyboard on desktop');
    await page.goto('/budzse/en/');
    await ready(page);
    await page.keyboard.press('Tab');
    await expect(page.locator('.skip')).toBeFocused();
    await page.getByTestId('metric-gdp').focus();
    const outline = await page.getByTestId('metric-gdp').evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(outline).not.toBe('none');
    await page.getByTestId('chart').focus();
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByTestId('year-select')).toHaveValue('2024');
  });

  test('reduced motion disables chart animation', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto('/budzse/en/');
    await ready(page);
    const transition = await page.locator('.switch-track').first().evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(['0s', '0ms']).toContain(transition);
    await ctx.close();
  });

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
