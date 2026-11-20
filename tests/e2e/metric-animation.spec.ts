import { test, expect } from '@playwright/test';

test('metric animations appear once on mobile and stay hidden on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/journal');
  const animations = page.locator('app-metric-animation');
  await expect(animations).toHaveCount(4);
  for (const animation of await animations.all()) {
    await animation.scrollIntoViewIfNeeded();
    await expect(animation).toBeVisible();
    await expect(animation).toHaveClass(/entered/);
    const card = await animation.locator('..').boundingBox();
    const icon = await animation.boundingBox();
    expect(icon!.x + icon!.width).toBeLessThanOrEqual(card!.x + card!.width);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1280, height: 900 });
  for (const animation of await animations.all()) await expect(animation).toBeHidden();
});
