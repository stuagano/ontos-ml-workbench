# Ontos ML Workbench - Operations Runbook

Operational runbook for managing the Ontos ML Workbench in production.

## Table of Contents

1. [Common Issues and Solutions](#common-issues-and-solutions)
2. [Monitoring and Alerting](#monitoring-and-alerting)
3. [Performance Tuning](#performance-tuning)
4. [Backup and Recovery](#backup-and-recovery)
5. [Scaling Guidelines](#scaling-guidelines)
6. [Troubleshooting Guide](#troubleshooting-guide)
7. [Incident Response](#incident-response)

---

## Common Issues and Solutions

### Issue: App is Down or Unresponsive

**Symptoms:**
- App URL returns 503 Service Unavailable
- App status shows `STOPPED` or `ERROR`
- Users cannot access the application

**Diagnosis:**
```bash
# Check app status
databricks apps get ontos-ml-workbench --profile=prod -o json | jq -r '.compute_status'

# Check recent logs
databricks apps logs ontos-ml-workbench --profile=prod --tail 100
```

**Resolution:**
```bash
# Restart the app
databricks apps restart ontos-ml-workbench --profile=prod

# Monitor restart progress
watch -n 5 "databricks apps get ontos-ml-workbench --profile=prod -o json | jq -r '.compute_status'"
```

**Prevention:**
- Set up health check monitoring
- Configure auto-restart on failure
- Review logs regularly for warnings

---

### Issue: Database Connection Timeout

**Symptoms:**
- API returns 500 errors
- Logs show "Connection timeout to SQL Warehouse"
- Queries fail intermittently

**Diagnosis:**
```bash
# Check warehouse status
databricks warehouses get $WAREHOUSE_ID --profile=prod -o json | jq -r '.state'

# Test direct connection
databricks sql exec --warehouse-id=$WAREHOUSE_ID "SELECT 1" --profile=prod
```

**Resolution:**
```bash
# Start warehouse if stopped
databricks warehouses start $WAREHOUSE_ID --profile=prod

# For serverless, allow cold start time (30-60 seconds)
# For classic, check cluster health

# Increase connection timeout in backend config
# Edit backend/.env:
# DATABRICKS_CONNECTION_TIMEOUT=120
```

**Prevention:**
- Use Pro or Serverless warehouse for auto-scaling
- Enable "Auto Stop" with appropriate timeout
- Monitor warehouse query queue length

---

### Issue: Slow Query Performance

**Symptoms:**
- API requests take > 5 seconds
- Users report slow page loads
- High warehouse CPU usage

**Diagnosis:**
```sql
-- Check query history for slow queries
SELECT
  query_text,
  execution_duration / 1000 as duration_seconds,
  rows_produced,
  start_time
FROM system.query.history
WHERE warehouse_id = '$WAREHOUSE_ID'
  AND start_time > NOW() - INTERVAL 1 HOUR
ORDER BY execution_duration DESC
LIMIT 10;
```

**Resolution:**

1. **Add indexes (if using Lakebase):**
```sql
CREATE INDEX idx_sheets_status ON ontos_ml.workbench.sheets(status);
CREATE INDEX idx_qa_pairs_status ON ontos_ml.workbench.qa_pairs(status);
```

2. **Optimize queries:**
```sql
-- Add partition filters
SELECT * FROM sheets WHERE created_at > '2026-01-01'

-- Limit result sets
SELECT * FROM qa_pairs LIMIT 1000
```

3. **Enable result caching:**
```bash
databricks warehouses update $WAREHOUSE_ID --enable-result-cache --profile=prod
```

**Prevention:**
- Regular OPTIMIZE operations on Delta tables
- Use appropriate partition strategies
- Implement pagination in API endpoints

---

### Issue: Out of Memory Errors

**Symptoms:**
- App crashes with OOM errors
- Logs show "MemoryError" or "Out of memory"
- App becomes unresponsive under load

**Diagnosis:**
```bash
# Check app resource usage
databricks apps get ontos-ml-workbench --profile=prod -o json | jq '.resources'
```

**Resolution:**

1. **Increase app resources in app.yaml:**
```yaml
resources:
  cpu: "2"
  memory: "4Gi"
```

2. **Redeploy with new resources:**
```bash
databricks apps deploy ontos-ml-workbench \
  --source-code-path /Workspace/Users/<your-email>/Apps/ontos-ml-workbench \
  --profile=prod
```

3. **Optimize data loading:**
```python
# In backend code, use streaming for large datasets
# Instead of:
data = spark.table("sheets").collect()

# Use:
data = spark.table("sheets").limit(100).collect()
```

**Prevention:**
- Implement pagination for all list endpoints
- Use streaming responses for large data
- Monitor memory usage trends

---

### Issue: Permission Denied Errors

**Symptoms:**
- 403 Forbidden errors
- Logs show "PERMISSION_DENIED" errors
- Users cannot access certain features

**Diagnosis:**
```sql
-- Check service principal permissions
SHOW GRANTS ON CATALOG ontos_ml;
SHOW GRANTS ON SCHEMA ontos_ml.workbench;
```

**Resolution:**
```sql
-- Get service principal ID
-- databricks apps get ontos-ml-workbench --profile=prod -o json | jq -r '.service_principal_id'

-- Grant necessary permissions
GRANT USE CATALOG ON CATALOG ontos_ml TO `${SP_ID}`;
GRANT USE SCHEMA ON SCHEMA ontos_ml.workbench TO `${SP_ID}`;
GRANT SELECT, MODIFY ON SCHEMA ontos_ml.workbench TO `${SP_ID}`;

-- For specific tables
GRANT SELECT ON TABLE ontos_ml.workbench.sheets TO `${SP_ID}`;
GRANT SELECT, MODIFY ON TABLE ontos_ml.workbench.qa_pairs TO `${SP_ID}`;
```

**Prevention:**
- Document all required permissions
- Use infrastructure-as-code for permission grants
- Implement permission checks in CI/CD

---

### Issue: Frontend Not Loading

**Symptoms:**
- Blank page or 404 errors
- Browser console shows JavaScript errors
- Assets fail to load

**Diagnosis:**
```bash
# Check if frontend files were deployed
databricks workspace list /Workspace/Users/<your-email>/Apps/ontos-ml-workbench/frontend/dist --profile=prod

# Check app logs for static file errors
databricks apps logs ontos-ml-workbench --profile=prod | grep "GET /assets"
```

**Resolution:**
```bash
# Rebuild and redeploy frontend
cd frontend
npm run build

# Sync to workspace
cd ..
databricks sync . /Workspace/Users/<your-email>/Apps/ontos-ml-workbench --profile=prod

# Redeploy app
databricks apps deploy ontos-ml-workbench \
  --source-code-path /Workspace/Users/<your-email>/Apps/ontos-ml-workbench \
  --profile=prod
```

**Prevention:**
- Include frontend build verification in CI/CD
- Test static file serving in staging
- Monitor browser errors via analytics

---

## Monitoring and Alerting

### Key Metrics to Monitor

#### Application Health
- App compute status (ACTIVE/STOPPED/ERROR)
- HTTP response codes (2xx, 4xx, 5xx)
- Request latency (p50, p95, p99)
- Request throughput (requests/minute)

#### Database Health
- Warehouse status
- Query execution time
- Query queue length
- Data freshness (last updated timestamps)

#### Resource Usage
- App CPU usage
- App memory usage
- Warehouse DBU consumption
- Storage size

### Setting Up Databricks Monitoring

```sql
-- Create monitoring queries for System Tables

-- Query 1: App Request Latency
CREATE OR REPLACE VIEW ontos_ml.workbench.app_latency_monitoring AS
SELECT
  DATE_TRUNC('minute', start_time) as time_bucket,
  COUNT(*) as request_count,
  AVG(execution_duration) / 1000 as avg_latency_seconds,
  PERCENTILE(execution_duration, 0.95) / 1000 as p95_latency_seconds
FROM system.query.history
WHERE warehouse_id = '$WAREHOUSE_ID'
GROUP BY time_bucket
ORDER BY time_bucket DESC;

-- Query 2: Error Rate
CREATE OR REPLACE VIEW ontos_ml.workbench.app_error_monitoring AS
SELECT
  DATE_TRUNC('hour', start_time) as time_bucket,
  COUNT(*) as total_queries,
  SUM(CASE WHEN error_message IS NOT NULL THEN 1 ELSE 0 END) as error_count,
  SUM(CASE WHEN error_message IS NOT NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as error_rate_pct
FROM system.query.history
WHERE warehouse_id = '$WAREHOUSE_ID'
GROUP BY time_bucket
ORDER BY time_bucket DESC;

-- Query 3: Table Growth
CREATE OR REPLACE VIEW ontos_ml.workbench.table_growth_monitoring AS
SELECT
  table_name,
  COUNT(*) as row_count,
  SUM(size_bytes) / 1024 / 1024 / 1024 as size_gb
FROM system.information_schema.tables t
JOIN system.information_schema.table_storage_metrics s
  ON t.table_catalog = s.catalog_name
  AND t.table_schema = s.schema_name
  AND t.table_name = s.table_name
WHERE t.table_catalog = 'ontos_ml'
  AND t.table_schema = 'workbench'
GROUP BY table_name;
```

### Alert Configuration

Create alerts in Databricks SQL:

#### Alert 1: High Error Rate
```sql
SELECT
  error_rate_pct,
  error_count,
  total_queries
FROM ontos_ml.workbench.app_error_monitoring
WHERE time_bucket = DATE_TRUNC('hour', NOW())
  AND error_rate_pct > 5  -- Alert if error rate > 5%
```

#### Alert 2: Slow Query Performance
```sql
SELECT
  avg_latency_seconds,
  p95_latency_seconds,
  request_count
FROM ontos_ml.workbench.app_latency_monitoring
WHERE time_bucket = DATE_TRUNC('minute', NOW())
  AND p95_latency_seconds > 10  -- Alert if p95 latency > 10 seconds
```

#### Alert 3: Warehouse Down
```bash
# Create a script to check warehouse status
# Schedule via cron or Databricks Job

#!/bin/bash
STATUS=$(databricks warehouses get $WAREHOUSE_ID --profile=prod -o json | jq -r '.state')
if [ "$STATUS" != "RUNNING" ]; then
  echo "ALERT: Warehouse $WAREHOUSE_ID is $STATUS"
  # Send notification (Slack, PagerDuty, email, etc.)
fi
```

---

## Performance Tuning

### Database Optimization

#### 1. Run OPTIMIZE on Delta Tables

```bash
# Create a weekly job to optimize tables
cat > optimize_tables.sql <<EOF
OPTIMIZE ontos_ml.workbench.sheets;
OPTIMIZE ontos_ml.workbench.templates;
OPTIMIZE ontos_ml.workbench.training_sheets;
OPTIMIZE ontos_ml.workbench.qa_pairs;
OPTIMIZE ontos_ml.workbench.canonical_labels;

-- Z-ORDER by commonly filtered columns
OPTIMIZE ontos_ml.workbench.sheets ZORDER BY (status, created_at);
OPTIMIZE ontos_ml.workbench.qa_pairs ZORDER BY (training_sheet_id, status);
EOF

# Run via SQL warehouse
databricks sql exec --file=optimize_tables.sql --warehouse-id=$WAREHOUSE_ID --profile=prod
```

#### 2. Vacuum Old Versions

```sql
-- Remove old file versions (keep 7 days)
VACUUM ontos_ml.workbench.sheets RETAIN 168 HOURS;
VACUUM ontos_ml.workbench.qa_pairs RETAIN 168 HOURS;
```

#### 3. Update Table Statistics

```sql
-- Update statistics for query optimizer
ANALYZE TABLE ontos_ml.workbench.sheets COMPUTE STATISTICS;
ANALYZE TABLE ontos_ml.workbench.qa_pairs COMPUTE STATISTICS;
```

### Application Optimization

#### 1. Enable Result Caching

```python
# In backend/app/core/databricks.py
from databricks.sdk import WorkspaceClient

client = WorkspaceClient()

# Enable caching in SQL execution
result = client.sql.execute_statement(
    warehouse_id=warehouse_id,
    statement=query,
    use_cache=True  # Enable result caching
)
```

#### 2. Implement Connection Pooling

```python
# In backend/app/core/databricks.py
from functools import lru_cache

@lru_cache(maxsize=1)
def get_databricks_client():
    """Cached Databricks client with connection pooling."""
    return WorkspaceClient()
```

#### 3. Add API Response Caching

```python
# In backend endpoints
from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend
from fastapi_cache.decorator import cache

# Initialize cache
FastAPICache.init(InMemoryBackend())

# Use on endpoints
@router.get("/sheets")
@cache(expire=60)  # Cache for 60 seconds
async def list_sheets():
    # ...
```

### Warehouse Tuning

#### 1. Right-Size Warehouse

| Workload | Recommended Size | Auto-Stop |
|----------|-----------------|-----------|
| Development | X-Small | 10 minutes |
| Testing | Small | 15 minutes |
| Production (Low) | Medium | 30 minutes |
| Production (High) | Large | 60 minutes |

#### 2. Enable Serverless (Recommended)

```bash
# Create serverless warehouse
databricks warehouses create \
  --name "ontos-ml-workbench-prod" \
  --cluster-size "Medium" \
  --warehouse-type "PRO" \
  --enable-serverless-compute \
  --profile=prod
```

#### 3. Configure Query Throttling

```bash
# Set max concurrent queries
databricks warehouses update $WAREHOUSE_ID \
  --max-num-clusters 2 \
  --profile=prod
```

---

## Backup and Recovery

### Automated Backups

#### Delta Table Time Travel

Delta tables automatically maintain version history:

```sql
-- View table history
DESCRIBE HISTORY ontos_ml.workbench.sheets;

-- Restore to previous version
RESTORE TABLE ontos_ml.workbench.sheets TO VERSION AS OF 42;

-- Restore to timestamp
RESTORE TABLE ontos_ml.workbench.sheets TO TIMESTAMP AS OF '2026-02-07 10:00:00';
```

#### Create Backup Snapshots

```sql
-- Create weekly backup snapshots
CREATE TABLE ontos_ml.workbench_backups.sheets_backup_20260207
AS SELECT * FROM ontos_ml.workbench.sheets;

CREATE TABLE ontos_ml.workbench_backups.qa_pairs_backup_20260207
AS SELECT * FROM ontos_ml.workbench.qa_pairs;
```

### Recovery Procedures

#### Scenario 1: Accidental Data Deletion

```sql
-- Restore from Delta time travel
RESTORE TABLE ontos_ml.workbench.sheets TO VERSION AS OF 10;

-- Or restore from backup
INSERT INTO ontos_ml.workbench.sheets
SELECT * FROM ontos_ml.workbench_backups.sheets_backup_20260207
WHERE id NOT IN (SELECT id FROM ontos_ml.workbench.sheets);
```

#### Scenario 2: Schema Migration Failure

```sql
-- Rollback schema changes
ALTER TABLE ontos_ml.workbench.sheets DROP COLUMN new_column;

-- Restore from backup if needed
DROP TABLE ontos_ml.workbench.sheets;
CREATE TABLE ontos_ml.workbench.sheets
AS SELECT * FROM ontos_ml.workbench_backups.sheets_backup_20260207;
```

#### Scenario 3: Complete Workspace Loss

```bash
# Restore from backup workspace
# 1. Export tables from backup workspace
databricks workspace export-dir /path/to/backup /local/backup --profile=backup

# 2. Import to new workspace
databricks workspace import-dir /local/backup /path/to/new --profile=new

# 3. Recreate Unity Catalog tables
databricks sql exec --file=schemas/create_tables.sql --warehouse-id=$WAREHOUSE_ID --profile=new

# 4. Load backup data
databricks sql exec "COPY INTO ontos_ml.workbench.sheets FROM '/backup/sheets'" --profile=new
```

---

## Scaling Guidelines

### Horizontal Scaling

#### App Instances
Databricks Apps automatically scale based on load. Monitor and adjust:

```yaml
# In app.yaml - increase replicas if needed
replicas: 3  # Default is 1
```

#### Warehouse Clusters
For high query concurrency:

```bash
# Enable multi-cluster warehouse
databricks warehouses update $WAREHOUSE_ID \
  --min-num-clusters 1 \
  --max-num-clusters 5 \
  --profile=prod
```

### Vertical Scaling

#### Increase App Resources
```yaml
# In app.yaml
resources:
  cpu: "4"      # Increase from 2
  memory: "8Gi" # Increase from 4Gi
```

#### Upgrade Warehouse Size
```bash
# Upgrade to larger warehouse
databricks warehouses update $WAREHOUSE_ID \
  --cluster-size "Large" \
  --profile=prod
```

### Data Partitioning

For large tables (> 1M rows):

```sql
-- Partition by date
ALTER TABLE ontos_ml.workbench.qa_pairs
SET TBLPROPERTIES (
  'delta.autoOptimize.optimizeWrite' = 'true',
  'delta.autoOptimize.autoCompact' = 'true'
);

-- Create partitioned table
CREATE TABLE ontos_ml.workbench.qa_pairs_partitioned
PARTITIONED BY (created_date)
AS SELECT *, DATE(created_at) as created_date
FROM ontos_ml.workbench.qa_pairs;
```

---

## Troubleshooting Guide

### Debug Mode

Enable detailed logging:

```bash
# In backend/.env
DEBUG=true
LOG_LEVEL=DEBUG

# Restart app to apply changes
databricks apps restart ontos-ml-workbench --profile=prod
```

### Collect Diagnostic Information

```bash
#!/bin/bash
# diagnostic_collector.sh - Collect diagnostic info

echo "=== App Status ==="
databricks apps get ontos-ml-workbench --profile=prod

echo "=== App Logs (last 500 lines) ==="
databricks apps logs ontos-ml-workbench --profile=prod --tail 500

echo "=== Warehouse Status ==="
databricks warehouses get $WAREHOUSE_ID --profile=prod

echo "=== Recent Queries ==="
databricks sql exec --warehouse-id=$WAREHOUSE_ID \
  "SELECT * FROM system.query.history WHERE warehouse_id = '$WAREHOUSE_ID' ORDER BY start_time DESC LIMIT 20" \
  --profile=prod

echo "=== Table Sizes ==="
databricks sql exec --warehouse-id=$WAREHOUSE_ID \
  "SHOW TABLES IN ontos_ml.workbench" \
  --profile=prod
```

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `WAREHOUSE_NOT_FOUND` | Warehouse deleted or invalid ID | Update DATABRICKS_WAREHOUSE_ID |
| `TABLE_OR_VIEW_NOT_FOUND` | Schema not initialized | Run database setup scripts |
| `PERMISSION_DENIED` | Insufficient permissions | Grant permissions to service principal |
| `CONNECTION_TIMEOUT` | Warehouse not started | Start warehouse or increase timeout |
| `INVALID_STATE` | App in error state | Restart app |

---

## Incident Response

### Severity Levels

- **P0 (Critical):** Complete service outage
- **P1 (High):** Major functionality broken
- **P2 (Medium):** Minor functionality impaired
- **P3 (Low):** Cosmetic or minor issues

### Incident Workflow

1. **Detection:** Alert triggers or user report
2. **Triage:** Assess severity and impact
3. **Investigation:** Gather diagnostic info
4. **Resolution:** Apply fix or workaround
5. **Verification:** Confirm issue resolved
6. **Post-Mortem:** Document incident and prevention

### Escalation Path

1. On-call engineer
2. Team lead
3. Platform engineering team
4. Databricks support (for platform issues)

### Rollback Decision Tree

```
Is the issue affecting > 50% of users?
├─ Yes → Immediate rollback
└─ No → Can we hotfix in < 30 minutes?
   ├─ Yes → Apply hotfix
   └─ No → Rollback and fix offline
```

---

## Maintenance Windows

### Scheduled Maintenance

- **Time:** Sundays 02:00-04:00 UTC
- **Frequency:** Monthly
- **Tasks:**
  - Database optimization (OPTIMIZE, VACUUM)
  - Apply security patches
  - Warehouse maintenance
  - Performance tuning

### Maintenance Checklist

- [ ] Notify users 48 hours in advance
- [ ] Create backup snapshots
- [ ] Run OPTIMIZE on all tables
- [ ] VACUUM old versions
- [ ] Update table statistics
- [ ] Apply app updates
- [ ] Run smoke tests
- [ ] Monitor for 1 hour post-maintenance

---

## Contact Information

- **Team:** Acme Instruments Data Engineering
- **On-Call:** [PagerDuty rotation]
- **Slack:** #ontos-ml-workbench-ops
- **Email:** ontos-ml-workbench-team@example.com
