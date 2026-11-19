import { test, expect } from '@playwright/test';

test('rules illustration fits desktop and mobile and respects reduced motion', async ({ page }) => {
  await page.goto('/journal/rules');
  await expect(page.locator('.discipline-checklist')).toBeVisible();
  for (const width of [1366, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(page.getByRole('heading', { name: 'My Trading Rules', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.check-one')).toHaveCSS('animation-name', 'none');
});
