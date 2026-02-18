# Ontos ML Workbench - Production Deployment Checklist

Complete checklist for deploying Ontos ML Workbench to production.

## Pre-Deployment Checklist

### Infrastructure

- [ ] **Databricks Workspace**
  - [ ] Production workspace provisioned
  - [ ] Unity Catalog enabled
  - [ ] Appropriate workspace tier (Premium or Enterprise)
  - [ ] Network security configured (private link, IP access lists)

- [ ] **Unity Catalog**
  - [ ] Production catalog created: `ontos_ml`
  - [ ] Schema created: `ontos_ml.workbench`
  - [ ] Service principal created for app authentication
  - [ ] Permissions granted to service principal
  - [ ] Backup catalog created: `ontos_ml_backups`

- [ ] **SQL Warehouse**
  - [ ] Production warehouse provisioned
  - [ ] Warehouse type: Pro or Serverless
  - [ ] Size appropriate for expected load
  - [ ] Auto-stop configured (30-60 minutes)
  - [ ] Query result caching enabled
  - [ ] Spot instance policy configured (if applicable)

- [ ] **Storage**
  - [ ] Unity Catalog volumes provisioned for multimodal data
  - [ ] Backup storage configured
  - [ ] Data retention policies defined
  - [ ] Access controls configured

### Security

- [ ] **Authentication & Authorization**
  - [ ] Service principal authentication configured
  - [ ] Personal access tokens disabled for app
  - [ ] OAuth 2.0 configured for user access
  - [ ] Role-based access control (RBAC) implemented
  - [ ] Least privilege principle applied

- [ ] **Secrets Management**
  - [ ] All secrets stored in Databricks Secrets
  - [ ] No hardcoded credentials in code
  - [ ] Environment variables properly configured
  - [ ] Secret rotation policy defined

- [ ] **Network Security**
  - [ ] Private Link configured (if required)
  - [ ] IP access lists configured
  - [ ] VPC peering established (if required)
  - [ ] TLS/SSL certificates configured
  - [ ] HTTPS enforced

- [ ] **Data Security**
  - [ ] Data encryption at rest enabled
  - [ ] Data encryption in transit enabled
  - [ ] Column-level encryption for sensitive data
  - [ ] Audit logging enabled
  - [ ] Data classification implemented

### Code Quality

- [ ] **Backend**
  - [ ] All tests passing: `pytest`
  - [ ] Code coverage > 80%
  - [ ] No security vulnerabilities: `bandit -r app/`
  - [ ] Type checking passing: `mypy app/`
  - [ ] Linting passing: `ruff check .`
  - [ ] No hardcoded credentials

- [ ] **Frontend**
  - [ ] All tests passing: `npm run test`
  - [ ] Type checking passing: `npx tsc --noEmit`
  - [ ] Linting passing: `npm run lint`
  - [ ] Production build succeeds: `npm run build`
  - [ ] Bundle size optimized (< 2MB total)
  - [ ] No console.log statements

- [ ] **Database**
  - [ ] All schema migration scripts tested
  - [ ] Foreign key constraints verified
  - [ ] Indexes created on frequently queried columns
  - [ ] Data validation constraints in place
  - [ ] Sample data scripts tested

### Configuration

- [ ] **Backend Configuration**
  - [ ] `app.yaml` configured for production
  - [ ] Environment variables set correctly
  - [ ] Debug mode disabled: `DEBUG=false`
  - [ ] Log level set to INFO or WARNING
  - [ ] CORS origins restricted to production domain
  - [ ] Connection pooling configured
  - [ ] Request timeouts configured

- [ ] **Frontend Configuration**
  - [ ] `.env.production` configured
  - [ ] API base URL set correctly
  - [ ] Debug mode disabled
  - [ ] Production feature flags set
  - [ ] Analytics tracking enabled (optional)
  - [ ] Error reporting configured

- [ ] **Database Configuration**
  - [ ] Catalog and schema names correct
  - [ ] Warehouse ID configured
  - [ ] Connection timeout appropriate
  - [ ] Query timeout configured
  - [ ] Table properties optimized

### Documentation

- [ ] **Technical Documentation**
  - [ ] Architecture diagrams updated
  - [ ] API documentation current
  - [ ] Database schema documented
  - [ ] Deployment guide reviewed
  - [ ] Runbook reviewed

