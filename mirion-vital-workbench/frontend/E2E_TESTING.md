# E2E Testing Guide for Ontos ML Workbench

Complete guide for running and maintaining the E2E test suite.

## Quick Start

```bash
# From frontend directory

# 1. Ensure backend is running
cd ../backend
uvicorn app.main:app --reload

# 2. In another terminal, run E2E tests
cd ../frontend
npm run e2e:ui
```

## Test Coverage

### Deploy → Monitor → Improve Workflow

✅ **DATA Stage** (01-data-stage.spec.ts)
- Sheet listing and browsing
- Sheet creation with validation
- Filtering by data type and status
- Search functionality
- Sheet details view

✅ **DEPLOY Stage** (02-deploy-stage.spec.ts)
- Deployment wizard flow
- Model and version selection
- Endpoint configuration (workload size, scale to zero)
- Deployment validation
- Endpoint status monitoring
- Update and rollback operations
- Query endpoint (playground)

✅ **MONITOR Stage** (03-monitor-stage.spec.ts)
- Performance metrics (requests, latency, error rate)
- Real-time metrics
- Time range filtering
- Alert creation and management
- Alert acknowledgment and resolution
- Drift detection
- Health checks

✅ **IMPROVE Stage** (04-improve-stage.spec.ts)
- Feedback submission
- Feedback statistics
- Filtering by rating and flagged status
- Flag/unflag feedback items
- Feedback details view
- Convert feedback to training data
- Export feedback data

✅ **Full Workflow** (05-full-workflow.spec.ts)
- End-to-end: Data → Deploy → Monitor → Improve
- Workflow interruption handling
- State persistence across navigation
- Loading states
- Concurrent operations
- Empty states

✅ **Error Handling** (06-error-handling.spec.ts)
- API errors (404, 500, 503, 422)
- Network timeout and offline
- Validation errors
- Error recovery and retry
- Stale data handling
- Edge cases (empty responses, malformed JSON)

## Test Execution

### Development

```bash
# Interactive mode (recommended)
npm run e2e:ui

# Watch mode with browser visible
npm run e2e:headed

# Debug single test
npm run e2e:debug
```

### CI/CD

```bash
# Run all tests (headless)
npm run e2e

# Generate report
npm run e2e:report
```

### Specific Tests

```bash
# Single file
npx playwright test e2e/tests/02-deploy-stage.spec.ts

# Single test
npx playwright test -g "should deploy a new model"

# Tests matching pattern
npx playwright test -g "deploy"
```

## Configuration

### Environment Variables

```bash
# API base URL (default: http://localhost:8000)
export API_BASE_URL=http://localhost:8000

# Frontend base URL (default: http://localhost:5173)
export BASE_URL=http://localhost:5173

# Read-only mode (skip write operations)
export E2E_READ_ONLY=true

# Enable video recording
export PLAYWRIGHT_VIDEO=on

# Skip global setup/teardown
export SKIP_SETUP=true
export SKIP_TEARDOWN=true

# CI mode
export CI=true
```

### Backend Setup

Ensure backend is running with test database:

```bash
cd backend

# Start backend
uvicorn app.main:app --reload

# Or with test database
DATABASE_URL=sqlite:///test.db uvicorn app.main:app --reload
```

## Test Data

### Using Real Backend

Tests work with any existing data in your backend. They:
- Check if data exists before testing operations on it
- Handle empty states gracefully
- Create temporary test data that doesn't interfere with existing data

### Using Mock Data

For testing error scenarios, tests mock API responses:

```typescript
await page.route('**/api/v1/sheets/*', route => {
  route.fulfill({
    status: 404,
    body: JSON.stringify({ detail: 'Sheet not found' }),
  });
});
```

### Test Fixtures

Pre-defined test data in `e2e/fixtures/`:

```typescript
import sheetsData from '../fixtures/sheets.json';
import endpointsData from '../fixtures/endpoints.json';
```

## Debugging

### Playwright Inspector

```bash
npm run e2e:debug
```

Features:
- Step through tests
- Pause and resume
- Inspect locators
- Time travel through test execution

### View Test Report

```bash
npm run e2e:report
```

Shows:
- Test results
- Screenshots on failure
- Video recordings (if enabled)
- Error traces

### Check Screenshots

Failed test screenshots: `e2e/screenshots/failures/`

```bash
ls e2e/screenshots/failures/
```

### View Traces

```bash
npx playwright show-trace trace.zip
```

