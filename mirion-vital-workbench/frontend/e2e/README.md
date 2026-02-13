# E2E Test Suite for VITAL Platform Workbench

Comprehensive end-to-end tests for the Deploy → Monitor → Improve workflow using Playwright.

## Overview

This test suite covers:

- **DATA Stage**: Sheet browsing, creation, filtering, and management
- **DEPLOY Stage**: Model deployment wizard, endpoint management, validation
- **MONITOR Stage**: Performance metrics, alerts, drift detection, health checks
- **IMPROVE Stage**: Feedback collection, analysis, conversion to training data
- **Full Workflow**: Complete Deploy → Monitor → Improve flow
- **Error Handling**: API errors, validation, network failures, recovery

## Setup

### Prerequisites

- Node.js 18+
- Backend API running at `http://localhost:8000` (or set `API_BASE_URL` env var)
- Databricks workspace with test data (optional, tests can run with empty state)

### Installation

```bash
# Install dependencies (from frontend directory)
npm install

# Install Playwright browsers
npx playwright install
```

## Running Tests

### All Tests

```bash
npm run e2e
```

### Interactive UI Mode (Recommended for Development)

```bash
npm run e2e:ui
```

This opens the Playwright Test Runner UI where you can:
- See all tests organized by file
- Run individual tests or groups
- Watch tests run in real-time
- Time travel through test execution
- Inspect selectors and page state

### Headed Mode (See Browser)

```bash
npm run e2e:headed
```

### Debug Mode

```bash
npm run e2e:debug
```

### Specific Test File

```bash
npx playwright test e2e/tests/02-deploy-stage.spec.ts
```

### Specific Test

```bash
npx playwright test -g "should deploy a new model"
```

## Test Organization

```
e2e/
├── fixtures/             # Test data
│   ├── sheets.json      # Sample sheet configurations
│   ├── templates.json   # Sample template configurations
│   ├── endpoints.json   # Sample endpoint configurations
│   └── mock-responses.json  # Mock API responses for error testing
├── pages/               # Page Object Models
│   ├── DataPage.ts      # DATA stage interactions
│   ├── DeployPage.ts    # DEPLOY stage interactions
│   ├── MonitorPage.ts   # MONITOR stage interactions
│   └── ImprovePage.ts   # IMPROVE stage interactions
├── tests/               # Test specifications
│   ├── 01-data-stage.spec.ts      # DATA stage tests
│   ├── 02-deploy-stage.spec.ts    # DEPLOY stage tests
│   ├── 03-monitor-stage.spec.ts   # MONITOR stage tests
│   ├── 04-improve-stage.spec.ts   # IMPROVE stage tests
│   ├── 05-full-workflow.spec.ts   # End-to-end workflow tests
│   └── 06-error-handling.spec.ts  # Error scenarios
└── utils/               # Test utilities
    ├── api-helpers.ts       # API interaction helpers
    ├── wait-helpers.ts      # Wait and synchronization utilities
    ├── screenshot-helpers.ts # Screenshot capture utilities
    └── data-generators.ts   # Test data generation
```

## Writing Tests

### Page Object Model Pattern

All page interactions should go through Page Object Models:

```typescript
import { DataPage } from '../pages/DataPage';

test('should create a sheet', async ({ page }) => {
  const dataPage = new DataPage(page);
  await dataPage.navigate();

  await dataPage.clickCreateSheet();
  await dataPage.fillSheetForm({
    name: 'Test Sheet',
    description: 'Test description',
    sourceType: 'unity_catalog_table',
    sourcePath: 'catalog.schema.table',
    dataType: 'tabular',
  });
  await dataPage.submitSheetForm();

  expect(await dataPage.isSheetPresent('Test Sheet')).toBe(true);
});
```

### Wait Helpers

Use wait helpers instead of hard-coded delays:

```typescript
import { waitForElement, waitForApiResponse, waitForLoadingComplete } from '../utils/wait-helpers';

// Wait for element
const element = await waitForElement(page, '[data-testid="my-element"]');

// Wait for API response
await waitForApiResponse(page, '/api/v1/sheets', async () => {
  await page.click('[data-testid="create-button"]');
});

// Wait for loading to complete
await waitForLoadingComplete(page);
```

### Data Generators

Use data generators for test data:

