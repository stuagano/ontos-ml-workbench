# Action Items Checklist - Ontos ML Workbench

**Last Updated:** February 7, 2026
**Status:** 🔴 CRITICAL ISSUES BLOCKING DEPLOYMENT

---

## 🔴 IMMEDIATE: Must Fix Today (8-12 hours)

**Target Completion:** February 9, 2026 EOD

### Backend Team

- [ ] **Fix SQL Warehouse Timeout** (4-6 hours)
  - Verify `.env` has correct Databricks credentials
  - Check SQL Warehouse `387bcda0f2ece20c` is running
  - Test query: `SELECT * FROM erp-demonstrations.ontos_ml_workbench.sheets LIMIT 10`
  - Add health check endpoint: `GET /api/health/db`
  - Consider local SQLite fallback for development
  - **Blocker Impact:** Prevents DATA stage from loading

- [ ] **Create monitor_alerts Table** (30 minutes)
  ```sql
  -- Execute lines 393-420 from schemas/init.sql
  CREATE TABLE IF NOT EXISTS erp-demonstrations.ontos_ml_workbench.monitor_alerts (
    alert_id STRING NOT NULL,
    endpoint_name STRING NOT NULL,
    alert_type STRING NOT NULL,
    severity STRING NOT NULL,
    message STRING,
    metric_name STRING,
    metric_value DOUBLE,
    threshold_value DOUBLE,
    detected_at TIMESTAMP NOT NULL,
    resolved_at TIMESTAMP,
    status STRING NOT NULL,
    assigned_to STRING,
    notes STRING
  ) USING DELTA;
  ```
  - Verify table created: `DESCRIBE TABLE erp-demonstrations.ontos_ml_workbench.monitor_alerts;`
  - Seed sample data: `INSERT INTO ... VALUES (...);`
  - **Blocker Impact:** Prevents Monitor alerts from loading

- [ ] **Fix Feedback Stats Type Error** (15 minutes)
  - File: `backend/app/api/v1/endpoints/feedback.py:234`
  - Change: `SUM(CASE WHEN rating >= 3` → `SUM(CASE WHEN CAST(rating AS INT) >= 3`
  - Test: `curl http://localhost:8000/api/v1/feedback/stats`
  - **Blocker Impact:** Prevents Monitor feedback stats from loading

- [ ] **Initialize Sheets Table** (1-2 hours)
  - Run: `python scripts/initialize_database.py`
  - Or manually create table from `schemas/init.sql` lines 1-50
  - Seed data: `python scripts/seed_sheets_data.py`
  - Verify: `SELECT COUNT(*) FROM erp-demonstrations.ontos_ml_workbench.sheets;`
  - **Blocker Impact:** No data for DATA stage to display

### Frontend Team

- [ ] **Fix TypeScript Production Errors** (2-3 hours)
  - Run: `cd frontend && npx tsc --noEmit`
  - Fix critical errors in:
    - `src/components/CanonicalLabelingTool.tsx:156` (toast property)
    - `src/components/CanonicalLabelingTool.tsx:613` (label_id property)
    - `src/components/CanonicalLabelStats.tsx:59` (undefined check)
  - Test: `npm run build` should succeed
  - **Blocker Impact:** Production build will fail

---

## 🟡 SHORT-TERM: Fix This Week (6-8 hours)

**Target Completion:** February 14, 2026

### Frontend Team

- [ ] **Add Global Error Boundary** (1 hour)
  - Wrap App.tsx root with ErrorBoundary
  - Add error recovery UI with retry button
  - Log errors to console in development
  - Consider Sentry integration for production

- [ ] **Fix React Router Warnings** (15 minutes)
  - Add to router config:
    ```typescript
    <BrowserRouter future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true
    }}>
    ```
  - Test navigation still works correctly

- [ ] **Add WorkflowBanner to DATA Stage** (10 minutes)
  - Import WorkflowBanner in `src/pages/DataPage.tsx`
  - Add `<WorkflowBanner />` at top of page content
  - Verify styling matches other stages

- [ ] **Verify CuratePage Fix** (15 minutes)
  - Restart dev server: `npm run dev`
  - Navigate to GENERATE stage
  - Verify no TypeError in console
  - Test StageSubNav buttons work

### QA Team

- [ ] **Complete E2E Workflow Testing** (2-3 hours)
  - Test: DATA → GENERATE → LABEL → TRAIN → DEPLOY → MONITOR → IMPROVE
  - Verify state persistence across stages
  - Test "Start New Cycle" button
  - Document any new bugs found

### Backend Team

- [ ] **Add Mock Data for Development** (2-3 hours)
  - Create `MockSQLService` with sample data
  - Add `USE_MOCK_DATA=true` to `.env`
  - Generate realistic sample sheets, templates, labels
  - Update `.env.example` with documentation

---

## 🟢 MEDIUM-TERM: Next Sprint (2-3 weeks)

**Target Completion:** February 28, 2026

### DevOps Team

- [ ] **Set Up Error Tracking** (1 day)
  - Integrate Sentry or similar service
  - Add error tracking to frontend
  - Add error tracking to backend
  - Create monitoring dashboard
  - Set up alert notifications

- [ ] **Create Staging Environment** (2 days)
  - Provision staging Databricks workspace
  - Deploy app to staging
  - Configure CI/CD pipeline
  - Set up automated deployments

