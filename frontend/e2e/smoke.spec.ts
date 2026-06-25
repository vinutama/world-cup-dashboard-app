import { test, expect } from '@playwright/test';

test.describe('World Cup Dashboard', () => {
  test('homepage loads and shows title', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveText('FIFA World Cup Dashboard');
  });

  test('tournaments page shows tournament cards', async ({ page }) => {
    await page.goto('/tournaments');
    // Wait for data to load and tournament cards to render
    await page.waitForSelector('a[href^="/tournaments/"]', { timeout: 10000 });
    const cards = page.locator('a[href^="/tournaments/"] h2');
    await expect(cards.first()).toBeVisible();
    // Should have at least 20 years listed
    expect(await cards.count()).toBeGreaterThan(20);
  });

  test('matches page loads for 2018', async ({ page }) => {
    await page.goto('/tournaments/2018/matches');
    await page.waitForSelector('a[href^="/matches/2018-"]', { timeout: 10000 });
    const matches = page.locator('a[href^="/matches/2018-"]');
    await expect(matches.first()).toBeVisible();
    // Page 1 should show 10 matches (paginated)
    expect(await matches.count()).toBeLessThanOrEqual(10);
  });

  test('pagination on matches page', async ({ page }) => {
    await page.goto('/tournaments/2018/matches?page=2');
    await page.waitForSelector('a[href^="/matches/2018-"]', { timeout: 10000 });
    const matches = page.locator('a[href^="/matches/2018-"]');
    await expect(matches.first()).toBeVisible();
    // Page 2 should also show matches
    expect(await matches.count()).toBeGreaterThan(0);
  });

  test('404 page for unknown routes', async ({ page }) => {
    await page.goto('/nonexistent');
    await expect(page.locator('h1')).toContainText('404');
  });
});
