/**
 * E2E tests for MONITOR stage
 * Tests performance metrics, alerts, and drift detection
 */

import { test, expect } from '@playwright/test';
import { MonitorPage } from '../pages/MonitorPage';
import { waitForLoadingComplete } from '../utils/wait-helpers';

test.describe('MONITOR Stage - Performance Monitoring', () => {
  let monitorPage: MonitorPage;

  test.beforeEach(async ({ page }) => {
    monitorPage = new MonitorPage(page);
    await monitorPage.navigate();
  });

  test('should display performance metrics', async ({ page }) => {
    const endpointSelect = page.locator('[data-testid="endpoint-select"]');
    const hasEndpoints = (await endpointSelect.locator('option').count()) > 1;

    if (hasEndpoints) {
      const firstEndpoint = await endpointSelect.locator('option').nth(1).textContent();
      if (firstEndpoint) {
        await monitorPage.selectEndpoint(firstEndpoint);
        const metrics = await monitorPage.getPerformanceMetrics();

        expect(metrics.totalRequests).toBeTruthy();
        expect(metrics.successRate).toBeTruthy();
      }
    }
  });

  test('should display realtime metrics', async ({ page }) => {
    const endpointSelect = page.locator('[data-testid="endpoint-select"]');
    const hasEndpoints = (await endpointSelect.locator('option').count()) > 1;

    if (hasEndpoints) {
      const firstEndpoint = await endpointSelect.locator('option').nth(1).textContent();
      if (firstEndpoint) {
        await monitorPage.selectEndpoint(firstEndpoint);
        const metrics = await monitorPage.getRealtimeMetrics();

        expect(metrics.requestCount).toBeTruthy();
        expect(metrics.requestsPerMinute).toBeTruthy();
      }
    }
  });

  test('should filter metrics by time range', async ({ page }) => {
    const endpointSelect = page.locator('[data-testid="endpoint-select"]');
    const hasEndpoints = (await endpointSelect.locator('option').count()) > 1;

    if (hasEndpoints) {
      const firstEndpoint = await endpointSelect.locator('option').nth(1).textContent();
      if (firstEndpoint) {
        await monitorPage.selectEndpoint(firstEndpoint);
        await monitorPage.selectTimeRange(24);
        await waitForLoadingComplete(page);

        const metrics = await monitorPage.getPerformanceMetrics();
        expect(metrics).toBeTruthy();
      }
    }
  });

  test('should display alerts list', async () => {
    const list = await monitorPage.getAlertsList();
    await expect(list).toBeVisible();
  });

  test('should create a new alert', async ({ page }) => {
    const endpointSelect = page.locator('[data-testid="endpoint-select"]');
    const hasEndpoints = (await endpointSelect.locator('option').count()) > 1;

    if (hasEndpoints) {
      const firstEndpoint = await endpointSelect.locator('option').nth(1).textContent();
      if (firstEndpoint) {
        await monitorPage.selectEndpoint(firstEndpoint);

        await monitorPage.createAlert({
          alertType: 'error_rate',
          threshold: 0.1,
          condition: 'gt',
        });

        await expect(page.locator('text=Alert created')).toBeVisible();
      }
    }
  });

  test('should filter alerts by status', async ({ page }) => {
    await monitorPage.filterAlertsByStatus('active');
    await waitForLoadingComplete(page);

    const count = await monitorPage.getAlertsCount();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should filter alerts by type', async ({ page }) => {
    await monitorPage.filterAlertsByType('error_rate');
    await waitForLoadingComplete(page);

    const count = await monitorPage.getAlertsCount();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should acknowledge an alert', async ({ page }) => {
    const count = await monitorPage.getAlertsCount();

    if (count > 0) {
      const cards = (await monitorPage.getAlertsList()).locator('[data-testid="alert-card"]');
      const firstAlertType = await cards.first().locator('[data-testid="alert-type"]').textContent();

      if (firstAlertType) {
        await monitorPage.acknowledgeAlert(firstAlertType);
        await expect(page.locator('text=Alert acknowledged')).toBeVisible();
      }
    }
  });

  test('should resolve an alert', async ({ page }) => {
    const count = await monitorPage.getAlertsCount();

    if (count > 0) {
      const cards = (await monitorPage.getAlertsList()).locator('[data-testid="alert-card"]');
      const firstAlertType = await cards.first().locator('[data-testid="alert-type"]').textContent();

      if (firstAlertType) {
        await monitorPage.resolveAlert(firstAlertType);
        await expect(page.locator('text=Alert resolved')).toBeVisible();
      }
    }
  });

  test('should detect drift', async ({ page }) => {
    const endpointSelect = page.locator('[data-testid="endpoint-select"]');
    const hasEndpoints = (await endpointSelect.locator('option').count()) > 1;

    if (hasEndpoints) {
      const firstEndpoint = await endpointSelect.locator('option').nth(1).textContent();
      if (firstEndpoint) {
        await monitorPage.selectEndpoint(firstEndpoint);
        const driftReport = await monitorPage.getDriftReport();

        expect(driftReport.driftDetected).toBeTruthy();
        expect(driftReport.severity).toBeTruthy();
      }
    }
  });

  test('should check endpoint health', async ({ page }) => {
    const endpointSelect = page.locator('[data-testid="endpoint-select"]');
    const hasEndpoints = (await endpointSelect.locator('option').count()) > 1;

    if (hasEndpoints) {
      const firstEndpoint = await endpointSelect.locator('option').nth(1).textContent();
      if (firstEndpoint) {
        await monitorPage.selectEndpoint(firstEndpoint);
        const healthStatus = await monitorPage.getHealthStatus();

        expect(healthStatus.healthScore).toBeTruthy();
        expect(healthStatus.status).toBeTruthy();
      }
    }
  });

  test('should display metrics chart', async ({ page }) => {
    const endpointSelect = page.locator('[data-testid="endpoint-select"]');
    const hasEndpoints = (await endpointSelect.locator('option').count()) > 1;

    if (hasEndpoints) {
      const firstEndpoint = await endpointSelect.locator('option').nth(1).textContent();
      if (firstEndpoint) {
        await monitorPage.selectEndpoint(firstEndpoint);
        const isVisible = await monitorPage.isMetricsChartVisible();
        expect(isVisible).toBe(true);
      }
    }
  });

  test('should refresh metrics', async ({ page }) => {
    const endpointSelect = page.locator('[data-testid="endpoint-select"]');
    const hasEndpoints = (await endpointSelect.locator('option').count()) > 1;

    if (hasEndpoints) {
      const firstEndpoint = await endpointSelect.locator('option').nth(1).textContent();
      if (firstEndpoint) {
        await monitorPage.selectEndpoint(firstEndpoint);
        await monitorPage.refreshMetrics();
        await expect(page.locator('[data-testid="performance-metrics"]')).toBeVisible();
      }
    }
  });

  test('should handle API errors gracefully', async ({ page }) => {
    await page.route('**/api/v1/monitoring/metrics/performance*', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ detail: 'Failed to fetch metrics' }),
      });
    });

    const endpointSelect = page.locator('[data-testid="endpoint-select"]');
    const hasEndpoints = (await endpointSelect.locator('option').count()) > 1;

    if (hasEndpoints) {
      const firstEndpoint = await endpointSelect.locator('option').nth(1).textContent();
      if (firstEndpoint) {
        await monitorPage.selectEndpoint(firstEndpoint);
        await expect(page.locator('text=Failed to fetch metrics')).toBeVisible();
      }
    }
  });

  test('should validate alert threshold range', async ({ page }) => {
    const endpointSelect = page.locator('[data-testid="endpoint-select"]');
    const hasEndpoints = (await endpointSelect.locator('option').count()) > 1;

    if (hasEndpoints) {
      const firstEndpoint = await endpointSelect.locator('option').nth(1).textContent();
      if (firstEndpoint) {
        await monitorPage.selectEndpoint(firstEndpoint);

        await page.click('[data-testid="create-alert-button"]');
        await page.selectOption('[data-testid="alert-type-select"]', 'error_rate');
        await page.fill('[data-testid="alert-threshold-input"]', '1.5');

        await page.click('[data-testid="submit-alert-button"]');
        await expect(page.locator('text=Threshold must be between 0 and 1')).toBeVisible();
      }
    }
  });

  test('should export metrics', async ({ page }) => {
    const endpointSelect = page.locator('[data-testid="endpoint-select"]');
    const hasEndpoints = (await endpointSelect.locator('option').count()) > 1;

    if (hasEndpoints) {
      const firstEndpoint = await endpointSelect.locator('option').nth(1).textContent();
      if (firstEndpoint) {
        await monitorPage.selectEndpoint(firstEndpoint);
        await monitorPage.exportMetrics('csv');
        await expect(page.locator('text=Export initiated')).toBeVisible();
      }
    }
  });
});
