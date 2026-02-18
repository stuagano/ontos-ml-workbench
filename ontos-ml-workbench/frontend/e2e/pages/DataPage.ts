/**
 * Page Object Model for DATA stage
 * Handles sheet browsing, creation, and management
 */

import { Page, Locator } from '@playwright/test';
import { waitForElement, waitForApiResponse, waitForLoadingComplete } from '../utils/wait-helpers';

export class DataPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigate() {
    await this.page.goto('/data');
    await waitForLoadingComplete(this.page);
  }

  async getSheetsList(): Promise<Locator> {
    return waitForElement(this.page, '[data-testid="sheets-list"]');
  }

  async getSheetCard(sheetName: string): Promise<Locator> {
    return this.page.locator(`[data-testid="sheet-card"]`).filter({ hasText: sheetName });
  }

  async clickCreateSheet() {
    await waitForApiResponse(
      this.page,
      '/api/v1/sheets',
      async () => {
        await this.page.click('[data-testid="create-sheet-button"]');
      }
    );
  }

  async fillSheetForm(data: {
    name: string;
    description: string;
    sourceType: string;
    sourcePath: string;
    dataType: string;
  }) {
    await this.page.fill('[data-testid="sheet-name-input"]', data.name);
    await this.page.fill('[data-testid="sheet-description-input"]', data.description);
    await this.page.selectOption('[data-testid="source-type-select"]', data.sourceType);
    await this.page.fill('[data-testid="source-path-input"]', data.sourcePath);
    await this.page.selectOption('[data-testid="data-type-select"]', data.dataType);
  }

  async submitSheetForm() {
    await waitForApiResponse(
      this.page,
      '/api/v1/sheets',
      async () => {
        await this.page.click('[data-testid="submit-sheet-button"]');
      }
    );
    await waitForLoadingComplete(this.page);
  }

  async searchSheets(query: string) {
    await this.page.fill('[data-testid="sheet-search-input"]', query);
    await waitForLoadingComplete(this.page);
  }

  async filterByDataType(dataType: string) {
    await this.page.selectOption('[data-testid="data-type-filter"]', dataType);
    await waitForLoadingComplete(this.page);
  }

  async filterByStatus(status: string) {
    await this.page.selectOption('[data-testid="status-filter"]', status);
    await waitForLoadingComplete(this.page);
  }

  async openSheetDetails(sheetName: string) {
    const card = await this.getSheetCard(sheetName);
    await card.click();
    await waitForLoadingComplete(this.page);
  }

  async getSheetCount(): Promise<number> {
    const list = await this.getSheetsList();
    const cards = list.locator('[data-testid="sheet-card"]');
    return cards.count();
  }

  async deleteSheet(sheetName: string) {
    const card = await this.getSheetCard(sheetName);
    await card.locator('[data-testid="delete-sheet-button"]').click();

    await waitForApiResponse(
      this.page,
      '/api/v1/sheets',
      async () => {
        await this.page.click('[data-testid="confirm-delete-button"]');
      }
    );
    await waitForLoadingComplete(this.page);
  }

  async getSheetStatus(sheetName: string): Promise<string> {
    const card = await this.getSheetCard(sheetName);
    const statusBadge = card.locator('[data-testid="sheet-status"]');
    return statusBadge.textContent() || '';
  }

  async getSheetDataType(sheetName: string): Promise<string> {
    const card = await this.getSheetCard(sheetName);
    const typeBadge = card.locator('[data-testid="sheet-data-type"]');
    return typeBadge.textContent() || '';
  }

  async getSheetsTableHeaders(): Promise<string[]> {
    const headers = this.page.locator('[data-testid="sheets-table"] th');
    return headers.allTextContents();
  }

  async refreshSheetsList() {
    await waitForApiResponse(
      this.page,
      '/api/v1/sheets',
      async () => {
        await this.page.click('[data-testid="refresh-sheets-button"]');
      }
    );
    await waitForLoadingComplete(this.page);
  }

  async isSheetPresent(sheetName: string): Promise<boolean> {
    const cards = this.page.locator('[data-testid="sheet-card"]').filter({ hasText: sheetName });
    return (await cards.count()) > 0;
  }
}
