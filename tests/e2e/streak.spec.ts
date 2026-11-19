import { test, expect } from '@playwright/test';

test('current streak follows selected recorded days and handles flat and empty periods', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('trading-journal-demo-v1', JSON.stringify([
    ['2026-10-01', 0], ['2026-10-03', 100], ['2026-10-06', 200],
    ['2026-11-01', -100], ['2026-11-02', -200], ['2026-12-01', 0],
  ].map(([date, pnl]) => ({ date, pnl, startingCapital: null, notes: '', tradeCount: 1, revision: 1 })))));
  await page.goto('/journal');
  await expect(page.locator('.streak-badge')).toContainText('Flat day');
  await page.getByLabel('Period', { exact: true }).selectOption('2026-10');
  await expect(page.locator('.streak-badge')).toContainText('2 winning days');
  await page.getByLabel('Period', { exact: true }).selectOption('2026-11');
  await expect(page.locator('.streak-badge')).toContainText('2 losing days');
  await page.getByLabel('Period', { exact: true }).selectOption('2027-01');
  await expect(page.locator('.streak-badge')).toContainText('No recorded days');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
