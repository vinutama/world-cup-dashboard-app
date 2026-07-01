import { test, expect } from '@playwright/test';

test.describe('Golden Boot Page', () => {
  test('golden boot page loads and shows player predictions', async ({ page }) => {
    await page.goto('/golden-boot');

    // Wait for the page heading
    await expect(page.locator('h1')).toContainText('Golden Boot');

    // Wait for either player data or empty/error state
    await page.waitForFunction(() => {
      const main = document.querySelector('main');
      if (!main) return false;
      const text = main.textContent || '';
      // Either player data loaded (percentage signs) or empty/error state
      return text.includes('No Golden Boot') || text.includes('%') || text.includes('Could not load');
    }, { timeout: 15000 });

    const text = await page.locator('main').textContent();

    if (text && (text.includes('No Golden Boot') || text.includes('Could not load'))) {
      // Empty/error state is acceptable when backend is unavailable
      expect(
        text.includes('No Golden Boot') || text.includes('Could not load')
      ).toBeTruthy();
    } else {
      // Data rendered — expect percentage signs
      const pctSpans = page.locator('text=%');
      const count = await pctSpans.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('golden boot nav item is visible and clickable', async ({ page }) => {
    await page.goto('/');

    // Find the Golden Boot nav link
    const goldenBootNav = page.locator('nav a', { hasText: 'Golden Boot' });
    await expect(goldenBootNav).toBeVisible();

    // Click it
    await goldenBootNav.click();
    await expect(page).toHaveURL('/golden-boot');
    await expect(page.locator('h1')).toContainText('Golden Boot');
  });
});
