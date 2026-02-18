# FE VM Workspace Deployment Setup

Quick setup guide for deploying Ontos ML Workbench to the FE VM Serverless workspace.

## Workspace Details

From your JDBC connection string, I extracted:

| Property | Value |
|----------|-------|
| **Workspace Host** | https://fevm-serverless-dxukih.cloud.databricks.com |
| **Warehouse ID** | 387bcda0f2ece20c |
| **Catalog** | erp-demonstrations |
| **Schema** | ontos_ml_workbench |
| **Target** | fevm (already configured) |

## One-Time Setup

### 1. Configure Databricks CLI Profile

You need to set up authentication for this workspace:

```bash
databricks configure --profile fe-vm-serverless-dxukih
```

When prompted, enter:
- **Host**: `https://fevm-serverless-dxukih.cloud.databricks.com`
- **Token**: Your personal access token (PAT)

#### Get a Personal Access Token (PAT)

1. Go to https://fevm-serverless-dxukih.cloud.databricks.com
2. Click your profile icon (top right) → **Settings**
3. Click **Developer** → **Access tokens**
4. Click **Generate new token**
5. Copy the token and paste it when prompted

### 2. Verify Warehouse Access

```bash
# Test connection
databricks sql --profile fe-vm-serverless-dxukih \
  --warehouse-id 387bcda0f2ece20c \
  -e "SELECT current_catalog(), current_schema()"
```

Expected output:
```
erp-demonstrations | ontos_ml_workbench
```

### 3. Create Schema (if needed)

```bash
databricks sql --profile fe-vm-serverless-dxukih \
  --warehouse-id 387bcda0f2ece20c \
  -e "CREATE SCHEMA IF NOT EXISTS erp_demonstrations.ontos_ml_workbench"
```

### 4. Create Database Tables

```bash
# Run the schema setup
databricks sql --profile fe-vm-serverless-dxukih \
  --warehouse-id 387bcda0f2ece20c \
  -f schemas/lakebase.sql
```

## Deploy the App

### Quick Deploy

```bash
./DEPLOY_FEVM.sh
```

### Manual Steps

```bash
# 1. Build frontend
apx build

# 2. Validate configuration
databricks bundle validate -t fevm

# 3. Deploy
databricks bundle deploy -t fevm

# 4. Access app
open https://fevm-serverless-dxukih.cloud.databricks.com/apps/ontos-ml-workbench-fevm
```

## Verify Deployment

### Check App Status

```bash
databricks apps list --profile fe-vm-serverless-dxukih
```

### View Logs

```bash
databricks apps logs ontos-ml-workbench-fevm -t fevm --follow
```

### Test the App

1. Open the app URL:
   ```
   https://fevm-serverless-dxukih.cloud.databricks.com/apps/ontos-ml-workbench-fevm
   ```

2. Test key workflows:
   - **DATA**: Browse Unity Catalog → Select table
   - **TEMPLATE**: Select or create template
   - **CURATE**: Review assembled data
   - **TRAIN**: Configure training job

## Configuration Details

The `databricks.yml` already has the fevm target configured:

```yaml
targets:
  fevm:
    mode: development
    workspace:
      profile: fe-vm-serverless-dxukih
      host: https://fevm-serverless-dxukih.cloud.databricks.com
    variables:
      catalog: erp-demonstrations
      schema: ontos_ml_workbench
      warehouse_id: "387bcda0f2ece20c"
```

## Troubleshooting

### Authentication Failed

```bash
# Re-configure profile
databricks configure --profile fe-vm-serverless-dxukih --force

# Test authentication
databricks auth profiles
```

### Warehouse Not Accessible

```bash
# List available warehouses
databricks warehouses list --profile fe-vm-serverless-dxukih

# Check warehouse status
databricks warehouses get 387bcda0f2ece20c --profile fe-vm-serverless-dxukih
```

### Catalog/Schema Not Found

```bash
# List catalogs you have access to
databricks catalogs list --profile fe-vm-serverless-dxukih

# Create schema if needed
databricks sql --profile fe-vm-serverless-dxukih \
  --warehouse-id 387bcda0f2ece20c \
  -e "CREATE SCHEMA IF NOT EXISTS erp_demonstrations.ontos_ml_workbench"
```

### App Deploy Failed

```bash
# Check bundle validation
databricks bundle validate -t fevm

# See what would be deployed
databricks bundle deploy -t fevm --dry-run

# Check app logs
databricks apps logs ontos-ml-workbench-fevm -t fevm
```

## Development Workflow

### Local Development

```bash
# Start APX dev server with FE VM configuration
export DATABRICKS_HOST="https://fevm-serverless-dxukih.cloud.databricks.com"
export WAREHOUSE_ID="387bcda0f2ece20c"
export CATALOG_NAME="erp-demonstrations"
export SCHEMA_NAME="ontos_ml_workbench"

apx dev start
```

### Deploy Changes

```bash
# After making changes
apx build
databricks bundle deploy -t fevm
```

## Multi-Environment Strategy

You now have 3 configured targets:

| Target | Workspace | Catalog | Use Case |
|--------|-----------|---------|----------|
| **dev** | e2-demo-west | main.ontos_ml_workbench_dev | Personal development |
| **logfood** | logfood | home_stuart_gano.ontos_ml_workbench | Internal testing |
| **fevm** | fevm-serverless-dxukih | erp-demonstrations.ontos_ml_workbench | Demo/FE testing |

Deploy to any target:
```bash
databricks bundle deploy -t <target>
```

## Next Steps

1. ✅ Configure CLI profile: `databricks configure --profile fe-vm-serverless-dxukih`
2. ✅ Verify warehouse access
3. ✅ Create schema and tables
4. ✅ Deploy app: `./DEPLOY_FEVM.sh`
5. ✅ Test app workflows
6. ✅ Share app URL with team

## Support

For issues:
- **Logs**: `databricks apps logs ontos-ml-workbench-fevm -t fevm`
- **Status**: `databricks apps list --profile fe-vm-serverless-dxukih`
- **Redeploy**: `databricks bundle deploy -t fevm --force`