Traces include:
- DOM snapshots
- Network activity
- Console logs
- Screenshots at each action

## Common Issues

### Backend Not Running

```
Error: API not ready after 30 attempts
```

**Solution**: Start backend first

```bash
cd backend
uvicorn app.main:app --reload
```

### Port Already in Use

```
Error: Port 5173 is already in use
```

**Solution**: Kill process or use different port

```bash
# Kill process on port 5173
lsof -ti:5173 | xargs kill -9

# Or use different port
BASE_URL=http://localhost:5174 npm run e2e
```

### Tests Timing Out

```
Error: Test timeout of 60000ms exceeded
```

**Solution**: Increase timeout in `playwright.config.ts`

```typescript
timeout: 120 * 1000, // 120 seconds
```

### Flaky Tests

Tests occasionally fail due to timing issues.

**Solution**:
1. Use proper wait helpers (`waitForLoadingComplete`, `waitForApiResponse`)
2. Avoid hard-coded delays (`page.waitForTimeout(5000)`)
3. Increase specific timeouts if needed

### Element Not Found

```
Error: locator.click: Target closed
```

**Solution**:
1. Verify `data-testid` exists in component
2. Wait for element to be visible
3. Check if element is in viewport

```typescript
await waitForElement(page, '[data-testid="my-element"]');
```

## CI/CD Integration

### GitHub Actions

```yaml
name: E2E Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: |
          cd frontend
          npm ci

      - name: Install Playwright
        run: |
          cd frontend
          npx playwright install --with-deps

      - name: Start backend
        run: |
          cd backend
          pip install -r requirements.txt
          uvicorn app.main:app &
        env:
          DATABASE_URL: sqlite:///test.db

      - name: Run E2E tests
        run: |
          cd frontend
          npm run e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: frontend/playwright-report
          retention-days: 30
```

### Databricks Workflow

```yaml
name: E2E Tests
tasks:
  - task_key: run_e2e_tests
    notebook_task:
      notebook_path: /notebooks/e2e_tests
    cluster_config:
      node_type_id: Standard_DS3_v2
      num_workers: 1
```

## Maintenance

### Updating Tests

1. **UI Changes**: Update page object models
2. **API Changes**: Update fixtures and mocks
3. **New Features**: Add new tests following existing patterns

### Adding New Tests

```bash
# Create new test file
touch e2e/tests/07-my-feature.spec.ts
```

Follow the pattern:

```typescript
import { test, expect } from '@playwright/test';
import { MyFeaturePage } from '../pages/MyFeaturePage';

test.describe('My Feature', () => {
  let myFeaturePage: MyFeaturePage;

  test.beforeEach(async ({ page }) => {
    myFeaturePage = new MyFeaturePage(page);
    await myFeaturePage.navigate();
  });

  test('should do something', async () => {
    // Test implementation
  });
});
```

### Updating Page Objects

When component structure changes:

```typescript
// e2e/pages/MyPage.ts

async clickButton() {
  // Old selector
  // await this.page.click('.btn-primary');

  // New selector
  await this.page.click('[data-testid="my-button"]');
}
```

### Reviewing Flaky Tests

```bash
# Run test multiple times to identify flakiness
npx playwright test --repeat-each=10 e2e/tests/02-deploy-stage.spec.ts
```

## Best Practices

1. ✅ Use `data-testid` for selectors
2. ✅ Use page object models
3. ✅ Use wait helpers (no hard delays)
4. ✅ Handle empty states
5. ✅ Test error scenarios
6. ✅ Clean, descriptive test names
7. ✅ Group related tests with `describe`
8. ✅ Use fixtures for test data
9. ✅ Mock API for error testing
10. ✅ Screenshot on failure (auto)

## Performance

### Parallel Execution

Tests run in parallel by default:

```typescript
// playwright.config.ts
fullyParallel: true,
workers: process.env.CI ? 1 : undefined,
```

### Test Isolation

Each test runs in isolated browser context:
- No shared state between tests
- Clean cookies/localStorage
- Independent network mocking

### Optimization Tips

1. Run critical path tests first
2. Use API helpers for setup instead of UI
3. Mock slow external services
4. Use fast assertions

## Resources

- [E2E README](./e2e/README.md) - Detailed documentation
- [Playwright Docs](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)

## Support

For questions or issues:
1. Check this guide
2. Review [e2e/README.md](./e2e/README.md)
3. Check Playwright documentation
4. Create an issue with test failure details
