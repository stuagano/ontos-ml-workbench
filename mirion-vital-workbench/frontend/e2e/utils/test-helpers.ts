/**
 * General test helpers and utilities
 */

import { Page } from '@playwright/test';

/**
 * Clear all browser storage
 */
export async function clearStorage(page: Page) {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * Set local storage item
 */
export async function setLocalStorage(page: Page, key: string, value: string) {
  await page.evaluate(
    ([k, v]) => localStorage.setItem(k, v),
    [key, value]
  );
}

/**
 * Get local storage item
 */
export async function getLocalStorage(page: Page, key: string): Promise<string | null> {
  return page.evaluate(k => localStorage.getItem(k), key);
}

/**
 * Mock authentication (if needed)
 */
export async function mockAuth(page: Page) {
  await setLocalStorage(page, 'auth_token', 'mock-token');
  await setLocalStorage(page, 'user', JSON.stringify({ name: 'Test User' }));
}

/**
 * Get console logs
 */
export async function getConsoleLogs(page: Page): Promise<string[]> {
  const logs: string[] = [];

  page.on('console', msg => {
    logs.push(`${msg.type()}: ${msg.text()}`);
  });

  return logs;
}

/**
 * Get network requests
 */
export async function getNetworkRequests(page: Page, filter?: string): Promise<string[]> {
  const requests: string[] = [];

  page.on('request', request => {
    const url = request.url();
    if (!filter || url.includes(filter)) {
      requests.push(url);
    }
  });

  return requests;
}

/**
 * Mock API endpoint
 */
export async function mockApiEndpoint(
  page: Page,
  urlPattern: string | RegExp,
  response: any,
  status = 200
) {
  await page.route(urlPattern, route => {
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

/**
 * Generate random email
 */
export function generateRandomEmail(): string {
  const random = Math.random().toString(36).substring(7);
  return `test-${random}@example.com`;
}

/**
 * Generate random string
 */
export function generateRandomString(length = 10): string {
  return Math.random().toString(36).substring(2, 2 + length);
}

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Sleep for specified milliseconds
 * Note: Prefer wait helpers over this
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get element text content safely
 */
export async function getTextContent(page: Page, selector: string): Promise<string> {
  const element = page.locator(selector);
  return (await element.textContent()) || '';
}

/**
 * Check if element is visible
 */
export async function isVisible(page: Page, selector: string): Promise<boolean> {
  const element = page.locator(selector);
  return element.isVisible();
}

/**
 * Get all text contents of multiple elements
 */
export async function getAllTextContents(page: Page, selector: string): Promise<string[]> {
  const elements = page.locator(selector);
  return elements.allTextContents();
}

/**
 * Fill form with data
 */
export async function fillForm(
  page: Page,
  formData: Record<string, string>
) {
  for (const [selector, value] of Object.entries(formData)) {
    await page.fill(selector, value);
  }
}

/**
 * Get form values
 */
export async function getFormValues(
  page: Page,
  selectors: string[]
): Promise<Record<string, string>> {
  const values: Record<string, string> = {};

  for (const selector of selectors) {
    const element = page.locator(selector);
    values[selector] = await element.inputValue();
  }

  return values;
}

/**
 * Wait for URL to match pattern
 */
export async function waitForUrl(
  page: Page,
  urlPattern: string | RegExp,
  timeout = 10000
) {
  await page.waitForURL(urlPattern, { timeout });
}

/**
 * Navigate with wait for network idle
 */
export async function navigateAndWait(page: Page, url: string) {
  await page.goto(url);
  await page.waitForLoadState('networkidle');
}

/**
 * Hover over element
 */
export async function hoverElement(page: Page, selector: string) {
  await page.hover(selector);
}

/**
 * Double click element
 */
export async function doubleClickElement(page: Page, selector: string) {
  await page.dblclick(selector);
}

/**
 * Right click element
 */
export async function rightClickElement(page: Page, selector: string) {
  await page.click(selector, { button: 'right' });
}

/**
 * Press keyboard key
 */
export async function pressKey(page: Page, key: string) {
  await page.keyboard.press(key);
}

/**
 * Type text with delay
 */
export async function typeSlowly(page: Page, selector: string, text: string, delay = 100) {
  await page.type(selector, text, { delay });
}

/**
 * Scroll to element
 */
export async function scrollToElement(page: Page, selector: string) {
  await page.locator(selector).scrollIntoViewIfNeeded();
}

/**
 * Get element attribute
 */
export async function getAttribute(
  page: Page,
  selector: string,
  attribute: string
): Promise<string | null> {
  const element = page.locator(selector);
  return element.getAttribute(attribute);
}

/**
 * Check if element has class
 */
export async function hasClass(page: Page, selector: string, className: string): Promise<boolean> {
  const classAttr = await getAttribute(page, selector, 'class');
  return classAttr?.includes(className) || false;
}

/**
 * Get element count
 */
export async function getElementCount(page: Page, selector: string): Promise<number> {
  return page.locator(selector).count();
}

/**
 * Wait for element count
 */
export async function waitForElementCount(
  page: Page,
  selector: string,
  expectedCount: number,
  timeout = 10000
) {
  await page.waitForFunction(
    ({ sel, count }) => document.querySelectorAll(sel).length === count,
    { selector, count: expectedCount },
    { timeout }
  );
}
