import { test, expect } from '@playwright/test';

test('reports includes weekend and flat entries, filters totals, and supports mobile navigation', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('trading-journal-demo-v1', JSON.stringify([
    { date: '2026-09-30', pnl: 999999 },
    { date: '2026-10-03', pnl: 123456 },
    { date: '2026-10-04', pnl: -23456 },
    { date: '2026-10-05', pnl: 0 },
    { date: '2026-11-01', pnl: -5000 },
  ].map(e => ({ ...e, notes: '', startingCapital: null, tradeCount: null, revision: 1 })))));
  await page.goto('/journal');
  await page.locator('.sidebar').getByRole('link', { name: 'Reports', exact: true }).click();
  await expect(page).toHaveURL(/journal\/reports/);
  await page.getByLabel('Report end date').fill('2026-11-30');
  await expect(page.getByTestId('report-total')).toHaveText('₹950.00');
  await expect(page.getByTestId('report-highest-profit')).toContainText('₹1,234.56');
  await expect(page.getByTestId('report-highest-profit')).toContainText('03 Oct 2026');
  await expect(page.getByTestId('report-highest-loss')).toContainText('-₹234.56');
  await expect(page.locator('.month-total')).toHaveText(['₹1,000.00', '-₹50.00']);
  await expect(page.getByRole('button', { name: '2026-10-03: Profit ₹1,234.56', exact: true })).toHaveClass(/profit/);
  await expect(page.getByRole('button', { name: '2026-10-05: Flat ₹0.00', exact: true })).toHaveClass(/flat/);
  await page.getByLabel('Report start date').fill('2026-11-01');
  await expect(page.getByTestId('report-total')).toHaveText('-₹50.00');
  await expect(page.getByTestId('report-highest-profit')).toContainText('No profit days');
  await expect(page.getByTestId('report-highest-loss')).toContainText('-₹50.00');
  await page.getByLabel('Report start date').fill('2026-10-01');
  await page.getByLabel('Report end date').fill('2026-10-31');
  await expect(page.getByTestId('report-total')).toHaveText('₹1,000.00');
  await expect(page.getByTestId('report-highest-profit')).toContainText('₹1,234.56');
  await page.getByLabel('Report end date').fill('2026-11-30');
  await page.getByLabel('Report start date').fill('2026-11-01');
  await expect(page.getByTestId('report-highest-loss')).toContainText('01 Nov 2026');
  await expect(page.getByTestId('report-highest-profit')).toContainText('No profit days');
  await page.getByRole('button', { name: 'All', exact: true }).click();
  await expect(page.getByTestId('report-total')).toHaveText('₹950.00');
  await expect(page.getByTestId('report-highest-profit')).toContainText('₹1,234.56');
  await expect(page.getByTestId('report-highest-loss')).toContainText('-₹234.56');
  await page.getByLabel('Report end date').fill('2026-11-30');
  await page.getByLabel('Report start date').fill('2026-12-01');
  await expect(page.getByRole('alert')).toContainText('Choose a valid date range');
  await page.getByLabel('Report end date').fill('2026-12-31');
  await expect(page.getByText('No journal entries in this date range.')).toBeVisible();
  await expect(page.getByTestId('report-highest-profit')).toContainText('No profit days');
  await expect(page.getByTestId('report-highest-loss')).toContainText('No loss days');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.mobile-page-nav').getByRole('link', { name: 'Journal', exact: true }).click();
  await page.locator('.mobile-page-nav').getByRole('link', { name: 'Reports', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Profit and Loss Details' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
