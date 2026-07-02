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

    // The wheel is a 320x320 relative container — check it exists
    const wheel = page.locator('.relative.w-\\[320px\\]');
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

  test('continent pulse section renders with continent cards', async ({ page }) => {
    await page.goto('/pulse');

    // Wait for the Continent Pulse heading
    await expect(page.locator('h2', { hasText: 'Continent Pulse' })).toBeVisible({ timeout: 15000 });

    // Right column exists
    const rightCols = page.locator('.lg\\:col-span-5');
    const count = await rightCols.count();
    expect(count).toBe(1);

    // Wait for data or error
    await page.waitForFunction(() => {
      const body = document.body;
      if (!body) return false;
      const text = body.textContent || '';
      return (
        text.includes('Continent Pulse') &&
        (text.includes('%') || text.includes('Failed to load'))
      );
    }, { timeout: 15000 });

    const text = await page.locator('body').textContent();

    // If data loaded, verify at least some continent cards with percentages
    if (text && !text.includes('Failed to load')) {
      // Expect percentage signs
      const pctEls = page.locator('.lg\\:col-span-5 text=%');
      const pctCount = await pctEls.count();
      expect(pctCount).toBeGreaterThanOrEqual(1);
    }
  });

  test('continent pulse shows empty state on error', async ({ page }) => {
    // Mock API to return 500
    await page.route('**/api/v1/predictions/continent', async (route) => {
      await route.fulfill({ status: 500 });
    });

    await page.goto('/pulse');

    // Continent Pulse heading should still be visible
    await expect(page.locator('h2', { hasText: 'Continent Pulse' })).toBeVisible({ timeout: 10000 });

    // Error state should show
    await expect(page.getByText(/Failed to load|Could not load/)).toBeVisible({ timeout: 10000 });
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
