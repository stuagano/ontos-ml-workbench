# Ontos ML Workbench - Workflows

Documentation for key workflows in the Ontos ML Workbench.

## Table of Contents

1. [Development Workflow](#development-workflow)
2. [Deployment Pipeline](#deployment-pipeline)
3. [Database Migration Workflow](#database-migration-workflow)
4. [Feature Flag Management](#feature-flag-management)
5. [Release Process](#release-process)
6. [Hotfix Process](#hotfix-process)

---

## Development Workflow

### Local Development Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Local Development                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
         ┌──────────────────────────────────────┐
         │ 1. Create feature branch             │
         │    git checkout -b feature/your-name │
         └──────────────────────────────────────┘
                            │
                            ▼
         ┌──────────────────────────────────────┐
         │ 2. Start local dev environment       │
         │    Option A: apx dev start           │
         │    Option B: backend + frontend      │
         └──────────────────────────────────────┘
                            │
                            ▼
         ┌──────────────────────────────────────┐
         │ 3. Make changes and test locally     │
         │    - Backend: pytest                 │
         │    - Frontend: npm test              │
         └──────────────────────────────────────┘
                            │
                            ▼
         ┌──────────────────────────────────────┐
         │ 4. Commit changes                    │
         │    git add .                         │
         │    git commit -m "feat: ..."         │
         └──────────────────────────────────────┘
                            │
                            ▼
         ┌──────────────────────────────────────┐
         │ 5. Push and create PR                │
         │    git push origin feature/your-name │
         └──────────────────────────────────────┘
                            │
                            ▼
         ┌──────────────────────────────────────┐
         │ 6. Code review and merge             │
         │    - Automated tests run             │
         │    - Code review required            │
         │    - Merge to main                   │
         └──────────────────────────────────────┘
```

### Step-by-Step Instructions

#### 1. Create Feature Branch

```bash
# Sync with main
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/canonical-labeling-tool

# Or for bug fixes
git checkout -b fix/database-connection-timeout
```

#### 2. Start Local Development

**Option A: APX (Recommended)**
```bash
apx dev start
# Access at: http://localhost:5173
```

**Option B: Manual**
```bash
# Terminal 1: Backend
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your credentials
uvicorn app.main:app --reload

# Terminal 2: Frontend
cd frontend
npm install
cp .env.example .env
npm run dev
```

#### 3. Make Changes and Test

**Backend Changes:**
```bash
cd backend

# Run tests
pytest

# Run with coverage
pytest --cov=app tests/

# Type checking
mypy app/

# Linting
ruff check .
```

**Frontend Changes:**
```bash
cd frontend

# Run tests
npm test

# Type checking
npx tsc --noEmit

# Linting
npm run lint

# Build verification
npm run build
```

#### 4. Commit Changes

Follow conventional commit format:

```bash
# Feature
git commit -m "feat: add canonical labeling tool"

# Bug fix
git commit -m "fix: resolve database connection timeout"

# Refactor
git commit -m "refactor: extract sheet service logic"

# Documentation
git commit -m "docs: update deployment guide"

# Tests
git commit -m "test: add tests for canonical labels"
```

#### 5. Create Pull Request

```bash
git push origin feature/your-branch

# Then create PR on GitHub/GitLab
# PR title should follow conventional commits
# PR description should include:
# - What changed
# - Why it changed
# - How to test
# - Screenshots (for UI changes)
```

#### 6. Code Review

PR checklist:
- [ ] All tests passing
- [ ] Code coverage maintained/improved
- [ ] Documentation updated
- [ ] No console.log statements
- [ ] No hardcoded credentials
- [ ] Type checking passes
- [ ] Linting passes

---

## Deployment Pipeline

### Dev → Staging → Production Flow

```
┌───────────┐      ┌───────────┐      ┌────────────┐
│    Dev    │ ───▶ │  Staging  │ ───▶ │ Production │
└───────────┘      └───────────┘      └────────────┘
     │                   │                    │
     │                   │                    │
  Automatic          Automatic           Manual
  on merge           on approval         release
```

### Development Environment

**Trigger:** Automatic on merge to `main` branch

**Steps:**
```bash
# Automated via CI/CD
1. Build frontend: npm run build
2. Run tests: pytest && npm test
3. Deploy bundle: databricks bundle deploy -t dev
4. Run smoke tests
5. Notify team in Slack
```

**Target:**
- Workspace: FEVM workspace or dev workspace
- Catalog: `main` or `home_<user>`
- Schema: `ontos_ml_workbench_dev`
- Warehouse: X-Small or Small

### Staging Environment

**Trigger:** Manual approval after dev verification

**Steps:**
```bash
# Manual deployment
1. Verify dev deployment successful
2. Run: databricks bundle deploy -t staging
3. Run full test suite
4. Perform manual QA testing
5. Product team sign-off
```

**Target:**
- Workspace: Staging workspace
- Catalog: `ontos_ml_staging`
- Schema: `workbench`
- Warehouse: Small or Medium

### Production Environment

**Trigger:** Manual release after staging approval

**Steps:**
```bash
# Follow PRODUCTION_CHECKLIST.md
1. Pre-deployment checklist
2. Create backups
3. Notify stakeholders
4. Run: databricks bundle deploy -t production
5. Monitor for 1 hour
6. Run smoke tests
7. Verify with end users
```

**Target:**
- Workspace: Production workspace
- Catalog: `ontos_ml`
- Schema: `workbench`
- Warehouse: Medium, Large, or Serverless

---

## Database Migration Workflow

### Migration Process

```
┌─────────────────────────────────────────────────────────────┐
│                  Database Migration                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
         ┌──────────────────────────────────────┐
         │ 1. Create migration script           │
         │    schemas/migrate_YYYYMMDD_desc.sql │
         └──────────────────────────────────────┘
                            │
                            ▼
         ┌──────────────────────────────────────┐
         │ 2. Test migration locally            │
         │    Apply to dev schema               │
         └──────────────────────────────────────┘
                            │
                            ▼
         ┌──────────────────────────────────────┐
         │ 3. Create rollback script            │
         │    schemas/rollback_YYYYMMDD.sql     │
         └──────────────────────────────────────┘
                            │
                            ▼
         ┌──────────────────────────────────────┐
         │ 4. Deploy to staging                 │
         │    Verify application works          │
         └──────────────────────────────────────┘
                            │
                            ▼
         ┌──────────────────────────────────────┐
         │ 5. Deploy to production              │
         │    During maintenance window         │
         └──────────────────────────────────────┘
                            │
                            ▼
         ┌──────────────────────────────────────┐
         │ 6. Verify and monitor                │
         │    Check data integrity              │
         └──────────────────────────────────────┘
```

### Migration Script Template

```sql
-- schemas/migrate_20260207_add_usage_constraints.sql
-- Description: Add usage constraints to qa_pairs table
-- Author: <your-name>
-- Date: 2026-02-07

-- Verify current schema
SELECT COUNT(*) as table_exists
FROM system.information_schema.tables
WHERE table_catalog = 'ontos_ml'
  AND table_schema = 'workbench'
  AND table_name = 'qa_pairs';

-- Add new columns
ALTER TABLE ontos_ml.workbench.qa_pairs
ADD COLUMN allowed_uses ARRAY<STRING> COMMENT 'Allowed use cases for this Q&A pair';

ALTER TABLE ontos_ml.workbench.qa_pairs
ADD COLUMN prohibited_uses ARRAY<STRING> COMMENT 'Prohibited use cases for this Q&A pair';

-- Verify migration
DESCRIBE ontos_ml.workbench.qa_pairs;

-- Validate data
SELECT COUNT(*) as total_rows,
       SUM(CASE WHEN allowed_uses IS NULL THEN 1 ELSE 0 END) as null_allowed_uses
FROM ontos_ml.workbench.qa_pairs;
```

### Rollback Script Template

```sql
-- schemas/rollback_20260207_add_usage_constraints.sql
-- Rollback for: migrate_20260207_add_usage_constraints.sql

-- Remove columns
ALTER TABLE ontos_ml.workbench.qa_pairs
DROP COLUMN allowed_uses;

ALTER TABLE ontos_ml.workbench.qa_pairs
DROP COLUMN prohibited_uses;

-- Verify rollback
DESCRIBE ontos_ml.workbench.qa_pairs;
```

### Apply Migration

```bash
# Development
databricks sql exec \
  --file=schemas/migrate_20260207_add_usage_constraints.sql \
  --warehouse-id=$DEV_WAREHOUSE_ID \
  --profile=dev

# Staging
databricks sql exec \
  --file=schemas/migrate_20260207_add_usage_constraints.sql \
  --warehouse-id=$STAGING_WAREHOUSE_ID \
  --profile=staging

# Production (during maintenance window)
databricks sql exec \
  --file=schemas/migrate_20260207_add_usage_constraints.sql \
  --warehouse-id=$PROD_WAREHOUSE_ID \
  --profile=production
```

### Rollback Migration

```bash
# If issues detected
databricks sql exec \
  --file=schemas/rollback_20260207_add_usage_constraints.sql \
  --warehouse-id=$PROD_WAREHOUSE_ID \
  --profile=production
```

---

## Feature Flag Management

### Feature Flag Configuration

**Backend (`backend/.env`):**
```bash
ENABLE_MONITORING=true
ENABLE_FEEDBACK=true
ENABLE_EXPERIMENTAL=false
ENABLE_APX=false
ENABLE_CACHING=true
```

**Frontend (`frontend/.env`):**
```bash
VITE_ENABLE_MONITORING=true
VITE_ENABLE_FEEDBACK=true
VITE_ENABLE_EXPERIMENTAL=false
VITE_ENABLE_AB_TESTING=false
```

### Feature Flag Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                    Feature Development                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
         ┌──────────────────────────────────────┐
         │ 1. Add feature flag                  │
         │    Backend & Frontend .env           │
         └──────────────────────────────────────┘
                            │
                            ▼
         ┌──────────────────────────────────────┐
         │ 2. Develop feature (flag=false)      │
         │    Feature hidden in production      │
         └──────────────────────────────────────┘
                            │
                            ▼
         ┌──────────────────────────────────────┐
         │ 3. Test in dev (flag=true)           │
         │    Enable for testing                │
         └──────────────────────────────────────┘
                            │
                            ▼
         ┌──────────────────────────────────────┐
         │ 4. Deploy to staging (flag=true)     │
         │    QA testing                        │
         └──────────────────────────────────────┘
                            │
                            ▼
         ┌──────────────────────────────────────┐
         │ 5. Deploy to production (flag=false) │
         │    Feature deployed but hidden       │
         └──────────────────────────────────────┘
                            │
                            ▼
         ┌──────────────────────────────────────┐
         │ 6. Enable feature (flag=true)        │
         │    Gradual rollout or instant        │
         └──────────────────────────────────────┘
                            │
                            ▼
         ┌──────────────────────────────────────┐
         │ 7. Remove flag (cleanup)             │
         │    After feature is stable           │
         └──────────────────────────────────────┘
```

### Implementing Feature Flags

**Backend Example:**
```python
# app/core/config.py
class Settings(BaseSettings):
    enable_monitoring: bool = False
    enable_feedback: bool = False

# app/api/v1/endpoints/monitoring.py
@router.get("/metrics")
async def get_metrics():
    if not settings.enable_monitoring:
        raise HTTPException(
            status_code=404,
            detail="Monitoring feature not enabled"
        )
    # ... metrics logic
```

**Frontend Example:**
```typescript
// frontend/src/config.ts
export const featureFlags = {
  enableMonitoring: import.meta.env.VITE_ENABLE_MONITORING === 'true',
  enableFeedback: import.meta.env.VITE_ENABLE_FEEDBACK === 'true',
};

// frontend/src/pages/MonitorPage.tsx
import { featureFlags } from '@/config';

export function MonitorPage() {
  if (!featureFlags.enableMonitoring) {
    return <NotFound />;
  }
  // ... monitoring page
}
```

---

## Release Process

### Release Workflow

```
1. Version Bump
   ├─ Update version in package.json
   ├─ Update version in backend/app/core/config.py
   └─ Update CHANGELOG.md

2. Create Release Branch
   ├─ git checkout -b release/v0.2.0
   └─ git push origin release/v0.2.0

3. Deploy to Staging
   ├─ databricks bundle deploy -t staging
   ├─ Run full test suite
   └─ Product team approval

4. Create Release Tag
   ├─ git tag -a v0.2.0 -m "Release v0.2.0"
   ├─ git push origin v0.2.0
   └─ Create GitHub release with notes

5. Deploy to Production
   ├─ Follow PRODUCTION_CHECKLIST.md
   ├─ databricks bundle deploy -t production
   └─ Monitor for 24 hours

6. Merge to Main
   ├─ git checkout main
   ├─ git merge release/v0.2.0
   └─ git push origin main
```

### Version Numbering

Follow Semantic Versioning (SemVer):

- **MAJOR.MINOR.PATCH** (e.g., 1.2.3)
  - **MAJOR**: Breaking changes (e.g., 1.0.0 → 2.0.0)
  - **MINOR**: New features (backward compatible) (e.g., 1.0.0 → 1.1.0)
  - **PATCH**: Bug fixes (e.g., 1.0.0 → 1.0.1)

### Release Notes Template

```markdown
# Release v0.2.0 - 2026-02-07

## New Features
- ✨ Add Canonical Labeling Tool for direct source data labeling
- ✨ Implement usage constraints (allowed_uses, prohibited_uses)
- ✨ Add monitoring dashboard with real-time metrics

## Improvements
- ⚡ Optimize Q&A pair generation performance (2x faster)
- 🎨 Redesign label review interface for better UX
- 📊 Add export functionality for training datasets

## Bug Fixes
- 🐛 Fix database connection timeout on large queries
- 🐛 Resolve frontend navigation state issues
- 🐛 Fix canonical label lookup for multiple labelsets

## Database Changes
- Add usage constraints columns to qa_pairs table
- Add composite index on (sheet_id, item_ref, label_type)

## Breaking Changes
None

## Deployment Notes
- Run migration: schemas/migrate_20260207_add_usage_constraints.sql
- Update environment variables: Add ENABLE_MONITORING=true

## Contributors
@user1, @user2, @user3
```

---

## Hotfix Process

### Hotfix Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                   Critical Bug Found                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
         ┌──────────────────────────────────────┐
         │ 1. Create hotfix branch from main    │
         │    git checkout -b hotfix/fix-desc   │
         └──────────────────────────────────────┘
                            │
                            ▼
         ┌──────────────────────────────────────┐
         │ 2. Fix bug and test locally          │
         │    Minimal changes only              │
         └──────────────────────────────────────┘
                            │
                            ▼
         ┌──────────────────────────────────────┐
         │ 3. Deploy to dev for verification    │
         │    databricks bundle deploy -t dev   │
         └──────────────────────────────────────┘
                            │
                            ▼
         ┌──────────────────────────────────────┐
         │ 4. Deploy to staging (if time allows)│
         │    Quick QA verification             │
         └──────────────────────────────────────┘
                            │
                            ▼
         ┌──────────────────────────────────────┐
         │ 5. Deploy to production              │
         │    Follow expedited process          │
         └──────────────────────────────────────┘
                            │
                            ▼
         ┌──────────────────────────────────────┐
         │ 6. Merge hotfix to main              │
         │    git checkout main                 │
         │    git merge hotfix/fix-desc         │
         └──────────────────────────────────────┘
```

### Hotfix Criteria

Deploy hotfix immediately if:
- Service is completely down
- Data corruption risk
- Security vulnerability
- Critical functionality broken for all users

Otherwise, follow normal release process.

### Expedited Deployment Checklist

Minimal checks for hotfix:

- [ ] Bug fix verified locally
- [ ] No new features introduced
- [ ] Tests passing
- [ ] Deployed to dev successfully
- [ ] Backup created
- [ ] Rollback plan documented
- [ ] Deploy to production
- [ ] Verify fix in production
- [ ] Monitor for 1 hour
- [ ] Merge to main

### Post-Hotfix

After hotfix is stable:

1. **Post-Mortem**: Document root cause and prevention
2. **Update Tests**: Add test cases to prevent regression
3. **Update Docs**: Update troubleshooting guides
4. **Communicate**: Notify team and stakeholders

---

## Continuous Integration

### CI/CD Pipeline

```yaml
# .github/workflows/ci.yml (example)
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
      - name: Run tests
        run: |
          cd backend
          pytest --cov=app tests/
      - name: Type checking
        run: |
          cd backend
          mypy app/

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
      - name: Run tests
        run: |
          cd frontend
          npm test
      - name: Type checking
        run: |
          cd frontend
          npx tsc --noEmit
      - name: Build
        run: |
          cd frontend
          npm run build

  deploy-dev:
    needs: [test-backend, test-frontend]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Dev
        run: |
          databricks bundle deploy -t dev
```

---

## Best Practices

### Development
- Always create feature branches
- Write tests for new features
- Update documentation with code changes
- Use conventional commit messages
- Keep PRs small and focused

### Deployment
- Follow the deployment checklist
- Create backups before major changes
- Monitor after deployment
- Have a rollback plan ready
- Deploy during low-traffic periods

### Database
- Always create rollback scripts
- Test migrations on dev/staging first
- Use Delta table time travel for safety
- Document migration dependencies
- Never skip schema validation

### Feature Flags
- Start with flags disabled in production
- Test thoroughly before enabling
- Monitor after enabling features
- Remove flags after features are stable
- Document flag dependencies
