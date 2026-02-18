# Deployment Checklist - SQL Warehouse Timeout Fix

Use this checklist to deploy the query optimization fixes safely.

## Pre-Deployment

### 1. Verify Configuration
- [ ] Copy `.env.example` to `.env` if not exists
- [ ] Set `DATABRICKS_WAREHOUSE_ID` in `.env`
- [ ] Confirm `SQL_QUERY_TIMEOUT_SECONDS=30` (or desired value)
- [ ] Set `USE_SERVERLESS_SQL=false` (or `true` for serverless)

### 2. Review Changes
- [ ] Review `backend/app/services/sheet_service.py`
- [ ] Review `backend/app/services/sql_service.py`
- [ ] Review `backend/app/core/config.py`
- [ ] Verify no breaking changes to API contracts

### 3. Run Tests
```bash
cd backend

# Syntax check
python3 -m py_compile app/services/sheet_service.py app/services/sql_service.py app/core/config.py

# Run optimization tests (if backend is running)
python3 test_sheet_query_optimization.py
```

- [ ] All files compile without errors
- [ ] Test suite passes (if backend is running)

## Deployment Steps

### 4. Deploy to Development
```bash
# Start backend
cd backend
uvicorn app.main:app --reload

# Or use APX (recommended)
cd ..
apx dev start
```

- [ ] Backend starts without errors
- [ ] Check logs for "Using SQL warehouse: ..." or "Using serverless SQL"
- [ ] Test API endpoint: `curl http://localhost:8000/api/v1/sheets-v2?limit=10`
- [ ] Verify response time < 5 seconds

### 5. Frontend Integration Test
- [ ] Open frontend in browser
- [ ] Navigate to DATA page
- [ ] Verify sheets list loads successfully
- [ ] Check browser console for errors
- [ ] Test search/filter functionality

### 6. Performance Verification
Run manual SQL tests in Databricks SQL Editor using `backend/QUERY_OPTIMIZATION_TEST.sql`:

- [ ] Test 1 (SELECT *): Record baseline time
- [ ] Test 2 (Selective columns): Should be 50%+ faster than Test 1
- [ ] Test 3 (With filter): Should be faster than Test 2
- [ ] Test 4 (Single sheet): Should be < 1 second

### 7. Load Testing (Optional but Recommended)
```bash
# Test multiple concurrent requests
for i in {1..10}; do
  curl http://localhost:8000/api/v1/sheets-v2?limit=10 &
done
wait
```

- [ ] All requests complete successfully
- [ ] No timeout errors
- [ ] Average response time < 5s

## Post-Deployment

### 8. Monitor for Issues
- [ ] Check application logs for errors
- [ ] Monitor query performance (first hour)
- [ ] Watch for timeout errors
- [ ] Check memory usage

### 9. Validate with Users
- [ ] App loads without long delays
- [ ] Sheets list appears quickly
- [ ] No timeout errors in UI
- [ ] Search/filter works correctly

### 10. Performance Metrics (Day 1)
Record and compare:
- [ ] Average list_sheets query time
- [ ] Average get_sheet query time
- [ ] Timeout rate (should be ~0%)
- [ ] User-reported issues (should be ~0)

## Rollback Plan

If issues occur:

### Quick Rollback
```bash
# In .env, increase timeout
SQL_QUERY_TIMEOUT_SECONDS=300

# Restart backend
```

### Full Rollback
```bash
# Revert changes
git checkout main -- backend/app/services/sheet_service.py
git checkout main -- backend/app/services/sql_service.py
git checkout main -- backend/app/core/config.py

# Restart backend
```

## Success Criteria

All of these should be true after deployment:

- [ ] App loads in < 10 seconds
- [ ] Sheets list query completes in < 5 seconds
- [ ] Single sheet query completes in < 1 second
- [ ] Zero timeout errors in first hour
- [ ] No user-reported performance issues
- [ ] Backend logs show no errors

## Support Resources

If issues arise:

1. **Check Documentation**
   - `backend/QUERY_OPTIMIZATION_GUIDE.md` - Comprehensive guide
   - `TIMEOUT_FIX_SUMMARY.md` - Quick reference

2. **Run Diagnostics**
   - `backend/test_sheet_query_optimization.py` - Automated tests
   - `backend/QUERY_OPTIMIZATION_TEST.sql` - Manual SQL tests

3. **Review Logs**
   - Check backend logs for query times
   - Look for timeout errors
   - Review Databricks SQL query history

4. **Adjust Configuration**
   - Increase `SQL_QUERY_TIMEOUT_SECONDS` if needed
   - Try `USE_SERVERLESS_SQL=true` for instant availability
   - Reduce default limit if queries are still slow

## Production Deployment

For production deployment, additionally:

### 11. Database Optimization
```sql
-- Run in Databricks SQL Editor
USE CATALOG your_catalog;
USE SCHEMA your_schema;

-- Optimize table
OPTIMIZE sheets;

-- Update statistics
ANALYZE TABLE sheets COMPUTE STATISTICS;

-- Optional: ZORDER for common query patterns
OPTIMIZE sheets ZORDER BY (status, created_at);
```

- [ ] OPTIMIZE completed successfully
- [ ] ANALYZE TABLE completed successfully
- [ ] Verify improved query performance

### 12. Monitoring Setup
- [ ] Set up query performance alerts (> 10s)
- [ ] Set up timeout error alerts
- [ ] Track p95 and p99 latency
- [ ] Monitor data transfer metrics

### 13. Documentation
- [ ] Update team wiki with new configuration options
- [ ] Share performance improvements with team
- [ ] Document any production-specific settings

## Notes

- All changes are backward compatible
- No API contract changes
- Configuration is optional with sensible defaults
- Can deploy incrementally (dev → staging → prod)
