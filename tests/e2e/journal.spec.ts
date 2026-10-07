import { test, expect } from '@playwright/test';
test('demo CRUD, duplicate prevention, metrics, filter, export and responsive layout', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/journal');
  await expect(page.getByRole('heading', { name: 'Your trading, in perspective.' })).toBeVisible();
  await page.getByRole('button', { name: 'Load sample data' }).click();
  await expect(page.locator('.metric-card').first()).toContainText('₹5,900.00');
  await page.getByRole('button', { name: 'New daily entry' }).click();
  await page.getByLabel('Date *', { exact: true }).fill('2026-10-07');
  await page.getByLabel('Profit / Loss (₹) *', { exact: true }).fill('100');
  await page.getByLabel('Starting Capital (₹)', { exact: true }).fill('200000');
  await page.getByLabel('Trade count (optional)').fill('2');
  await page.getByLabel('Trades / Notes', { exact: true }).fill('UI test entry');
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Edit 2026-10-07', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator('.metric-card').first()).toContainText('₹6,000.00');
  await page.getByRole('button', { name: 'Edit 2026-10-07', exact: true }).click();
  await page.getByLabel('Profit / Loss (₹) *', { exact: true }).fill('-100');
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();
  await expect(page.locator('.metric-card').first()).toContainText('₹5,800.00');
  await page.getByRole('button', { name: 'New daily entry' }).click();
  await page.getByLabel('Date *', { exact: true }).fill('2026-10-07');
  await page.getByLabel('Profit / Loss (₹) *', { exact: true }).fill('1');
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('already has an entry');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByLabel('Filter status').selectOption('Loss');
  await expect(page.locator('#daily tbody tr')).toHaveCount(3);
  await page.getByLabel('Search entries').fill('UI test');
  await expect(page.locator('#daily tbody tr')).toHaveCount(1);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export view · CSV' }).click();
  expect((await download).suggestedFilename()).toBe('trading-journal.csv');
  await page.getByRole('button', { name: 'Delete 2026-10-07', exact: true }).click();
  await page.getByRole('button', { name: 'Delete entry', exact: true }).click();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await page.getByLabel('Search entries').fill('');
  await page.getByLabel('Filter status').selectOption('');
  await page.getByLabel('Period', { exact: true }).selectOption('2026-10');
  await expect(page.locator('.metric-card').first()).toContainText('₹6,800.00');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'New daily entry' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.getByLabel('Period', { exact: true }).selectOption('');
  await page.screenshot({ path: 'test-results/desktop.png', fullPage: true });
  expect(errors).toEqual([]);
});
test('table pagination and sorting', async ({ page }) => {
  await page.goto('/journal');
  await page.evaluate(() => {
    localStorage.setItem(
      'trading-journal-demo-v1',
      JSON.stringify(
        Array.from({ length: 12 }, (_, i) => ({
          date: `2026-10-${String(i + 1).padStart(2, '0')}`,
          startingCapital: 100000,
          pnl: i * 100,
          notes: 'Pagination',
          tradeCount: 1,
          revision: 1,
        })),
      ),
    );
  });
  await page.reload();
  await expect(page.locator('#daily tbody tr')).toHaveCount(10);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.locator('#daily tbody tr')).toHaveCount(2);
  await page.getByRole('button', { name: 'Previous', exact: true }).click();
  await page.getByRole('button', { name: 'Date ↓', exact: true }).click();
  await expect(page.locator('#daily tbody tr').first()).toContainText('2026-10-01');
});
