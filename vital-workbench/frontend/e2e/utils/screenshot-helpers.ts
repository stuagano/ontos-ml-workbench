/**
 * Screenshot helpers for E2E tests
 * Provides utilities for capturing screenshots with proper naming and organization
 */

import { Page } from '@playwright/test';
import { test } from '@playwright/test';

/**
 * Take a screenshot with context-aware naming
 */
export async function takeScreenshot(
  page: Page,
  name: string,
  options: { fullPage?: boolean } = {}
) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${name}-${timestamp}.png`;

  await page.screenshot({
    path: `e2e/screenshots/${filename}`,
    fullPage: options.fullPage ?? false,
  });

  return filename;
}

/**
 * Take screenshot on failure
 */
export async function screenshotOnFailure(page: Page, testInfo: any) {
  if (testInfo.status !== testInfo.expectedStatus) {
    const filename = `failure-${testInfo.title.replace(/\s+/g, '-')}.png`;
    await page.screenshot({
      path: `e2e/screenshots/failures/${filename}`,
      fullPage: true,
    });
  }
}

/**
 * Compare screenshot with baseline
 */
export async function compareScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `e2e/screenshots/baseline/${name}.png`,
  });
}

/**
 * Take screenshots of specific element
 */
export async function screenshotElement(
  page: Page,
  selector: string,
  name: string
) {
  const element = page.locator(selector);
  await element.screenshot({
    path: `e2e/screenshots/${name}.png`,
  });
}

/**
 * Auto-screenshot helper for test steps
 */
export async function withScreenshot<T>(
  page: Page,
  stepName: string,
  action: () => Promise<T>
): Promise<T> {
  try {
    const result = await action();
    await takeScreenshot(page, `success-${stepName}`);
    return result;
  } catch (error) {
    await takeScreenshot(page, `error-${stepName}`, { fullPage: true });
    throw error;
  }
}
