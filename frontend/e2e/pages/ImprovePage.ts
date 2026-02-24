/**
 * Page Object Model for IMPROVE stage
 * Handles feedback collection, analysis, and conversion to training data
 */

import { Page, Locator } from '@playwright/test';
import { waitForElement, waitForApiResponse, waitForLoadingComplete } from '../utils/wait-helpers';

export class ImprovePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigate() {
    await this.page.goto('/improve');
    await waitForLoadingComplete(this.page);
  }

  async selectEndpoint(endpointName: string) {
    await this.page.selectOption('[data-testid="endpoint-select"]', endpointName);
    await waitForLoadingComplete(this.page);
  }

  async getFeedbackList(): Promise<Locator> {
    return waitForElement(this.page, '[data-testid="feedback-list"]');
  }

  async getFeedbackCard(index: number): Promise<Locator> {
    const list = await this.getFeedbackList();
    return list.locator('[data-testid="feedback-card"]').nth(index);
  }

  async submitFeedback(data: {
    inputText: string;
    outputText: string;
    rating: 'positive' | 'negative';
    feedbackText?: string;
  }) {
    await this.page.click('[data-testid="submit-feedback-button"]');

    await this.page.fill('[data-testid="feedback-input-text"]', data.inputText);
    await this.page.fill('[data-testid="feedback-output-text"]', data.outputText);

    const ratingButton = this.page.locator(`[data-testid="rating-${data.rating}"]`);
    await ratingButton.click();

    if (data.feedbackText) {
      await this.page.fill('[data-testid="feedback-text-input"]', data.feedbackText);
    }

    await waitForApiResponse(
      this.page,
      '/api/v1/feedback',
      async () => {
        await this.page.click('[data-testid="submit-feedback-form-button"]');
      }
    );
    await waitForLoadingComplete(this.page);
  }

  async getFeedbackCount(): Promise<number> {
    const list = await this.getFeedbackList();
    const cards = list.locator('[data-testid="feedback-card"]');
    return cards.count();
  }

  async getFeedbackStats(): Promise<any> {
    await waitForApiResponse(
      this.page,
      '/api/v1/feedback/stats',
      async () => {
        await this.page.click('[data-testid="refresh-stats-button"]');
      }
    );

    const container = await waitForElement(this.page, '[data-testid="feedback-stats"]');
    return {
      totalCount: await container.locator('[data-testid="total-count"]').textContent(),
      positiveCount: await container.locator('[data-testid="positive-count"]').textContent(),
      negativeCount: await container.locator('[data-testid="negative-count"]').textContent(),
      positiveRate: await container.locator('[data-testid="positive-rate"]').textContent(),
    };
  }

  async filterByRating(rating: 'positive' | 'negative') {
    await this.page.selectOption('[data-testid="rating-filter"]', rating);
    await waitForLoadingComplete(this.page);
  }

  async filterByFlagged(flaggedOnly: boolean) {
    const checkbox = this.page.locator('[data-testid="flagged-filter"]');
    const isChecked = await checkbox.isChecked();

    if (isChecked !== flaggedOnly) {
      await checkbox.click();
      await waitForLoadingComplete(this.page);
    }
  }

  async flagFeedback(index: number) {
    const card = await this.getFeedbackCard(index);
    await waitForApiResponse(
      this.page,
      '/api/v1/feedback',
      async () => {
        await card.locator('[data-testid="flag-feedback-button"]').click();
      }
    );
    await waitForLoadingComplete(this.page);
  }

  async unflagFeedback(index: number) {
    const card = await this.getFeedbackCard(index);
    await waitForApiResponse(
      this.page,
      '/api/v1/feedback',
      async () => {
        await card.locator('[data-testid="unflag-feedback-button"]').click();
      }
    );
    await waitForLoadingComplete(this.page);
  }

  async deleteFeedback(index: number) {
    const card = await this.getFeedbackCard(index);
    await card.locator('[data-testid="delete-feedback-button"]').click();

    await waitForApiResponse(
      this.page,
      '/api/v1/feedback',
      async () => {
        await this.page.click('[data-testid="confirm-delete-feedback-button"]');
      }
    );
    await waitForLoadingComplete(this.page);
  }

  async convertToTrainingData(index: number, trainingSheetId: string) {
    const card = await this.getFeedbackCard(index);
    await card.locator('[data-testid="convert-to-training-button"]').click();

    await this.page.selectOption('[data-testid="training-sheet-select"]', trainingSheetId);

    await waitForApiResponse(
      this.page,
      '/api/v1/feedback',
      async () => {
        await this.page.click('[data-testid="confirm-convert-button"]');
      }
    );
    await waitForLoadingComplete(this.page);
  }

  async viewFeedbackDetails(index: number) {
    const card = await this.getFeedbackCard(index);
    await card.click();
    await waitForLoadingComplete(this.page);
  }

  async getFeedbackDetailsText(): Promise<any> {
    const container = await waitForElement(this.page, '[data-testid="feedback-details"]');
    return {
      inputText: await container.locator('[data-testid="detail-input-text"]').textContent(),
      outputText: await container.locator('[data-testid="detail-output-text"]').textContent(),
      rating: await container.locator('[data-testid="detail-rating"]').textContent(),
      feedbackText: await container.locator('[data-testid="detail-feedback-text"]').textContent(),
    };
  }

  async selectTimeRange(days: number) {
    await this.page.selectOption('[data-testid="time-range-select"]', days.toString());
    await waitForLoadingComplete(this.page);
  }

  async isFeedbackPresent(inputText: string): Promise<boolean> {
    const cards = this.page.locator('[data-testid="feedback-card"]').filter({ hasText: inputText });
    return (await cards.count()) > 0;
  }

  async refreshFeedbackList() {
    await waitForApiResponse(
      this.page,
      '/api/v1/feedback',
      async () => {
        await this.page.click('[data-testid="refresh-feedback-button"]');
      }
    );
    await waitForLoadingComplete(this.page);
  }

  async exportFeedback(format: 'csv' | 'json') {
    await this.page.click('[data-testid="export-feedback-button"]');
    await this.page.selectOption('[data-testid="export-format-select"]', format);
    await this.page.click('[data-testid="confirm-export-button"]');
  }

  async getRecentFeedback(limit: number): Promise<Locator[]> {
    await waitForApiResponse(
      this.page,
      `/api/v1/feedback/endpoint/`,
      async () => {
        await this.page.click('[data-testid="load-recent-button"]');
      }
    );

    const list = await this.getFeedbackList();
    const cards = list.locator('[data-testid="feedback-card"]');
    const count = Math.min(limit, await cards.count());

    const items: Locator[] = [];
    for (let i = 0; i < count; i++) {
      items.push(cards.nth(i));
    }
    return items;
  }
}
