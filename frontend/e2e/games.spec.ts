import { test, expect } from '@playwright/test';

test.describe('Games Page', () => {
  test('games page loads and shows match cards', async ({ page }) => {
    await page.goto('/games');

    // Wait for the page heading
    await expect(page.locator('h1')).toContainText('World Cup 2026 Matches');

    // Wait for either match cards or empty state — data may take time
    // with the 15 concurrent Gamma API calls
    await page.waitForFunction(() => {
      const main = document.querySelector('main');
      if (!main) return false;
      const text = main.textContent || '';
      // Either match data loaded (VS badges) or empty state
      return text.includes('No matches') || text.includes('VS');
    }, { timeout: 15000 });

    const text = await page.locator('main').textContent();

    if (text && text.includes('No matches')) {
      await expect(page.locator('main')).toContainText('No matches available');
    } else {
      const vsBadges = page.locator('text=VS');
      const count = await vsBadges.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('games nav item is visible and clickable', async ({ page }) => {
    await page.goto('/');

    // Find the Games nav link
    const gamesNav = page.locator('nav a', { hasText: 'Games' });
    await expect(gamesNav).toBeVisible();

    // Click it
    await gamesNav.click();
    await expect(page).toHaveURL('/games');
    await expect(page.locator('h1')).toContainText('World Cup 2026 Matches');
  });
});
