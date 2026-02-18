# E2E Tests Quick Start

Get your E2E tests running in 5 minutes.

## Prerequisites

```bash
# 1. Backend must be running
cd backend
uvicorn app.main:app --reload

# 2. Install Playwright browsers (one-time)
cd ../frontend
npx playwright install
```

## Run Tests

### Option 1: Interactive UI (Recommended)

```bash
npm run e2e:ui
```

**What you'll see:**
- Visual test runner with all tests listed
- Click any test to run it
- Watch browser execute tests in real-time
- See results instantly
- Debug failures with time-travel

### Option 2: Headless (CI/CD)

```bash
npm run e2e
```

**What happens:**
- All tests run in background
- Results in terminal
- HTML report generated
- Screenshots saved on failure

### Option 3: Debug Mode

```bash
npm run e2e:debug
```

**Features:**
- Step through tests line by line
- Pause and inspect page state
- Perfect for troubleshooting

## What Gets Tested

### ✅ Deploy Stage
- Deploy models to endpoints
- Configure workload sizes
- Validate deployments
- Query endpoints
- Update and rollback

### ✅ Monitor Stage
- View performance metrics
- Create alerts
- Detect drift
- Check health
- Export data

### ✅ Improve Stage
- Submit feedback
- View statistics
- Flag issues
- Convert to training data

### ✅ Full Workflow
- End-to-end: Deploy → Monitor → Improve
- Error handling
- State persistence

## Common Commands

```bash
# Run all tests
npm run e2e

# Run with UI
npm run e2e:ui

# Run specific file
npx playwright test e2e/tests/02-deploy-stage.spec.ts

# Run tests matching pattern
npx playwright test -g "deploy"

# View test report
npm run e2e:report

# Debug tests
npm run e2e:debug
```

## Test Results

After running tests:

```bash
# View HTML report
npm run e2e:report

# Check screenshots (failures only)
ls e2e/screenshots/failures/

# View video recordings
ls test-results/
```

## Troubleshooting

### Backend Not Running

```
Error: API not ready
```

**Fix:**
```bash
cd backend
uvicorn app.main:app --reload
```

### Port Conflict

```
Error: Port 5173 in use
```

**Fix:**
```bash
# Kill process
lsof -ti:5173 | xargs kill -9

# Or change port
BASE_URL=http://localhost:5174 npm run e2e
```

### Tests Fail

1. Check backend is running
2. Check frontend dev server started
3. Review error message
4. Check screenshot in `e2e/screenshots/failures/`

## Environment Variables

```bash
# Use different backend
export API_BASE_URL=http://localhost:8000

# Use different frontend
export BASE_URL=http://localhost:5173

# Skip write operations
export E2E_READ_ONLY=true

# Enable video recording
export PLAYWRIGHT_VIDEO=on
```

## Test Structure

```
e2e/
├── tests/                  # Your test files
│   ├── 01-data-stage.spec.ts
│   ├── 02-deploy-stage.spec.ts
│   ├── 03-monitor-stage.spec.ts
│   ├── 04-improve-stage.spec.ts
│   ├── 05-full-workflow.spec.ts
│   └── 06-error-handling.spec.ts
│
├── pages/                  # Page interactions
│   ├── DataPage.ts
│   ├── DeployPage.ts
│   ├── MonitorPage.ts
│   └── ImprovePage.ts
│
└── utils/                  # Helpers
    ├── api-helpers.ts
    ├── wait-helpers.ts
    └── data-generators.ts
```

## Writing Your First Test

```typescript
import { test, expect } from '@playwright/test';
import { DataPage } from '../pages/DataPage';

test('should create a sheet', async ({ page }) => {
  const dataPage = new DataPage(page);
  await dataPage.navigate();

  await dataPage.clickCreateSheet();
  await dataPage.fillSheetForm({
    name: 'My Test Sheet',
    description: 'Testing',
    sourceType: 'unity_catalog_table',
    sourcePath: 'catalog.schema.table',
    dataType: 'tabular',
  });
  await dataPage.submitSheetForm();

  expect(await dataPage.isSheetPresent('My Test Sheet')).toBe(true);
});
```

## Next Steps

1. **Run tests** with `npm run e2e:ui`
2. **Explore tests** in the UI runner
3. **Check docs** in [E2E_TESTING.md](./E2E_TESTING.md)
4. **Read patterns** in [e2e/README.md](./e2e/README.md)

## Need Help?

1. Check [E2E_TESTING.md](./E2E_TESTING.md) - Complete guide
2. Check [e2e/README.md](./e2e/README.md) - Detailed patterns
3. Check [Playwright docs](https://playwright.dev) - Framework docs
4. Create an issue with failure details

## Success! 🎉

You now have:
- ✅ 84 comprehensive E2E tests
- ✅ Deploy → Monitor → Improve workflow coverage
- ✅ Error handling and edge cases
- ✅ CI/CD ready test suite
- ✅ Interactive debugging tools

Happy testing! 🚀
