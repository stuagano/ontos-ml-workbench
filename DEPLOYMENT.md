# Ontos ML Workbench - Deployment Guide

Complete deployment guide for the Ontos ML Workbench, covering everything from prerequisites to production deployment.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Initialization](#database-initialization)
4. [Backend Deployment](#backend-deployment)
5. [Frontend Deployment](#frontend-deployment)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Rollback Procedures](#rollback-procedures)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools

```bash
# Databricks CLI (v0.218+)
brew install databricks

# Node.js (18+)
brew install node

# Python (3.11+)
brew install python@3.11

# Optional: APX for unified development
uvx --index https://databricks-solutions.github.io/apx/simple apx init
```

### Databricks Workspace Requirements

**For Development/Testing:**
- Databricks workspace with Unity Catalog enabled
- Serverless SQL Warehouse available

**For Production:**
- Databricks workspace on AWS or Azure
- Unity Catalog with dedicated catalog (e.g., `ontos_ml`)
- SQL Warehouse (Pro or Serverless recommended)
- Service Principal for app authentication

### Access Requirements

- Workspace Admin or appropriate permissions to:
  - Create and manage catalogs/schemas
  - Create SQL warehouses
  - Deploy Databricks Apps
  - Grant Unity Catalog permissions
  - Create service principals

---

## Environment Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd ontos-ml-workbench
```

### 2. Create Environment Files

#### Backend Environment

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` with your configuration:

```bash
# App Configuration
APP_NAME=ontos-ml-workbench
APP_VERSION=0.1.0
DEBUG=false

# Databricks Connection (for local dev only)
DATABRICKS_HOST=https://your-workspace.cloud.databricks.com
DATABRICKS_TOKEN=your-personal-access-token
DATABRICKS_CONFIG_PROFILE=your-cli-profile

# Unity Catalog
DATABRICKS_CATALOG=ontos_ml
DATABRICKS_SCHEMA=workbench

# SQL Warehouse
DATABRICKS_WAREHOUSE_ID=your-warehouse-id

# API Configuration
API_PREFIX=/api/v1
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]

# Lakebase Configuration (optional)
LAKEBASE_SCHEMA=ontos_ml_lakebase
```

#### Frontend Environment

```bash
cd frontend
cp .env.example .env
```

Edit `frontend/.env` with your configuration:

```bash
# API Endpoint (for local dev)
VITE_API_BASE_URL=http://localhost:8000

# Feature Flags
VITE_ENABLE_MONITORING=true
VITE_ENABLE_FEEDBACK=true
VITE_ENABLE_APX=false

# Environment
VITE_ENVIRONMENT=development
```

### 3. Configure Databricks CLI

```bash
# Authenticate to your workspace
databricks auth login https://your-workspace.cloud.databricks.com --profile=your-profile

# Verify authentication
databricks auth profiles
```

### 4. Update DAB Configuration

Edit `databricks.yml` to add your target:

```yaml
targets:
  production:
    mode: production
    workspace:
      profile: your-production-profile
    variables:
      catalog: ontos_ml
      schema: workbench
      warehouse_id: "your-prod-warehouse-id"
```

---

## Database Initialization

### Automated Setup (Recommended)

Use the bootstrap script for complete database setup:

```bash
./scripts/bootstrap.sh <workspace-name>

# Example
./scripts/bootstrap.sh my-workspace
```

The bootstrap script will:
1. Authenticate to workspace
2. Create/find SQL warehouse
3. Create Unity Catalog schema
4. Create all required tables
5. Seed sample data
6. Deploy the application

### Manual Setup

If you need to set up the database manually:

#### Step 1: Create Catalog and Schema

```bash
# Via Databricks CLI
databricks catalogs create ontos_ml --profile=your-profile
databricks schemas create workbench ontos_ml --profile=your-profile
```

Or via SQL:

```sql
CREATE CATALOG IF NOT EXISTS ontos_ml;
USE CATALOG ontos_ml;
CREATE SCHEMA IF NOT EXISTS workbench;
```

#### Step 2: Create Tables

Execute the schema files in order:

```bash
cd schemas

# Core schema
databricks sql exec --file=01_create_catalog.sql --warehouse-id=$WAREHOUSE_ID --profile=your-profile
databricks sql exec --file=02_sheets.sql --warehouse-id=$WAREHOUSE_ID --profile=your-profile
databricks sql exec --file=03_templates.sql --warehouse-id=$WAREHOUSE_ID --profile=your-profile
databricks sql exec --file=04_canonical_labels.sql --warehouse-id=$WAREHOUSE_ID --profile=your-profile
databricks sql exec --file=05_training_sheets.sql --warehouse-id=$WAREHOUSE_ID --profile=your-profile
databricks sql exec --file=06_qa_pairs.sql --warehouse-id=$WAREHOUSE_ID --profile=your-profile
databricks sql exec --file=07_model_training_lineage.sql --warehouse-id=$WAREHOUSE_ID --profile=your-profile
databricks sql exec --file=08_example_store.sql --warehouse-id=$WAREHOUSE_ID --profile=your-profile

# Validation and seeding
databricks sql exec --file=99_validate_and_seed.sql --warehouse-id=$WAREHOUSE_ID --profile=your-profile
```

#### Step 3: Seed Sample Data (Optional)

```bash
# Seed simple test data
databricks sql exec --file=seed_simple.sql --warehouse-id=$WAREHOUSE_ID --profile=your-profile

# Seed full sample sheets
databricks sql exec --file=seed_sheets.sql --warehouse-id=$WAREHOUSE_ID --profile=your-profile

# Seed prompt templates
databricks sql exec --file=seed_templates.sql --warehouse-id=$WAREHOUSE_ID --profile=your-profile
```

#### Step 4: Verify Tables

```sql
-- Check tables were created
SHOW TABLES IN ontos_ml.workbench;

-- Verify sample data
SELECT COUNT(*) FROM ontos_ml.workbench.sheets;
SELECT COUNT(*) FROM ontos_ml.workbench.templates;
```

---

## Backend Deployment

### Local Development

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn app.main:app --reload --port 8000
```

Or using APX (recommended):

```bash
# From project root
apx dev start
```

### Deploy to Databricks

#### Option 1: Using Bootstrap Script (First Time)

```bash
./scripts/bootstrap.sh <workspace-name>
```

#### Option 2: Manual Deployment

```bash
# Build frontend first (see Frontend Deployment)
cd frontend
npm install
npm run build
cd ..

# Sync to workspace
databricks sync . /Workspace/Users/<your-email>/Apps/ontos-ml-workbench --profile=your-profile

# Create app (first time only)
databricks apps create ontos-ml-workbench --profile=your-profile

# Wait for compute to start (may take 2-3 minutes)
databricks apps get ontos-ml-workbench --profile=your-profile

# Deploy
databricks apps deploy ontos-ml-workbench \
  --source-code-path /Workspace/Users/<your-email>/Apps/ontos-ml-workbench \
  --profile=your-profile

# IMPORTANT: Poll for deployment completion (DO NOT SKIP!)
./.claude/scripts/poll-databricks-app.sh ontos-ml-workbench your-profile
```

**Note:** Always wait for deployment completion before testing. The polling script will automatically check deployment status every 5 seconds and exit when ready (typically 30-90 seconds).

#### Option 3: Using DAB Bundle

```bash
# Deploy to dev environment
databricks bundle deploy -t dev

# Deploy to production
databricks bundle deploy -t production
```

### Configure Service Principal Permissions

```sql
-- Replace ${SP_ID} with your service principal ID
-- Get SP ID from: databricks apps get ontos-ml-workbench -o json | jq -r '.service_principal_id'

GRANT USE CATALOG ON CATALOG ontos_ml TO `${SP_ID}`;
GRANT USE SCHEMA ON SCHEMA ontos_ml.workbench TO `${SP_ID}`;
GRANT SELECT, MODIFY ON SCHEMA ontos_ml.workbench TO `${SP_ID}`;
```

---

## Frontend Deployment

### Local Development

```bash
cd frontend

# Install dependencies
npm install

# Run development server (with API proxy)
npm run dev
```

Access at http://localhost:5173

### Production Build

```bash
cd frontend

# Clean previous builds
rm -rf dist

# Build for production
npm run build

# Verify build
ls -lh dist/
```

Build output will be in `frontend/dist/` and includes:
- Optimized JavaScript bundles
- Chunked vendor files for caching
- Static assets (images, fonts)
- index.html

### Deploy to Databricks

The frontend is automatically deployed as part of the backend deployment:

```bash
# Build frontend
cd frontend && npm run build && cd ..

# Deploy entire app
databricks apps deploy ontos-ml-workbench \
  --source-code-path /Workspace/Users/<your-email>/Apps/ontos-ml-workbench \
  --profile=your-profile

# IMPORTANT: Poll for deployment completion (DO NOT SKIP!)
./.claude/scripts/poll-databricks-app.sh ontos-ml-workbench your-profile
```

**Note:** Always wait for deployment completion before testing. The polling script will automatically check deployment status every 5 seconds and exit when ready (typically 30-90 seconds).

The FastAPI backend serves the frontend static files from `frontend/dist/`.

---

## Post-Deployment Verification

**Note:** If you used the polling script (`.claude/scripts/poll-databricks-app.sh`), deployment verification is automatic. The script confirms `compute_status: ACTIVE` and `pending_deployment: null` before exiting.

### 1. Check App Status (Manual Verification)

```bash
# Get app details
databricks apps get ontos-ml-workbench --profile=your-profile -o json

# Get app URL
databricks apps get ontos-ml-workbench --profile=your-profile -o json | jq -r '.url'
```

### 2. Verify Compute Status (Manual Verification)

```bash
# Check compute is ACTIVE
databricks apps get ontos-ml-workbench --profile=your-profile -o json | jq -r '.compute_status'

# Verify no pending deployment
databricks apps get ontos-ml-workbench --profile=your-profile -o json | jq -r '.pending_deployment'
```

Expected output:
- `compute_status`: `ACTIVE`
- `pending_deployment`: `null`

### 3. Test API Endpoints

```bash
# Get app URL
APP_URL=$(databricks apps get ontos-ml-workbench --profile=your-profile -o json | jq -r '.url')

# Test health endpoint
curl $APP_URL/api/health

# Test API endpoints
curl $APP_URL/api/v1/sheets
curl $APP_URL/api/v1/templates
```

**Interactive API Testing**: Open `$APP_URL/docs` in your browser for Swagger UI documentation. This provides:
- Complete API reference with request/response schemas
- Interactive "Try it out" functionality for all endpoints
- Real-time testing without curl/Postman
- Automatic OpenAPI schema generation

### 4. Verify Database Connectivity

```bash
# Check sheets table
curl $APP_URL/api/v1/sheets

# Check templates table
curl $APP_URL/api/v1/templates
```

### 5. Test Frontend

Open the app URL in a browser and verify:

- [ ] App loads without errors
- [ ] Navigation between stages works
- [ ] DATA stage shows sheets
- [ ] TOOLS menu is accessible
- [ ] No console errors in browser DevTools

### 5a. Interactive API Documentation

For debugging and API exploration, access the Swagger UI:

```bash
# Get app URL
APP_URL=$(databricks apps get ontos-ml-workbench --profile=your-profile -o json | jq -r '.url')

# Open Swagger UI
open "${APP_URL}/docs"

# Or ReDoc alternative
open "${APP_URL}/redoc"
```

**Swagger UI Features**:
- Complete API reference with all endpoints
- Interactive testing with "Try it out" button
- Request/response examples
- Schema validation and documentation
- Authentication testing

This is invaluable for:
- Debugging API issues
- Testing endpoints without frontend
- Validating request/response formats
- Exploring available operations

### 6. Run Smoke Tests

```bash
cd backend
python scripts/e2e_test.py
```

### 7. Check Logs

```bash
# View app logs
databricks apps logs ontos-ml-workbench --profile=your-profile

# View recent logs
databricks apps logs ontos-ml-workbench --profile=your-profile --tail 100
```

---

## Rollback Procedures

### Rollback App Deployment

```bash
# Stop current app
databricks apps stop ontos-ml-workbench --profile=your-profile

# Redeploy from previous workspace path
databricks apps deploy ontos-ml-workbench \
  --source-code-path /Workspace/Users/<your-email>/Apps/ontos-ml-workbench-backup \
  --profile=your-profile

# Or restart app if issue is transient
databricks apps start ontos-ml-workbench --profile=your-profile
```

### Rollback Database Changes

```sql
-- Restore from Delta table time travel
RESTORE TABLE ontos_ml.workbench.sheets TO VERSION AS OF <version_number>;
RESTORE TABLE ontos_ml.workbench.templates TO VERSION AS OF <version_number>;

-- Or use timestamp
RESTORE TABLE ontos_ml.workbench.sheets TO TIMESTAMP AS OF '2026-02-07 10:00:00';
```

### Rollback Unity Catalog Permissions

```sql
-- Revoke permissions if needed
REVOKE SELECT ON SCHEMA ontos_ml.workbench FROM `${SP_ID}`;
REVOKE MODIFY ON SCHEMA ontos_ml.workbench FROM `${SP_ID}`;
```

---

## Troubleshooting

### App Won't Start

**Symptoms:** App status is `STOPPED` or `ERROR`

**Solutions:**
1. Check logs: `databricks apps logs ontos-ml-workbench --profile=your-profile`
2. Verify app.yaml configuration
3. Check warehouse is running: `databricks warehouses get $WAREHOUSE_ID --profile=your-profile`
4. Restart app: `databricks apps start ontos-ml-workbench --profile=your-profile`

### Database Connection Errors

**Symptoms:** 500 errors, "Unable to connect to Unity Catalog"

**Solutions:**
1. Verify warehouse ID in environment variables
2. Check service principal permissions (see Configure Service Principal Permissions)
3. Verify catalog and schema exist
4. Test warehouse connectivity: `databricks sql exec --warehouse-id=$WAREHOUSE_ID "SELECT 1"`

### Frontend Not Loading

**Symptoms:** Blank page, 404 errors

**Solutions:**
1. Verify frontend was built: `ls frontend/dist/`
2. Rebuild frontend: `cd frontend && npm run build`
3. Check FastAPI is serving static files correctly
4. Verify no CORS issues in browser console

### Permission Denied Errors

**Symptoms:** 403 errors when accessing tables

**Solutions:**
1. Grant permissions to service principal (see Configure Service Principal Permissions)
2. Verify user has appropriate workspace permissions
3. Check catalog/schema ownership

### High Latency

**Symptoms:** Slow API responses

**Solutions:**
1. Check warehouse is started and not serverless cold start
2. Increase warehouse size
3. Enable result caching on warehouse
4. Review slow queries in Query History

---

## Next Steps

After successful deployment:

1. **Review Runbook** - See [RUNBOOK.md](RUNBOOK.md) for monitoring, alerts, and operations
2. **Set up Alerts** - Configure Databricks monitoring alerts (see Runbook)
3. **Enable Backups** - Set up regular Delta table snapshots (see Runbook)

---

## Support

For issues or questions:

- Check [RUNBOOK.md](RUNBOOK.md) for common issues
- Review Databricks Apps documentation: https://docs.databricks.com/apps/
- Contact: Acme Instruments Data Engineering Team
