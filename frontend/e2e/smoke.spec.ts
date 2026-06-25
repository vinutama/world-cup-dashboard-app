import { test, expect } from '@playwright/test';

test.describe('World Cup Dashboard', () => {
  test('homepage loads and shows title', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveText('FIFA World Cup Dashboard');
  });

  test('tournaments page shows 9 cards with pagination', async ({ page }) => {
    await page.goto('/tournaments');
    // Wait for data to load and tournament cards to render
    await page.waitForSelector('a[href^="/tournaments/"]', { timeout: 10000 });
    const cards = page.locator('a[href^="/tournaments/"] h2');
    await expect(cards.first()).toBeVisible();
    // Page 1 shows exactly 9 tournaments
    expect(await cards.count()).toBe(9);
    // Click Next and verify page 2 has more
    await page.getByRole('button', { name: /next/i }).click();
    await page.waitForTimeout(300);
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test('matches page loads for 2018', async ({ page }) => {
    await page.goto('/tournaments/2018/matches');
    await page.waitForSelector('a[href^="/matches/2018-"]', { timeout: 10000 });
    const matches = page.locator('a[href^="/matches/2018-"]');
    await expect(matches.first()).toBeVisible();
    // Page 1 should show 5 matches (paginated)
    expect(await matches.count()).toBeLessThanOrEqual(5);
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
