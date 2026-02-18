# Claude Code Scripts

Utility scripts for automated workflows and deployment verification.

## Deployment Scripts

### poll-databricks-app.sh

Polls Databricks Apps deployment status until ready.

**Usage**:
```bash
./poll-databricks-app.sh <app-name> <profile>
```

**Example**:
```bash
./poll-databricks-app.sh ontos-ml-workbench <your-profile>
```

**What it does**:
- Checks deployment status every 5 seconds
- Waits for `compute_status: ACTIVE` and `pending_deployment: null`
- Verifies health endpoint is responding
- Exits with code 0 on success, 1 on timeout/error
- Timeout: 5 minutes

**When to use**:
- After every `databricks apps deploy` command
- Before asking user to test deployed changes
- As part of CI/CD deployment pipelines

**Dependencies**:
- `databricks` CLI
- `jq` for JSON parsing
- `curl` for health checks

## Testing Scripts

(Future: E2E testing, API testing, etc.)

## Development Scripts

(Future: Local setup, data seeding, etc.)

## Usage in Claude Code

These scripts are automatically referenced in:
- `.claude/rules/databricks-deployment.md` - Deployment workflow rules
- `.claude/DEPLOYMENT_WORKFLOW.md` - Quick reference guide
- `DEPLOYMENT.md` - Full deployment documentation

Claude Code will automatically use these scripts during deployment workflows.
