/**
 * Page Object Model for MONITOR stage
 * Handles performance metrics, alerts, and drift detection
 */

import { Page, Locator } from '@playwright/test';
import { waitForElement, waitForApiResponse, waitForLoadingComplete } from '../utils/wait-helpers';

export class MonitorPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigate() {
    await this.page.goto('/monitor');
    await waitForLoadingComplete(this.page);
  }

  async selectEndpoint(endpointName: string) {
    await this.page.selectOption('[data-testid="endpoint-select"]', endpointName);
    await waitForLoadingComplete(this.page);
  }

  async getPerformanceMetrics(): Promise<any> {
    const metricsContainer = await waitForElement(this.page, '[data-testid="performance-metrics"]');
    return {
      totalRequests: await metricsContainer.locator('[data-testid="total-requests"]').textContent(),
      successRate: await metricsContainer.locator('[data-testid="success-rate"]').textContent(),
      avgLatency: await metricsContainer.locator('[data-testid="avg-latency"]').textContent(),
      errorRate: await metricsContainer.locator('[data-testid="error-rate"]').textContent(),
    };
  }

  async getRealtimeMetrics(): Promise<any> {
    await waitForApiResponse(
      this.page,
      '/api/v1/monitoring/metrics/realtime',
      async () => {
        await this.page.click('[data-testid="refresh-realtime-button"]');
      }
    );

    const container = await waitForElement(this.page, '[data-testid="realtime-metrics"]');
    return {
      requestCount: await container.locator('[data-testid="request-count"]').textContent(),
      requestsPerMinute: await container.locator('[data-testid="requests-per-minute"]').textContent(),
      successRate: await container.locator('[data-testid="realtime-success-rate"]').textContent(),
    };
  }

  async selectTimeRange(hours: number) {
    await this.page.selectOption('[data-testid="time-range-select"]', hours.toString());
    await waitForLoadingComplete(this.page);
  }

  async getAlertsList(): Promise<Locator> {
    return waitForElement(this.page, '[data-testid="alerts-list"]');
  }

  async getAlertCard(alertType: string): Promise<Locator> {
    return this.page.locator(`[data-testid="alert-card"]`).filter({ hasText: alertType });
  }

  async createAlert(config: {
    alertType: string;
    threshold: number;
    condition: string;
  }) {
    await this.page.click('[data-testid="create-alert-button"]');

    await this.page.selectOption('[data-testid="alert-type-select"]', config.alertType);
    await this.page.fill('[data-testid="alert-threshold-input"]', config.threshold.toString());
    await this.page.selectOption('[data-testid="alert-condition-select"]', config.condition);

    await waitForApiResponse(
      this.page,
      '/api/v1/monitoring/alerts',
      async () => {
        await this.page.click('[data-testid="submit-alert-button"]');
      }
    );
    await waitForLoadingComplete(this.page);
  }

  async getAlertStatus(alertType: string): Promise<string> {
    const card = await this.getAlertCard(alertType);
    const statusBadge = card.locator('[data-testid="alert-status"]');
    return statusBadge.textContent() || '';
  }

  async acknowledgeAlert(alertType: string) {
    const card = await this.getAlertCard(alertType);
    await card.locator('[data-testid="acknowledge-alert-button"]').click();

    await waitForApiResponse(
      this.page,
      '/api/v1/monitoring/alerts',
      async () => {
        await this.page.click('[data-testid="confirm-acknowledge-button"]');
      }
    );
    await waitForLoadingComplete(this.page);
  }

  async resolveAlert(alertType: string) {
    const card = await this.getAlertCard(alertType);
    await card.locator('[data-testid="resolve-alert-button"]').click();

    await waitForApiResponse(
      this.page,
      '/api/v1/monitoring/alerts',
      async () => {
        await this.page.click('[data-testid="confirm-resolve-button"]');
      }
    );
    await waitForLoadingComplete(this.page);
  }

  async deleteAlert(alertType: string) {
    const card = await this.getAlertCard(alertType);
    await card.locator('[data-testid="delete-alert-button"]').click();

    await waitForApiResponse(
      this.page,
      '/api/v1/monitoring/alerts',
      async () => {
        await this.page.click('[data-testid="confirm-delete-alert-button"]');
      }
    );
    await waitForLoadingComplete(this.page);
  }

  async getDriftReport(): Promise<any> {
    await waitForApiResponse(
      this.page,
      '/api/v1/monitoring/drift',
      async () => {
        await this.page.click('[data-testid="check-drift-button"]');
      }
    );

    const container = await waitForElement(this.page, '[data-testid="drift-report"]');
    return {
      driftDetected: await container.locator('[data-testid="drift-detected"]').textContent(),
      driftScore: await container.locator('[data-testid="drift-score"]').textContent(),
      severity: await container.locator('[data-testid="drift-severity"]').textContent(),
    };
  }

  async getHealthStatus(): Promise<any> {
    await waitForApiResponse(
      this.page,
      '/api/v1/monitoring/health',
      async () => {
        await this.page.click('[data-testid="check-health-button"]');
      }
    );

    const container = await waitForElement(this.page, '[data-testid="health-status"]');
    return {
      healthScore: await container.locator('[data-testid="health-score"]').textContent(),
      status: await container.locator('[data-testid="health-status-badge"]').textContent(),
    };
  }

  async getAlertsCount(): Promise<number> {
    const list = await this.getAlertsList();
    const cards = list.locator('[data-testid="alert-card"]');
    return cards.count();
  }

  async filterAlertsByStatus(status: string) {
    await this.page.selectOption('[data-testid="alert-status-filter"]', status);
    await waitForLoadingComplete(this.page);
  }

  async filterAlertsByType(type: string) {
    await this.page.selectOption('[data-testid="alert-type-filter"]', type);
    await waitForLoadingComplete(this.page);
  }

  async isMetricsChartVisible(): Promise<boolean> {
    const chart = this.page.locator('[data-testid="metrics-chart"]');
    return chart.isVisible();
  }

  async refreshMetrics() {
    await waitForApiResponse(
      this.page,
      '/api/v1/monitoring/metrics',
      async () => {
        await this.page.click('[data-testid="refresh-metrics-button"]');
      }
    );
    await waitForLoadingComplete(this.page);
  }

  async exportMetrics(format: 'csv' | 'json') {
    await this.page.click('[data-testid="export-metrics-button"]');
    await this.page.selectOption('[data-testid="export-format-select"]', format);
    await this.page.click('[data-testid="confirm-export-button"]');
  }
}
