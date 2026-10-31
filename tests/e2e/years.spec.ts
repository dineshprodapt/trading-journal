import { test, expect } from '@playwright/test';

test('year pages preserve period metrics and cumulative totals through October 2037', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-30T12:00:00+05:30'));
  await page.goto('/journal');
  await page.evaluate(() => localStorage.setItem('trading-journal-demo-v1', JSON.stringify(
    ['2026-10-01', '2027-01-01', '2037-10-31'].map((date) => ({
      date, startingCapital: null, pnl: 10000, notes: '', tradeCount: 1, revision: 1,
    })),
  )));
  await page.reload();
  const period = page.getByLabel('Period', { exact: true });
  const year = page.getByLabel('Monthly summary year');
  const rows = page.locator('#monthly tbody tr');
  await expect(period.locator('option')).toHaveCount(134);
  await expect(period.locator('option').last()).toHaveAttribute('value', '2037-10');
  await expect(year).toHaveValue('2026');
  await expect(rows).toHaveCount(3);
  await expect(page.getByRole('button', { name: 'Previous year', exact: true })).toBeDisabled();
  const metrics = await page.locator('.metric-card').allTextContents();
  const daily = await page.locator('#daily tbody').innerText();
  await page.getByRole('button', { name: 'Next year', exact: true }).click();
  await expect(year).toHaveValue('2027');
  await expect(rows).toHaveCount(12);
  await expect(rows.first().locator('td').last()).toContainText('200.00');
  await year.selectOption('2037');
  await expect(rows).toHaveCount(10);
  await expect(rows.last()).toContainText('Oct 2037');
  await expect(rows.last().locator('td').last()).toContainText('300.00');
  await expect(page.getByRole('button', { name: 'Next year', exact: true })).toBeDisabled();
  expect(await page.locator('.metric-card').allTextContents()).toEqual(metrics);
  expect(await page.locator('#daily tbody').innerText()).toEqual(daily);
  await period.selectOption('2037-10');
  await expect(rows).toHaveCount(1);
  await expect(rows.first().locator('td').last()).toContainText('100.00');
  await expect(page.locator('#daily tbody tr')).toHaveCount(1);
  await expect(page.locator('.metric-card').first()).toContainText('100.00');
  await expect(year).toHaveValue('2037');
  await period.selectOption('');
  await expect(rows).toHaveCount(10);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
