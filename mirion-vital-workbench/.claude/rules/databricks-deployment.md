# Databricks Apps Deployment Workflow

## Automatic Deployment Verification

**CRITICAL**: When deploying to Databricks Apps, ALWAYS poll the deployment endpoint to verify the new version is live BEFORE asking the user to test.

### Deployment Flow

1. **Deploy the app**
   ```bash
   databricks apps deploy ontos-ml-workbench --source-code-path <path> --profile=<profile>
   ```

2. **Automatically poll for deployment completion**
   - Use the polling script: `.claude/scripts/poll-databricks-app.sh`
   - Poll interval: 5 seconds
   - Timeout: 5 minutes (300 seconds)
   - Check for: `compute_status: ACTIVE` and `pending_deployment: null`

3. **Verify the endpoint is responding**
   - Test health endpoint
   - Verify new version is deployed

4. **Only then ask user to test**

### Implementation

```bash
# After deploying, ALWAYS run:
./.claude/scripts/poll-databricks-app.sh ontos-ml-workbench <profile>

# The script will:
# 1. Check deployment status every 5 seconds
# 2. Exit when deployment is complete
# 3. Return exit code 0 on success, 1 on timeout
```

### Example Workflow

```bash
# 1. Build frontend
cd frontend && npm run build && cd ..

# 2. Deploy
databricks apps deploy ontos-ml-workbench \
  --source-code-path /Workspace/Users/user@example.com/Apps/ontos-ml-workbench \
  --profile=fe-vm-serverless-dxukih

# 3. AUTOMATICALLY poll for completion (DO NOT SKIP THIS!)
./.claude/scripts/poll-databricks-app.sh ontos-ml-workbench fe-vm-serverless-dxukih

# 4. Verify endpoint
APP_URL=$(databricks apps get ontos-ml-workbench --profile=fe-vm-serverless-dxukih -o json | jq -r '.url')
curl $APP_URL/health

# 5. NOW ask user to test
echo "✓ Deployment complete. Please test at: $APP_URL"
```

## When to Use

Use this workflow for:
- Databricks Apps deployments
- Bundle deployments that update apps
- Any deployment that changes app code or configuration

## Don't Use For

- Local development (uvicorn hot reload)
- Database schema updates (those are immediate)
- Documentation updates

## Error Handling

If polling times out:
1. Check app logs: `databricks apps logs ontos-ml-workbench --profile=<profile>`
2. Check compute status: `databricks apps get ontos-ml-workbench --profile=<profile> -o json | jq -r '.compute_status'`
3. Check for deployment errors: `databricks apps get ontos-ml-workbench --profile=<profile> -o json | jq -r '.status_message'`
4. Inform user of the issue and show relevant logs

## Key Points

- **NEVER** ask user to test immediately after `databricks apps deploy`
- **ALWAYS** poll for deployment completion first
- Typical deployment takes 30-90 seconds
- If deployment takes > 5 minutes, there's likely an issue
