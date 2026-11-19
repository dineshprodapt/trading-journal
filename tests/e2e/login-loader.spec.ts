import { test, expect } from '@playwright/test';

test('login loader waits for data then holds for three seconds', async ({ page }) => {
  await page.goto('/journal');
  await expect(page.getByRole('heading', { name: 'Dinesh Trading Journal' })).toBeVisible();
  await page.clock.install();
  await page.evaluate(() => {
    const app = (window as any).ng.getComponent(document.querySelector('app-root'));
    app.journal.loading.set(true);
    app.journal.loginPresentationPending.set(true);
  });
  await expect(page.locator('.journal-loading-overlay')).toBeVisible();
  await page.clock.runFor(4000);
  await expect(page.locator('.journal-loading-overlay')).toBeVisible();
  await page.evaluate(() => {
    const app = (window as any).ng.getComponent(document.querySelector('app-root'));
    app.journal.loading.set(false);
  });
  await page.clock.runFor(2800);
  await expect(page.locator('.journal-loading-overlay')).toBeVisible();
  await page.evaluate(() => {
    const app = (window as any).ng.getComponent(document.querySelector('app-root'));
    app.journal.entries.set([...app.journal.entries()]);
  });
  await page.clock.runFor(400);
  await expect(page.locator('app-journal-loader')).toHaveCount(0);
  await expect(page.locator('app-root > div')).not.toHaveAttribute('inert');
});
