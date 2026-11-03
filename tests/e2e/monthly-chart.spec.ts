import { test, expect } from '@playwright/test';

test('monthly chart starts in October 2026 and aligns panels', async ({ page }) => {
 await page.goto('/journal');
 const period = page.getByTestId('chart-period');
 await expect(page.getByLabel('Chart period', { exact: true })).toHaveValue('latest');
 await expect(period).toContainText('Oct 2027');
 const chartData = () => page.locator('app-trend-chart').first().evaluate(el => {
   const component = (window as any).ng.getComponent(el);
   return { labels: component.chart.data.labels, values: component.chart.data.datasets[0].data };
 });
 await expect.poll(async () => (await chartData()).labels.length).toBe(13);
 await page.getByLabel('Chart period', { exact: true }).selectOption('year');
 await page.getByLabel('Chart year', { exact: true }).selectOption('2027');
 await expect(period).toContainText('Jan 2027');
 await expect(period).toContainText('Dec 2027');
 expect((await chartData()).labels).toHaveLength(12);
 await page.getByLabel('Chart year', { exact: true }).selectOption('2026');
 await expect(period).toContainText('Oct 2026');
 expect((await chartData()).labels).toHaveLength(3);
 await expect(page.locator('#chart-range option')).toHaveCount(2);
 const panels = await page.locator('.overview-chart-panel').evaluateAll(elements => elements.map(el => ({ height: el.getBoundingClientRect().height, chartTop: el.querySelector('canvas')!.getBoundingClientRect().top })));
 expect(Math.abs(panels[0].height - panels[1].height)).toBeLessThan(1);
 expect(Math.abs(panels[0].chartTop - panels[1].chartTop)).toBeLessThan(1);
 await page.setViewportSize({ width: 390, height: 844 });
 await expect(page.getByLabel('Chart year', { exact: true })).toBeVisible();
 expect(await page.getByLabel('Chart year', { exact: true }).evaluate(el => el.getBoundingClientRect().right <= innerWidth)).toBe(true);
 await page.getByLabel('Chart period', { exact: true }).selectOption('latest');
 await expect(period).toContainText('Oct 2027');
});


test('chart totals show amounts and match plotted data', async ({ page }) => {
 await page.addInitScript(() => localStorage.setItem('trading-journal-demo-v1', JSON.stringify([
  { date: '2026-10-01', notes: '', pnl: 10000, startingCapital: null, tradeCount: 1, revision: 1 },
  { date: '2026-11-01', notes: '', pnl: -2500, startingCapital: null, tradeCount: 1, revision: 1 },
  { date: '2027-02-01', notes: '', pnl: 5000, startingCapital: null, tradeCount: 1, revision: 1 }
 ])));
 await page.goto('/journal');
 await expect(page.getByTestId('monthly-chart-total')).toContainText('125.00');
 await expect(page.getByTestId('cumulative-chart-total')).toContainText('125.00');
 const values = await page.locator('app-trend-chart').evaluateAll(elements => elements.map(el => (window as any).ng.getComponent(el).chart.data.datasets[0].data));
 expect(values[0].reduce((a: number, b: number) => a + b, 0)).toBe(125);
 expect(values[1].at(-1)).toBe(125);
 await page.getByLabel('Chart period', { exact: true }).selectOption('year');
 await page.getByLabel('Chart year', { exact: true }).selectOption('2026');
 await expect(page.getByTestId('monthly-chart-total')).toContainText('75.00');
 await expect(page.getByTestId('cumulative-chart-total')).toContainText('125.00');
 await page.getByLabel('Chart year', { exact: true }).selectOption('2028');
 await expect(page.getByTestId('monthly-chart-total')).toContainText('No data');
});
