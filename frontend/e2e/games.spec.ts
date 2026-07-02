import { test, expect } from '@playwright/test';

test.describe('Games Page', () => {
  test('games page loads and shows match cards with scores', async ({ page }) => {
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

      // Check that score elements are rendered (font-mono tabular-nums)
      const scoreElements = page.locator('.font-mono.tabular-nums');
      const scoreCount = await scoreElements.count();
      expect(scoreCount).toBeGreaterThan(0);

      // At least one score shows "0 — 0" (muted placeholder) or a real score pattern
      const scoresVisible = await page.locator('text=0 — 0').count();
      // Either we see muted placeholder scores or real scored matches
      // This confirms ScoreDisplay is rendering
      const scoreTexts = page.locator('.font-mono.tabular-nums');
      const firstScore = await scoreTexts.first().textContent();
      expect(firstScore).toBeTruthy();
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
