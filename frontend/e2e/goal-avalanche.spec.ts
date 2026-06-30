import { test, expect } from '@playwright/test';

test.describe('Goal Avalanche', () => {
  test.describe.configure({ mode: 'serial' });
  test('page loads and shows title', async ({ page }) => {
    await page.goto('/goal-avalanche');
    await expect(page.locator('h1')).toHaveText('Goal Avalanche');
    await expect(page.locator('p')).toContainText('FIFA World Cup 2018');
  });

  test('default year 2018 via /goal-avalanche route', async ({ page }) => {
    await page.goto('/goal-avalanche');
    await expect(page.locator('h1')).toHaveText('Goal Avalanche');
    await expect(page.locator('p')).toContainText('FIFA World Cup 2018');
  });

  test('year param route /goal-avalanche/2022', async ({ page }) => {
    await page.goto('/goal-avalanche/2022');
    await expect(page.locator('h1')).toHaveText('Goal Avalanche');
    await expect(page.locator('p')).toContainText('FIFA World Cup 2022');
  });

  test('renders events with scorer names', async ({ page }) => {
    await page.goto('/goal-avalanche/2018');
    // Wait for known scorer to appear
    await expect(page.getByText('Gazinsky').first()).toBeVisible({ timeout: 10000 });
    // Verify multiple scorers rendered (Gazinsky and at least one other)
    // Cheryshev scored multiple times, so use a scorer who only scored once
    await expect(page.getByText('Dzyuba').first()).toBeVisible({ timeout: 5000 });
  });

  test('shows match day section headers', async ({ page }) => {
    await page.goto('/goal-avalanche/2018');
    // Wait for data to load, then check day headers
    await page.waitForSelector('h2', { timeout: 15000 });
    // Use toContainText for resilience against whitespace/nesting differences
    const dayHeadings = page.locator('h2');
    await expect(dayHeadings.first()).toContainText(/Day\s+\d/i);
  });

  test('shows goal count per day', async ({ page }) => {
    await page.goto('/goal-avalanche/2018');
    await page.waitForSelector('h2', { timeout: 15000 });
    const dayHeadings = page.locator('h2');
    await expect(dayHeadings.first()).toContainText(/goal/i);
  });

  test('expand card shows full-time score and round', async ({ page }) => {
    await page.goto('/goal-avalanche/2018');
    await page.waitForSelector('span.text-2xl', { timeout: 15000 });
    // Click the first minute badge (top of page, always visible)
    const badge = page.locator('span.text-2xl').first();
    await badge.waitFor({ state: 'visible', timeout: 10000 });
    await badge.click();
    // Wait for expanded details
    await expect(page.getByText('Full time').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Stage').first()).toBeVisible({ timeout: 5000 });
  });

  test('expand shows timeline bar with marker', async ({ page }) => {
    await page.goto('/goal-avalanche/2018');
    await page.waitForSelector('span.text-2xl', { timeout: 15000 });
    // Click a card to expand
    const badge = page.locator('span.text-2xl').first();
    await badge.waitFor({ state: 'visible', timeout: 10000 });
    await badge.click();
    // Timeline bar should be visible — scope to the expanded card
    await expect(page.getByText('Match timeline')).toBeVisible({ timeout: 5000 });
    // Use first() to avoid strict mode on minute markers
    await expect(page.getByText('0′').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('120′').first()).toBeVisible({ timeout: 5000 });
  });

  test('clicking same card toggles collapse', async ({ page }) => {
    await page.goto('/goal-avalanche/2018');
    await page.waitForSelector('span.text-2xl', { timeout: 15000 });

    const firstMinuteBadge = page.locator('span.text-2xl').first();
    await firstMinuteBadge.waitFor({ state: 'visible', timeout: 10000 });
    await firstMinuteBadge.click();

    // Should show expanded content
    await expect(page.getByText('Full time').first()).toBeVisible({ timeout: 5000 });

    // Click again to collapse
    await firstMinuteBadge.click();
    // After collapse, no "Full time" should be visible
    await expect(page.getByText('Full time')).toHaveCount(0, { timeout: 5000 });
  });

  test('clicking different card switches expanded', async ({ page }) => {
    await page.goto('/goal-avalanche/2018');
    // Wait for events
    await page.waitForSelector('span.text-2xl', { timeout: 15000 });
    // Click first card
    const badges = page.locator('span.text-2xl');
    await badges.nth(0).waitFor({ state: 'visible', timeout: 10000 });
    await badges.nth(0).click();
    await expect(page.getByText('Full time').first()).toBeVisible({ timeout: 5000 });

    // Click second card — scroll to it first to ensure visibility
    await badges.nth(1).scrollIntoViewIfNeeded();
    await badges.nth(1).waitFor({ state: 'visible', timeout: 10000 });
    await badges.nth(1).click();
    // The full-time text should still be visible (second card now expanded)
    await expect(page.getByText('Full time').first()).toBeVisible({ timeout: 5000 });
  });

  test('CHAOS badge visible on clustered events', async ({ page }) => {
    await page.goto('/goal-avalanche/2018');
    // Wait for timeline to load
    await page.getByRole('heading', { name: 'Day 2(8 goals)' }).waitFor({ timeout: 10000 });
    // Look for CHAOS badges across the page
    const chaosBadges = page.locator('text=CHAOS');
    const count = await chaosBadges.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('error state for year with no data', async ({ page }) => {
    await page.goto('/goal-avalanche/2099');
    await expect(page.getByText(/Error:/)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/tournament not found/i)).toBeVisible({ timeout: 3000 });
  });

  test('known scorers from different matches render', async ({ page }) => {
    await page.goto('/goal-avalanche/2018');
    // Check known scorers — use .first() since some names appear in multiple events
    await expect(page.getByText('Ronaldo').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Messi').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Mbappé').first()).toBeVisible({ timeout: 5000 });
  });
});
