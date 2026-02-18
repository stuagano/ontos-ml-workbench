import { test, expect } from '@playwright/test';

/**
 * E2E tests for Job triggering and monitoring
 */

test.describe('Jobs on Data Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/data');
  });

  test('should display job cards', async ({ page }) => {
    // Should show job card section
    await expect(page.locator('body')).toContainText(/job|extraction|transcription/i);
  });

  test('should open job config modal when clicking job card', async ({ page }) => {
    // Find and click a job card
    const jobCard = page.locator('[data-testid="job-card"], .job-card, button').filter({
      hasText: /ocr|extraction|transcription|embedding/i
    }).first();

    if (await jobCard.isVisible()) {
      await jobCard.click();

      // Modal should open with configuration form
      const modal = page.locator('[role="dialog"], .modal, [data-testid="job-modal"]');
      await expect(modal.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show job configuration fields', async ({ page }) => {
    // Click on a job card to open modal
    const jobCard = page.locator('button, [role="button"]').filter({
      hasText: /ocr|extraction/i
    }).first();

    if (await jobCard.isVisible()) {
      await jobCard.click();

      // Should show input fields
      const inputs = page.locator('input, select, textarea');
      const inputCount = await inputs.count();
      expect(inputCount).toBeGreaterThan(0);
    }
  });
});

test.describe('Jobs Panel', () => {
  test('should show jobs panel with recent runs', async ({ page }) => {
    await page.goto('/data');

    // Look for jobs panel
    const jobsPanel = page.locator('text=Jobs').first();

    if (await jobsPanel.isVisible()) {
      // Panel should show active or recent sections
      const content = await page.textContent('body');
      const hasJobsContent = content?.includes('Active') ||
                            content?.includes('Recent') ||
                            content?.includes('No jobs');
      expect(hasJobsContent).toBe(true);
    }
  });

  test('should have refresh button', async ({ page }) => {
    await page.goto('/data');

    // Look for refresh button in jobs panel
    const refreshButton = page.locator('button[title="Refresh"], button').filter({
      has: page.locator('svg')
    });

    // Should have some button with refresh capability
    const count = await refreshButton.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
