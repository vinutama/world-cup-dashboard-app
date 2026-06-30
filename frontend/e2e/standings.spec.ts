import { test, expect } from '@playwright/test';

test.describe('Standings Page', () => {
  test('standings page loads and shows group tables or error state', async ({ page }) => {
    await page.goto('/standings');

    // Wait for the page heading
    await expect(page.locator('h1')).toContainText('Group Standings');

    // Wait for data or error — the ESPN API may or may not be reachable
    await page.waitForFunction(() => {
      const main = document.querySelector('main');
      if (!main) return false;
      const text = main.textContent || '';
      // Either group tables loaded, or error state, or still loading
      return text.includes('Group') || text.includes('Could not load');
    }, { timeout: 15000 });

    const text = await page.locator('main').textContent();

    if (text && text.includes('Could not load')) {
      // Error state is acceptable in CI with no ESPN access
      await expect(page.locator('main')).toContainText('Could not load standings');
    } else if (text && text.includes('Group')) {
      // Should show at least one group table with team data
      const groupHeaders = page.locator('text=/Group [A-Z]/');
      const count = await groupHeaders.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('standings nav item is visible and clickable', async ({ page }) => {
    await page.goto('/');

    const standingsNav = page.locator('nav a', { hasText: 'Standings' });
    await expect(standingsNav).toBeVisible();

    await standingsNav.click();
    await expect(page).toHaveURL('/standings');
    await expect(page.locator('h1')).toContainText('Group Standings');
  });
});
