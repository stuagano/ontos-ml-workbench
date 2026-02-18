# Deploying Ontos ML Workbench to Databricks Apps

This guide covers deploying the Ontos ML Workbench application to Databricks Apps using APX and Databricks Asset Bundles (DAB).

## Prerequisites

- Databricks CLI v0.281.0+ installed (`databricks --version`)
- Databricks workspace profile configured (`.databrickscfg`)
- SQL Warehouse created in your workspace
- APX installed (`apx --version`)

## Deployment Architecture

```
┌─────────────────────────────────────────────────┐
│ Databricks Apps (Serverless Container)         │
├─────────────────────────────────────────────────┤
│ FastAPI Backend (Python)                       │
│  ├─ REST API endpoints (/api/v1/*)            │
│  ├─ Databricks SDK integration                │
│  └─ Static file serving                       │
├─────────────────────────────────────────────────┤
│ React Frontend (Vite build)                    │
│  └─ Served from /backend/static/               │
└─────────────────────────────────────────────────┘
         │
         ├─> Unity Catalog (Data)
         ├─> SQL Warehouses (Queries)
         └─> Databricks Jobs (Background Tasks)
```

## Quick Start

### 1. Build the Frontend

APX handles building the React frontend and copying it to the backend static directory:

```bash
# Build optimized production bundle
apx build

# Alternative: Manual build
cd frontend && npm run build
```

This creates optimized assets in `backend/static/`:
- `index.html` - Main HTML file
- `assets/` - JavaScript, CSS, fonts, images

### 2. Configure Target Workspace

Edit `databricks.yml` to set your target workspace:

```yaml
targets:
  dev:
    mode: development
    default: true
    workspace:
      profile: your-workspace-profile  # Change this
    variables:
      catalog: main
      schema: ontos_ml_workbench_dev
      warehouse_id: "your-warehouse-id"  # Add your SQL Warehouse ID
```

Get your SQL Warehouse ID from:
- Databricks UI → SQL → Warehouses → Click warehouse → Copy ID from URL
- Or use CLI: `databricks warehouses list`

### 3. Validate Bundle Configuration

```bash
# Validate DAB configuration
databricks bundle validate -t dev

# Preview what will be deployed
databricks bundle deploy -t dev --dry-run
```

### 4. Deploy to Databricks

```bash
# Deploy the application
databricks bundle deploy -t dev

# View deployment status
databricks bundle run apps.ontos-ml-workbench -t dev
```

### 5. Access Your App

After deployment, get the app URL:

```bash
# Get app details
databricks apps list

# Or from the UI
# Databricks Workspace → Apps → ontos-ml-workbench-dev
```

The app will be available at:
```
https://<workspace>.cloud.databricks.com/apps/ontos-ml-workbench-dev
```

## Development Workflow

### Local Development with APX

```bash
# Start hot reload dev server
apx dev start

# Make changes to React components or Python endpoints
# Changes reload instantly without restart

# Access at http://localhost:8000
```

### Deploy Changes

```bash
# Build frontend
apx build

# Deploy to Databricks
databricks bundle deploy -t dev
```

## Deployment Targets

The project supports multiple deployment environments:

### Development (dev)
```bash
databricks bundle deploy -t dev
```
- Default target
- Uses `ontos_ml_workbench_dev` schema
- Full error messages and logging

### Logfood (Internal Testing)
```bash
databricks bundle deploy -t logfood
```
- Uses `home_stuart_gano.ontos_ml_workbench` catalog
- Internal Databricks workspace

### FE VM (Field Engineering Demo)
```bash
databricks bundle deploy -t fevm
```
- Uses `erp-demonstrations.ontos_ml_workbench` catalog
- Serverless workspace
- Pre-configured warehouse

## Troubleshooting

### Build Failures

**Frontend build fails:**
```bash
cd frontend
npm install
npm run build
```

**Python dependencies missing:**
```bash
uv sync
```

### Deployment Errors

**Warehouse not found:**
- Check `warehouse_id` in `databricks.yml`
- Verify warehouse exists: `databricks warehouses list`