- [ ] **User Documentation**
  - [ ] User guide updated
  - [ ] Feature documentation complete
  - [ ] Training materials prepared
  - [ ] FAQ document created
  - [ ] Video tutorials (optional)

- [ ] **Operational Documentation**
  - [ ] Monitoring setup documented
  - [ ] Alert configurations documented
  - [ ] Incident response plan created
  - [ ] Escalation paths defined
  - [ ] Contact information current

---

## Deployment Steps

### 1. Pre-Deployment Preparation

- [ ] **Backup Current State**
  ```sql
  -- Backup all tables
  CREATE TABLE ontos_ml_backups.sheets_backup_$(date +%Y%m%d)
  AS SELECT * FROM ontos_ml.workbench.sheets;

  -- Repeat for all tables
  ```

- [ ] **Notify Stakeholders**
  - [ ] Send deployment notification email
  - [ ] Update status page
  - [ ] Post in team Slack channel
  - [ ] Schedule deployment window

- [ ] **Create Rollback Plan**
  - [ ] Document rollback procedure
  - [ ] Test rollback on staging
  - [ ] Identify rollback decision criteria
  - [ ] Assign rollback decision maker

### 2. Database Deployment

- [ ] **Run Schema Migrations**
  ```bash
  cd schemas
  databricks sql exec --file=01_create_catalog.sql --warehouse-id=$WAREHOUSE_ID --profile=prod
  # Run all schema files in order
  databricks sql exec --file=99_validate_and_seed.sql --warehouse-id=$WAREHOUSE_ID --profile=prod
  ```

- [ ] **Verify Schema**
  ```sql
  -- Check all tables exist
  SHOW TABLES IN ontos_ml.workbench;

  -- Verify table structures
  DESCRIBE ontos_ml.workbench.sheets;
  DESCRIBE ontos_ml.workbench.qa_pairs;
  ```

- [ ] **Grant Permissions**
  ```sql
  -- Grant permissions to service principal
  GRANT USE CATALOG ON CATALOG ontos_ml TO `${SP_ID}`;
  GRANT USE SCHEMA ON SCHEMA ontos_ml.workbench TO `${SP_ID}`;
  GRANT SELECT, MODIFY ON SCHEMA ontos_ml.workbench TO `${SP_ID}`;
  ```

- [ ] **Seed Initial Data (if needed)**
  ```bash
  databricks sql exec --file=seed_templates.sql --warehouse-id=$WAREHOUSE_ID --profile=prod
  ```

### 3. Backend Deployment

- [ ] **Build Backend**
  ```bash
  cd backend
  pip install -r requirements.txt
  pytest  # Verify all tests pass
  ```

- [ ] **Sync to Workspace**
  ```bash
  databricks sync . /Workspace/Users/deploy/Apps/ontos-ml-workbench --profile=prod --watch=false
  ```

- [ ] **Configure App**
  - [ ] Update `app.yaml` with production settings
  - [ ] Verify environment variables
  - [ ] Check resource allocations

- [ ] **Deploy App**
  ```bash
  # Create app (first time only)
  databricks apps create ontos-ml-workbench --profile=prod

  # Deploy app
  databricks apps deploy ontos-ml-workbench \
    --source-code-path /Workspace/Users/deploy/Apps/ontos-ml-workbench \
    --profile=prod
  ```

- [ ] **Wait for App to Start**
  ```bash
  # Monitor app status
  watch -n 5 "databricks apps get ontos-ml-workbench --profile=prod -o json | jq -r '.compute_status'"
  ```

### 4. Frontend Deployment

- [ ] **Build Frontend**
  ```bash
  cd frontend
  npm install
  npm run build
  ls -lh dist/  # Verify build output
  ```

- [ ] **Deploy Frontend**
  - Frontend is automatically deployed with backend
  - Verify `frontend/dist/` is included in workspace sync

### 5. Post-Deployment Verification

