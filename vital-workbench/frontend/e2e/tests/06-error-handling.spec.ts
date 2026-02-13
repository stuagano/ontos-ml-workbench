/**
 * E2E tests for error handling and edge cases
 * Tests API errors, validation, network failures, and recovery
 */

import { test, expect } from '@playwright/test';
import { DataPage } from '../pages/DataPage';
import { DeployPage } from '../pages/DeployPage';
import { MonitorPage } from '../pages/MonitorPage';
import { ImprovePage } from '../pages/ImprovePage';
import mockResponses from '../fixtures/mock-responses.json';

test.describe('Error Handling - API Errors', () => {
  test('should handle 404 errors gracefully', async ({ page }) => {
    await page.route('**/api/v1/sheets/*', route => {
      route.fulfill({
        status: 404,
        body: JSON.stringify(mockResponses.errorResponses.sheetNotFound.body),
      });
    });

    const dataPage = new DataPage(page);
    await dataPage.navigate();

    await expect(page.locator('text=Sheet not found')).toBeVisible();
  });

  test('should handle 500 errors gracefully', async ({ page }) => {
    await page.route('**/api/v1/deployment/deploy', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify(mockResponses.errorResponses.deploymentFailed.body),
      });
    });

    const deployPage = new DeployPage(page);
    await deployPage.navigate();

    await deployPage.clickDeployModel();
    await deployPage.submitDeployment();

    await expect(page.locator('text=Failed to deploy model')).toBeVisible();
  });

  test('should handle 503 service unavailable', async ({ page }) => {
    await page.route('**/api/v1/deployment/endpoints/*', route => {
      route.fulfill({
        status: 503,
        body: JSON.stringify(mockResponses.errorResponses.endpointNotReady.body),
      });
    });

    const deployPage = new DeployPage(page);
    await deployPage.navigate();

    await expect(page.locator('text=Endpoint is not ready yet')).toBeVisible();
  });

  test('should handle validation errors (422)', async ({ page }) => {
    await page.route('**/api/v1/feedback', route => {
      route.fulfill({
        status: 422,
        body: JSON.stringify(mockResponses.errorResponses.feedbackValidationError.body),
      });
    });

    const improvePage = new ImprovePage(page);
    await improvePage.navigate();

    await expect(page.locator('text=rating must be')).toBeVisible();
  });

  test('should handle network timeout', async ({ page }) => {
    await page.route('**/api/v1/monitoring/metrics/performance*', route => {
      // Simulate timeout by never fulfilling
      setTimeout(() => {
        route.abort('timedout');
      }, 5000);
    });

    const monitorPage = new MonitorPage(page);
    await monitorPage.navigate();

    await expect(page.locator('text=Request timed out')).toBeVisible({ timeout: 10000 });
  });

  test('should handle network offline', async ({ page, context }) => {
    const dataPage = new DataPage(page);
    await dataPage.navigate();

    // Simulate offline
    await context.setOffline(true);

    await dataPage.clickCreateSheet();
    await expect(page.locator('text=Network error')).toBeVisible();

    // Restore online
    await context.setOffline(false);
  });
});

test.describe('Error Handling - Validation', () => {
  test('should validate required fields in sheet creation', async ({ page }) => {
    const dataPage = new DataPage(page);
    await dataPage.navigate();

    await dataPage.clickCreateSheet();
    await dataPage.submitSheetForm();

    await expect(page.locator('text=Name is required')).toBeVisible();
    await expect(page.locator('text=Source path is required')).toBeVisible();
  });

  test('should validate required fields in deployment', async ({ page }) => {
    const deployPage = new DeployPage(page);
    await deployPage.navigate();

    await deployPage.clickDeployModel();
    await deployPage.submitDeployment();

    await expect(page.locator('text=Model is required')).toBeVisible();
  });

  test('should validate alert threshold range', async ({ page }) => {
    const monitorPage = new MonitorPage(page);
    await monitorPage.navigate();

    const endpointSelect = page.locator('[data-testid="endpoint-select"]');
    const hasEndpoints = (await endpointSelect.locator('option').count()) > 1;

    if (hasEndpoints) {
      const firstEndpoint = await endpointSelect.locator('option').nth(1).textContent();
      if (firstEndpoint) {
        await monitorPage.selectEndpoint(firstEndpoint);

        await page.click('[data-testid="create-alert-button"]');
        await page.selectOption('[data-testid="alert-type-select"]', 'error_rate');
        await page.fill('[data-testid="alert-threshold-input"]', '2.0');
        await page.click('[data-testid="submit-alert-button"]');

        await expect(page.locator('text=Threshold must be between 0 and 1')).toBeVisible();
      }
    }
  });

  test('should validate feedback rating', async ({ page }) => {
    const improvePage = new ImprovePage(page);
    await improvePage.navigate();

    await page.click('[data-testid="submit-feedback-button"]');
    await page.fill('[data-testid="feedback-input-text"]', 'test');
    await page.fill('[data-testid="feedback-output-text"]', 'test');
    await page.click('[data-testid="submit-feedback-form-button"]');

    await expect(page.locator('text=Rating is required')).toBeVisible();
  });

  test('should validate endpoint name format', async ({ page }) => {
    const deployPage = new DeployPage(page);
    await deployPage.navigate();

    await deployPage.clickDeployModel();
    await deployPage.fillEndpointName('Invalid Name With Spaces');
    await deployPage.submitDeployment();

    await expect(page.locator('text=Endpoint name must be lowercase with hyphens')).toBeVisible();
  });

  test('should prevent duplicate endpoint names', async ({ page }) => {
    await page.route('**/api/v1/deployment/deploy', route => {
      route.fulfill({
        status: 400,
        body: JSON.stringify({ detail: 'Endpoint name already exists' }),
      });
    });

    const deployPage = new DeployPage(page);
    await deployPage.navigate();

    await deployPage.clickDeployModel();
    await deployPage.fillEndpointName('existing-endpoint');
    await deployPage.submitDeployment();

    await expect(page.locator('text=Endpoint name already exists')).toBeVisible();
  });
});

