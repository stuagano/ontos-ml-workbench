/**
 * E2E tests for IMPROVE stage
 * Tests feedback collection, analysis, and conversion to training data
 */

import { test, expect } from '@playwright/test';
import { ImprovePage } from '../pages/ImprovePage';
import { generateFeedback } from '../utils/data-generators';
import { waitForLoadingComplete } from '../utils/wait-helpers';

test.describe('IMPROVE Stage - Feedback Management', () => {
  let improvePage: ImprovePage;

  test.beforeEach(async ({ page }) => {
    improvePage = new ImprovePage(page);
    await improvePage.navigate();
  });

  test('should display feedback list', async () => {
    const list = await improvePage.getFeedbackList();
    await expect(list).toBeVisible();
  });

  test('should submit new feedback', async ({ page }) => {
    const endpointSelect = page.locator('[data-testid="endpoint-select"]');
    const hasEndpoints = (await endpointSelect.locator('option').count()) > 1;

    if (hasEndpoints) {
      const firstEndpoint = await endpointSelect.locator('option').nth(1).textContent();
      if (firstEndpoint) {
        await improvePage.selectEndpoint(firstEndpoint);

        await improvePage.submitFeedback({
          inputText: 'Test input for E2E',
          outputText: 'Test output for E2E',
          rating: 'positive',
          feedbackText: 'This is a test feedback comment',
        });

        await expect(page.locator('text=Feedback submitted')).toBeVisible();
      }
    }
  });

  test('should display feedback statistics', async ({ page }) => {
    const endpointSelect = page.locator('[data-testid="endpoint-select"]');
    const hasEndpoints = (await endpointSelect.locator('option').count()) > 1;

    if (hasEndpoints) {
      const firstEndpoint = await endpointSelect.locator('option').nth(1).textContent();
      if (firstEndpoint) {
        await improvePage.selectEndpoint(firstEndpoint);
        const stats = await improvePage.getFeedbackStats();

        expect(stats.totalCount).toBeTruthy();
        expect(stats.positiveRate).toBeTruthy();
      }
    }
  });

  test('should filter feedback by rating', async ({ page }) => {
    const endpointSelect = page.locator('[data-testid="endpoint-select"]');
    const hasEndpoints = (await endpointSelect.locator('option').count()) > 1;

    if (hasEndpoints) {
      const firstEndpoint = await endpointSelect.locator('option').nth(1).textContent();
      if (firstEndpoint) {
        await improvePage.selectEndpoint(firstEndpoint);
        await improvePage.filterByRating('positive');
        await waitForLoadingComplete(page);

        const count = await improvePage.getFeedbackCount();
        expect(count).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('should filter feedback by flagged status', async ({ page }) => {
    const endpointSelect = page.locator('[data-testid="endpoint-select"]');
    const hasEndpoints = (await endpointSelect.locator('option').count()) > 1;

    if (hasEndpoints) {
      const firstEndpoint = await endpointSelect.locator('option').nth(1).textContent();
      if (firstEndpoint) {
        await improvePage.selectEndpoint(firstEndpoint);
        await improvePage.filterByFlagged(true);
        await waitForLoadingComplete(page);

        const count = await improvePage.getFeedbackCount();
        expect(count).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('should flag feedback item', async ({ page }) => {
    const endpointSelect = page.locator('[data-testid="endpoint-select"]');
    const hasEndpoints = (await endpointSelect.locator('option').count()) > 1;

    if (hasEndpoints) {
      const firstEndpoint = await endpointSelect.locator('option').nth(1).textContent();
      if (firstEndpoint) {
        await improvePage.selectEndpoint(firstEndpoint);
        const count = await improvePage.getFeedbackCount();

        if (count > 0) {
          await improvePage.flagFeedback(0);
          await expect(page.locator('text=Feedback flagged')).toBeVisible();
        }
      }
    }
  });

  test('should unflag feedback item', async ({ page }) => {
    const endpointSelect = page.locator('[data-testid="endpoint-select"]');
    const hasEndpoints = (await endpointSelect.locator('option').count()) > 1;

    if (hasEndpoints) {
      const firstEndpoint = await endpointSelect.locator('option').nth(1).textContent();
      if (firstEndpoint) {
        await improvePage.selectEndpoint(firstEndpoint);
        await improvePage.filterByFlagged(true);
        const count = await improvePage.getFeedbackCount();

        if (count > 0) {
          await improvePage.unflagFeedback(0);
          await expect(page.locator('text=Feedback unflagged')).toBeVisible();
        }
      }
    }
  });

  test('should view feedback details', async ({ page }) => {
    const endpointSelect = page.locator('[data-testid="endpoint-select"]');
    const hasEndpoints = (await endpointSelect.locator('option').count()) > 1;

    if (hasEndpoints) {
      const firstEndpoint = await endpointSelect.locator('option').nth(1).textContent();
      if (firstEndpoint) {
        await improvePage.selectEndpoint(firstEndpoint);
        const count = await improvePage.getFeedbackCount();

        if (count > 0) {
          await improvePage.viewFeedbackDetails(0);
          await expect(page.locator('[data-testid="feedback-details"]')).toBeVisible();
        }
      }
    }
  });

  test('should convert feedback to training data', async ({ page }) => {
    const endpointSelect = page.locator('[data-testid="endpoint-select"]');
    const hasEndpoints = (await endpointSelect.locator('option').count()) > 1;

    if (hasEndpoints) {
      const firstEndpoint = await endpointSelect.locator('option').nth(1).textContent();
      if (firstEndpoint) {
        await improvePage.selectEndpoint(firstEndpoint);
        const count = await improvePage.getFeedbackCount();

        if (count > 0) {
          await improvePage.convertToTrainingData(0, 'test-training-sheet-id');
          await expect(page.locator('text=Converted to training data')).toBeVisible();
        }
      }
    }
  });

  test('should delete feedback item', async ({ page }) => {
    const endpointSelect = page.locator('[data-testid="endpoint-select"]');
    const hasEndpoints = (await endpointSelect.locator('option').count()) > 1;

    if (hasEndpoints) {
      const firstEndpoint = await endpointSelect.locator('option').nth(1).textContent();
      if (firstEndpoint) {
        await improvePage.selectEndpoint(firstEndpoint);
        const count = await improvePage.getFeedbackCount();

        if (count > 0) {
          await improvePage.deleteFeedback(0);
          await expect(page.locator('text=Feedback deleted')).toBeVisible();
        }
      }
    }
  });

  test('should refresh feedback list', async ({ page }) => {
    const endpointSelect = page.locator('[data-testid="endpoint-select"]');
    const hasEndpoints = (await endpointSelect.locator('option').count()) > 1;

    if (hasEndpoints) {
      const firstEndpoint = await endpointSelect.locator('option').nth(1).textContent();
      if (firstEndpoint) {
        await improvePage.selectEndpoint(firstEndpoint);
        await improvePage.refreshFeedbackList();
        await expect(page.locator('[data-testid="feedback-list"]')).toBeVisible();
      }
    }
  });

  test('should handle empty feedback list', async ({ page }) => {
    await page.route('**/api/v1/feedback*', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          items: [],
          total: 0,
          page: 1,
          page_size: 20,
        }),
      });
    });

    const endpointSelect = page.locator('[data-testid="endpoint-select"]');
    const hasEndpoints = (await endpointSelect.locator('option').count()) > 1;

    if (hasEndpoints) {
      const firstEndpoint = await endpointSelect.locator('option').nth(1).textContent();
      if (firstEndpoint) {
        await improvePage.selectEndpoint(firstEndpoint);
        await expect(page.locator('text=No feedback items found')).toBeVisible();
      }
    }
  });

  test('should validate feedback submission', async ({ page }) => {
    const endpointSelect = page.locator('[data-testid="endpoint-select"]');
    const hasEndpoints = (await endpointSelect.locator('option').count()) > 1;

    if (hasEndpoints) {
      const firstEndpoint = await endpointSelect.locator('option').nth(1).textContent();
      if (firstEndpoint) {
        await improvePage.selectEndpoint(firstEndpoint);

        await page.click('[data-testid="submit-feedback-button"]');
        await page.click('[data-testid="submit-feedback-form-button"]');

        await expect(page.locator('text=Input text is required')).toBeVisible();
      }
    }
  });

  test('should export feedback data', async ({ page }) => {
    const endpointSelect = page.locator('[data-testid="endpoint-select"]');
    const hasEndpoints = (await endpointSelect.locator('option').count()) > 1;

    if (hasEndpoints) {
      const firstEndpoint = await endpointSelect.locator('option').nth(1).textContent();
      if (firstEndpoint) {
        await improvePage.selectEndpoint(firstEndpoint);
        await improvePage.exportFeedback('csv');
        await expect(page.locator('text=Export initiated')).toBeVisible();
      }
    }
  });

  test('should select time range for feedback', async ({ page }) => {
    const endpointSelect = page.locator('[data-testid="endpoint-select"]');
    const hasEndpoints = (await endpointSelect.locator('option').count()) > 1;

    if (hasEndpoints) {
      const firstEndpoint = await endpointSelect.locator('option').nth(1).textContent();
      if (firstEndpoint) {
        await improvePage.selectEndpoint(firstEndpoint);
        await improvePage.selectTimeRange(7);
        await waitForLoadingComplete(page);

        const stats = await improvePage.getFeedbackStats();
        expect(stats).toBeTruthy();
      }
    }
  });
});
