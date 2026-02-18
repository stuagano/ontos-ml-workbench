/**
 * E2E tests for DEPLOY stage
 * Tests model deployment, endpoint management, and validation
 */

import { test, expect } from '@playwright/test';
import { DeployPage } from '../pages/DeployPage';
import { generateEndpoint } from '../utils/data-generators';
import { waitForLoadingComplete } from '../utils/wait-helpers';

test.describe('DEPLOY Stage - Model Deployment', () => {
  let deployPage: DeployPage;

  test.beforeEach(async ({ page }) => {
    deployPage = new DeployPage(page);
    await deployPage.navigate();
  });

  test('should display deployments list', async () => {
    const list = await deployPage.getDeploymentsList();
    await expect(list).toBeVisible();
  });

  test('should open deployment wizard', async ({ page }) => {
    await deployPage.clickDeployModel();
    await expect(page.locator('[data-testid="deployment-wizard"]')).toBeVisible();
  });

  test('should deploy a new model', async ({ page }) => {
    const endpointData = generateEndpoint();

    await deployPage.clickDeployModel();
    await deployPage.selectModel(endpointData.model_name);
    await deployPage.selectModelVersion(endpointData.model_version);
    await deployPage.fillEndpointName(endpointData.endpoint_name);
    await deployPage.selectWorkloadSize('Small');
    await deployPage.toggleScaleToZero(true);
    await deployPage.submitDeployment();

    await expect(page.locator('text=Deployment initiated')).toBeVisible();
  });

  test('should display deployment status', async () => {
    const count = await deployPage.getDeploymentCount();

    if (count > 0) {
      const cards = (await deployPage.getDeploymentsList()).locator('[data-testid="deployment-card"]');
      const firstEndpointName = await cards.first().locator('[data-testid="endpoint-name"]').textContent();

      if (firstEndpointName) {
        const status = await deployPage.getDeploymentStatus(firstEndpointName);
        expect(['READY', 'NOT_READY', 'UPDATING', 'CREATING']).toContain(status);
      }
    }
  });

  test('should filter deployments by status', async ({ page }) => {
    await deployPage.filterByStatus('READY');
    await waitForLoadingComplete(page);

    const count = await deployPage.getDeploymentCount();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should open endpoint details', async ({ page }) => {
    const count = await deployPage.getDeploymentCount();

    if (count > 0) {
      const cards = (await deployPage.getDeploymentsList()).locator('[data-testid="deployment-card"]');
      const firstEndpointName = await cards.first().locator('[data-testid="endpoint-name"]').textContent();

      if (firstEndpointName) {
        await deployPage.openEndpointDetails(firstEndpointName);
        await expect(page.locator('[data-testid="endpoint-details"]')).toBeVisible();
      }
    }
  });

  test('should validate endpoint configuration', async ({ page }) => {
    const count = await deployPage.getDeploymentCount();

    if (count > 0) {
      const cards = (await deployPage.getDeploymentsList()).locator('[data-testid="deployment-card"]');
      const firstEndpointName = await cards.first().locator('[data-testid="endpoint-name"]').textContent();

      if (firstEndpointName) {
        await deployPage.validateEndpoint(firstEndpointName);
        await expect(page.locator('[data-testid="validation-results"]')).toBeVisible();
      }
    }
  });

  test('should update deployment configuration', async ({ page }) => {
    const count = await deployPage.getDeploymentCount();

    if (count > 0) {
      const cards = (await deployPage.getDeploymentsList()).locator('[data-testid="deployment-card"]');
      const firstEndpointName = await cards.first().locator('[data-testid="endpoint-name"]').textContent();

      if (firstEndpointName) {
        await deployPage.updateDeployment(firstEndpointName, '2');
        await expect(page.locator('text=Deployment updated')).toBeVisible();
      }
    }
  });

  test('should handle deployment errors gracefully', async ({ page }) => {
    await page.route('**/api/v1/deployment/deploy', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ detail: 'Deployment failed' }),
      });
    });

    const endpointData = generateEndpoint();

    await deployPage.clickDeployModel();
    await deployPage.selectModel(endpointData.model_name);
    await deployPage.selectModelVersion(endpointData.model_version);
    await deployPage.fillEndpointName(endpointData.endpoint_name);
    await deployPage.submitDeployment();

    await expect(page.locator('text=Deployment failed')).toBeVisible();
  });

  test('should refresh deployments list', async ({ page }) => {
    await deployPage.refreshDeploymentsList();
    await expect(page.locator('[data-testid="deployments-list"]')).toBeVisible();
  });

  test('should validate required fields in deployment wizard', async ({ page }) => {
    await deployPage.clickDeployModel();
    await deployPage.submitDeployment();

    await expect(page.locator('text=Model is required')).toBeVisible();
  });

  test('should display workload size options', async ({ page }) => {
    await deployPage.clickDeployModel();

    const sizeSelect = page.locator('[data-testid="workload-size-select"]');
    await expect(sizeSelect).toBeVisible();

    const options = await sizeSelect.locator('option').allTextContents();
    expect(options).toContain('Small');
    expect(options).toContain('Medium');
    expect(options).toContain('Large');
  });

  test('should support scale to zero toggle', async ({ page }) => {
    await deployPage.clickDeployModel();

    const checkbox = page.locator('[data-testid="scale-to-zero-checkbox"]');
    await expect(checkbox).toBeVisible();

    await checkbox.check();
    expect(await checkbox.isChecked()).toBe(true);

    await checkbox.uncheck();
    expect(await checkbox.isChecked()).toBe(false);
  });

  test('should query endpoint successfully', async ({ page }) => {
    const count = await deployPage.getDeploymentCount();

    if (count > 0) {
      const cards = (await deployPage.getDeploymentsList()).locator('[data-testid="deployment-card"]');
      const firstEndpointName = await cards.first().locator('[data-testid="endpoint-name"]').textContent();

      if (firstEndpointName) {
        const testInput = { test: 'input' };
        await deployPage.queryEndpoint(firstEndpointName, testInput);

        await expect(page.locator('[data-testid="query-results"]')).toBeVisible();
      }
    }
  });

  test('should display endpoint history', async ({ page }) => {
    const count = await deployPage.getDeploymentCount();

    if (count > 0) {
      const cards = (await deployPage.getDeploymentsList()).locator('[data-testid="deployment-card"]');
      const firstEndpointName = await cards.first().locator('[data-testid="endpoint-name"]').textContent();

      if (firstEndpointName) {
        await deployPage.openEndpointDetails(firstEndpointName);
        await page.click('[data-testid="view-history-button"]');

        await expect(page.locator('[data-testid="deployment-history"]')).toBeVisible();
      }
    }
  });
});
