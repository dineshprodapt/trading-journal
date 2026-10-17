import { test, expect } from '@playwright/test';

test('login fits mobile and desktop screens with Google sign-in in view', async ({ page }) => {
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/login');
    await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeInViewport();
    if (viewport.width <= 767) {
      await expect(page.getByText('MY PRIVATE WORKSPACE')).toBeHidden();
    } else {
      await expect(page.getByText('MY PRIVATE WORKSPACE')).toBeVisible();
    }
    expect(await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
    }))).toEqual(viewport);
  }
});
