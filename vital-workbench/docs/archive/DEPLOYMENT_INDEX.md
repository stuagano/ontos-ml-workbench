# VITAL Platform Workbench - Deployment Documentation Index

Quick reference guide to all deployment and operations documentation.

## Quick Start

**New to the project?** Start here:
1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development)
3. [First Deployment](#first-deployment)

**Deploying to production?** Follow this path:
1. [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md) - Complete pre-deployment checklist
2. [DEPLOYMENT.md](DEPLOYMENT.md) - Step-by-step deployment guide
3. [MONITORING_SETUP.md](MONITORING_SETUP.md) - Configure monitoring and alerts
4. [RUNBOOK.md](RUNBOOK.md) - Keep handy for troubleshooting

---

## Documentation Overview

### Core Documentation

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **[README.md](README.md)** | Project overview and quick start | First time setup, project overview |
| **[CLAUDE.md](CLAUDE.md)** | Project context for AI assistants | Development with Claude Code |
| **[DEPLOYMENT.md](DEPLOYMENT.md)** | Complete deployment guide | Any deployment (dev, staging, prod) |
| **[PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md)** | Production deployment checklist | Before deploying to production |
| **[RUNBOOK.md](RUNBOOK.md)** | Operations runbook | Troubleshooting, day-to-day ops |
| **[MONITORING_SETUP.md](MONITORING_SETUP.md)** | Monitoring configuration | Setting up dashboards and alerts |
| **[WORKFLOWS.md](WORKFLOWS.md)** | Development and deployment workflows | Understanding the full dev lifecycle |

### Supporting Documentation

| Document | Purpose |
|----------|---------|
| **backend/.env.example** | Backend configuration template |
| **frontend/.env.example** | Frontend configuration template |
| **backend/CLAUDE.md** | Backend-specific development guide |
| **frontend/CLAUDE.md** | Frontend-specific development guide |
| **docs/PRD.md** | Product requirements (v2.3) |
| **VALIDATION_SUMMARY.md** | Data model validation summary |

---

## Documentation by Role

### Developers

**Daily Development:**
- [README.md](README.md#local-development) - Local dev setup
- [backend/CLAUDE.md](backend/CLAUDE.md) - Backend conventions
- [frontend/CLAUDE.md](frontend/CLAUDE.md) - Frontend conventions
- [WORKFLOWS.md](WORKFLOWS.md#development-workflow) - Dev workflow

**Deploying Changes:**
- [WORKFLOWS.md](WORKFLOWS.md#deployment-pipeline) - Deployment pipeline
- [WORKFLOWS.md](WORKFLOWS.md#database-migration-workflow) - Database migrations
- [DEPLOYMENT.md](DEPLOYMENT.md#backend-deployment) - Deploy steps

**Troubleshooting:**
- [RUNBOOK.md](RUNBOOK.md#common-issues-and-solutions) - Common issues
- [RUNBOOK.md](RUNBOOK.md#troubleshooting-guide) - Debug procedures

### DevOps / Platform Engineers

**Infrastructure Setup:**
- [DEPLOYMENT.md](DEPLOYMENT.md#prerequisites) - Prerequisites
- [DEPLOYMENT.md](DEPLOYMENT.md#environment-setup) - Environment setup
- [DEPLOYMENT.md](DEPLOYMENT.md#database-initialization) - Database setup

**Monitoring:**
- [MONITORING_SETUP.md](MONITORING_SETUP.md#dashboard-setup) - Dashboards
- [MONITORING_SETUP.md](MONITORING_SETUP.md#alert-configuration) - Alerts
- [MONITORING_SETUP.md](MONITORING_SETUP.md#log-aggregation) - Logs

**Performance:**
- [RUNBOOK.md](RUNBOOK.md#performance-tuning) - Performance tuning
- [RUNBOOK.md](RUNBOOK.md#scaling-guidelines) - Scaling strategies
- [MONITORING_SETUP.md](MONITORING_SETUP.md#cost-monitoring) - Cost optimization

**Operations:**
- [RUNBOOK.md](RUNBOOK.md#backup-and-recovery) - Backup procedures
- [RUNBOOK.md](RUNBOOK.md#incident-response) - Incident response
- [DEPLOYMENT.md](DEPLOYMENT.md#rollback-procedures) - Rollback procedures

### Product Managers / QA

**Feature Releases:**
- [WORKFLOWS.md](WORKFLOWS.md#release-process) - Release process
- [WORKFLOWS.md](WORKFLOWS.md#feature-flag-management) - Feature flags
- [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md#post-deployment-verification) - Verification tests

**Monitoring Usage:**
- [MONITORING_SETUP.md](MONITORING_SETUP.md#key-metrics) - Key metrics
- [MONITORING_SETUP.md](MONITORING_SETUP.md#dashboard-setup) - Dashboards
- [RUNBOOK.md](RUNBOOK.md#monitoring-and-alerting) - Alerting

---

## Prerequisites

### Required Tools

```bash
# Databricks CLI
brew install databricks

# Python 3.11+
brew install python@3.11

# Node.js 18+
brew install node

# Optional: APX for unified development
uvx --index https://databricks-solutions.github.io/apx/simple apx init
```

### Access Requirements

- Databricks workspace access (workspace admin or appropriate permissions)
- Unity Catalog permissions (create catalogs, schemas, tables)
- SQL warehouse access
- Service principal (for production deployments)

**Detailed prerequisites:** [DEPLOYMENT.md](DEPLOYMENT.md#prerequisites)

---

## Local Development

### Quick Start

```bash
# Clone repository
git clone <repository-url>
cd mirion-vital-workbench

# Option 1: APX (Recommended)
apx dev start

# Option 2: Manual setup
# Backend (Terminal 1)
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your credentials
uvicorn app.main:app --reload

# Frontend (Terminal 2)
cd frontend
npm install
cp .env.example .env
npm run dev
```

**Detailed setup:** [README.md](README.md#local-development)

### Configuration Files

- **Backend**: Copy `backend/.env.example` to `backend/.env`
- **Frontend**: Copy `frontend/.env.example` to `frontend/.env`
- **Databricks**: Configure CLI profile with `databricks auth login`

**Configuration details:** [DEPLOYMENT.md](DEPLOYMENT.md#environment-setup)

---

## First Deployment

### FEVM Workspace (Development)

**One-command deployment:**
```bash
./scripts/bootstrap.sh <workspace-name>
```

This automated script:
1. Authenticates to workspace
2. Creates SQL warehouse
3. Sets up Unity Catalog
4. Creates tables
5. Seeds sample data
6. Deploys application

**Script details:** [README.md](README.md#one-command-deployment-recommended)

### Manual Deployment

**Step-by-step:**
1. [Set up environment](DEPLOYMENT.md#environment-setup)
2. [Initialize database](DEPLOYMENT.md#database-initialization)
3. [Deploy backend](DEPLOYMENT.md#backend-deployment)
4. [Deploy frontend](DEPLOYMENT.md#frontend-deployment)
5. [Verify deployment](DEPLOYMENT.md#post-deployment-verification)

**Full guide:** [DEPLOYMENT.md](DEPLOYMENT.md)

---

## Production Deployment

### Pre-Deployment

**Complete checklist:**
- [Infrastructure checklist](PRODUCTION_CHECKLIST.md#infrastructure)
- [Security checklist](PRODUCTION_CHECKLIST.md#security)
- [Code quality checklist](PRODUCTION_CHECKLIST.md#code-quality)
- [Configuration checklist](PRODUCTION_CHECKLIST.md#configuration)

**Full checklist:** [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md#pre-deployment-checklist)

### Deployment Steps

**Follow this sequence:**
1. [Backup current state](PRODUCTION_CHECKLIST.md#1-pre-deployment-preparation)
2. [Deploy database changes](PRODUCTION_CHECKLIST.md#2-database-deployment)
3. [Deploy backend](PRODUCTION_CHECKLIST.md#3-backend-deployment)
4. [Deploy frontend](PRODUCTION_CHECKLIST.md#4-frontend-deployment)
5. [Verify deployment](PRODUCTION_CHECKLIST.md#5-post-deployment-verification)

**Full guide:** [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md#deployment-steps)

### Post-Deployment

**Verification:**
- [Smoke tests](PRODUCTION_CHECKLIST.md#smoke-tests)
- [Functional tests](PRODUCTION_CHECKLIST.md#functional-tests)
- [Performance tests](PRODUCTION_CHECKLIST.md#performance-tests)
- [Security verification](PRODUCTION_CHECKLIST.md#security-verification)

**Monitoring:**
- [Set up dashboards](MONITORING_SETUP.md#dashboard-setup)
- [Configure alerts](MONITORING_SETUP.md#alert-configuration)
- [Verify logs](MONITORING_SETUP.md#log-aggregation)

---

## Monitoring & Operations

### Setting Up Monitoring

**Initial setup:**
1. [Grant access to System Tables](MONITORING_SETUP.md#grant-access-to-system-tables)
2. [Create monitoring views](MONITORING_SETUP.md#key-metrics)
3. [Set up dashboards](MONITORING_SETUP.md#dashboard-setup)
4. [Configure alerts](MONITORING_SETUP.md#alert-configuration)

**Full guide:** [MONITORING_SETUP.md](MONITORING_SETUP.md)

### Key Metrics to Track

| Metric | Where to Find | Alert Threshold |
|--------|---------------|-----------------|
| Error rate | [monitoring_error_rate view](MONITORING_SETUP.md#2-error-rate) | > 5% |
| P95 latency | [monitoring_request_latency view](MONITORING_SETUP.md#1-request-rate-and-latency) | > 5 seconds |
| Active users | [monitoring_active_users view](MONITORING_SETUP.md#3-active-users) | N/A |
| Table growth | [monitoring_table_growth view](MONITORING_SETUP.md#4-table-growth) | > 10 GB/day |
| DBU consumption | [system.billing.usage](MONITORING_SETUP.md#7-cost-tracking) | > monthly budget |

### Common Issues

| Issue | Quick Fix | Documentation |
|-------|-----------|---------------|
| App won't start | Check logs, restart | [RUNBOOK.md](RUNBOOK.md#issue-app-is-down-or-unresponsive) |
| Database timeout | Check warehouse, increase timeout | [RUNBOOK.md](RUNBOOK.md#issue-database-connection-timeout) |
| Slow queries | Optimize queries, scale warehouse | [RUNBOOK.md](RUNBOOK.md#issue-slow-query-performance) |
| Permission errors | Grant SP permissions | [RUNBOOK.md](RUNBOOK.md#issue-permission-denied-errors) |
| High costs | Review query patterns, optimize | [MONITORING_SETUP.md](MONITORING_SETUP.md#cost-monitoring) |

**Full troubleshooting:** [RUNBOOK.md](RUNBOOK.md#troubleshooting-guide)

---

## Workflows

### Development Workflow

**Feature development:**
1. [Create feature branch](WORKFLOWS.md#1-create-feature-branch)
2. [Develop locally](WORKFLOWS.md#2-start-local-development)
3. [Test changes](WORKFLOWS.md#3-make-changes-and-test)
4. [Create PR](WORKFLOWS.md#5-create-pull-request)
5. [Code review and merge](WORKFLOWS.md#6-code-review)

**Full workflow:** [WORKFLOWS.md](WORKFLOWS.md#development-workflow)

### Deployment Pipeline

**Dev → Staging → Production:**
- [Dev deployment](WORKFLOWS.md#development-environment) (automatic on merge)
- [Staging deployment](WORKFLOWS.md#staging-environment) (manual approval)
- [Production deployment](WORKFLOWS.md#production-environment) (manual release)

**Full pipeline:** [WORKFLOWS.md](WORKFLOWS.md#deployment-pipeline)

### Database Migrations

**Migration process:**
1. [Create migration script](WORKFLOWS.md#migration-script-template)
2. [Create rollback script](WORKFLOWS.md#rollback-script-template)
3. [Test on dev/staging](WORKFLOWS.md#apply-migration)
4. [Deploy to production](WORKFLOWS.md#apply-migration)

**Full guide:** [WORKFLOWS.md](WORKFLOWS.md#database-migration-workflow)

### Release Process

**Steps:**
1. [Version bump](WORKFLOWS.md#release-workflow)
2. [Create release branch](WORKFLOWS.md#release-workflow)
3. [Deploy to staging](WORKFLOWS.md#release-workflow)
4. [Create release tag](WORKFLOWS.md#release-workflow)
5. [Deploy to production](WORKFLOWS.md#release-workflow)
6. [Merge to main](WORKFLOWS.md#release-workflow)

**Full process:** [WORKFLOWS.md](WORKFLOWS.md#release-process)

---

## Emergency Procedures

### Rollback

**When to rollback:**
- Critical bug discovered
- Service degradation
- Data integrity issues
- Security vulnerability

**Rollback procedure:**
1. [Stop current app](PRODUCTION_CHECKLIST.md#immediate-rollback-30-minutes-after-deployment)
2. [Restore previous version](PRODUCTION_CHECKLIST.md#immediate-rollback-30-minutes-after-deployment)
3. [Restore database if needed](PRODUCTION_CHECKLIST.md#database-rollback-if-schema-changed)
4. [Verify rollback](PRODUCTION_CHECKLIST.md#immediate-rollback-30-minutes-after-deployment)
5. [Notify stakeholders](PRODUCTION_CHECKLIST.md#notification)

**Full procedure:** [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md#rollback-procedure)

### Hotfix Process

**For critical bugs:**
1. [Create hotfix branch](WORKFLOWS.md#hotfix-workflow)
2. [Fix and test](WORKFLOWS.md#hotfix-workflow)
3. [Deploy to production](WORKFLOWS.md#hotfix-workflow)
4. [Verify and monitor](WORKFLOWS.md#hotfix-workflow)
5. [Merge to main](WORKFLOWS.md#hotfix-workflow)

**Full process:** [WORKFLOWS.md](WORKFLOWS.md#hotfix-process)

### Incident Response

**Response workflow:**
1. [Detect and triage](RUNBOOK.md#incident-workflow)
2. [Investigate](RUNBOOK.md#incident-workflow)
3. [Apply fix or rollback](RUNBOOK.md#rollback-decision-tree)
4. [Verify resolution](RUNBOOK.md#incident-workflow)
5. [Post-mortem](RUNBOOK.md#incident-workflow)

**Full guide:** [RUNBOOK.md](RUNBOOK.md#incident-response)

---

## Cheat Sheets

### Databricks CLI Commands

```bash
# App management
databricks apps get vital-workbench --profile=prod
databricks apps logs vital-workbench --profile=prod --tail 100
databricks apps restart vital-workbench --profile=prod

# Deployment
databricks bundle deploy -t dev
databricks bundle deploy -t production

# SQL execution
databricks sql exec --file=migration.sql --warehouse-id=$WAREHOUSE_ID --profile=prod

# Workspace sync
databricks sync . /Workspace/Users/deploy/Apps/vital-workbench --profile=prod
```

### Quick Diagnostics

```bash
# Check app status
APP_URL=$(databricks apps get vital-workbench --profile=prod -o json | jq -r '.url')
curl $APP_URL/health

# Check warehouse status
databricks warehouses get $WAREHOUSE_ID --profile=prod

# View recent errors
databricks apps logs vital-workbench --profile=prod --tail 100 | grep ERROR

# Check table counts
databricks sql exec --warehouse-id=$WAREHOUSE_ID \
  "SELECT COUNT(*) FROM mirion_vital.workbench.sheets" \
  --profile=prod
```

### Common SQL Queries

```sql
-- Check recent errors
SELECT * FROM mirion_vital.workbench.monitoring_error_rate
ORDER BY time_bucket DESC LIMIT 10;

-- Check slow queries
SELECT query_text, execution_duration / 1000 as seconds
FROM system.query.history
WHERE warehouse_id = '${WAREHOUSE_ID}'
  AND start_time > NOW() - INTERVAL 1 HOUR
ORDER BY execution_duration DESC LIMIT 10;

-- Check table sizes
SELECT * FROM mirion_vital.workbench.monitoring_table_growth;

-- Check costs
SELECT * FROM mirion_vital.workbench.monitoring_cost
ORDER BY date DESC LIMIT 30;
```

---

## Support

### Internal Resources

- **Team Slack**: #vital-workbench-ops
- **On-Call**: PagerDuty rotation
- **Documentation**: This repository

### External Resources

- **Databricks Support**: https://help.databricks.com
- **Databricks Docs**: https://docs.databricks.com
- **Unity Catalog Docs**: https://docs.databricks.com/unity-catalog/

### Escalation

1. On-call engineer (PagerDuty)
2. Team lead
3. Platform engineering team
4. Databricks support (for platform issues)

---

## Contributing to Documentation

### Adding New Documentation

1. Follow the existing structure and format
2. Use clear, actionable language
3. Include code examples and commands
4. Test all commands before documenting
5. Update this index with links

### Documentation Standards

- Use markdown for all documentation
- Include table of contents for long documents
- Use code blocks with language specification
- Include both simple and detailed explanations
- Cross-reference related documentation

### Keeping Documentation Current

- Update docs when code changes
- Review docs during sprint retrospectives
- Archive outdated documentation
- Version documentation with releases

---

## Document Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-02-07 | 1.0.0 | Initial deployment documentation | Claude Code |
| | | Created comprehensive deployment guides | |
| | | Added monitoring and operations runbook | |
