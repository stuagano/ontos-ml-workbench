import { test, expect } from '@playwright/test';

/**
 * E2E tests for Template management
 */

test.describe('Templates Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/template');
  });

  test('should display templates list', async ({ page }) => {
    // Should show templates heading or list
    await expect(page.locator('h1, h2').filter({ hasText: /template/i }).first()).toBeVisible();
  });

  test('should have create template button', async ({ page }) => {
    // Should have a button to create new template
    const createButton = page.locator('button').filter({ hasText: /create|new|add/i });
    await expect(createButton.first()).toBeVisible();
  });

  test('should open template editor when clicking create', async ({ page }) => {
    // Click create button
    const createButton = page.locator('button').filter({ hasText: /create|new|add/i }).first();
    await createButton.click();

    // Should show editor/form
    await expect(page.locator('input, textarea').first()).toBeVisible();
  });
});

test.describe('Template Editor', () => {
  test('should validate required fields', async ({ page }) => {
    await page.goto('/template');

    // Open create modal
    const createButton = page.locator('button').filter({ hasText: /create|new|add/i }).first();
    await createButton.click();

    // Try to submit without filling required fields
    const saveButton = page.locator('button').filter({ hasText: /save|create|submit/i }).first();

    if (await saveButton.isVisible()) {
      await saveButton.click();

      // Should show validation error or stay on form
      const form = page.locator('form, [role="dialog"]');
      await expect(form.first()).toBeVisible();
    }
  });

  test('should fill template name', async ({ page }) => {
    await page.goto('/template');

    // Open create modal
    const createButton = page.locator('button').filter({ hasText: /create|new|add/i }).first();
    await createButton.click();

    // Fill name field
    const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();

    if (await nameInput.isVisible()) {
      await nameInput.fill('Test Template');
      await expect(nameInput).toHaveValue('Test Template');
    }
  });
});