```typescript
import { generateSheet, generateEndpoint, generateFeedback } from '../utils/data-generators';

const sheetData = generateSheet({
  name: 'Custom Name',
  dataType: 'image',
});

const endpointData = generateEndpoint();
```

### API Helpers

Use API helpers for setup/teardown:

```typescript
import { seedSheets, seedEndpoint, cleanupTestData } from '../utils/api-helpers';

test.beforeAll(async () => {
  await seedSheets();
  await seedEndpoint();
});

test.afterAll(async () => {
  await cleanupTestData();
});
```

## Test Data

### Using Fixtures

```typescript
import sheetsData from '../fixtures/sheets.json';

const defectSheet = sheetsData.defectDetection;
```

### Using Mock Responses

```typescript
import mockResponses from '../fixtures/mock-responses.json';

await page.route('**/api/v1/sheets/*', route => {
  route.fulfill({
    status: 404,
    body: JSON.stringify(mockResponses.errorResponses.sheetNotFound.body),
  });
});
```

## Best Practices

### 1. Use Data Test IDs

Always prefer `data-testid` selectors over CSS classes or text content:

```typescript
// Good
await page.click('[data-testid="create-button"]');

// Avoid
await page.click('.btn-primary');
await page.click('text=Create');
```

### 2. Wait for Network

Wait for API responses when performing actions:

```typescript
await waitForApiResponse(page, '/api/v1/sheets', async () => {
  await page.click('[data-testid="submit-button"]');
});
```

### 3. Handle Empty States

Tests should handle cases where data doesn't exist:

```typescript
const count = await dataPage.getSheetCount();
if (count > 0) {
  // Test with existing data
} else {
  // Test empty state
}
```

### 4. Clean Assertions

Use expect with clear messages:

```typescript
expect(await dataPage.isSheetPresent('Test Sheet')).toBe(true);
```

### 5. Screenshot on Failure

Screenshots are automatically captured on failure (configured in playwright.config.ts).

## Environment Variables

```bash
# API base URL (default: http://localhost:8000)
export API_BASE_URL=http://localhost:8000

# Run in read-only mode (skip write operations)
export E2E_READ_ONLY=true

# Enable video recording
export PLAYWRIGHT_VIDEO=on
```

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run E2E tests
  run: |
    npm run e2e
  env:
    API_BASE_URL: ${{ secrets.API_BASE_URL }}
```

### Retries in CI

Tests automatically retry 2 times in CI (configured in playwright.config.ts).

## Debugging

### 1. Use Playwright Inspector

```bash
npm run e2e:debug
```

### 2. View Test Results

```bash
npx playwright show-report
```

### 3. Enable Trace

Traces are captured on first retry (configured in playwright.config.ts).

View trace:

```bash
npx playwright show-trace trace.zip
```

### 4. Check Screenshots

Failed test screenshots are saved to `e2e/screenshots/failures/`.

## Troubleshooting

### Tests Timing Out

- Increase timeout in `playwright.config.ts`
- Check if backend is running
- Verify network connectivity

### Flaky Tests

- Use proper wait helpers instead of fixed delays
- Check for race conditions
- Ensure proper cleanup between tests

### Element Not Found

- Verify `data-testid` exists in component
- Check if element is in viewport
- Wait for loading to complete

## Adding New Tests

1. Create test file in `e2e/tests/`
2. Import necessary page objects
3. Use `test.describe()` for grouping
4. Use `test.beforeEach()` for setup
5. Write clear test descriptions
6. Use proper wait helpers
7. Add assertions with clear expectations

Example:

```typescript
import { test, expect } from '@playwright/test';
import { DataPage } from '../pages/DataPage';

test.describe('My New Feature', () => {
  let dataPage: DataPage;

  test.beforeEach(async ({ page }) => {
    dataPage = new DataPage(page);
    await dataPage.navigate();
  });

  test('should do something', async ({ page }) => {
    // Your test here
  });
});
```

## Maintenance

### Updating Page Objects

When UI changes, update the corresponding page object model, not individual tests.

### Updating Fixtures

Keep fixtures in sync with backend schemas.

### Reviewing Flaky Tests

Regularly review and fix flaky tests to maintain reliability.

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [API Testing](https://playwright.dev/docs/api-testing)
- [Debugging Guide](https://playwright.dev/docs/debug)
