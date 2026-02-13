# Testing Guide - VITAL Workbench

Comprehensive testing strategy for the VITAL Platform Workbench, covering backend API tests, frontend unit tests, and end-to-end workflow tests.

## Table of Contents

- [Quick Start](#quick-start)
- [Test Structure](#test-structure)
- [Backend Testing](#backend-testing)
- [Frontend Testing](#frontend-testing)
- [End-to-End Testing](#end-to-end-testing)
- [Test Coverage](#test-coverage)
- [CI/CD Integration](#cicd-integration)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Quick Start

### Run All Tests

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test

# E2E tests
cd backend
python scripts/e2e_test.py --url http://localhost:8000
```

### Run with Coverage

```bash
# Backend coverage
cd backend
pytest --cov=app --cov-report=html

# Frontend coverage
cd frontend
npm run test:coverage
```

## Test Structure

```
mirion-vital-workbench/
├── backend/
│   ├── tests/
│   │   ├── conftest.py              # Pytest fixtures
│   │   ├── test_api_integration.py  # API integration tests
│   │   ├── test_curation.py         # Curation workflow tests
│   │   └── test_templates.py        # Template tests
│   └── scripts/
│       └── e2e_test.py              # End-to-end workflow test
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Pagination.test.tsx
│   │   │   ├── ConfirmDialog.test.tsx
│   │   │   ├── LabelsetForm.test.tsx
│   │   │   └── TemplateEditor.test.tsx
│   │   ├── services/
│   │   │   └── api.test.ts          # API client tests
│   │   └── test/
│   │       └── setup.ts             # Test environment setup
│   └── e2e/
│       ├── navigation.spec.ts       # Navigation tests
│       ├── curation.spec.ts         # Curation UI tests
│       ├── templates.spec.ts        # Template management tests
│       └── jobs.spec.ts             # Job workflow tests
└── TESTING.md                       # This file
```

## Backend Testing

### Technology Stack

- **pytest** - Test framework
- **pytest-asyncio** - Async test support
- **pytest-mock** - Mocking utilities
- **FastAPI TestClient** - API endpoint testing

### Running Backend Tests

```bash
cd backend

# Run all tests
pytest

# Run specific test file
pytest tests/test_api_integration.py

# Run specific test class
pytest tests/test_api_integration.py::TestSheetsAPI

# Run specific test
pytest tests/test_api_integration.py::TestSheetsAPI::test_create_sheet

# Run with verbose output
pytest -v

# Run with print statements visible
pytest -s

# Run with coverage report
pytest --cov=app --cov-report=html
open htmlcov/index.html  # View coverage report
```

### Test Categories

#### 1. API Integration Tests (`test_api_integration.py`)

Tests all API endpoints including:
- **Sheets API** - Dataset definitions (CREATE, READ, UPDATE, DELETE)
- **Templates API** - Prompt template management
- **Training Sheets API** - Q&A dataset generation
- **Canonical Labels API** - Ground truth labeling
- **Labeling Workflow API** - Expert review workflow
- **Deployment API** - Model deployment
- **Monitoring API** - Performance metrics
- **Feedback API** - Expert feedback loop

#### 2. Curation Tests (`test_curation.py`)

Tests the curation workflow:
- Listing curation items with filters
- Status transitions (pending → approved/rejected)
- Bulk operations
- Stats aggregation
- Human label overrides

#### 3. Template Tests (`test_templates.py`)

Tests template management:
- Template CRUD operations
- Version management
- Schema validation
- Prompt variable substitution

### Mock Infrastructure

The test suite uses `MockSQLService` (defined in `conftest.py`) to simulate Databricks Unity Catalog operations without requiring actual Databricks connectivity.

```python
# Example test using mock service
def test_create_sheet(client, mock_sql_service):
    payload = {
        "name": "Test Sheet",
        "source_catalog": "main",
        "source_schema": "test"
    }

    response = client.post("/api/v1/sheets", json=payload)
    assert response.status_code == 201
```

### Writing New Backend Tests

1. **Use fixtures from conftest.py**

```python
def test_my_feature(client, mock_sql_service, sample_template):
    # client: FastAPI TestClient
    # mock_sql_service: MockSQLService instance
    # sample_template: Sample template data
    pass
```

2. **Follow AAA pattern** (Arrange, Act, Assert)

```python
def test_update_sheet(client, mock_sql_service):
    # Arrange
    sheet_id = "sheet-001"
    payload = {"description": "Updated"}

    # Act
    response = client.put(f"/api/v1/sheets/{sheet_id}", json=payload)

    # Assert
    assert response.status_code == 200
    assert response.json()["description"] == "Updated"
```

3. **Test error cases**

```python
def test_get_nonexistent_sheet(client, mock_sql_service):
    response = client.get("/api/v1/sheets/nonexistent-id")
    assert response.status_code == 404
```

## Frontend Testing

### Technology Stack

- **Vitest** - Fast unit test framework (Vite-native)
- **React Testing Library** - Component testing utilities
- **@testing-library/jest-dom** - DOM matchers
- **jsdom** - DOM environment for Node.js

### Running Frontend Tests

```bash
cd frontend

# Run all tests
npm test

# Run in watch mode (auto-rerun on changes)
npm test -- --watch

# Run specific test file
npm test -- Pagination.test.tsx

# Run with coverage
npm run test:coverage

# Run E2E tests (Playwright)
npm run test:e2e

# Run E2E with UI
npm run test:e2e:ui

# Run E2E in headed mode (see browser)
npm run test:e2e:headed
```

### Test Categories

#### 1. Component Tests

- **Pagination.test.tsx** - Pagination controls
- **ConfirmDialog.test.tsx** - Confirmation dialogs
- **LabelsetForm.test.tsx** - Labelset creation/editing
- **TemplateEditor.test.tsx** - Template editing interface

#### 2. Service Layer Tests

- **api.test.ts** - API client functions
- Error handling
- Request/response validation

#### 3. E2E Tests (Playwright)

- **navigation.spec.ts** - Page navigation and routing
- **curation.spec.ts** - Curation workflow UI
- **templates.spec.ts** - Template management UI
- **jobs.spec.ts** - Job execution UI

### Writing New Frontend Tests

1. **Component testing pattern**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('handles user interaction', () => {
    const onClickMock = vi.fn();
    render(<MyComponent onClick={onClickMock} />);

    fireEvent.click(screen.getByRole('button'));
    expect(onClickMock).toHaveBeenCalledOnce();
  });
});
```

2. **API testing pattern**

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('API Service', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('fetches data correctly', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [] }),
    });

    const result = await api.getData();
    expect(result).toEqual({ items: [] });
  });
});
```

3. **E2E testing pattern (Playwright)**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature', () => {
  test('completes workflow', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Start');
    await expect(page.locator('text=Success')).toBeVisible();
  });
});
```

## End-to-End Testing

### E2E Test Script

The E2E test script (`backend/scripts/e2e_test.py`) tests the complete VITAL workflow:

**Workflow Stages Tested:**
1. **DATA** - Create Sheet (dataset definition)
2. **GENERATE** - Create Template + Training Sheet
3. **LABEL** - Create Canonical Labels
4. **TRAIN** - Trigger training job
5. **VERIFY** - Validate all resources created
6. **CLEANUP** - Delete test resources

### Running E2E Tests

```bash
# Start the backend server first
cd backend
uvicorn app.main:app --reload

# In another terminal, run E2E tests
cd backend
python scripts/e2e_test.py

# With custom URL
python scripts/e2e_test.py --url http://localhost:8000

# Verbose output
python scripts/e2e_test.py -v

# Skip cleanup (inspect resources after test)
python scripts/e2e_test.py --skip-cleanup
```

### E2E Test Output

```
============================================================
VITAL Workbench E2E Test Suite
============================================================
Target: http://localhost:8000

=== Stage 0: Health Check ===
✓ Health check - Status 200
✓ Health response - Field 'status' exists

=== Stage 1: DATA - Create Sheet ===
✓ Create sheet - Status 201
✓ Sheet response - Field 'id' exists

=== Stage 2: GENERATE - Create Template ===
✓ Create template - Status 201
✓ Template response - Field 'id' exists

=== Stage 3: LABEL - Create Canonical Label ===
✓ Create canonical label - Status 201
✓ Canonical label response - Field 'id' exists

=== Stage 4: TRAIN - Trigger Training ===
✓ Trigger training - Status 202
✓ Training job response - Field 'id' exists

=== Stage 5: VERIFY - Check Resources ===
✓ Verified sheet_id: sheet-001
✓ Verified template_id: template-001
✓ Verified label_id: label-001

=== Stage 6: CLEANUP ===
✓ Deleted training_job_id: job-001
✓ Deleted label_id: label-001
✓ Deleted training_sheet_id: training-001
✓ Deleted template_id: template-001
✓ Deleted sheet_id: sheet-001

============================================================
Test Summary
============================================================
Passed: 18
Failed: 0

✓ All tests passed!
```

## Test Coverage

### Coverage Requirements

- **Backend API**: 80%+ coverage target
- **Frontend Components**: 70%+ coverage target
- **Critical paths**: 100% coverage (authentication, data mutations)

### Viewing Coverage Reports

#### Backend Coverage

```bash
cd backend
pytest --cov=app --cov-report=html
open htmlcov/index.html
```

#### Frontend Coverage

```bash
cd frontend
npm run test:coverage
open coverage/index.html
```

### Coverage Best Practices

1. **Focus on critical paths first**
   - API endpoints for CRUD operations
   - Authentication and authorization
   - Data validation and transformation

2. **Don't chase 100% coverage**
   - Some code is not worth testing (trivial getters/setters)
   - Focus on business logic and error paths

3. **Test behavior, not implementation**
   - Test what the code does, not how it does it
   - Avoid testing internal state

## CI/CD Integration

### GitHub Actions Example

Create `.github/workflows/test.yml`:

```yaml
name: Test Suite

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
      - name: Run tests
        run: |
          cd backend
          pytest --cov=app --cov-report=xml
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
      - name: Run tests
        run: |
          cd frontend
          npm run test:run
      - name: Run E2E tests
        run: |
          cd frontend
          npx playwright install --with-deps
          npm run test:e2e

  e2e-integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Start backend
        run: |
          cd backend
          pip install -r requirements.txt
          uvicorn app.main:app &
          sleep 10
      - name: Run E2E tests
        run: |
          cd backend
          python scripts/e2e_test.py
```

### Pre-commit Hooks

Create `.pre-commit-config.yaml`:

```yaml
repos:
  - repo: local
    hooks:
      - id: backend-tests
        name: Backend Tests
        entry: sh -c 'cd backend && pytest'
        language: system
        pass_filenames: false

      - id: frontend-tests
        name: Frontend Tests
        entry: sh -c 'cd frontend && npm run test:run'
        language: system
        pass_filenames: false
```

Install hooks:

```bash
pip install pre-commit
pre-commit install
```

## Best Practices

### General Testing Principles

1. **Write tests first (TDD)**
   - Define expected behavior before implementation
   - Helps design better APIs

2. **Test one thing at a time**
   - Each test should verify a single behavior
   - Makes failures easier to diagnose

3. **Use descriptive test names**
   - `test_create_sheet_with_valid_data()`
   - `test_create_sheet_returns_400_when_missing_required_fields()`

4. **Arrange-Act-Assert (AAA) pattern**
   ```python
   def test_example():
       # Arrange: Set up test data
       data = {"name": "Test"}

       # Act: Execute the behavior
       result = function_under_test(data)

       # Assert: Verify the outcome
       assert result.status == "success"
   ```

5. **Avoid test interdependencies**
   - Tests should be isolated and runnable in any order
   - Use fixtures for shared setup

6. **Mock external dependencies**
   - Databricks API calls
   - Database connections
   - External services

### Backend Testing Best Practices

1. **Use FastAPI TestClient**
   ```python
   def test_endpoint(client):
       response = client.get("/api/v1/resource")
       assert response.status_code == 200
   ```

2. **Test validation errors**
   ```python
   def test_invalid_payload(client):
       response = client.post("/api/v1/resource", json={})
       assert response.status_code == 422
   ```

3. **Test authorization**
   ```python
   def test_unauthorized_access(client):
       # Mock user without permissions
       response = client.delete("/api/v1/resource/123")
       assert response.status_code == 403
   ```

### Frontend Testing Best Practices

1. **Test user interactions, not implementation**
   ```typescript
   // Good
   fireEvent.click(screen.getByRole('button', { name: 'Save' }));
   expect(onSave).toHaveBeenCalled();

   // Bad (testing implementation details)
   expect(component.state.isOpen).toBe(true);
   ```

2. **Use semantic queries**
   ```typescript
   // Prefer accessible queries
   screen.getByRole('button', { name: 'Submit' })
   screen.getByLabelText('Email address')

   // Avoid brittle queries
   screen.getByClassName('submit-btn')
   ```

3. **Test accessibility**
   ```typescript
   it('has accessible form labels', () => {
       render(<LoginForm />);
       expect(screen.getByLabelText('Email')).toBeInTheDocument();
       expect(screen.getByLabelText('Password')).toBeInTheDocument();
   });
   ```

## Troubleshooting

### Common Issues

#### Backend Tests

**Issue: ImportError or module not found**
```bash
# Solution: Ensure you're in the backend directory and dependencies are installed
cd backend
pip install -r requirements.txt
pytest
```

**Issue: Tests failing with "connection refused"**
```bash
# Solution: Tests use mocks, not real connections. Check conftest.py fixtures
# If you need real Databricks, set environment variables:
export DATABRICKS_HOST="https://your-workspace.cloud.databricks.com"
export DATABRICKS_TOKEN="your-token"
```

**Issue: Async test warnings**
```python
# Solution: Mark async tests with pytest.mark.asyncio
@pytest.mark.asyncio
async def test_async_function():
    result = await async_function()
    assert result is not None
```

#### Frontend Tests

**Issue: "Cannot find module" errors**
```bash
# Solution: Clear cache and reinstall
cd frontend
rm -rf node_modules
npm install
npm test
```

**Issue: Tests timing out**
```typescript
// Solution: Increase timeout or use waitFor
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
}, { timeout: 5000 });
```

**Issue: "Not wrapped in act(...)" warnings**
```typescript
// Solution: Use waitFor for async updates
await waitFor(() => {
  expect(screen.getByText('Updated')).toBeInTheDocument();
});
```

#### E2E Tests

**Issue: Connection refused**
```bash
# Solution: Ensure backend is running
cd backend
uvicorn app.main:app --reload

# In another terminal
python scripts/e2e_test.py
```

**Issue: Tests passing but resources not created**
```bash
# Solution: Use --skip-cleanup to inspect resources
python scripts/e2e_test.py --skip-cleanup -v

# Then manually inspect in Unity Catalog
```

### Debug Mode

#### Backend Debug
```bash
# Run with print statements
pytest -s

# Run single test with debugger
pytest --pdb tests/test_api_integration.py::test_create_sheet
```

#### Frontend Debug
```bash
# Run in watch mode
npm test -- --watch

# Debug in browser (for E2E tests)
npm run test:e2e:ui
```

## Additional Resources

- [Pytest Documentation](https://docs.pytest.org/)
- [FastAPI Testing Guide](https://fastapi.tiangolo.com/tutorial/testing/)
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)

## Contributing Tests

When adding new features:

1. **Write tests first** (TDD approach)
2. **Ensure tests pass** before submitting PR
3. **Maintain coverage** - don't decrease overall coverage
4. **Update this guide** if adding new test patterns

Test categories to cover:
- ✅ Happy path (successful operations)
- ✅ Error cases (validation, not found, unauthorized)
- ✅ Edge cases (empty data, large data, special characters)
- ✅ Integration points (API contracts, database operations)
