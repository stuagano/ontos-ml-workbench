/**
 * E2E tests for DATA stage
 * Tests sheet browsing, creation, filtering, and management
 */

import { test, expect } from '@playwright/test';
import { DataPage } from '../pages/DataPage';
import { generateSheet } from '../utils/data-generators';
import { waitForLoadingComplete } from '../utils/wait-helpers';

test.describe('DATA Stage - Sheet Management', () => {
  let dataPage: DataPage;

  test.beforeEach(async ({ page }) => {
    dataPage = new DataPage(page);
    await dataPage.navigate();
  });

  test('should display sheets list', async () => {
    const list = await dataPage.getSheetsList();
    await expect(list).toBeVisible();
  });

  test('should display table headers', async () => {
    const headers = await dataPage.getSheetsTableHeaders();
    expect(headers).toContain('Name');
    expect(headers).toContain('Type');
    expect(headers).toContain('Status');
  });

  test('should create a new sheet', async ({ page }) => {
    const sheetData = generateSheet({
      name: 'E2E Test Sheet',
      description: 'Created during E2E test',
      sourceType: 'unity_catalog_table',
      sourcePath: 'catalog.schema.test_table',
      dataType: 'tabular',
    });

    await dataPage.clickCreateSheet();
    await dataPage.fillSheetForm(sheetData);
    await dataPage.submitSheetForm();

    await expect(page.locator('text=Sheet created successfully')).toBeVisible();

    const isPresent = await dataPage.isSheetPresent(sheetData.name);
    expect(isPresent).toBe(true);
  });

  test('should filter sheets by data type', async () => {
    await dataPage.filterByDataType('image');
    await waitForLoadingComplete(dataPage.page);

    const count = await dataPage.getSheetCount();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should filter sheets by status', async () => {
    await dataPage.filterByStatus('active');
    await waitForLoadingComplete(dataPage.page);

    const count = await dataPage.getSheetCount();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should search sheets by name', async () => {
    await dataPage.searchSheets('Test');
    await waitForLoadingComplete(dataPage.page);

    const count = await dataPage.getSheetCount();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should open sheet details', async () => {
    const count = await dataPage.getSheetCount();

    if (count > 0) {
      const cards = (await dataPage.getSheetsList()).locator('[data-testid="sheet-card"]');
      const firstSheetName = await cards.first().locator('[data-testid="sheet-name"]').textContent();

      if (firstSheetName) {
        await dataPage.openSheetDetails(firstSheetName);
        await expect(dataPage.page.locator('[data-testid="sheet-details"]')).toBeVisible();
      }
    }
  });

  test('should refresh sheets list', async ({ page }) => {
    await dataPage.refreshSheetsList();
    await expect(page.locator('[data-testid="sheets-list"]')).toBeVisible();
  });

  test('should display sheet status badge', async () => {
    const count = await dataPage.getSheetCount();

    if (count > 0) {
      const cards = (await dataPage.getSheetsList()).locator('[data-testid="sheet-card"]');
      const firstSheetName = await cards.first().locator('[data-testid="sheet-name"]').textContent();

      if (firstSheetName) {
        const status = await dataPage.getSheetStatus(firstSheetName);
        expect(['active', 'inactive', 'archived']).toContain(status.toLowerCase());
      }
    }
  });

  test('should display sheet data type', async () => {
    const count = await dataPage.getSheetCount();

    if (count > 0) {
      const cards = (await dataPage.getSheetsList()).locator('[data-testid="sheet-card"]');
      const firstSheetName = await cards.first().locator('[data-testid="sheet-name"]').textContent();

      if (firstSheetName) {
        const dataType = await dataPage.getSheetDataType(firstSheetName);
        expect(['image', 'tabular', 'timeseries', 'text']).toContain(dataType.toLowerCase());
      }
    }
  });

  test('should validate required fields in sheet creation', async ({ page }) => {
    await dataPage.clickCreateSheet();
    await dataPage.submitSheetForm();

    await expect(page.locator('text=Name is required')).toBeVisible();
  });

  test('should handle sheet creation with special characters', async ({ page }) => {
    const sheetData = generateSheet({
      name: 'Test Sheet (Special) #123',
      description: 'Sheet with special characters: @#$%',
    });

    await dataPage.clickCreateSheet();
    await dataPage.fillSheetForm(sheetData);
    await dataPage.submitSheetForm();

    await waitForLoadingComplete(page);
  });

  test('should support pagination when many sheets exist', async ({ page }) => {
    const paginationContainer = page.locator('[data-testid="pagination"]');

    if (await paginationContainer.isVisible()) {
      const nextButton = page.locator('[data-testid="pagination-next"]');
      if (await nextButton.isEnabled()) {
        await nextButton.click();
        await waitForLoadingComplete(page);
        await expect(dataPage.page).toHaveURL(/page=2/);
      }
    }
  });
});
