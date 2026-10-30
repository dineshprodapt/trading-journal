import { test, expect } from '@playwright/test';

test('trading rules preserve emphasis and support desktop and mobile navigation', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/journal');
  await page.locator('.sidebar').getByRole('link', { name: 'My Trading Rules' }).click();
  await expect(page.getByRole('heading', { name: 'My Trading Rules', exact: true })).toBeVisible();
  await expect(page.locator('.rule-card')).toHaveCount(18);
  await expect(page.locator('mark')).toHaveCount(0);
  await expect(page.locator('.rule-emphasis').last()).toContainText('30 points SL is a HARD STOP');
  await expect(page.locator('strong.rule-red').filter({ hasText: 'HARD STOP' })).toBeVisible();
  await expect(page.locator('.rule-card em')).toContainText('Less Trades = More Profit');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'My Trading Rules', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Monthly summary' }).click();
  await expect(page.locator('#monthly')).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.mobile-page-nav').getByRole('link', { name: 'My Trading Rules' }).click();
  await expect(page.getByRole('heading', { name: 'My Trading Rules', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.locator('.mobile-page-nav').getByRole('link', { name: 'Journal', exact: true }).click();
  await expect(page.locator('#daily')).toBeAttached();
  expect(errors).toEqual([]);
});
