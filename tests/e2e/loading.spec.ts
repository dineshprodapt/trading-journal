import { test, expect, Page } from '@playwright/test';

async function pendingSnapshot(page: Page) {
  await page.evaluate(() => {
    const component = (window as any).ng.getComponent(document.querySelector('app-journal'));
    component.journal.entries.set([]);
    component.journal.loading.set(true);
  });
}

test('delayed first read offers retry without showing an empty journal', async ({ page }) => {
  await page.goto('/journal');
  await expect(page.getByRole('heading', { name: 'Dinesh Trading Journal' })).toBeVisible();
  await pendingSnapshot(page);
  await page.evaluate(() => {
    const component = (window as any).ng.getComponent(document.querySelector('app-journal'));
    component.journal.connectionDelayed.set(true);
  });
  await expect(page.getByTestId('connection-delayed')).toContainText('Your entries have not loaded yet');
  await expect(page.getByTestId('entries-loading')).toHaveCount(0);
  await expect(page.locator('.metric-card')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'New daily entry' })).toBeDisabled();
  await page.getByRole('button', { name: 'Retry connection' }).click();
  await expect(page.getByTestId('connection-delayed')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'New daily entry' })).toBeEnabled();
});

for (const theme of ['light', 'dark']) {
  test(`pending data keeps workspace usable in ${theme} theme`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/journal');
    await expect(page.getByRole('heading', { name: 'Dinesh Trading Journal' })).toBeVisible();
    if (theme === 'dark') await page.getByRole('button', { name: 'Switch to dark theme' }).click();
    await pendingSnapshot(page);
    await expect(page.getByTestId('entries-loading')).toBeVisible();
    await expect(page.locator('app-journal-loader')).toHaveCount(0);
    await expect(page.locator('app-root > div')).not.toHaveAttribute('inert');
    await expect(page.locator('.metric-card')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'New daily entry' })).toBeDisabled();
    await page.getByRole('button', { name: 'Pause scrolling quotes' }).click();
    await expect(page.getByRole('button', { name: 'Resume scrolling quotes' })).toBeVisible();
    await page.setViewportSize({ width: 320, height: 568 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.evaluate(() => {
      const component = (window as any).ng.getComponent(document.querySelector('app-journal'));
      component.journal.entries.set([{
        date: '2026-11-02', startingCapital: 100000, pnl: 12345,
        notes: 'Delayed snapshot', tradeCount: 1, revision: 1,
      }]);
      component.journal.loading.set(false);
    });
    await expect(page.getByTestId('entries-loading')).toHaveCount(0);
    await expect(page.locator('.metric-card').first()).toContainText('₹123.45', { timeout: 1500 });
    expect(errors).toEqual([]);
  });
}

test('empty snapshots and errors finish loading', async ({ page }) => {
  await page.goto('/journal');
  await expect(page.getByRole('heading', { name: 'Dinesh Trading Journal' })).toBeVisible();
  for (const error of ['', 'Server unavailable. Reconnect before saving.']) {
    await pendingSnapshot(page);
    await expect(page.getByTestId('entries-loading')).toBeVisible();
    await page.evaluate(error => {
      const component = (window as any).ng.getComponent(document.querySelector('app-journal'));
      component.journal.error.set(error);
      component.journal.loading.set(false);
    }, error);
    await expect(page.getByTestId('entries-loading')).toHaveCount(0);
    if (error) await expect(page.getByRole('alert')).toContainText(error);
    await expect(page.getByRole('button', { name: 'New daily entry' })).toBeEnabled();
  }
});