**Permission denied:**
- Ensure you have CREATE APP permission in the workspace
- Check workspace admin settings

**Static files not serving:**
- Verify `backend/static/` contains built frontend
- Check `backend/static/index.html` exists
- Ensure `app.yaml` static_files configuration is correct

### App Not Starting

**Check app logs:**
```bash
databricks apps logs ontos-ml-workbench-dev -t dev
```

**Common issues:**
- Missing environment variables (CATALOG_NAME, SCHEMA_NAME)
- SQL Warehouse not started
- Python dependencies not installed

## APX Integration

APX provides enhanced development workflow:

### APX Commands

```bash
# Start dev server (hot reload)
apx dev start

# Build for production
apx build

# Check project for errors
apx dev check

# View APX logs
apx dev logs

# Stop dev servers
apx dev stop
```

### APX vs Manual Build

| Task | Manual | APX |
|------|--------|-----|
| Frontend build | `cd frontend && npm run build && cd ..` | `apx build` |
| Copy to backend | Manual `cp -r frontend/dist/* backend/static/` | Automatic |
| Dev server | 3 terminals (uvicorn, npm dev, monitoring) | `apx dev start` |
| Hot reload | Manual restart | Automatic |

## Production Checklist

Before deploying to production:

- [ ] Update `databricks.yml` with production catalog/schema
- [ ] Set production SQL Warehouse ID
- [ ] Build frontend with `apx build`
- [ ] Test locally with `apx dev start`
- [ ] Validate bundle: `databricks bundle validate -t prod`
- [ ] Deploy: `databricks bundle deploy -t prod`
- [ ] Test deployed app URL
- [ ] Verify SQL Warehouse connectivity
- [ ] Check app logs for errors
- [ ] Test key workflows (DATA → TEMPLATE → CURATE → TRAIN)

## Environment Variables

The app automatically receives these variables in Databricks Apps:

```bash
DATABRICKS_HOST      # Workspace URL
DATABRICKS_TOKEN     # Auth token (automatic)
CATALOG_NAME         # Unity Catalog catalog
SCHEMA_NAME          # Schema for tables
WAREHOUSE_ID         # SQL Warehouse ID
```

These are configured in `resources/apps.yml` and populated from `databricks.yml` variables.

## File Structure for Deployment

```
ontos-ml-workbench/
├── databricks.yml           # DAB bundle configuration
├── app.yaml                 # APX metadata
├── pyproject.toml           # Python dependencies
├── resources/
│   ├── apps.yml            # ← Databricks Apps resource
│   ├── jobs.yml            # Background jobs
│   └── example_store.yml   # Vector search indexes
├── backend/
│   ├── app/
│   │   ├── main.py         # FastAPI app entrypoint
│   │   ├── api/            # REST endpoints
│   │   └── services/       # Business logic
│   └── static/             # ← Built frontend goes here
│       ├── index.html
│       └── assets/
└── frontend/
    ├── src/                # React source
    ├── vite.config.ts
    └── package.json
```

## Continuous Deployment

For automated deployments, use Databricks GitHub Actions:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Databricks

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install APX
        run: pip install apx

      - name: Build frontend
        run: apx build

      - name: Deploy to Databricks
        env:
          DATABRICKS_HOST: ${{ secrets.DATABRICKS_HOST }}
          DATABRICKS_TOKEN: ${{ secrets.DATABRICKS_TOKEN }}
        run: |
          databricks bundle deploy -t prod
```

## Support

For issues:
- Check Databricks Apps logs: `databricks apps logs ontos-ml-workbench-dev`
- Verify APX status: `apx dev status`
- Review DAB validation: `databricks bundle validate`
- Consult [Databricks Apps documentation](https://docs.databricks.com/en/dev-tools/databricks-apps/)

## Next Steps

1. **Set up Unity Catalog tables**: Run `schemas/lakebase.sql` to create tables
2. **Configure SQL Warehouse**: Ensure warehouse has access to catalog/schema
3. **Test locally**: Use `apx dev start` to verify everything works
4. **Deploy**: Run `databricks bundle deploy -t dev`
5. **Access app**: Open app URL and test workflows
