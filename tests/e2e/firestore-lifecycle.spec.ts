import { test, expect, Page } from '@playwright/test';

async function installListener(page: Page) {
  await page.goto('/journal');
  await expect(page.getByRole('heading', { name: 'Dinesh Trading Journal' })).toBeVisible();
  await page.evaluate(() => {
    const component = (window as any).ng.getComponent(document.querySelector('app-journal'));
    const harness = (window as any).listenerHarness = { starts: 0, stops: 0, next: null };
    // Exercise the real service effect, snapshot processing and Angular rendering;
    // replace only the SDK boundary, without using a real account or cloud writes.
    component.journal.listen = (_uid: string, next: unknown) => {
      harness.starts++;
      harness.next = next;
      return () => harness.stops++;
    };
    component.auth.demo = false;
    component.auth.db = {};
    component.auth.user.set({ uid: 'lifecycle-test', providerData: [] });
  });
  await expect.poll(() => page.evaluate(() => (window as any).listenerHarness.starts)).toBe(1);
}

async function snapshot(page: Page, fromCache: boolean, populated: boolean) {
  await page.evaluate(({ fromCache, populated }) => {
    const entries = populated ? [{ date: '2026-11-02', startingCapital: 100000,
      pnl: 12345, notes: 'Listener regression', tradeCount: 1, revision: 1 }] : [];
    (window as any).listenerHarness.next({
      metadata: { fromCache }, empty: !entries.length, size: entries.length,
      docs: entries.map(entry => ({ data: () => entry })),
      docChanges: () => entries.map(() => ({ type: 'added' })),
    });
  }, { fromCache, populated });
}

test('first server snapshot renders promptly without resubscription loops', async ({ page }) => {
  await installListener(page);
  await snapshot(page, true, false);
  await expect(page.getByTestId('entries-loading')).toBeVisible();
  await snapshot(page, false, true);
  await expect(page.locator('.metric-card').first()).toContainText('₹123.45', { timeout: 1500 });
  await expect(page.getByTestId('entries-loading')).toHaveCount(0);
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await page.getByLabel('Period', { exact: true }).selectOption('2026-11');
  await snapshot(page, false, true);
  expect(await page.evaluate(() => ({ starts: (window as any).listenerHarness.starts,
    stops: (window as any).listenerHarness.stops }))).toEqual({ starts: 1, stops: 0 });
});

test('30 seconds without a snapshot does not loop; retry cleans up and late data renders', async ({ page }) => {
  await installListener(page);
  await page.clock.install();
  // Start a fresh listener so its connection timer uses the controlled clock.
  await page.evaluate(() => (window as any).ng.getComponent(document.querySelector('app-journal')).journal.retryConnection());
  await expect.poll(() => page.evaluate(() => (window as any).listenerHarness.starts)).toBe(2);
  await snapshot(page, true, false);
  await page.clock.fastForward(31000);
  await expect(page.getByTestId('connection-delayed')).toBeVisible();
  expect(await page.evaluate(() => (window as any).listenerHarness.starts)).toBe(2);
  await page.getByRole('button', { name: 'Retry connection' }).click();
  await expect.poll(() => page.evaluate(() => (window as any).listenerHarness.starts)).toBe(3);
  expect(await page.evaluate(() => (window as any).listenerHarness.stops)).toBe(2);
  await page.clock.resume();
  await snapshot(page, false, true);
  await expect(page.locator('.metric-card').first()).toContainText('₹123.45', { timeout: 1500 });
  await expect(page.getByTestId('connection-delayed')).toHaveCount(0);
});

test('server-confirmed empty journal ends loading', async ({ page }) => {
  await installListener(page);
  await snapshot(page, false, false);
  await expect(page.getByTestId('entries-loading')).toHaveCount(0);
  await expect(page.getByText('Your first entry starts the story.')).toBeVisible();
});
