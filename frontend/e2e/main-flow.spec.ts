import { test, expect } from '@playwright/test';

test.describe('Main User Flows', () => {
  test('1. Browse tournaments → filter by year → select a tournament', async ({ page }) => {
    await page.goto('/tournaments');
    // Wait for tournament cards to load
    await page.waitForSelector('a[href^="/tournaments/"] h2', { timeout: 10000 });

    // Open year filter dropdown
    const filterBtn = page.getByRole('button', { name: /filter/i });
    await expect(filterBtn).toBeVisible();
    await filterBtn.click();

    // Select "2022" from dropdown options
    await page.getByRole('button', { name: '2022', exact: true }).click();
    await expect(page.locator('a[href^="/tournaments/"] h2')).not.toHaveCount(0);

    // Click the first tournament card — should navigate to /tournaments/2022/matches
    const firstCard = page.locator('a[href^="/tournaments/"]').first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();

    await expect(page).toHaveURL('/tournaments/2022/matches');
    // Verify match cards load
    await expect(page.locator('a[href^="/matches/2022-"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('2. View matches for a selected tournament — shows teams and scores', async ({ page }) => {
    await page.goto('/tournaments/2018/matches');
    await page.waitForSelector('a[href^="/matches/2018-"]', { timeout: 10000 });

    // Should have match links visible
    const matchLinks = page.locator('a[href^="/matches/2018-"]');
    await expect(matchLinks.first()).toBeVisible();

    // Each match card should display a team name
    const firstMatchLink = matchLinks.first();
    const matchText = await firstMatchLink.textContent();
    expect(matchText?.trim().length).toBeGreaterThan(0);
  });

  test('3. Click a match → view match details → navigate back', async ({ page }) => {
    await page.goto('/tournaments/2018/matches');
    await page.waitForSelector('a[href^="/matches/2018-"]', { timeout: 10000 });

    // Click first match link
    const firstMatch = page.locator('a[href^="/matches/2018-"]').first();
    await firstMatch.click();

    // Should be on match detail page
    await expect(page).toHaveURL(/\/matches\/2018-/);

    // Verify detail content — teams heading should be visible
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    const headingText = await heading.textContent();
    // Heading should show "TeamA vs TeamB"
    expect(headingText).toContain('vs');

    // Score should be visible (the main full-time score block)
    const scoreBlock = page.locator('.font-mono.text-xl.font-bold');
    await expect(scoreBlock).toBeVisible();
    expect(await scoreBlock.textContent()).toMatch(/\d+ – \d+/);

    // Click "← Back to Matches" link
    await page.getByText(/back to matches/i).click();
    await expect(page).toHaveURL('/tournaments/2018/matches');
  });
});
