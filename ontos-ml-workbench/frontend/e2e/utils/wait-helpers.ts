/**
 * Wait helpers for E2E tests
 * Provides reliable waiting utilities without hard-coded delays
 */

import { Page, Locator } from '@playwright/test';

/**
 * Wait for element to be visible and stable
 */
export async function waitForElement(
  page: Page,
  selector: string,
  timeout = 10000
): Promise<Locator> {
  const element = page.locator(selector);
  await element.waitFor({ state: 'visible', timeout });
  return element;
}

/**
 * Wait for API response
 */
export async function waitForApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  action: () => Promise<void>
) {
  const responsePromise = page.waitForResponse(
    response => {
      const url = response.url();
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern);
      }
      return urlPattern.test(url);
    },
    { timeout: 30000 }
  );

  await action();
  return responsePromise;
}

/**
 * Wait for multiple API responses
 */
export async function waitForApiResponses(
  page: Page,
  urlPatterns: Array<string | RegExp>,
  action: () => Promise<void>
) {
  const promises = urlPatterns.map(pattern =>
    page.waitForResponse(
      response => {
        const url = response.url();
        if (typeof pattern === 'string') {
          return url.includes(pattern);
        }
        return pattern.test(url);
      },
      { timeout: 30000 }
    )
  );

  await action();
  return Promise.all(promises);
}

/**
 * Wait for network idle
 */
export async function waitForNetworkIdle(page: Page, timeout = 5000) {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Wait for element to disappear
 */
export async function waitForElementToDisappear(
  page: Page,
  selector: string,
  timeout = 10000
) {
  await page.locator(selector).waitFor({ state: 'hidden', timeout });
}

/**
 * Wait for text content
 */
export async function waitForText(
  page: Page,
  selector: string,
  text: string,
  timeout = 10000
) {
  await page.waitForSelector(selector, { timeout });
  await page.locator(selector).filter({ hasText: text }).waitFor({ timeout });
}

/**
 * Wait for loading spinner to disappear
 */
export async function waitForLoadingComplete(page: Page, timeout = 30000) {
  const spinnerSelectors = [
    '[data-testid="loading-spinner"]',
    '.animate-spin',
    '[role="progressbar"]',
  ];

  for (const selector of spinnerSelectors) {
    const spinner = page.locator(selector);
    const count = await spinner.count();
    if (count > 0) {
      await spinner.waitFor({ state: 'hidden', timeout });
    }
  }
}

/**
 * Wait for condition with polling
 */
export async function waitForCondition(
  condition: () => Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 10000, interval = 100 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Wait for count to match
 */
export async function waitForCount(
  locator: Locator,
  expectedCount: number,
  timeout = 10000
) {
  await waitForCondition(
    async () => {
      const count = await locator.count();
      return count === expectedCount;
    },
    { timeout }
  );
}

/**
 * Retry action until success
 */
export async function retryUntilSuccess<T>(
  action: () => Promise<T>,
  options: { maxAttempts?: number; delayMs?: number } = {}
): Promise<T> {
  const { maxAttempts = 3, delayMs = 1000 } = options;
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await action();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError!;
}
