import { test, expect } from '@playwright/test';

test('theme changes all pages, persists, and works on mobile and with keyboard', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/journal');
  const root = page.locator('html');
  await expect(root).toHaveAttribute('data-bs-theme', 'light');
  await expect(page.locator('.sidebar')).toHaveCSS('background-color', 'rgb(18, 46, 39)');
  await page.getByRole('button', { name: 'Switch to dark theme' }).focus();
  await page.keyboard.press('Enter');
  await expect(root).toHaveAttribute('data-bs-theme', 'dark');
  await expect(page.locator('#daily')).toHaveCSS('background-color', 'rgb(24, 48, 48)');
  await expect(page.locator('#monthly')).toHaveCSS('background-color', 'rgb(43, 34, 46)');
  await expect(page.locator('.sidebar')).toHaveCSS('background-color', 'rgb(12, 23, 18)');
  await page.getByRole('button', { name: 'New daily entry' }).click();
  await expect(page.getByLabel('Profit / Loss (₹) *')).toHaveCSS('background-color', 'rgb(19, 33, 25)');
  await page.locator('.sidebar').getByRole('link', { name: 'My Trading Rules' }).click();
  await expect(page.locator('.rule-card').first()).toHaveCSS('background-color', 'rgb(26, 42, 34)');
  for (const paragraph of await page.locator('.rule-card > p').all()) {
    await expect(paragraph).toHaveCSS('color', 'rgb(207, 221, 212)');
  }
  await expect(page.locator('.rule-limits')).toHaveCSS('color', 'rgb(207, 221, 212)');
  await expect(page.locator('mark')).toHaveCount(0);
  await expect(page.locator('.rule-emphasis').first()).toHaveCSS('color', 'rgb(229, 188, 121)');
  await expect(page.locator('.rule-card strong').filter({ hasText: 'Fixed Lots' })).toHaveCSS('color', 'rgb(229, 188, 121)');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Switch to light theme' })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await expect(root).toHaveAttribute('data-bs-theme', 'light');
  await expect(page.locator('.sidebar')).toHaveCSS('background-color', 'rgb(18, 46, 39)');
  await expect(page.locator('.rule-card > p').first()).toHaveCSS('color', 'rgb(61, 81, 75)');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto('/login');
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(page.locator('.login-wrap')).toHaveCSS('background-color', 'rgb(16, 27, 23)');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Switch to light theme' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('theme toggle still works when saving preferences is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new Error('Storage unavailable'); };
  });
  await page.goto('/login');
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-bs-theme', 'dark');
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-bs-theme', 'light');
});
