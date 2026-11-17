import { test, expect } from '@playwright/test';

test('sidebar follows manual scrolling in both directions and preserves page navigation', async ({ page }) => {
  await page.goto('/journal');
  const nav = page.locator('.sidebar');
  await expect(nav.getByRole('button', { name: 'Overview' })).toHaveAttribute('aria-current', 'location');
  for (const [id, label] of [['daily', 'Daily journal'], ['monthly', 'Monthly summary'], ['daily', 'Daily journal'], ['overview', 'Overview']]) {
    await page.evaluate(id => {
      const target = document.getElementById(id)!;
      const header = document.querySelector('.topbar')!.getBoundingClientRect().height;
      window.scrollTo({ top: id === 'overview' ? 0 : window.scrollY + target.getBoundingClientRect().top - header - 20, behavior: 'instant' });
    }, id);
    await expect(nav.getByRole('button', { name: label })).toHaveAttribute('aria-current', 'location');
    await expect(nav.locator('[aria-current]')).toHaveCount(1);
  }
  await nav.getByRole('button', { name: 'Monthly summary' }).click();
  await expect(page.locator('#monthly')).toBeFocused();
  await expect(nav.getByRole('button', { name: 'Monthly summary' })).toHaveAttribute('aria-current', 'location');
  await nav.getByRole('link', { name: 'Mistakes', exact: true }).click();
  await page.mouse.wheel(0, 800);
  await expect(nav.getByRole('link', { name: 'Mistakes', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(nav.locator('[aria-current]')).toHaveCount(1);
});
