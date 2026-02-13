/**
 * E2E tests for complete Deploy → Monitor → Improve workflow
 * Tests the end-to-end flow of deploying a model, monitoring it, and collecting feedback
 */

import { test, expect } from '@playwright/test';
import { DataPage } from '../pages/DataPage';
import { DeployPage } from '../pages/DeployPage';
import { MonitorPage } from '../pages/MonitorPage';
import { ImprovePage } from '../pages/ImprovePage';
import { generateSheet, generateEndpoint, generateFeedback } from '../utils/data-generators';
import { waitForLoadingComplete } from '../utils/wait-helpers';

test.describe('Full Workflow - Deploy → Monitor → Improve', () => {
  test('should complete full workflow from data to improvement', async ({ page }) => {
    // Skip if this is a read-only test environment
    const isReadOnly = process.env.E2E_READ_ONLY === 'true';
    test.skip(isReadOnly, 'Skipping in read-only mode');

    // Step 1: Create a sheet (DATA stage)
    const dataPage = new DataPage(page);
    await dataPage.navigate();

    const sheetData = generateSheet({
      name: `E2E Workflow Sheet ${Date.now()}`,
      description: 'Sheet created for full workflow test',
    });

    await dataPage.clickCreateSheet();
    await dataPage.fillSheetForm(sheetData);
    await dataPage.submitSheetForm();

    await expect(page.locator('text=Sheet created successfully')).toBeVisible();

    // Step 2: Deploy a model (DEPLOY stage)
    const deployPage = new DeployPage(page);
    await deployPage.navigate();

    const endpointData = generateEndpoint({
      endpoint_name: `e2e-workflow-endpoint-${Date.now()}`,
    });

    await deployPage.clickDeployModel();
    await deployPage.selectModel(endpointData.model_name);
    await deployPage.selectModelVersion(endpointData.model_version);
    await deployPage.fillEndpointName(endpointData.endpoint_name);
    await deployPage.selectWorkloadSize('Small');
    await deployPage.toggleScaleToZero(true);
    await deployPage.submitDeployment();

    await expect(page.locator('text=Deployment initiated')).toBeVisible();

    // Step 3: Monitor the deployment (MONITOR stage)
    const monitorPage = new MonitorPage(page);
    await monitorPage.navigate();

    await monitorPage.selectEndpoint(endpointData.endpoint_name);
    const metrics = await monitorPage.getPerformanceMetrics();
    expect(metrics).toBeTruthy();

    // Create an alert
    await monitorPage.createAlert({
      alertType: 'error_rate',
      threshold: 0.1,
      condition: 'gt',
    });

    await expect(page.locator('text=Alert created')).toBeVisible();

    // Check drift
    const driftReport = await monitorPage.getDriftReport();
    expect(driftReport.driftDetected).toBeTruthy();

    // Step 4: Collect feedback (IMPROVE stage)
    const improvePage = new ImprovePage(page);
    await improvePage.navigate();

    await improvePage.selectEndpoint(endpointData.endpoint_name);

    await improvePage.submitFeedback({
      inputText: 'E2E test input',
      outputText: 'E2E test output',
      rating: 'positive',
      feedbackText: 'Full workflow test feedback',
    });

    await expect(page.locator('text=Feedback submitted')).toBeVisible();

    // Verify feedback appears in list
    const isPresent = await improvePage.isFeedbackPresent('E2E test input');
    expect(isPresent).toBe(true);

    // Step 5: Convert feedback to training data
    const count = await improvePage.getFeedbackCount();
    if (count > 0) {
      await improvePage.convertToTrainingData(0, 'test-assembly-id');
      await expect(page.locator('text=Converted to training data')).toBeVisible();
    }

    // Cleanup: Navigate back to verify all stages
    await dataPage.navigate();
    expect(await dataPage.isSheetPresent(sheetData.name)).toBe(true);

    await deployPage.navigate();
    expect(await deployPage.isEndpointPresent(endpointData.endpoint_name)).toBe(true);
  });

  test('should handle workflow interruption gracefully', async ({ page }) => {
    const deployPage = new DeployPage(page);
    await deployPage.navigate();

    // Start deployment but interrupt it
    await deployPage.clickDeployModel();
    const endpointData = generateEndpoint();

    await deployPage.selectModel(endpointData.model_name);
    await deployPage.selectModelVersion(endpointData.model_version);

    // Navigate away before completing
    await page.goto('/monitor');
    await waitForLoadingComplete(page);

    // Navigate back and verify form is reset
    await deployPage.navigate();
    const wizardVisible = await page.locator('[data-testid="deployment-wizard"]').isVisible();
    expect(wizardVisible).toBe(false);
  });

  test('should maintain state across page navigation', async ({ page }) => {
    // Deploy stage
    const deployPage = new DeployPage(page);
    await deployPage.navigate();

    const initialCount = await deployPage.getDeploymentCount();

    // Navigate to monitor and back
    await page.goto('/monitor');
    await waitForLoadingComplete(page);

    await deployPage.navigate();
    const finalCount = await deployPage.getDeploymentCount();

    expect(finalCount).toBe(initialCount);
  });

  test('should show loading states during transitions', async ({ page }) => {
    const dataPage = new DataPage(page);
    await dataPage.navigate();

    // Trigger a search that might show loading
    await dataPage.searchSheets('test');

    // Loading spinner should not be visible after load completes
    await waitForLoadingComplete(page);
    const spinner = page.locator('[data-testid="loading-spinner"]');
    expect(await spinner.count()).toBe(0);
  });

  test('should handle rapid navigation between stages', async ({ page }) => {
    const stages = ['/data', '/deploy', '/monitor', '/improve'];

    for (const stage of stages) {
      await page.goto(stage);
      await waitForLoadingComplete(page);
      await expect(page).toHaveURL(stage);
    }
  });

  test('should preserve filters across page refresh', async ({ page }) => {
    const monitorPage = new MonitorPage(page);
    await monitorPage.navigate();

    await monitorPage.filterAlertsByStatus('active');
    await waitForLoadingComplete(page);

    // Refresh page
    await page.reload();
    await waitForLoadingComplete(page);

    // Filter should still be applied (if implemented with URL params)
    const statusFilter = page.locator('[data-testid="alert-status-filter"]');
    const selectedValue = await statusFilter.inputValue();
    expect(selectedValue).toBe('active');
  });

  test('should handle concurrent operations', async ({ page }) => {
    const improvePage = new ImprovePage(page);
    await improvePage.navigate();

    const endpointSelect = page.locator('[data-testid="endpoint-select"]');
    const hasEndpoints = (await endpointSelect.locator('option').count()) > 1;

    if (hasEndpoints) {
      const firstEndpoint = await endpointSelect.locator('option').nth(1).textContent();
      if (firstEndpoint) {
        await improvePage.selectEndpoint(firstEndpoint);

        // Trigger multiple operations in parallel
        const operations = [
          improvePage.getFeedbackStats(),
          improvePage.refreshFeedbackList(),
        ];

        await Promise.all(operations);
        await waitForLoadingComplete(page);
      }
    }
  });

  test('should validate workflow prerequisites', async ({ page }) => {
    // Try to monitor a non-existent endpoint
    const monitorPage = new MonitorPage(page);
    await monitorPage.navigate();

    const endpointSelect = page.locator('[data-testid="endpoint-select"]');
    await endpointSelect.selectOption('non-existent-endpoint');

    await expect(page.locator('text=Endpoint not found')).toBeVisible();
  });

  test('should show appropriate empty states', async ({ page }) => {
    // Mock empty responses
    await page.route('**/api/v1/deployment/endpoints*', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify([]),
      });
    });

    const deployPage = new DeployPage(page);
    await deployPage.navigate();

    await expect(page.locator('text=No deployments found')).toBeVisible();
    await expect(page.locator('[data-testid="deploy-model-button"]')).toBeVisible();
  });

  test('should complete monitoring workflow', async ({ page }) => {
    const monitorPage = new MonitorPage(page);
    await monitorPage.navigate();

    const endpointSelect = page.locator('[data-testid="endpoint-select"]');
    const hasEndpoints = (await endpointSelect.locator('option').count()) > 1;

    if (hasEndpoints) {
      const firstEndpoint = await endpointSelect.locator('option').nth(1).textContent();
      if (firstEndpoint) {
        // Select endpoint
        await monitorPage.selectEndpoint(firstEndpoint);

        // Get metrics
        const metrics = await monitorPage.getPerformanceMetrics();
        expect(metrics.totalRequests).toBeTruthy();

        // Check health
        const health = await monitorPage.getHealthStatus();
        expect(health.healthScore).toBeTruthy();

        // Create alert
        await monitorPage.createAlert({
          alertType: 'drift',
          threshold: 0.2,
          condition: 'gt',
        });

        await expect(page.locator('text=Alert created')).toBeVisible();

        // Get drift report
        const drift = await monitorPage.getDriftReport();
        expect(drift.severity).toBeTruthy();
      }
    }
  });

  test('should complete improvement workflow', async ({ page }) => {
    const improvePage = new ImprovePage(page);
    await improvePage.navigate();

    const endpointSelect = page.locator('[data-testid="endpoint-select"]');
    const hasEndpoints = (await endpointSelect.locator('option').count()) > 1;

    if (hasEndpoints) {
      const firstEndpoint = await endpointSelect.locator('option').nth(1).textContent();
      if (firstEndpoint) {
        // Select endpoint
        await improvePage.selectEndpoint(firstEndpoint);

        // Get stats
        const stats = await improvePage.getFeedbackStats();
        expect(stats.totalCount).toBeTruthy();

        // Filter by rating
        await improvePage.filterByRating('negative');
        await waitForLoadingComplete(page);

        // Flag a negative feedback if exists
        const count = await improvePage.getFeedbackCount();
        if (count > 0) {
          await improvePage.flagFeedback(0);
          await expect(page.locator('text=Feedback flagged')).toBeVisible();
        }
      }
    }
  });
});
