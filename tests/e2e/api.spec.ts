import { existsSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('data API on the GitHub Pages layout', () => {
  test.beforeEach(({ }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'The files do not depend on the viewport');
  });

  test('the deployment artifact contains the API and skips Jekyll', () => {
    for (const path of [
      'dist/.nojekyll',
      'dist/404.html',
      'dist/llms.txt',
      'dist/llms-full.txt',
      'dist/api/v1/index.json',
      'dist/api/v1/index.html',
      'dist/api/v1/metadata.json',
      'dist/api/v1/observations/central.revenue.2000.original.json',
      'dist/api/v1/years/2020.json',
      'dist/api/v1/indicators/deficit.json',
      'dist/api/v1/sources/eurostat-gov.json',
      'dist/hu/api/index.html',
      'dist/en/api/index.html',
      'dist/hu/obs/central.revenue.2000.original/index.html',
      'dist/en/figures/index.html',
    ]) expect(existsSync(path), path).toBe(true);
  });

  test('an agent can fetch a figure, a year, an indicator and a source', async ({ request }) => {
    const llms = await request.get('/budzse/llms.txt');
    expect(llms.status()).toBe(200);
    expect(llms.headers()['content-type']).toContain('text/plain');
    expect(await llms.text()).toMatch(/^# Büdzsé\n/);

    const full = await request.get('/budzse/llms-full.txt');
    expect(full.status()).toBe(200);

    const catalog = await request.get('/budzse/api/v1/index.json');
    expect(catalog.status()).toBe(200);
    expect(catalog.headers()['content-type']).toContain('application/json');
    const body = await catalog.json();
    expect(body.examples.budget).toContain('/observations/central.revenue.2000.original.json');

    const one = await request.get('/budzse/api/v1/observations/central.revenue.2000.original.json');
    expect(one.status()).toBe(200);
    const record = await one.json();
    expect(record.value).toBe(3_392_043_900_000);
    expect(record.status).toBe('original');
    expect(record.scope).toBe('centralBudget');
    expect(record.source.url).toBe('https://mkogy.jogtar.hu/jogszabaly?docid=99900125.tv');
    expect(record.interpretation.cpiAdjusted).toBe(false);
    expect(record.citation.en).toContain('not an outturn');
    expect(record.citation.en).toContain(record.source.url);

    expect((await request.get('/budzse/api/v1/years/2020.json')).status()).toBe(200);
    expect((await request.get('/budzse/api/v1/indicators/deficit.json')).status()).toBe(200);
    expect((await request.get('/budzse/api/v1/sources/eurostat-gov.json')).status()).toBe(200);
    expect((await request.get('/budzse/api/v1/metadata.json')).status()).toBe(200);
    expect((await request.get('/budzse/api/v1/gaps.json')).status()).toBe(200);

    const missing = await request.get('/budzse/api/v1/observations/not.a.real.id.json');
    expect(missing.status()).toBe(404);
  });

  test('a directory URL resolves and an unknown API path does not become the chart', async ({ request }) => {
    const home = await request.get('/budzse/api/v1/');
    expect(home.status()).toBe(200);
    expect(await home.text()).toContain('index.json');
    const guide = await request.get('/budzse/hu/api/');
    expect(guide.status()).toBe(200);
    expect(guide.headers()['content-type']).toContain('text/html');
  });

  test('the homepage names the dataset and the API without running JavaScript', async ({ request }) => {
    for (const path of ['/budzse/', '/budzse/hu/', '/budzse/en/']) {
      const html = await (await request.get(path)).text();
      expect(html, path).toContain('rel="describedby"');
      expect(html, path).toContain('https://tmrk.github.io/budzse/llms.txt');
      expect(html, path).toContain('application/ld+json');
      expect(html, path).toContain('"@type": "Dataset"');
      expect(html, path).toContain('/budzse/api/v1/index.json');
    }
  });

  test('an observation page can be read with JavaScript disabled', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    const response = await page.goto('/budzse/en/obs/central.revenue.2000.original/');
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toContainText('2000');
    await expect(page.locator('body')).toContainText('not an outturn');
    await expect(page.locator('body')).toContainText('3,392,043,900,000');
    await expect(page.locator('a[rel="cite"]')).toHaveAttribute('href', 'https://mkogy.jogtar.hu/jogszabaly?docid=99900125.tv');
    await expect(page.locator('script[type="module"]')).toHaveCount(0);
    await context.close();
  });

  test('the guide and one record pass axe', async ({ page }) => {
    await page.goto('/budzse/en/api/');
    await expect(page.locator('h1')).toHaveText('Data and API');
    await expect(page.locator('a[href="/budzse/api/v1/index.json"]').first()).toBeVisible();
    await expect(page.getByTestId('ledger')).toHaveCount(0);
    const guide = await new AxeBuilder({ page }).analyze();
    expect(guide.violations.filter((item) => item.impact === 'serious' || item.impact === 'critical').map((item) => item.id)).toEqual([]);

    await page.goto('/budzse/hu/obs/central.revenue.2000.original/');
    await expect(page.locator('h1')).toContainText('2000');
    const record = await new AxeBuilder({ page }).analyze();
    expect(record.violations.filter((item) => item.impact === 'serious' || item.impact === 'critical').map((item) => item.id)).toEqual([]);
  });
});

test.describe('the footer link', () => {
  test('opens the guide in the current language', async ({ page }) => {
    await page.goto('/budzse/hu/');
    await expect(page.getByTestId('ledger')).toBeVisible();
    const link = page.getByTestId('api-link');
    await expect(link).toHaveText('Adatok és API');
    await expect(link).toHaveAttribute('href', '/budzse/hu/api/');
    await link.click();
    await expect(page).toHaveURL(/\/budzse\/hu\/api\/?$/);
    await expect(page.locator('h1')).toHaveText('Adatok és API');
    await expect(page.locator('a[href="/budzse/api/v1/index.json"]').first()).toBeVisible();
  });

  test('follows a language change without leaving the chart', async ({ page }) => {
    await page.goto('/budzse/hu/');
    await expect(page.getByTestId('ledger')).toBeVisible();
    await page.evaluate(() => ((window as unknown as { __marker: number }).__marker = 7));
    await page.getByTestId('lang-en').click();
    expect(await page.evaluate(() => (window as unknown as { __marker: number }).__marker)).toBe(7);
    await expect(page.getByTestId('api-link')).toHaveText('Data and API');
    await expect(page.getByTestId('api-link')).toHaveAttribute('href', '/budzse/en/api/');
  });

  test('the guide does not widen the page', async ({ page }) => {
    for (const path of ['/budzse/hu/api/', '/budzse/en/figures/']) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, path).toBeLessThanOrEqual(1);
    }
  });
});
