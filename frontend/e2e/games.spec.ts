import { test, expect } from '@playwright/test';

test.describe('Games Page', () => {
  test('games page loads and shows match cards', async ({ page }) => {
    await page.goto('/games');

    // Wait for the page heading
    await expect(page.locator('h1')).toContainText('World Cup 2026 Matches');

    // Should either show match cards or empty state
    // Wait for data to settle (skeleton disappears or data renders)
    await page.waitForTimeout(2000);

    const pageContent = page.locator('main');
    const text = await pageContent.textContent();

    // Either we have match data (team1 vs team2 pattern) or empty state
    if (text && text.includes('No matches')) {
      // Empty state is acceptable
      await expect(page.locator('main')).toContainText('No matches available');
    } else {
      // Should have rendered match cards
      // Match cards contain "VS" in the card
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