See [Post-Deployment Verification](#post-deployment-verification) section below.

---

## Post-Deployment Verification

### Smoke Tests

- [ ] **Health Check**
  ```bash
  APP_URL=$(databricks apps get ontos-ml-workbench --profile=prod -o json | jq -r '.url')
  curl $APP_URL/health
  # Expected: {"status": "healthy", ...}
  ```

- [ ] **API Endpoints**
  ```bash
  # Test sheets endpoint
  curl $APP_URL/api/v1/sheets
  # Expected: JSON array of sheets

  # Test templates endpoint
  curl $APP_URL/api/v1/templates
  # Expected: JSON array of templates

  # Test health with auth
  curl -H "Authorization: Bearer $TOKEN" $APP_URL/api/v1/health/detailed
  ```

- [ ] **Database Connectivity**
  ```bash
  # Test database read
  curl $APP_URL/api/v1/sheets?limit=1

  # Test database write (if safe)
  curl -X POST $APP_URL/api/v1/sheets \
    -H "Content-Type: application/json" \
    -d '{"name": "Smoke Test Sheet", "description": "Test"}'
  ```

- [ ] **Frontend Loading**
  - [ ] Open app URL in browser
  - [ ] Verify homepage loads
  - [ ] Check browser console for errors
  - [ ] Test navigation between stages
  - [ ] Verify static assets load (images, fonts)

### Functional Tests

- [ ] **DATA Stage**
  - [ ] Create new sheet
  - [ ] List sheets
  - [ ] View sheet details
  - [ ] Edit sheet
  - [ ] Delete sheet

- [ ] **GENERATE Stage**
  - [ ] List templates
  - [ ] Apply template to sheet
  - [ ] Generate Q&A pairs
  - [ ] View training sheet

- [ ] **LABEL Stage**
  - [ ] Review Q&A pairs
  - [ ] Approve pair
  - [ ] Edit pair
  - [ ] Reject pair
  - [ ] Use canonical labeling tool

- [ ] **TRAIN Stage**
  - [ ] Submit training job
  - [ ] Monitor training progress
  - [ ] View training results

- [ ] **DEPLOY Stage**
  - [ ] List deployments
  - [ ] Deploy model
  - [ ] Test deployed endpoint

- [ ] **MONITOR Stage**
  - [ ] View monitoring dashboard
  - [ ] Check metrics
  - [ ] View alerts

- [ ] **IMPROVE Stage**
  - [ ] Submit feedback
  - [ ] View improvement suggestions
  - [ ] Identify retraining candidates

### Performance Tests

- [ ] **Response Times**
  ```bash
  # Test API response times
  time curl $APP_URL/api/v1/sheets
  # Expected: < 500ms

  time curl $APP_URL/api/v1/qa_pairs?limit=100
  # Expected: < 2s
  ```

- [ ] **Concurrent Users**
  - [ ] Run load test with 10 concurrent users
  - [ ] Monitor response times under load
  - [ ] Check for errors under load

- [ ] **Database Performance**
  ```sql
  -- Check query performance
  SELECT
    query_text,
    execution_duration / 1000 as duration_seconds
  FROM system.query.history
  WHERE warehouse_id = '$WAREHOUSE_ID'
    AND start_time > NOW() - INTERVAL 1 HOUR
  ORDER BY execution_duration DESC
  LIMIT 10;
  ```

### Security Verification

- [ ] **Authentication**
  - [ ] Verify unauthenticated requests are rejected
  - [ ] Verify token-based auth works
  - [ ] Verify OAuth flow works

- [ ] **Authorization**
  - [ ] Verify users can only access permitted data
  - [ ] Verify service principal has correct permissions
  - [ ] Verify admin functions require admin role

- [ ] **Data Protection**
  - [ ] Verify encryption at rest
  - [ ] Verify encryption in transit (HTTPS)
  - [ ] Verify audit logs are being written

### Monitoring Verification

- [ ] **Metrics Collection**
  - [ ] Verify metrics are being collected
  - [ ] Check System Tables for query history
  - [ ] Verify custom metrics are working

- [ ] **Alerts**
  - [ ] Test alert notifications
  - [ ] Verify alert thresholds are correct
  - [ ] Check alert escalation paths

- [ ] **Logging**
  - [ ] Verify application logs are available
  - [ ] Check log aggregation
  - [ ] Verify log retention settings

---

## Performance Baselines

Record baseline performance metrics for comparison:

### API Response Times

| Endpoint | Method | p50 | p95 | p99 |
|----------|--------|-----|-----|-----|
| `/api/v1/sheets` | GET | ___ | ___ | ___ |
| `/api/v1/templates` | GET | ___ | ___ | ___ |
| `/api/v1/qa_pairs` | GET | ___ | ___ | ___ |
| `/api/v1/sheets` | POST | ___ | ___ | ___ |
| `/api/v1/training_sheets/{id}/generate` | POST | ___ | ___ | ___ |

### Database Query Times

| Query | Avg Duration | p95 Duration |
|-------|-------------|--------------|
| List sheets (100 rows) | ___ | ___ |
| Get sheet by ID | ___ | ___ |
| List Q&A pairs (1000 rows) | ___ | ___ |
| Generate Q&A pairs (100 items) | ___ | ___ |

### Resource Usage

| Metric | Baseline |
|--------|----------|
| App CPU usage (idle) | ___ |
| App CPU usage (load) | ___ |
| App memory usage (idle) | ___ |
| App memory usage (load) | ___ |
| Warehouse DBU/hour (low load) | ___ |
| Warehouse DBU/hour (high load) | ___ |

### Data Volumes

| Table | Row Count | Size (GB) |
|-------|-----------|-----------|
| sheets | ___ | ___ |
| templates | ___ | ___ |
| training_sheets | ___ | ___ |
| qa_pairs | ___ | ___ |
| canonical_labels | ___ | ___ |

---

## Rollback Procedure

If critical issues are discovered:

### Immediate Rollback (< 30 minutes after deployment)

1. **Stop Current App**
   ```bash
   databricks apps stop ontos-ml-workbench --profile=prod
   ```

2. **Restore Previous App Version**
   ```bash
   databricks apps deploy ontos-ml-workbench \
     --source-code-path /Workspace/Users/deploy/Apps/ontos-ml-workbench-backup \
     --profile=prod
   ```

3. **Verify App Restarted**
   ```bash
   databricks apps get ontos-ml-workbench --profile=prod
   ```

### Database Rollback (if schema changed)

1. **Restore Tables from Backup**
   ```sql
   -- Drop current tables
   DROP TABLE IF EXISTS ontos_ml.workbench.sheets;

   -- Restore from backup
   CREATE TABLE ontos_ml.workbench.sheets
   AS SELECT * FROM ontos_ml_backups.sheets_backup_$(date +%Y%m%d);
   ```

2. **Or Use Time Travel**
   ```sql
   -- Restore to version before deployment
   RESTORE TABLE ontos_ml.workbench.sheets TO VERSION AS OF 42;
   ```

### Notification

1. Send rollback notification to stakeholders
2. Update status page
3. Schedule post-mortem meeting
4. Document rollback reason

---

## Post-Deployment Tasks

After successful deployment:

- [ ] **Update Documentation**
  - [ ] Record deployment date and version
  - [ ] Update architecture diagrams if changed
  - [ ] Document any manual configuration steps
  - [ ] Update runbook with lessons learned

- [ ] **Enable Monitoring**
  - [ ] Verify all monitoring dashboards
  - [ ] Enable production alerts
  - [ ] Set up on-call rotation
  - [ ] Schedule weekly health checks

- [ ] **User Communication**
  - [ ] Send deployment success notification
  - [ ] Provide user training if needed
  - [ ] Share updated documentation
  - [ ] Collect initial feedback

- [ ] **Schedule Follow-ups**
  - [ ] 1-day check-in: Verify stability
  - [ ] 1-week review: Performance analysis
  - [ ] 1-month review: Usage metrics
  - [ ] Quarterly review: ROI assessment

---

## Approval Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| **Tech Lead** | | | |
| **Product Owner** | | | |
| **Security Lead** | | | |
| **Operations Lead** | | | |

---

## Deployment Log

| Date | Version | Deployed By | Status | Notes |
|------|---------|-------------|--------|-------|
| YYYY-MM-DD | v0.1.0 | | | |

---

## Emergency Contacts

| Role | Name | Contact | Availability |
|------|------|---------|--------------|
| Primary On-Call | | | 24/7 |
| Secondary On-Call | | | 24/7 |
| Tech Lead | | | Business hours |
| Databricks Support | | | 24/7 |
