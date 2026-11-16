import { test, expect } from '@playwright/test';
import { today } from '../../src/app/core/journal.model';

test('month selection reads November notes and updates patterns without reloading', async ({ page }) => {
 await page.addInitScript(() => localStorage.setItem('trading-journal-demo-v1', JSON.stringify([
  ...['01', '02'].map(day => ({ date: `2026-10-${day}`, notes: 'FOMO.', pnl: -100, startingCapital: null, tradeCount: 1, revision: 1 })),
  ...['01', '02'].map(day => ({ date: `2026-11-${day}`, notes: 'Over trading. Early entry.', pnl: -100, startingCapital: null, tradeCount: 1, revision: 1 })),
 ])));
 await page.goto('/journal');
 await page.locator('.sidebar').getByRole('link', { name: 'Mistakes', exact: true }).click();
 await page.getByLabel('Review month').selectOption('2026-10');
 await expect(page.locator('.mistake-card')).toHaveCount(1);
 await expect(page.locator('.mistake-card')).toContainText('FOMO');
 await page.getByLabel('Review month').selectOption('2026-11');
 await expect(page.locator('.mistake-card')).toHaveCount(2);
 await expect(page.locator('.mistakes-grid')).not.toContainText('FOMO');
 await page.getByText('View analyzed notes').click();
 await expect(page.locator('details[open]')).toContainText('2026-11-01');
 await expect(page.locator('details[open]')).toContainText('2026-11-02');
 await expect(page.locator('details[open]')).not.toContainText('2026-10');
});
test('mistakes default month, evidence, navigation and mobile', async ({ page }) => {
 const month = today().slice(0, 7);
 await page.addInitScript(({ month }) => localStorage.setItem('trading-journal-demo-v1', JSON.stringify([
  { date: month + '-01', notes: 'Overtraded today.', pnl: -100, startingCapital: null, tradeCount: 3, revision: 1 },
  { date: month + '-02', notes: 'Too many trades.', pnl: 100, startingCapital: null, tradeCount: 4, revision: 1 },
  { date: '2020-01-01', notes: 'Patient entry.', pnl: 100, startingCapital: null, tradeCount: 1, revision: 1 },
 ])), { month });
 await page.goto('/journal');
 await page.locator('.sidebar').getByRole('link', { name: 'Mistakes', exact: true }).click();
 await expect(page.getByRole('heading', { name: 'Mistakes', exact: true })).toBeVisible();
 await expect(page.getByLabel('Review month')).toHaveValue(month);
 await expect(page.locator('.mistake-card')).toHaveCount(1);
 await page.getByText('View supporting notes').click();
 await expect(page.locator('.mistake-card').getByText('Overtraded today.', { exact: true })).toBeVisible();
 await page.getByLabel('Review month').selectOption('2020-01');
 await expect(page.getByText('No repeated patterns detected')).toBeVisible();
 await page.reload();
 await expect(page.getByLabel('Review month')).toHaveValue(month);
 await page.getByRole('button', { name: 'Daily journal' }).click();
 await expect(page.locator('#daily')).toBeFocused();
 await page.setViewportSize({ width: 390, height: 844 });
 await page.locator('.mobile-page-nav').getByRole('link', { name: 'Mistakes', exact: true }).click();
 await expect(page.locator('.mistake-card')).toBeVisible();
 expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