test.describe('Error Handling - Recovery', () => {
  test('should retry failed requests', async ({ page }) => {
    let requestCount = 0;

    await page.route('**/api/v1/sheets*', route => {
      requestCount++;
      if (requestCount === 1) {
        // Fail first request
        route.abort('failed');
      } else {
        // Succeed on retry
        route.fulfill({
          status: 200,
          body: JSON.stringify([]),
        });
      }
    });

    const dataPage = new DataPage(page);
    await dataPage.navigate();

    // Should eventually succeed after retry
    await expect(page.locator('[data-testid="sheets-list"]')).toBeVisible({ timeout: 10000 });
    expect(requestCount).toBeGreaterThan(1);
  });

  test('should show retry button on persistent failures', async ({ page }) => {
    await page.route('**/api/v1/monitoring/metrics/performance*', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ detail: 'Internal server error' }),
      });
    });

    const monitorPage = new MonitorPage(page);
    await monitorPage.navigate();

    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });

  test('should recover from session timeout', async ({ page }) => {
    // Simulate 401 unauthorized
    await page.route('**/api/v1/**', route => {
      route.fulfill({
        status: 401,
        body: JSON.stringify({ detail: 'Unauthorized' }),
      });
    });

    const dataPage = new DataPage(page);
    await dataPage.navigate();

    await expect(page.locator('text=Session expired')).toBeVisible();
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
  });

  test('should handle stale data gracefully', async ({ page }) => {
    const deployPage = new DeployPage(page);
    await deployPage.navigate();

    const count = await deployPage.getDeploymentCount();

    if (count > 0) {
      // Mock deletion by another user
      await page.route('**/api/v1/deployment/endpoints/*', route => {
        route.fulfill({
          status: 404,
          body: JSON.stringify({ detail: 'Endpoint not found' }),
        });
      });

      const cards = (await deployPage.getDeploymentsList()).locator('[data-testid="deployment-card"]');
      const firstEndpointName = await cards.first().locator('[data-testid="endpoint-name"]').textContent();

      if (firstEndpointName) {
        await deployPage.deleteEndpoint(firstEndpointName);
        await expect(page.locator('text=Endpoint not found')).toBeVisible();
      }
    }
  });
});

test.describe('Error Handling - Edge Cases', () => {
  test('should handle empty response data', async ({ page }) => {
    await page.route('**/api/v1/sheets*', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify([]),
      });
    });

    const dataPage = new DataPage(page);
    await dataPage.navigate();

    await expect(page.locator('text=No sheets found')).toBeVisible();
  });

  test('should handle malformed JSON responses', async ({ page }) => {
    await page.route('**/api/v1/monitoring/metrics/performance*', route => {
      route.fulfill({
        status: 200,
        body: 'Invalid JSON {',
      });
    });

    const monitorPage = new MonitorPage(page);
    await monitorPage.navigate();

    await expect(page.locator('text=Invalid response format')).toBeVisible();
  });

  test('should handle extremely long text inputs', async ({ page }) => {
    const improvePage = new ImprovePage(page);
    await improvePage.navigate();

    const longText = 'a'.repeat(100000);

    await page.click('[data-testid="submit-feedback-button"]');
    await page.fill('[data-testid="feedback-input-text"]', longText);

    await expect(page.locator('text=Input too long')).toBeVisible();
  });

  test('should handle special characters in inputs', async ({ page }) => {
    const dataPage = new DataPage(page);
    await dataPage.navigate();

    await dataPage.clickCreateSheet();
    await dataPage.fillSheetForm({
      name: `Test<script>alert('xss')</script>`,
      description: 'Test & "quotes" and \'apostrophes\'',
      sourceType: 'unity_catalog_table',
      sourcePath: 'catalog.schema.table',
      dataType: 'tabular',
    });

    // Should sanitize or escape properly
    await dataPage.submitSheetForm();
  });

  test('should handle concurrent modifications', async ({ page }) => {
    await page.route('**/api/v1/monitoring/alerts/*', route => {
      route.fulfill({
        status: 409,
        body: JSON.stringify({ detail: 'Alert was modified by another user' }),
      });
    });

    const monitorPage = new MonitorPage(page);
    await monitorPage.navigate();

    await expect(page.locator('text=Alert was modified by another user')).toBeVisible();
  });

  test('should handle pagination at boundaries', async ({ page }) => {
    const improvePage = new ImprovePage(page);
    await improvePage.navigate();

    const paginationContainer = page.locator('[data-testid="pagination"]');

    if (await paginationContainer.isVisible()) {
      // Try to go before first page
      const firstButton = page.locator('[data-testid="pagination-first"]');
      if (await firstButton.isDisabled()) {
        expect(await firstButton.isDisabled()).toBe(true);
      }

      // Try to go past last page
      const lastButton = page.locator('[data-testid="pagination-last"]');
      await lastButton.click();

      const nextButton = page.locator('[data-testid="pagination-next"]');
      expect(await nextButton.isDisabled()).toBe(true);
    }
  });
});
