# Ontos ML Workbench - Monitoring Setup Guide

Complete guide for setting up monitoring, metrics, alerts, and dashboards for Ontos ML Workbench.

## Table of Contents

1. [Overview](#overview)
2. [Databricks System Tables](#databricks-system-tables)
3. [Key Metrics](#key-metrics)
4. [Dashboard Setup](#dashboard-setup)
5. [Alert Configuration](#alert-configuration)
6. [Log Aggregation](#log-aggregation)
7. [Performance Monitoring](#performance-monitoring)
8. [Cost Monitoring](#cost-monitoring)

---

## Overview

Ontos ML Workbench monitoring leverages:

- **Databricks System Tables** - Built-in query history, audit logs, billing data
- **SQL Dashboards** - Custom dashboards for key metrics
- **Databricks Alerts** - Automated alerts for threshold breaches
- **App Logs** - Application-level logging via Databricks Apps
- **MLflow** - Model training and deployment tracking

---

## Databricks System Tables

### Available System Tables

Databricks provides comprehensive system tables for monitoring:

```sql
-- Query History (all SQL queries)
SELECT * FROM system.query.history LIMIT 10;

-- Audit Logs (access and permission changes)
SELECT * FROM system.access.audit LIMIT 10;

-- Billing Usage (DBU consumption)
SELECT * FROM system.billing.usage LIMIT 10;

-- Table Lineage (data flow tracking)
SELECT * FROM system.access.table_lineage LIMIT 10;
```

### Grant Access to System Tables

```sql
-- Grant READ access to monitoring user/service principal
GRANT SELECT ON CATALOG system TO `monitoring_user@example.com`;
GRANT SELECT ON SCHEMA system.query TO `monitoring_user@example.com`;
GRANT SELECT ON SCHEMA system.access TO `monitoring_user@example.com`;
GRANT SELECT ON SCHEMA system.billing TO `monitoring_user@example.com`;
```

---

## Key Metrics

### Application Health Metrics

#### 1. Request Rate and Latency

```sql
CREATE OR REPLACE VIEW ontos_ml.workbench.monitoring_request_latency AS
SELECT
  DATE_TRUNC('minute', start_time) as time_bucket,
  user_email,
  COUNT(*) as request_count,
  AVG(execution_duration) / 1000 as avg_latency_seconds,
  PERCENTILE(execution_duration, 0.50) / 1000 as p50_latency_seconds,
  PERCENTILE(execution_duration, 0.95) / 1000 as p95_latency_seconds,
  PERCENTILE(execution_duration, 0.99) / 1000 as p99_latency_seconds,
  MAX(execution_duration) / 1000 as max_latency_seconds
FROM system.query.history
WHERE warehouse_id = '${WAREHOUSE_ID}'
  AND start_time > NOW() - INTERVAL 24 HOURS
GROUP BY time_bucket, user_email
ORDER BY time_bucket DESC;
```

#### 2. Error Rate

```sql
CREATE OR REPLACE VIEW ontos_ml.workbench.monitoring_error_rate AS
SELECT
  DATE_TRUNC('hour', start_time) as time_bucket,
  COUNT(*) as total_queries,
  SUM(CASE WHEN error_message IS NOT NULL THEN 1 ELSE 0 END) as error_count,
  SUM(CASE WHEN error_message IS NOT NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as error_rate_pct,
  COLLECT_LIST(DISTINCT error_message) as error_messages
FROM system.query.history
WHERE warehouse_id = '${WAREHOUSE_ID}'
  AND start_time > NOW() - INTERVAL 24 HOURS
GROUP BY time_bucket
ORDER BY time_bucket DESC;
```

#### 3. Active Users

```sql
CREATE OR REPLACE VIEW ontos_ml.workbench.monitoring_active_users AS
SELECT
  DATE(start_time) as date,
  COUNT(DISTINCT user_email) as daily_active_users,
  COUNT(DISTINCT CASE WHEN start_time > NOW() - INTERVAL 1 HOUR THEN user_email END) as hourly_active_users
FROM system.query.history
WHERE warehouse_id = '${WAREHOUSE_ID}'
  AND start_time > NOW() - INTERVAL 30 DAYS
GROUP BY date
ORDER BY date DESC;
```

### Database Metrics

#### 4. Table Growth

```sql
CREATE OR REPLACE VIEW ontos_ml.workbench.monitoring_table_growth AS
SELECT
  table_name,
  COUNT(*) as row_count,
  SUM(size_bytes) / 1024 / 1024 / 1024 as size_gb,
  MAX(created_at) as latest_record,
  MIN(created_at) as earliest_record,
  DATEDIFF(NOW(), MIN(created_at)) as days_of_data
FROM ontos_ml.workbench.sheets  -- Union with other tables
GROUP BY table_name
UNION ALL
SELECT
  'templates' as table_name,
  COUNT(*) as row_count,
  0 as size_gb,
  MAX(created_at) as latest_record,
  MIN(created_at) as earliest_record,
  DATEDIFF(NOW(), MIN(created_at)) as days_of_data
FROM ontos_ml.workbench.templates
UNION ALL
SELECT
  'qa_pairs' as table_name,
  COUNT(*) as row_count,
  0 as size_gb,
  MAX(created_at) as latest_record,
  MIN(created_at) as earliest_record,
  DATEDIFF(NOW(), MIN(created_at)) as days_of_data
FROM ontos_ml.workbench.qa_pairs;
```

#### 5. Data Quality Metrics

```sql
CREATE OR REPLACE VIEW ontos_ml.workbench.monitoring_data_quality AS
SELECT
  'qa_pairs' as table_name,
  COUNT(*) as total_records,
  SUM(CASE WHEN status = 'labeled' THEN 1 ELSE 0 END) as labeled_count,
  SUM(CASE WHEN status = 'labeled' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as labeled_pct,
  SUM(CASE WHEN canonical_label_id IS NOT NULL THEN 1 ELSE 0 END) as with_canonical_label,
  SUM(CASE WHEN canonical_label_id IS NOT NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as canonical_label_pct
FROM ontos_ml.workbench.qa_pairs
UNION ALL
SELECT
  'canonical_labels' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT sheet_id) as distinct_sheets,
  COUNT(DISTINCT label_type) as distinct_label_types,
  AVG(LENGTH(label_value)) as avg_label_length
FROM ontos_ml.workbench.canonical_labels;
```

### Resource Metrics

#### 6. Warehouse Utilization

```sql
CREATE OR REPLACE VIEW ontos_ml.workbench.monitoring_warehouse_utilization AS
SELECT
  DATE_TRUNC('hour', start_time) as time_bucket,
  warehouse_id,
  COUNT(*) as query_count,
  SUM(execution_duration) / 1000 / 3600 as total_compute_hours,
  AVG(execution_duration) / 1000 as avg_query_duration_seconds,
  MAX(execution_duration) / 1000 as max_query_duration_seconds
FROM system.query.history
WHERE warehouse_id = '${WAREHOUSE_ID}'
  AND start_time > NOW() - INTERVAL 7 DAYS
GROUP BY time_bucket, warehouse_id
ORDER BY time_bucket DESC;
```

#### 7. Cost Tracking

```sql
CREATE OR REPLACE VIEW ontos_ml.workbench.monitoring_cost AS
SELECT
  DATE(usage_date) as date,
  workspace_id,
  SUM(usage_quantity) as total_dbus,
  SUM(usage_quantity * list_price) as estimated_cost_usd,
  AVG(usage_quantity) as avg_dbus_per_day
FROM system.billing.usage
WHERE workspace_id = '${WORKSPACE_ID}'
  AND usage_date > NOW() - INTERVAL 30 DAYS
  AND sku_name LIKE '%SQL%'
GROUP BY date, workspace_id
ORDER BY date DESC;
```

### Workflow Metrics

#### 8. Stage Completion Tracking

```sql
CREATE OR REPLACE VIEW ontos_ml.workbench.monitoring_workflow_progress AS
SELECT
  'Sheets' as stage,
  COUNT(*) as total_items,
  SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as completed_items,
  SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as completion_pct
FROM ontos_ml.workbench.sheets
UNION ALL
SELECT
  'Training Sheets' as stage,
  COUNT(*) as total_items,
  SUM(CASE WHEN status = 'ready' THEN 1 ELSE 0 END) as completed_items,
  SUM(CASE WHEN status = 'ready' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as completion_pct
FROM ontos_ml.workbench.training_sheets
UNION ALL
SELECT
  'Q&A Pairs' as stage,
  COUNT(*) as total_items,
  SUM(CASE WHEN status = 'labeled' THEN 1 ELSE 0 END) as completed_items,
  SUM(CASE WHEN status = 'labeled' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as completion_pct
FROM ontos_ml.workbench.qa_pairs;
```

---

## Dashboard Setup

### Create Monitoring Dashboard

1. **Navigate to Databricks SQL**
   - Go to SQL Personas in your workspace
   - Click "Dashboards" > "Create Dashboard"

2. **Create Dashboard: Ontos ML Workbench Health**

#### Widget 1: Request Rate (Time Series)

```sql
SELECT
  time_bucket,
  SUM(request_count) as requests_per_minute
FROM ontos_ml.workbench.monitoring_request_latency
WHERE time_bucket > NOW() - INTERVAL 24 HOURS
GROUP BY time_bucket
ORDER BY time_bucket;
```

**Visualization:** Line chart
**X-axis:** time_bucket
**Y-axis:** requests_per_minute

#### Widget 2: Error Rate (Time Series)

```sql
SELECT
  time_bucket,
  error_rate_pct
FROM ontos_ml.workbench.monitoring_error_rate
WHERE time_bucket > NOW() - INTERVAL 24 HOURS
ORDER BY time_bucket;
```

**Visualization:** Line chart with threshold line at 5%
**X-axis:** time_bucket
**Y-axis:** error_rate_pct

#### Widget 3: Latency Percentiles (Time Series)

```sql
SELECT
  time_bucket,
  AVG(p50_latency_seconds) as p50,
  AVG(p95_latency_seconds) as p95,
  AVG(p99_latency_seconds) as p99
FROM ontos_ml.workbench.monitoring_request_latency
WHERE time_bucket > NOW() - INTERVAL 24 HOURS
GROUP BY time_bucket
ORDER BY time_bucket;
```

**Visualization:** Multi-line chart
**X-axis:** time_bucket
**Y-axis:** latency (seconds)

#### Widget 4: Active Users (Counter)

```sql
SELECT
  hourly_active_users as value
FROM ontos_ml.workbench.monitoring_active_users
WHERE date = CURRENT_DATE()
LIMIT 1;
```

**Visualization:** Counter

#### Widget 5: Table Sizes (Bar Chart)

```sql
SELECT
  table_name,
  row_count,
  size_gb
FROM ontos_ml.workbench.monitoring_table_growth
ORDER BY size_gb DESC;
```

**Visualization:** Horizontal bar chart
**X-axis:** size_gb
**Y-axis:** table_name

#### Widget 6: Data Quality (Pie Chart)

```sql
SELECT
  status,
  COUNT(*) as count
FROM ontos_ml.workbench.qa_pairs
GROUP BY status;
```

**Visualization:** Pie chart

#### Widget 7: Daily Cost (Line Chart)

```sql
SELECT
  date,
  estimated_cost_usd
FROM ontos_ml.workbench.monitoring_cost
WHERE date > NOW() - INTERVAL 30 DAYS
ORDER BY date;
```

**Visualization:** Line chart
**X-axis:** date
**Y-axis:** estimated_cost_usd

#### Widget 8: Workflow Progress (Funnel)

```sql
SELECT
  stage,
  completion_pct
FROM ontos_ml.workbench.monitoring_workflow_progress
ORDER BY
  CASE stage
    WHEN 'Sheets' THEN 1
    WHEN 'Training Sheets' THEN 2
    WHEN 'Q&A Pairs' THEN 3
  END;
```

**Visualization:** Funnel chart

### Dashboard Refresh Schedule

Set dashboard to auto-refresh:
- **Refresh interval:** 5 minutes
- **Active hours:** 24/7 (for production)
- **Notification:** Email on refresh failure

---

## Alert Configuration

### Create Alerts in Databricks SQL

#### Alert 1: High Error Rate

**Query:**
```sql
SELECT
  error_rate_pct,
  error_count,
  total_queries,
  time_bucket
FROM ontos_ml.workbench.monitoring_error_rate
WHERE time_bucket = DATE_TRUNC('hour', NOW())
LIMIT 1;
```

**Alert Condition:**
- Trigger when: `error_rate_pct > 5`
- Check interval: Every 10 minutes
- Notification: Email + Slack

**Alert Template:**
```
🚨 High Error Rate Alert

Error Rate: {{ error_rate_pct }}%
Error Count: {{ error_count }}
Total Queries: {{ total_queries }}
Time: {{ time_bucket }}

Action Required: Investigate errors immediately.
```

#### Alert 2: High Latency

**Query:**
```sql
SELECT
  p95_latency_seconds,
  p99_latency_seconds,
  request_count,
  time_bucket
FROM ontos_ml.workbench.monitoring_request_latency
WHERE time_bucket > NOW() - INTERVAL 15 MINUTES
ORDER BY time_bucket DESC
LIMIT 1;
```

**Alert Condition:**
- Trigger when: `p95_latency_seconds > 5`
- Check interval: Every 5 minutes
- Notification: Email + PagerDuty

**Alert Template:**
```
⚠️ High Latency Alert

P95 Latency: {{ p95_latency_seconds }}s
P99 Latency: {{ p99_latency_seconds }}s
Request Count: {{ request_count }}
Time: {{ time_bucket }}

Action: Check warehouse status and query performance.
```

#### Alert 3: Warehouse Down

**Query:**
```sql
SELECT
  warehouse_id,
  MAX(start_time) as last_query_time,
  TIMESTAMPDIFF(MINUTE, MAX(start_time), NOW()) as minutes_since_last_query
FROM system.query.history
WHERE warehouse_id = '${WAREHOUSE_ID}'
GROUP BY warehouse_id;
```

**Alert Condition:**
- Trigger when: `minutes_since_last_query > 60`
- Check interval: Every 15 minutes
- Notification: Email + PagerDuty (P1)

**Alert Template:**
```
🔴 Warehouse Inactive Alert

Warehouse ID: {{ warehouse_id }}
Last Query: {{ last_query_time }}
Minutes Since Last Query: {{ minutes_since_last_query }}

Action: Check if warehouse is running and restart if needed.
```

#### Alert 4: Rapid Table Growth

**Query:**
```sql
SELECT
  table_name,
  row_count,
  size_gb,
  (size_gb - LAG(size_gb, 1) OVER (PARTITION BY table_name ORDER BY date)) as growth_gb
FROM ontos_ml.workbench.monitoring_table_growth
WHERE date > NOW() - INTERVAL 7 DAYS
ORDER BY growth_gb DESC;
```

**Alert Condition:**
- Trigger when: `growth_gb > 10`
- Check interval: Daily
- Notification: Email

**Alert Template:**
```
📈 Rapid Table Growth Alert

Table: {{ table_name }}
Current Size: {{ size_gb }} GB
Growth: {{ growth_gb }} GB
Row Count: {{ row_count }}

Action: Review data retention policies.
```

#### Alert 5: Low Data Quality

**Query:**
```sql
SELECT
  labeled_pct
FROM ontos_ml.workbench.monitoring_data_quality
WHERE table_name = 'qa_pairs';
```

**Alert Condition:**
- Trigger when: `labeled_pct < 80`
- Check interval: Daily
- Notification: Email

**Alert Template:**
```
⚠️ Low Data Quality Alert

Labeled Percentage: {{ labeled_pct }}%

Action: Review labeling backlog and assign reviewers.
```

---

## Log Aggregation

### View Application Logs

```bash
# Stream logs in real-time
databricks apps logs ontos-ml-workbench --profile=prod --follow

# View recent logs
databricks apps logs ontos-ml-workbench --profile=prod --tail 500

# Export logs to file
databricks apps logs ontos-ml-workbench --profile=prod > logs_$(date +%Y%m%d).txt
```

### Log Levels

Configure log levels in `backend/.env`:

```bash
# Development
LOG_LEVEL=DEBUG

# Production
LOG_LEVEL=INFO
```

### Structured Logging

Implement structured logging in backend:

```python
import logging
import json

logger = logging.getLogger(__name__)

# Structured log entry
logger.info(json.dumps({
    "event": "sheet_created",
    "sheet_id": sheet.id,
    "user": user_email,
    "timestamp": datetime.now().isoformat()
}))
```

### Log Analysis Queries

```sql
-- Parse JSON logs from system tables
SELECT
  action_name,
  request_params,
  response,
  event_time
FROM system.access.audit
WHERE workspace_id = '${WORKSPACE_ID}'
  AND action_name LIKE 'ontos-ml-workbench%'
  AND event_time > NOW() - INTERVAL 24 HOURS
ORDER BY event_time DESC;
```

---

## Performance Monitoring

### Query Performance Analysis

```sql
-- Identify slow queries
SELECT
  query_text,
  execution_duration / 1000 as duration_seconds,
  rows_produced,
  bytes_scanned,
  start_time,
  user_email
FROM system.query.history
WHERE warehouse_id = '${WAREHOUSE_ID}'
  AND start_time > NOW() - INTERVAL 24 HOURS
  AND execution_duration > 10000  -- > 10 seconds
ORDER BY execution_duration DESC
LIMIT 20;
```

### Cache Hit Rate

```sql
-- Calculate cache hit rate
SELECT
  DATE(start_time) as date,
  COUNT(*) as total_queries,
  SUM(CASE WHEN cache_hit = true THEN 1 ELSE 0 END) as cache_hits,
  SUM(CASE WHEN cache_hit = true THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as cache_hit_rate_pct
FROM system.query.history
WHERE warehouse_id = '${WAREHOUSE_ID}'
  AND start_time > NOW() - INTERVAL 30 DAYS
GROUP BY date
ORDER BY date DESC;
```

### Warehouse Queue Time

```sql
-- Monitor warehouse queue times
SELECT
  DATE_TRUNC('hour', start_time) as time_bucket,
  AVG(queued_duration) / 1000 as avg_queue_seconds,
  MAX(queued_duration) / 1000 as max_queue_seconds,
  COUNT(*) as queued_queries
FROM system.query.history
WHERE warehouse_id = '${WAREHOUSE_ID}'
  AND start_time > NOW() - INTERVAL 24 HOURS
  AND queued_duration > 0
GROUP BY time_bucket
ORDER BY time_bucket DESC;
```

---

## Cost Monitoring

### DBU Consumption by Feature

```sql
-- Track DBU consumption by query pattern
SELECT
  CASE
    WHEN query_text LIKE '%sheets%' THEN 'Sheets'
    WHEN query_text LIKE '%qa_pairs%' THEN 'Q&A Pairs'
    WHEN query_text LIKE '%templates%' THEN 'Templates'
    ELSE 'Other'
  END as feature,
  COUNT(*) as query_count,
  SUM(execution_duration) / 1000 / 3600 as compute_hours,
  SUM(bytes_scanned) / 1024 / 1024 / 1024 as gb_scanned
FROM system.query.history
WHERE warehouse_id = '${WAREHOUSE_ID}'
  AND start_time > NOW() - INTERVAL 30 DAYS
GROUP BY feature
ORDER BY compute_hours DESC;
```

### Cost Optimization Opportunities

```sql
-- Find queries that scan too much data
SELECT
  query_text,
  bytes_scanned / 1024 / 1024 / 1024 as gb_scanned,
  rows_produced,
  execution_duration / 1000 as duration_seconds,
  bytes_scanned / rows_produced as bytes_per_row
FROM system.query.history
WHERE warehouse_id = '${WAREHOUSE_ID}'
  AND start_time > NOW() - INTERVAL 7 DAYS
  AND bytes_scanned > 1073741824  -- > 1 GB
ORDER BY bytes_scanned DESC
LIMIT 50;
```

### Budget Alerts

```sql
-- Set up budget alert query
SELECT
  SUM(usage_quantity * list_price) as total_cost_usd,
  COUNT(DISTINCT DATE(usage_date)) as days_in_period,
  SUM(usage_quantity * list_price) / COUNT(DISTINCT DATE(usage_date)) as avg_daily_cost
FROM system.billing.usage
WHERE workspace_id = '${WORKSPACE_ID}'
  AND usage_date > NOW() - INTERVAL 30 DAYS
  AND sku_name LIKE '%SQL%';
```

**Alert Condition:** `total_cost_usd > monthly_budget`

---

## Monitoring Best Practices

### Dashboard Organization

1. **Executive Dashboard**
   - High-level KPIs
   - Daily active users
   - Cost tracking
   - Workflow completion

2. **Operations Dashboard**
   - Error rates
   - Latency metrics
   - Resource utilization
   - Alert status

3. **Performance Dashboard**
   - Query performance
   - Cache hit rates
   - Queue times
   - Database growth

### Alert Best Practices

1. **Severity Levels**
   - P0 (Critical): Service down, requires immediate action
   - P1 (High): Major functionality impaired, < 1 hour response
   - P2 (Medium): Minor functionality impaired, < 4 hours response
   - P3 (Low): Informational, next business day

2. **Alert Routing**
   - P0/P1: PagerDuty → On-call engineer
   - P2: Email → Team lead
   - P3: Email → Team distribution list

3. **Alert Fatigue Prevention**
   - Set appropriate thresholds
   - Use time-based windows
   - Implement alert de-duplication
   - Regular alert review and tuning

### Regular Maintenance

- **Daily:** Review error logs, check alert status
- **Weekly:** Analyze performance trends, optimize slow queries
- **Monthly:** Review cost trends, update dashboards
- **Quarterly:** Audit alert effectiveness, review monitoring strategy

---

## Next Steps

After setting up monitoring:

1. **Test Alerts** - Trigger each alert to verify notifications
2. **Baseline Metrics** - Record baseline performance for comparison
3. **Document Runbook** - Update runbook with monitoring procedures
4. **Train Team** - Ensure team knows how to access dashboards
5. **Schedule Reviews** - Set up regular monitoring review meetings
