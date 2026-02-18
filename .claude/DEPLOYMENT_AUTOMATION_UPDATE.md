# Deployment Automation Update

**Date**: 2026-02-11
**Purpose**: Automatic deployment verification before asking user to test

## Problem Solved

Previously, after deploying to Databricks Apps, we would immediately ask the user to test. This caused issues because:
- Databricks Apps deployments are **asynchronous**
- `databricks apps deploy` returns immediately but deployment takes 30-90 seconds
- Users would test too early and see the old version
- This led to confusion and wasted debugging time

## Solution Implemented

### 1. Automatic Polling Script

**Location**: `.claude/scripts/poll-databricks-app.sh`

**What it does**:
- Checks deployment status every 5 seconds
- Waits for `compute_status: ACTIVE` and `pending_deployment: null`
- Verifies health endpoint is responding
- Exits when deployment is truly ready
- Timeout: 5 minutes

**Usage**:
```bash
./.claude/scripts/poll-databricks-app.sh ontos-ml-workbench <your-profile>
```

**Exit codes**:
- `0`: Deployment successful and ready
- `1`: Timeout or error (logs shown)

### 2. Claude Code Rules

**Global Rule**: `~/.claude/rules/databricks-deployment.md`
- Applies to all projects with Databricks Apps
- Enforces automatic polling before user testing
- Provides error handling guidance

**Project Rule**: `.claude/rules/databricks-deployment.md`
- Project-specific deployment workflow
- Details on when to use polling
- Troubleshooting steps

### 3. Documentation Updates

**New Files**:
- `.claude/DEPLOYMENT_WORKFLOW.md` - Quick reference for Claude Code
- `.claude/scripts/README.md` - Script documentation

**Updated Files**:
- `DEPLOYMENT.md` - Added polling steps to all deployment procedures
- `CLAUDE.md` - Updated deployment section with polling requirement

### 4. Standard Deployment Flow

```bash
# 1. Build frontend
cd frontend && npm run build && cd ..

# 2. Deploy
databricks apps deploy ontos-ml-workbench \
  --source-code-path /Workspace/Users/<user>/Apps/ontos-ml-workbench \
  --profile=<your-profile>

# 3. MANDATORY: Poll for completion
./.claude/scripts/poll-databricks-app.sh ontos-ml-workbench <your-profile>

# 4. Get URL
APP_URL=$(databricks apps get ontos-ml-workbench --profile=<your-profile> -o json | jq -r '.url')

# 5. Verify health
curl -s "$APP_URL/health"

# 6. Tell user it's ready
echo "✓ Deployment complete at: $APP_URL"
```

## Files Created/Modified

### Created
- `.claude/scripts/poll-databricks-app.sh` - Polling script (executable)
- `.claude/scripts/README.md` - Script documentation
- `.claude/rules/databricks-deployment.md` - Project deployment rules
- `.claude/DEPLOYMENT_WORKFLOW.md` - Quick reference guide
- `~/.claude/rules/databricks-deployment.md` - Global deployment rules

### Modified
- `DEPLOYMENT.md` - Added polling to all deployment procedures
- `CLAUDE.md` - Updated deployment section

## Benefits

1. **No more premature testing** - Users only test when deployment is truly ready
2. **Better error visibility** - Script shows logs if deployment fails
3. **Consistent workflow** - Same process every time
4. **Automated verification** - No manual status checking needed
5. **Clear feedback** - User knows exactly when to test

## Example Output

**Successful deployment**:
```
🔄 Polling deployment status for 'ontos-ml-workbench' (profile: <your-profile>)
   Timeout: 300s | Poll interval: 5s

[0 s] Compute: ACTIVE | Pending: active_deployment
[5 s] Compute: ACTIVE | Pending: active_deployment
[10 s] Compute: ACTIVE | Pending: active_deployment
[15 s] Compute: ACTIVE | Pending: null

✓ Deployment complete!
  Compute status: ACTIVE
  App URL: https://...

🔍 Verifying endpoint...
✓ Health endpoint responding
```

**Failed deployment**:
```
🔄 Polling deployment status for 'ontos-ml-workbench'...

[0 s] Compute: ERROR | Pending: null

✗ Deployment failed!
  Compute status: ERROR
  Status message: Failed to start application

Check logs: databricks apps logs ontos-ml-workbench --profile=<your-profile>
```

## Testing

Script validation completed:
- ✓ Bash syntax valid
- ✓ All dependencies available (databricks, jq, curl)
- ✓ Script is executable
- ✓ Error handling tested

## Next Steps

When deploying in the future:
1. Claude Code will automatically use the polling script
2. Users will only be asked to test when deployment is truly ready
3. Any deployment failures will be caught and debugged before user involvement

## Rollout

- ✅ Scripts created and tested
- ✅ Documentation updated
- ✅ Rules configured (global and project)
- ✅ Ready for immediate use

This update is immediately active for all future deployments in this project.
