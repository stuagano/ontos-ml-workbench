import { test, expect } from '@playwright/test';

/**
 * E2E tests for navigation and page loading
 */

test.describe('Navigation', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/');

    // Should show the app title or logo
    await expect(page.locator('text=Ontos ML')).toBeVisible();
  });

  test('should navigate to Templates page', async ({ page }) => {
    await page.goto('/');

    // Click on Templates nav item
    await page.click('text=Template');

    // Should show templates page content
    await expect(page).toHaveURL(/.*template/);
  });

  test('should navigate to Data page', async ({ page }) => {
    await page.goto('/');

    // Click on Data nav item
    await page.click('text=Data');

    // Should show data page
    await expect(page).toHaveURL(/.*data/);
  });

  test('should navigate to Curate page', async ({ page }) => {
    await page.goto('/');

    // Click on Curate nav item
    await page.click('text=Curate');

    // Should show curation page
    await expect(page).toHaveURL(/.*curate/);
  });

  test('should show pipeline breadcrumb stages', async ({ page }) => {
    await page.goto('/');

    // Should show the 7 pipeline stages
    const stages = ['DATA', 'TEMPLATE', 'CURATE', 'TRAIN', 'DEPLOY', 'MONITOR', 'IMPROVE'];

    for (const stage of stages) {
      await expect(page.locator(`text=${stage}`).first()).toBeVisible();
    }
  });
});

test.describe('Responsive Design', () => {
  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Page should still load without errors
    await expect(page.locator('body')).toBeVisible();
  });

  test('should be responsive on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    // Page should load correctly
    await expect(page.locator('body')).toBeVisible();
  });
});
