# Databricks Apps Deployment Workflow

## Quick Reference for Claude Code

### Standard Deployment Flow

```bash
# 1. Build frontend
cd frontend && npm run build && cd ..

# 2. Deploy to Databricks
databricks apps deploy ontos-ml-workbench \
  --source-code-path /Workspace/Users/<user>/Apps/ontos-ml-workbench \
  --profile=fe-vm-serverless-dxukih

# 3. ALWAYS poll for completion (MANDATORY!)
./.claude/scripts/poll-databricks-app.sh ontos-ml-workbench fe-vm-serverless-dxukih

# 4. Get app URL for user
APP_URL=$(databricks apps get ontos-ml-workbench --profile=fe-vm-serverless-dxukih -o json | jq -r '.url')

# 5. Verify health endpoint
curl -s "$APP_URL/health"

# 6. NOW tell user deployment is ready
echo "✓ Deployment complete at: $APP_URL"
```

## Critical Rules

1. **NEVER** ask user to test immediately after `databricks apps deploy`
2. **ALWAYS** run the polling script to wait for deployment completion
3. **VERIFY** the health endpoint responds before asking user to test
4. **PROVIDE** the app URL to the user when ready

## Polling Script Details

**Script**: `.claude/scripts/poll-databricks-app.sh`

**What it checks**:
- `compute_status: ACTIVE`
- `pending_deployment: null`
- Health endpoint responding

**Timing**:
- Poll interval: 5 seconds
- Timeout: 5 minutes
- Typical deployment: 30-90 seconds

**Exit codes**:
- `0`: Deployment successful
- `1`: Timeout or error

## Common Deployment Commands

### FEVM Workspace (Primary)
```bash
# Profile: fe-vm-serverless-dxukih
# Catalog: serverless_dxukih_catalog
# Schema: ontos_ml
# Warehouse: 387bcda0f2ece20c

# Deploy
databricks apps deploy ontos-ml-workbench \
  --source-code-path /Workspace/Users/stuart.gano@databricks.com/Apps/ontos-ml-workbench \
  --profile=fe-vm-serverless-dxukih

# Poll
./.claude/scripts/poll-databricks-app.sh ontos-ml-workbench fe-vm-serverless-dxukih
```

### Check Status Manually
```bash
# Full status
databricks apps get ontos-ml-workbench --profile=fe-vm-serverless-dxukih -o json

# Just compute status
databricks apps get ontos-ml-workbench --profile=fe-vm-serverless-dxukih -o json | jq -r '.compute_status'

# Just URL
databricks apps get ontos-ml-workbench --profile=fe-vm-serverless-dxukih -o json | jq -r '.url'

# Check pending deployment
databricks apps get ontos-ml-workbench --profile=fe-vm-serverless-dxukih -o json | jq -r '.pending_deployment'
```

### View Logs
```bash
# Tail logs
databricks apps logs ontos-ml-workbench --profile=fe-vm-serverless-dxukih --tail 100

# Follow logs
databricks apps logs ontos-ml-workbench --profile=fe-vm-serverless-dxukih --follow
```

## Troubleshooting

### Deployment Stuck
```bash
# Check compute status
databricks apps get ontos-ml-workbench --profile=fe-vm-serverless-dxukih -o json | jq '.compute_status, .status_message'

# Check logs for errors
databricks apps logs ontos-ml-workbench --profile=fe-vm-serverless-dxukih --tail 50
```

### Health Endpoint Not Responding
```bash
# Wait 30 more seconds after compute is ACTIVE
sleep 30

# Try again
APP_URL=$(databricks apps get ontos-ml-workbench --profile=fe-vm-serverless-dxukih -o json | jq -r '.url')
curl -v "$APP_URL/health"
```

### Deployment Error
```bash
# Get detailed status
databricks apps get ontos-ml-workbench --profile=fe-vm-serverless-dxukih -o json | jq '{
  compute_status: .compute_status,
  status_message: .status_message,
  pending_deployment: .pending_deployment,
  url: .url
}'

# Check recent logs
databricks apps logs ontos-ml-workbench --profile=fe-vm-serverless-dxukih --tail 100
```

## User Communication Template

After successful deployment:

```
✓ Deployment complete!

App URL: https://...
Status: ACTIVE
Health: ✓ Responding

You can now test the application at the URL above.
```

After failed deployment:

```
✗ Deployment failed

Status: ERROR
Error: [error message from logs]

Checking logs...
[relevant log excerpt]

Let me investigate and fix the issue.
```

## When to Use

**Use this workflow for**:
- All Databricks Apps deployments
- Code changes (backend/frontend)
- Configuration changes in app.yaml
- After database schema updates that affect app behavior

**Don't use for**:
- Local development (uvicorn --reload)
- Database-only changes (schema updates that don't need app redeploy)
- Documentation updates
