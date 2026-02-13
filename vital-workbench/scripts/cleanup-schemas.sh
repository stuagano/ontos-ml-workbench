#!/bin/bash

# ============================================================================
# Schema Cleanup Script - Consolidate to Single Source of Truth
# Implements SCHEMA_CLEANUP_PLAN.md
# ============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${BLUE}[CLEANUP]${NC} $1"; }
success() { echo -e "${GREEN}[✓]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; }
warning() { echo -e "${YELLOW}[!]${NC} $1"; }

PROJECT_ROOT="/Users/stuart.gano/Documents/Customers/Mirion/mirion-vital-workbench"
cd "$PROJECT_ROOT"

echo ""
log "Schema Cleanup - Consolidating to home_stuart_gano.mirion_vital_workbench"
echo ""
warning "This script will:"
echo "  1. Update backend/.env to use home catalog"
echo "  2. Delete duplicate schema SQL files"
echo "  3. Archive old documentation"
echo "  4. Show you what tables exist"
echo ""
read -p "Continue? [y/N]: " choice
if [[ ! "$choice" =~ ^[Yy]$ ]]; then
    log "Aborted."
    exit 0
fi
echo ""

# ============================================================================
# Phase 1: Fix Backend Configuration
# ============================================================================

log "Phase 1: Updating backend configuration..."

# Backup current .env
if [ -f backend/.env ]; then
    cp backend/.env backend/.env.backup
    success "Backed up backend/.env to backend/.env.backup"
fi

# Check what's currently configured
CURRENT_CATALOG=$(grep "^DATABRICKS_CATALOG=" backend/.env 2>/dev/null | cut -d= -f2)
CURRENT_SCHEMA=$(grep "^DATABRICKS_SCHEMA=" backend/.env 2>/dev/null | cut -d= -f2)

echo ""
warning "Current configuration:"
echo "  Catalog: ${CURRENT_CATALOG:-<not set>}"
echo "  Schema: ${CURRENT_SCHEMA:-<not set>}"
echo ""

# Ask user for warehouse ID and profile
read -p "Enter your warehouse ID (or press Enter to skip): " WAREHOUSE_ID
read -p "Enter your Databricks profile (or press Enter to use default): " PROFILE

# Update .env
cat > backend/.env << EOF
# Databricks Configuration - Local Development
# Uses home catalog (no metastore admin required)
DATABRICKS_CATALOG=home_stuart_gano
DATABRICKS_SCHEMA=mirion_vital_workbench
DATABRICKS_WAREHOUSE_ID=${WAREHOUSE_ID}
${PROFILE:+DATABRICKS_CONFIG_PROFILE=$PROFILE}

# API Configuration
API_V1_STR=/api/v1
PROJECT_NAME=VITAL Platform Workbench

# Logging
LOG_LEVEL=INFO
EOF

success "Updated backend/.env to use home_stuart_gano.mirion_vital_workbench"
echo ""

# ============================================================================
# Phase 2: Delete Stale Schema Files
# ============================================================================

log "Phase 2: Cleaning up duplicate schema files..."

FILES_TO_DELETE=(
    "schemas/setup_serverless_catalog.sql"
    "schemas/setup_serverless_catalog_fixed.sql"
    "schemas/setup_serverless_catalog_simple.sql"
    "schemas/setup_serverless_final.sql"
    "schemas/create_tables.sql"
    "schemas/init.sql"
)

for file in "${FILES_TO_DELETE[@]}"; do
    if [ -f "$file" ]; then
        rm "$file"
        success "Deleted: $file"
    fi
done

echo ""
success "Kept only canonical schema files (01-08*.sql)"
echo ""

# ============================================================================
# Phase 3: Archive Old Documentation
# ============================================================================

log "Phase 3: Archiving old documentation..."

# Create archive directory
mkdir -p docs/archive

DOCS_TO_ARCHIVE=(
    "ACTION_ITEMS_CHECKLIST.md"
    "AGENT_WORKFLOW.md"
    "BOOTSTRAP_VERIFICATION.md"
    "CHARTS_IMPLEMENTATION.md"
    "DEMO_DATA_SETUP.md"
    "DEMO_GUIDE.md"
    "DEMO_MONITOR_CHECKLIST.md"
    "DEPLOYMENT_CHECKLIST.md"
    "DEPLOYMENT_INDEX.md"
    "DEPLOY_MONITOR_IMPROVE_IMPLEMENTATION.md"
    "FINAL_STATUS.md"
    "FINAL_VERIFICATION.md"
    "MONITORING_SETUP.md"
    "MONITOR_PAGE_INTEGRATION.md"
    "PRODUCTION_CHECKLIST.md"
    "QUICK_FIXES.md"
    "QUICK_FIX_MISSING_TABLES.md"
    "VERIFICATION_RESULTS.md"
    "WORKFLOWS.md"
)

for doc in "${DOCS_TO_ARCHIVE[@]}"; do
    if [ -f "$doc" ]; then
        mv "$doc" docs/archive/
        success "Archived: $doc → docs/archive/"
    fi
done

echo ""

# ============================================================================
# Phase 4: Summary & Next Steps
# ============================================================================

echo ""
success "Cleanup complete!"
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              Single Source of Truth Established           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Primary Development Location:${NC}"
echo "  Catalog: home_stuart_gano"
echo "  Schema:  mirion_vital_workbench"
echo ""
echo -e "${GREEN}Files Kept:${NC}"
echo "  • schemas/01-08*.sql (canonical schema)"
echo "  • schemas/fix_monitor_schema.sql (needed fix)"
echo "  • schemas/add_flagged_column.sql (needed fix)"
echo "  • README.md, CLAUDE.md, DEPLOYMENT.md (essential docs)"
echo ""
echo -e "${GREEN}Files Archived:${NC}"
echo "  • Old documentation moved to docs/archive/"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Restart backend: cd backend && uvicorn app.main:app --reload"
echo "  2. Verify connection: curl http://localhost:8000/api/v1/sheets"
echo "  3. Check tables exist:"
echo "     databricks sql -e 'SHOW TABLES IN home_stuart_gano.mirion_vital_workbench;'"
echo "  4. If tables missing, run: cd schemas && databricks sql --file 01_create_catalog.sql"
echo "  5. Apply fixes: databricks sql --file fix_runtime_errors.sql"
echo ""
echo -e "${BLUE}Backup Created:${NC}"
echo "  • backend/.env.backup (restore if needed)"
echo ""
