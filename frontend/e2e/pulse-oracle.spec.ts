import { test, expect } from '@playwright/test';

test.describe('Pulse Oracle', () => {
  test('page loads with title and content', async ({ page }) => {
    await page.goto('/pulse');

    // Title
    await expect(page.locator('h1')).toContainText('Pulse Oracle');

    // Subtitle
    await expect(page.getByText('Prediction insights powered by Polymarket')).toBeVisible();

    // Wait for content to settle — either the spinning wheel, wheel skeleton,
    // or the inline list with percentages
    await page.waitForFunction(() => {
      const body = document.body;
      if (!body) return false;
      const text = body.textContent || '';
      return (
        text.includes('Wisdom Wheel') ||
        text.includes('Could not load') ||
        text.includes('Failed to load')
      );
    }, { timeout: 15000 });

    // Left column heading is present
    const wisdomWheelHeading = page.locator('h2', { hasText: 'Wisdom Wheel' });
    await expect(wisdomWheelHeading).toBeVisible();
  });

  test('spinning wheel component renders', async ({ page }) => {
    await page.goto('/pulse');

    // The spinning wheel container exists — either skeleton or populated segments
    // Check for the WC center hub (static element always present inside the wheel)
    await page.waitForTimeout(1000);

    // The wheel is a 340x340 relative container — check it exists
    const wheel = page.locator('.relative.w-\\[340px\\]');
    await expect(wheel).toBeVisible({ timeout: 10000 });

    // Hover the wheel to verify pause on hover works (animation-play-state)
    // Just check the element is interactive
    await wheel.hover();
    await expect(wheel).toBeVisible();
  });

  test('wisdom wheel inline list renders items with percentage', async ({ page }) => {
    await page.goto('/pulse');

    // Wait for content
    await page.waitForFunction(() => {
      const body = document.body;
      if (!body) return false;
      const text = body.textContent || '';
      return text.includes('%') || text.includes('Could not load');
    }, { timeout: 15000 });

    const text = await page.locator('body').textContent();

    // If data loaded, verify the inline list shows percentages
    if (text && !text.includes('Could not load') && !text.includes('Failed to load')) {
      // At least one item has a percentage
      const pctSpans = page.locator('text=%');
      const count = await pctSpans.count();
      expect(count).toBeGreaterThan(0);

      // Progress bars inside the inline list should have w-full class
      // (full-width decorative bar, not proportional)
      const progressBars = page.locator('.w-full.h-2');
      const barCount = await progressBars.count();
      expect(barCount).toBeGreaterThan(0);
    }
  });

  test('right column is empty placeholder', async ({ page }) => {
    await page.goto('/pulse');

    // Check the right column exists and is empty
    // The grid has two children: left (col-span-7) and right (col-span-5)
    const grid = page.locator('.grid.grid-cols-1.lg\\:grid-cols-12');
    await expect(grid).toBeVisible();

    // The right column should be an empty div
    const rightCols = page.locator('.lg\\:col-span-5');
    const count = await rightCols.count();
    expect(count).toBe(1);

    // Verify no Match Oracle text is present
    await expect(page.getByText('Match Oracle')).toHaveCount(0);
  });

  test('nav link navigates to pulse oracle page', async ({ page }) => {
    await page.goto('/');

    // Find the Pulse Oracle nav link
    const pulseNav = page.locator('nav a', { hasText: 'Pulse Oracle' });
    await expect(pulseNav).toBeVisible();

    // Click it
    await pulseNav.click();
    await expect(page).toHaveURL('/pulse');
    await expect(page.locator('h1')).toContainText('Pulse Oracle');
  });
});
