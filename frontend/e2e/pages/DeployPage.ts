/**
 * Page Object Model for DEPLOY stage
 * Handles model deployment wizard and endpoint management
 */

import { Page, Locator } from '@playwright/test';
import { waitForElement, waitForApiResponse, waitForLoadingComplete } from '../utils/wait-helpers';

export class DeployPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigate() {
    await this.page.goto('/deploy');
    await waitForLoadingComplete(this.page);
  }

  async getDeploymentsList(): Promise<Locator> {
    return waitForElement(this.page, '[data-testid="deployments-list"]');
  }

  async getDeploymentCard(endpointName: string): Promise<Locator> {
    return this.page.locator(`[data-testid="deployment-card"]`).filter({ hasText: endpointName });
  }

  async clickDeployModel() {
    await this.page.click('[data-testid="deploy-model-button"]');
    await waitForLoadingComplete(this.page);
  }

  async selectModel(modelName: string) {
    await this.page.selectOption('[data-testid="model-select"]', modelName);
    await waitForLoadingComplete(this.page);
  }

  async selectModelVersion(version: string) {
    await this.page.selectOption('[data-testid="model-version-select"]', version);
  }

  async fillEndpointName(name: string) {
    await this.page.fill('[data-testid="endpoint-name-input"]', name);
  }

  async selectWorkloadSize(size: 'Small' | 'Medium' | 'Large') {
    await this.page.selectOption('[data-testid="workload-size-select"]', size);
  }

  async toggleScaleToZero(enabled: boolean) {
    const checkbox = this.page.locator('[data-testid="scale-to-zero-checkbox"]');
    const isChecked = await checkbox.isChecked();

    if (isChecked !== enabled) {
      await checkbox.click();
    }
  }

  async submitDeployment() {
    await waitForApiResponse(
      this.page,
      '/api/v1/deployment/deploy',
      async () => {
        await this.page.click('[data-testid="submit-deployment-button"]');
      }
    );
    await waitForLoadingComplete(this.page);
  }

  async getDeploymentStatus(endpointName: string): Promise<string> {
    const card = await this.getDeploymentCard(endpointName);
    const statusBadge = card.locator('[data-testid="deployment-status"]');
    return statusBadge.textContent() || '';
  }

  async getDeploymentCount(): Promise<number> {
    const list = await this.getDeploymentsList();
    const cards = list.locator('[data-testid="deployment-card"]');
    return cards.count();
  }

  async openEndpointDetails(endpointName: string) {
    const card = await this.getDeploymentCard(endpointName);
    await card.click();
    await waitForLoadingComplete(this.page);
  }

  async deleteEndpoint(endpointName: string) {
    const card = await this.getDeploymentCard(endpointName);
    await card.locator('[data-testid="delete-endpoint-button"]').click();

    await waitForApiResponse(
      this.page,
      `/api/v1/deployment/endpoints/${endpointName}`,
      async () => {
        await this.page.click('[data-testid="confirm-delete-button"]');
      }
    );
    await waitForLoadingComplete(this.page);
  }

  async updateDeployment(endpointName: string, newVersion: string) {
    await this.openEndpointDetails(endpointName);
    await this.page.click('[data-testid="update-deployment-button"]');
    await this.selectModelVersion(newVersion);

    await waitForApiResponse(
      this.page,
      `/api/v1/deployment/endpoints/${endpointName}`,
      async () => {
        await this.page.click('[data-testid="submit-update-button"]');
      }
    );
    await waitForLoadingComplete(this.page);
  }

  async rollbackDeployment(endpointName: string, targetVersion: string) {
    await this.openEndpointDetails(endpointName);
    await this.page.click('[data-testid="rollback-button"]');
    await this.page.selectOption('[data-testid="rollback-version-select"]', targetVersion);

    await waitForApiResponse(
      this.page,
      `/api/v1/deployment/endpoints/${endpointName}/rollback`,
      async () => {
        await this.page.click('[data-testid="confirm-rollback-button"]');
      }
    );
    await waitForLoadingComplete(this.page);
  }

  async validateEndpoint(endpointName: string) {
    await this.openEndpointDetails(endpointName);
    await waitForApiResponse(
      this.page,
      `/api/v1/deployment/endpoints/${endpointName}/validate`,
      async () => {
        await this.page.click('[data-testid="validate-endpoint-button"]');
      }
    );
    await waitForLoadingComplete(this.page);
  }

  async getValidationResults(): Promise<any> {
    const resultsElement = await waitForElement(this.page, '[data-testid="validation-results"]');
    const resultsText = await resultsElement.textContent();
    return resultsText;
  }

  async queryEndpoint(endpointName: string, input: any) {
    await this.openEndpointDetails(endpointName);
    await this.page.click('[data-testid="test-endpoint-button"]');
    await this.page.fill('[data-testid="endpoint-input"]', JSON.stringify(input));

    await waitForApiResponse(
      this.page,
      `/api/v1/deployment/endpoints/${endpointName}/query`,
      async () => {
        await this.page.click('[data-testid="send-query-button"]');
      }
    );
    await waitForLoadingComplete(this.page);
  }

  async getQueryResults(): Promise<string> {
    const resultsElement = await waitForElement(this.page, '[data-testid="query-results"]');
    return resultsElement.textContent() || '';
  }

  async isEndpointPresent(endpointName: string): Promise<boolean> {
    const cards = this.page.locator('[data-testid="deployment-card"]').filter({ hasText: endpointName });
    return (await cards.count()) > 0;
  }

  async filterByStatus(status: string) {
    await this.page.selectOption('[data-testid="status-filter"]', status);
    await waitForLoadingComplete(this.page);
  }

  async refreshDeploymentsList() {
    await waitForApiResponse(
      this.page,
      '/api/v1/deployment/endpoints',
      async () => {
        await this.page.click('[data-testid="refresh-deployments-button"]');
      }
    );
    await waitForLoadingComplete(this.page);
  }
}