### Frontend Team

- [ ] **Add Unit Tests** (3-4 days)
  - Target 80%+ coverage
  - Write tests for:
    - All page components
    - Critical utility functions
    - API service layer
    - State management
  - Add tests to CI/CD pipeline

- [ ] **Improve Accessibility** (2-3 days)
  - Run WCAG 2.1 AA compliance audit
  - Fix keyboard navigation issues
  - Add ARIA labels to all interactive elements
  - Test with NVDA/JAWS screen readers
  - Fix color contrast issues

- [ ] **Mobile Responsive Design** (1 week)
  - Test on mobile viewports (375x667)
  - Test on tablet viewports (768x1024)
  - Make sidebar collapsible on mobile
  - Ensure 44x44px touch targets
  - Fix horizontal scrolling on tables

### Backend Team

- [ ] **Add Integration Tests** (2-3 days)
  - Test all CRUD operations
  - Test error scenarios
  - Test authentication/authorization
  - Add to CI/CD pipeline
  - Target 80%+ coverage

- [ ] **Optimize Database Queries** (2-3 days)
  - Profile slow queries
  - Add indexes where needed
  - Implement query caching
  - Test with production-size data
  - Document query performance

---

## 🔵 LONG-TERM: Technical Debt (1-2 months)

**Target Completion:** March 31, 2026

### Performance Optimization

- [ ] Code splitting and lazy loading
- [ ] Bundle size optimization
- [ ] API response caching
- [ ] Image optimization
- [ ] Database connection pooling
- [ ] Load testing and benchmarking

### Security Hardening

- [ ] Security audit
- [ ] Penetration testing
- [ ] Input validation hardening
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] CSRF protection

### Documentation

- [ ] User guide
- [ ] API documentation
- [ ] Deployment guide
- [ ] Troubleshooting guide
- [ ] Architecture documentation
- [ ] Demo videos

---

## Progress Tracking

### Overall Completion

```
🔴 Immediate (P0):     ⬜⬜⬜⬜⬜⬛⬛⬛⬛⬛  27% (4/15 fixed)
🟡 Short-Term (P1):    ⬜⬛⬛⬛⬛⬛⬛⬛⬛⬛   0% (0/10 fixed)
🟢 Medium-Term (P2):   ⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛   0% (0/25 fixed)
🔵 Long-Term (P3):     ⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛   0% (0/20 fixed)
```

### Team Workload

| Team | Immediate | Short-Term | Medium-Term | Long-Term | Total |
|------|-----------|------------|-------------|-----------|-------|
| Backend | 8-10 hours | 2-3 hours | 4-6 days | 2-3 weeks | ~6 weeks |
| Frontend | 2-3 hours | 1.5 hours | 2-3 weeks | 1-2 weeks | ~6 weeks |
| QA | 0 hours | 2-3 hours | 3-4 days | 1 week | ~3 weeks |
| DevOps | 0 hours | 0 hours | 3-4 days | 1-2 weeks | ~3 weeks |

---

## Burn Down Chart (Estimated)

```
Bugs Remaining Over Time:

20 │
19 │ ●
18 │ │
17 │ │
16 │ │
15 │ ●
14 │  ╲
13 │   ╲
12 │    ╲
11 │     ●
10 │      ╲____
 9 │           ╲
 8 │            ●
 7 │             ╲____
 6 │                  ╲
 5 │                   ●
 4 │                    ╲____
 3 │                         ╲
 2 │                          ●
 1 │                           ╲____
 0 │                                ●
   └─────────────────────────────────
   Now  Week1  Week2  Week3  Week4

   ● Actual Progress
   ╲ Projected Trajectory
```

---

## Daily Standup Template

### What I Did Yesterday
- [ ] Fixed: [Bug/Feature]
- [ ] Progress: [Task Name] - [% Complete]
- [ ] Blocked by: [Issue]

### What I'm Doing Today
- [ ] Fix: [Bug/Feature]
- [ ] Test: [Component/Feature]
- [ ] Deploy: [Environment]

### Blockers
- [ ] Waiting for: [Dependency]
- [ ] Need help with: [Technical Issue]
- [ ] Resource constraint: [What's Missing]

---

## Quick Commands

### Backend Testing
```bash
cd backend

# Fix SQL Warehouse timeout
export DATABRICKS_HOST="https://erp-demonstrations.cloud.databricks.com"
export DATABRICKS_TOKEN="your-token-here"
python -c "from app.core.settings import get_settings; get_settings().test_connection()"

# Create monitor_alerts table
databricks-sql --sql-file schemas/init.sql

# Test feedback stats
curl http://localhost:8000/api/v1/feedback/stats

# Initialize sheets
python scripts/initialize_database.py
python scripts/seed_sheets_data.py
```

### Frontend Testing
```bash
cd frontend

# Check TypeScript errors
npx tsc --noEmit

# Fix and verify
npm run build

# Start dev server
npm run dev

# Run tests
npm test
```

### Full Stack Testing
```bash
# Terminal 1: Backend
cd backend && uvicorn app.main:app --reload

# Terminal 2: Frontend
cd frontend && npm run dev

# Terminal 3: E2E Tests
cd backend && python scripts/e2e_test.py
```

---

**Next Update:** Daily until immediate items complete
**Owner:** Engineering Team Lead
**Reviewers:** Product Management, QA Lead, DevOps Lead
