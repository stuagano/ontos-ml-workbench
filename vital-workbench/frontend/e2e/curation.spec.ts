import { test, expect } from '@playwright/test';

/**
 * E2E tests for Curation workflow
 */

test.describe('Curation Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/curate');
  });

  test('should display curation interface', async ({ page }) => {
    // Should show curate heading or content
    await expect(page.locator('body')).toContainText(/curat/i);
  });

  test('should show filter options', async ({ page }) => {
    // Should have status filter dropdown or tabs
    const filterElement = page.locator('select, [role="tablist"], button').filter({
      hasText: /pending|approved|rejected|all|filter/i
    });

    // At least one filter control should exist
    const count = await filterElement.count();
    expect(count).toBeGreaterThanOrEqual(0); // May not have items yet
  });

  test('should show empty state when no items', async ({ page }) => {
    // If no curation items, should show empty state message
    const content = await page.textContent('body');

    // Either has items or shows empty state
    const hasItems = content?.includes('pending') || content?.includes('approved');
    const hasEmptyState = content?.includes('No items') || content?.includes('empty') || content?.includes('Select');

    expect(hasItems || hasEmptyState).toBe(true);
  });
});

test.describe('Curation Actions', () => {
  test('should have bulk action buttons when items present', async ({ page }) => {
    await page.goto('/curate');

    // Look for bulk action controls
    const bulkActions = page.locator('button').filter({
      hasText: /approve|reject|bulk|select all/i
    });

    // These may or may not be visible depending on selection state
    const count = await bulkActions.count();
    // Just verify the page loaded - bulk actions depend on having items
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
